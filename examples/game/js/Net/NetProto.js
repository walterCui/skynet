//用来encode和decode协议的.
var ProtoType = require('NetGlobal').ProtoType;

function NetProto(){

    var fillInt32 = function(data,sz){
        data.push(sz & 0xFF,
            sz >> 8 & 0xFF,
            sz >> 16 & 0xFF,
            sz >> 24 & 0xFF);
    }

    var toInt32 = function(data, index){
        return data[index] + (data[index+1] << 8)  + (data[index+2] << 16)  + (data[index+3] << 24) ;
    }

    var readShort = function(data, index){
        return data[index] + (data[index+1] << 8);
    }

    var encodeInt = function(header,data, val){

        if(val < 0x7FFF){
            val = (val + 1) * 2;
            header.push(val & 0xFF, val >> 8 & 0xFF);
        }else{
            header.push(0x00,0x00);
            fillInt32(data,4);
            fillInt32(data,val);
        }
    }

    //参数为一个对象，为了可以修改其中的值.{field, fieldIndex, data, dataIndex}
    var decodeInt = function(args){
        var field = args.field;
        var fieldIndex = args.fieldIndex;
        var data = args.data;
        var dataIndex = args.dataIndex;

        var temp = field[fieldIndex] + (field[fieldIndex+1] << 8);
        if(temp != 0){
            args.fieldIndex += 2;
            return temp / 2 - 1;
        }else{

            args.fieldIndex += 2;
            args.dataIndex += 8;
            
            return toInt32(data,dataIndex+4)

        }
    }

    var decodeFieldSz = function(args){
        var field = args.field;
        var fieldIndex = args.fieldIndex;

        var temp = field[fieldIndex] + (field[fieldIndex+1] << 8);
        args.fieldIndex += 2;

        return temp;
    }

    var encodeString = function(header,data,val){
        var len = val.length;
        header.push(0x00,0x00);
        fillInt32(data,len);
        for(var i = 0; i < len; i++){
            data.push(val.charCodeAt(i));
        }
    }
    //参数为一个对象，为了可以修改其中的值.{field, fieldIndex, data, dataIndex}
    var decodeString = function(args){
        var field = args.field;
        var fieldIndex = args.fieldIndex;
        var data = args.data;
        var dataIndex = args.dataIndex;

        args.fieldIndex += 2;

        var len = toInt32(data, args.dataIndex);
        args.dataIndex += 4;
        dataIndex = args.dataIndex;
        args.dataIndex += len;
        var str = [];
        for(var i = dataIndex,max = dataIndex + len; i < max; i++){
            str.push(String.fromCharCode(data[i]));
        }

        return str.join('');
    }

    //返回的是一个数组.
    this.encode = function(val){
        var header = [];
        var data = [];
        //s.push(0x02,0x00,val.opcode & 0xFF, val.opcode >> 8 & 0xFF, val.session & 0xFF, val.session >> 8 & 0xFF );
        
        //opcode.
        header.push(0x02,0x00);
        encodeInt(header,data,val.opcode);
        encodeInt(header,data,val.session);
        
        var opcodeData = header;
        
        var paramData;
        //param
        if(val.param){
            header = [0x00,0x00];
            var param = val.param;
            var fieldSize = 0;
            for(var k in param){
                //如果存在value的话才序列化.
                if(param[k].value){
                    var temp = param[k];
                    fieldSize++;
                    switch(temp.type){
                        case ProtoType.TypeString:
                        encodeString(header,data,temp.value);
                        break;
                        default:
                        break;
                    }
                }
            }

            if(fieldSize > 0){
                header[0] = fieldSize & 0xFF;
                header[1] = fieldSize >> 8 & 0xFF;
                paramData = header.concat(data);
            }
        }
        //var s = header;//header.concat(data);
        if(paramData == null){
            return opcodeData;
        }
        else{
            return opcodeData.concat(paramData);
        }
    };

    //如果val为null，则认为resp为val，且返回header。否则认为是解析数据.
    //返回{result:,size:}
    this.decode = function(resp, val, index){
        var src = 0;

        var args;// = {field:val, fieldIndex:src, data:val, dataIndex:src};

        if(val == null){
            //decode header.
            val = resp;
            args = {field:val, fieldIndex:src, data:val, dataIndex:src};
            var fieldSz = decodeFieldSz(args);
            args.dataIndex = (fieldSz + 1) * 2;
            var opcode = decodeInt(args);
            var session = decodeInt(args);
            return {result:{opcode:opcode, session:session},size:args.dataIndex}
        }
        else{
            src = index;
            args = {field:val, fieldIndex:src, data:val, dataIndex:src};
            var leftSz = val.length - args.dataIndex;
            if(leftSz < 3)
                return {result:resp,size:0};
            //decode content.
            var fieldSz = decodeFieldSz(args);
            args.dataIndex = (fieldSz + 1) * 2 + src;
            var temp;
            for(var i in resp){
                temp = resp[i];
                switch(temp.type){
                    case ProtoType.TypeString:
                        temp.value = decodeString(args);
                    break;
                    default:
                    break;
                }
            }

            return {result:resp,size:0};
        }
    }

    //压缩八位数据，并返回填充的数据长度.
    var packSeg = function(src, srcIndex, dest, destIndex,n){
        var noZero = 0;
        var start = destIndex;
        var header = 0x00;
        destIndex++;
        for(var i = 0; i < 8; i++){
            if(src[srcIndex] != 0){
                noZero++;
                header |= 1 << i;
                dest[destIndex] = src[srcIndex]
                destIndex = destIndex + 1;
            }
            srcIndex = srcIndex + 1;
        }
        dest[start] = header;
        if(n > 0 && (noZero == 7 || noZero == 6)){
            noZero = 8;
        }

        if(noZero == 8){
            if(n != 0){
                return 8;
            }else{
                return 10;
            }
        }
        return noZero+1;
    }

    var constFF = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80]

    //将n个连续的八为src写到dest中去.
    var writeFF = function(src,srcIndex, dest, destIndex, n){
        dest[destIndex] = 0xFF&0xFF;
        destIndex = destIndex + 1;
        dest[destIndex] = n-1;
        destIndex = destIndex + 1;
        var max = n * 8;
        for(var i = 0; i < max; i++){
            dest[destIndex] = src[srcIndex];
            srcIndex = srcIndex + 1;
            destIndex = destIndex + 1;
        }
        return max + 2;
    }

    //将byte数据进行压缩，并返回带长度[大段的short]的byteArray.
    this.pack = function(val){

        // var ret = [0x00,0x00];//前两个字节用来存储长度.
        // var dest = 2;
        var ret = [];
        var src = 0;
        var dest = 0;
        var temp = [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00];
        var len = val.length;

        var dataSz = 0;
        var packSegSz = 0;//压缩8位后的长度, 8特殊处理.
        var ff_n = 0;//0xFF的个数.
        var ff_srcData;
        var ff_src;
        var ff_dest;
        for(var i = 0; i < len; i+=8){
            src = i;
            if(len - src < 8){
                var k = 0;
                for(; src < len; src++){
                    temp[k] = val[src];
                    k++;

                }
                val = temp;
                src = 0;
            }

            packSegSz = packSeg(val,src,ret,dest,ff_n);
            if(packSegSz == 10){
                //first time.
                ff_n = 1;
                ff_srcData = val;
                ff_src = src;
                ff_dest = dest;
            }
            else if(packSegSz == 8){
                ff_n++;
                if(ff_n == 256){
                    writeFF(ff_srcData,ff_src,ret,ff_dest,ff_n);
                    ff_n = 0;
                }
            }else{
                if(ff_n != 0){
                    //end the oxFF.
                    writeFF(ff_srcData,ff_src,ret,ff_dest,ff_n);
                    ff_n = 0;
                }
            }

            dest += packSegSz;
        }

        if(ff_n == 1){
            writeFF(ff_srcData,ff_src,ret,ff_dest,ff_n);
        }else if(ff_n > 1){
            writeFF(ff_srcData,ff_src,ret,ff_dest,ff_n-1);
        }
        // dataSz = ret.length - 2;
        // ret[0] = dataSz >> 8 & 0xFF;
        // ret[1] = dataSz & 0xFF;

        var arrayBuffer = new Uint8Array(ret);
        return arrayBuffer;
    }

    this.unPack = function(val){
        var ret = [];
        var src = 2;//忽略头部的长度.
        var header;
        var ff_n = 0;
        for(var i = src, max = val.length; i < max;){
            header = val[i];
            i++;

            if(header == 0xFF){
                ff_n = (val[i]+1)*8;
                i++;
                for(var j = 0; j < ff_n; j++){
                    ret.push(val[i]);
                    i++;
                }
            }else{
                for(var j = 0; j < 8; j++){
                    if((header & constFF[j]) == constFF[j]){
                        ret.push(val[i]);
                        i++;
                    }else{
                        ret.push(0);
                    }
                }
            }
        }

        return ret;
    }
}

module.exports = {NetProto:NetProto}