var Network = require("Network").Network
cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },

    // use this for initialization
    onLoad: function () {
        var ws = new Network("ws://127.0.0.1:8001",{
            onopen:function(){
                ws.login('111','33',function(msg){
                    if(msg.error){
                        console.log('login error',msg.error)
                    }else{
                        console.log('ddddd',msg.uid);
                        ws.enterRoom((1<<8)+0,function(msg){
                            if(msg.error){
                                console.log("enter room error",msg.error.value)
                            }else{
                                //enter room ok.
                            }
                        })
                    }
                })
            }
        });
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
