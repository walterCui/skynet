var NetProto = require("NetProto").NetProto
var Protocols = require('Protocols')


var NetSocket = function(url, handle){
    var ws = new WebSocket(url);
    // ws.binaryType = 'arraybuffer'
    ws.onopen = function (event) {
        handle.onopen(event);
    };
    ws.onmessage = function (event) {
        var reader = new FileReader();
        reader.addEventListener("loadend", function(){
            var ret = [];
            var res = reader.result;
            for(var i = 0, max = res.length; i < max; i++){
                ret.push(res.charCodeAt(i));
            }
            var temp = netProto.unPack(ret);

            var headerTemp = netProto.decode(temp);
            var header = headerTemp.result;

            var resp = Protocols.findResponseBySeesion(header.session);
            headerTemp = netProto.decode(resp,temp, headerTemp.size);

            handle.onmessage({msg:headerTemp.result, session:header.session});
        });
        reader.readAsBinaryString(event.data);
    };
    ws.onerror = function (event) {
        handle.onerror(event);
    };
    ws.onclose = function (event) {
        handle.onclose(event);
    };
    
    setTimeout(function () {
        if (ws.readyState === WebSocket.OPEN) {
            //ws.send("Hello WebSocket, I'm a text message.");
        }
        else {
            handle.ontimeout();
        }
    }, 3);

    var netProto = new NetProto();
    this.send = function(msg){
        var ret = netProto.encode(msg);
        ws.send(netProto.pack(ret));
    }
}

module.exports = NetSocket;