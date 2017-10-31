var Net = require('NetSocket');
var Protocols = require('Protocols')
var NetProto = require("NetProto").NetProto

var handler = {};
var netProto;
var socket;
var handleSocket;

handler.onopen = function (event) {
    console.log("Send Text WS was opened.");
    handleSocket.onopen();
};
handler.onmessage = function (event) {
   
    var byteBuffer  = new Uint8Array(event.data);
    var ret = byteBuffer;
    var temp = netProto.unPack(ret);

    var headerTemp = netProto.decode(temp);
    var header = headerTemp.result;

    var resp = Protocols.findResponseBySeesion(header.session);
    headerTemp = netProto.decode(resp,temp, headerTemp.size);

    var cb = Protocols.findCb(header.session);
    if(cb){
        cb(headerTemp.result);
    }
    //handle.onmessage({msg:headerTemp.result, session:header.session});
    
    // var r = headerTemp.result.result.value;
    // console.log('msg.msg.result'+r)
};
handler.onerror = function (event) {
    console.log("Send Text fired an error");
};
handler.onclose = function (event) {
    console.log("WebSocket instance closed.");
};
handler.ontimeout = function(){
    console.log("WebSocket instance timeout.");
}

var send = function (msg,cb){
    Protocols.registerCb(msg.session,cb)
    var ret = netProto.encode(msg);
    socket.send(netProto.pack(ret));
}
var Network = function(url,handleSocketCb){
    netProto = new NetProto();
    socket = new Net(url,handler);
    handleSocket = handleSocketCb;
    Protocols.init();

    var request = Protocols.request;
    
    this.login = function(name, pwd,cb){
        var loginProto = request.login;
        loginProto.param.name.value = name;
        loginProto.param.pwd.value = pwd;
        send(loginProto,cb);
    };

    this.enterRoom = function(roomId,cb){
        var temp = request.enterRoom;
        temp.param.roomId.value = roomId;
        send(temp,cb);
    }
}


module.exports = {Network:Network}