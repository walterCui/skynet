var Net = require('NetSocket');
var Protocols = require('Protocols')

var handler = {};
var netProto;
var socket;
var handleSocket;

handler.onopen = function (event) {
    console.log("Send Text WS was opened.");
    handleSocket.onopen();
};
handler.onmessage = function (msg) {
    // console.log("response text msg: " + event.data);
    var r = msg.msg.result.value;
    console.log('msg.msg.result'+r)
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
var Network = function(url,cb){
    socket = new Net(url,handler);
    handleSocket = cb;
    Protocols.init();

    var protocols = Protocols.protocols;
    
    this.login = function(name, pwd){
        var loginProto = protocols.login;
        loginProto.param.what.value = name;
        loginProto.param.value.value = pwd;
        socket.send(loginProto);
    };
}


module.exports = {Network:Network}