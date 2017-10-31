var Protocols = require('Protocols')


var NetSocket = function(url, handle){
    var ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer'
    ws.onopen = function (event) {
        handle.onopen(event);
    };
    ws.onmessage = function (event) {
        handle.onmessage(event);
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
    this.send = function(msg){
        ws.send(msg);
    }
}

module.exports = NetSocket;