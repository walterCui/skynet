var ProtoType = require('NetGlobal').ProtoType;

var opcode2Protocol = {}
var session2Response = {}

var init = function(){
    var proto;
    for(var i in Protocols){
        proto = Protocols[i];
        if(proto.opcode){
            opcode2Protocol[proto.opcode] = proto;
            
            if(proto.session){
                session2Response[proto.session] = Respone[i];
            }
        }
    }
}

var findRequestByOpcode = function(opcode){
    return opcode2Protocol[opcode];
}

var findResponseBySeesion = function(session){
    return session2Response[session];
}

var Protocols = {
    login:{
        opcode : 3,
        session : 3,
        param : {what:{type:ProtoType.TypeString, tag:0},value:{type:ProtoType.TypeString, tag:1}},
        }

};

var Respone = {
    login:{
        result:{type:ProtoType.TypeString, tag:0}
    }
}

module.exports = {
    protocols:Protocols, 
    init:init, 
    findRequestByOpcode:findRequestByOpcode,
    findResponseBySeesion:findResponseBySeesion
};