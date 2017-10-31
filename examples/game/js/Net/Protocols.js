var ProtoType = require('NetGlobal').ProtoType;

var opcode2Request = {}

var session2Response = {}

var responeCallback = {}

var request = {}

var init = function(){
    var proto;
    for(var i in Protocols){
        proto = Protocols[i];
        var req = proto.request;
        var res = proto.respone;

        if(req){
            opcode2Request[req.opcode] = req;
            request[i] = req;
            if(req.session){
                session2Response[req.session] = res;
            }
        }
    }
}

var findRequestByOpcode = function(opcode){
    return opcode2Request[opcode];
}

var findResponseBySeesion = function(session){
    return session2Response[session];
}

var registerCb = function(session, cb){
    responeCallback[session] = cb;
}

var findCb = function(session){
    return responeCallback[session];
}


//房间内的玩家信息.
var useInRoom = {
    name : {type : ProtoType.TypeString, tag : 0},
    pos :  {type : ProtoType.TypeInt32,  tag : 1}
}

var Protocols = {
    login:{
        request:{
            opcode : 3,
            session : 3,
            param : {
                name:{type:ProtoType.TypeString, tag:0},
                pwd:{type:ProtoType.TypeString, tag:1}
            }
        },
        respone:{
            error:{type:ProtoType.TypeInt32, tag:0},
            uid:{type:ProtoType.TypeInt32, tag:1},
        }
    },
    enterRoom:{
        request:{
            opcode : 4,
            session : 4,
            param : {
                roomId : {type : ProtoType.TypeInt32, tag : 0}
            }
        },
        respone:{
            error : {type:ProtoType.TypeInt32, tag:0},
            roomId : {type:ProtoType.TypeInt32, tag:1},            
            uses :  {type:ProtoType.TypeArrayStruct, subType: useInRoom,tag : 2}
        }
    }

};

module.exports = {
    request:request, 
    init:init, 
    findRequestByOpcode:findRequestByOpcode,
    findResponseBySeesion:findResponseBySeesion,
    registerCb:registerCb,
    findCb:findCb
};