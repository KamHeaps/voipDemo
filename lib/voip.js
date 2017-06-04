

var Voip = (function(){
    function log(message){
        console.log("--------------------    /voip.js    --------------------\n"+message );
    }
    function Voip(server){
        function getRemoteAddress(request){
            var
                remoteAddress = request.remoteAddress,
                result = "",
                index0 = remoteAddress.lastIndexOf(":")
            ;
            if(index0 >= 0){
                result = remoteAddress.substring(index0+1);
            }
            return result;
        }
        function verifyRequest(request){
            // returns connect0Verified or connection1Verified or undefined
            function defaultVerify(){
                var result;
                if(!connection0){
                    result = "connection0Verified";
                }else if(!connection1){
                    result = "connection1Verified";
                }
                return result;
            }
            
            var
                result,
                resourceData = request.resource,
                remoteAddress =  getRemoteAddress(request),
                ip, data
            ;
            log(
                "in originIsAllowed with origin:\n"+request.origin+"\n"+
                //"request:\n"+u.getObjectString(request)+"\n"+
                "resourceData:"+resourceData+"\n"+
                "remoteAddress:"+remoteAddress+"\n"
            );
            if(connectionData){
                if(connectionData.connection0 &&  !connection0){
                    ip = connectionData.connection0.ip;
                    data = connectionData.connection0.data;
                    if( !ip || ip == remoteAddress ){
                        if(!data || data == resourceData){
                            result = "connection0Verified";
                        }
                    }
                }else if(connectionData.connection1 && !connection1){
                    ip = connectionData.connection1.ip;
                    data = connectionData.connection1.data;
                    if( !ip || ip == remoteAddress ){
                        if(!data || data == resourceData){
                            result = "connection1Verified";
                        }
                    }
                }
            }else{
                result = defaultVerify();
            }
            return result;
        }
        function onRequest(request){
            var
                verified = verifyRequest(request),
                sendConnectionChanged = false,
                resourceData = request.resource.substring("/data/".length)
            ;
            
            if (!verified) {
              // Make sure we only accept requests from an allowed origin 
              request.reject();
              log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            }else{
                var connection = request.accept('echo-protocol', request.origin); //'echo-protocol', request.origin);
                connection.id = resourceData;
                log("set connection id"+connection.id);
                // set as connection0 or connection1
                if(verified == "connection0Verified"){
                    if(connection0){
                        connection0.close();
                    }
                    connection0 = connection;
                    connection0.name = "connection0";
                    log("connection0 set "+getRemoteAddress(request));
                    sendConnectionChanged = true;
                }else if(verified == "connection1Verified"){
                    if(connection1){
                        connection1.close();
                    }
                    connection1 = connection;
                    connection1.name = "connection1";
                    log("connection1 set "+getRemoteAddress(request));
                    sendConnectionChanged = true;
                }
                connection.on('message', function(message) {
                    var
                        data,
                        bufferIndex
                    ;
                    if (message.type === 'utf8') {
                        log('received utf data.'+message.utf8Data);
                    }
                    else if (message.type === 'binary') {
                        data = message.binaryData;
                        bufferIndex = data[4]+(data[5]<<8)+(data[6]<<16)+(data[7]<<24);
                        
                         /*
                        var uInt32s = new Uint32Array(arraybuffer, 0, 4);
                        log(
                            "binary message data :\n"+
                            "channel count:"+uInt32s[0]+"\n"+
                            "sample rate:"+uInt32s[1]+"\n"+
                            "buffer index:"+uInt32s[2]+"\n"+
                            "buffer size:"+uInt32s[3]+" x 4096 = "+(uInt32s[3]*4096)+", actual:"+data.length+"\n"+
                            "----------------------------\n"+
                            uInt32s[4]+","+uInt32s[5]+","+uInt32s[6]+","+uInt32s[7]+"\n"+
                            data[4]+","+data[5]+","+data[6]+","+data[7]+"\n"+
                            data[8]+","+data[9]+","+data[10]+","+data[11]+"\n"+
                            data[12]+","+data[13]+","+data[14]+","+data[15 ]+"\n"+
                            data[16]+","+data[17]+","+data[18]+","+data[19 ]+"\n"
                        );
                        */
                        if(connection.name == "connection0" && connection1){
                            log("bufferIndex:"+bufferIndex+", connection0==>connection1, "+message.binaryData.length+" bytes");
                            connection1.sendBytes(message.binaryData);
                        }else if(connection.name == "connection1" &&  connection0){
                            log("bufferIndex:"+bufferIndex+", connection1==>connection0, "+message.binaryData.length+" bytes");
                            connection0.sendBytes(message.binaryData);
                        }
                    }
                });
                
                connection.on('close', function(reasonCode, description) {
                    log(
                        "connection, "+this.name+", closed.\n"+
                        "Reason code:" +reasonCode+"\n description:"+description+"\n"+
                        "\naddress:"+ getRemoteAddress(request)+"\n"//+
                        //"frameSize:"+frameSize
                    );
                    var sendConnectionChanged = false;
                    if(this.name == "connection0" && connection0 == this){
                        connection0 = undefined;
                        sendConnectionChanged = true;
                    }else if(this.name == "connection1" && connection1 == this){
                        connection1 = undefined;
                        sendConnectionChanged = true;
                    }
                    if(sendConnectionChanged){
                        _this.onConnectionChanged();
                    }
                });
                
                if(sendConnectionChanged){
                    _this.onConnectionChanged();
                }
            }
        }
        function disconnect(connection){
            var sendConnectionChanged = false;
            if(connection0 && (!connection || connection == "connection0") ){
                connection0.close();
                sendConnectionChanged = true;
            }
            if(connection1 && (!connection || connection == "connection1") ){
                connection1.close();
                sendConnectionChanged = true;
            }
            if(sendConnectionChanged){
                _this.onConnectionChanged();
            }
        }
        
        function init(){
            wsServer = new (require('websocket').server)({
                httpServer: server,
                // You should not use autoAcceptConnections for production 
                // applications, as it defeats all standard cross-origin protection 
                // facilities built into the protocol and the browser.  You should 
                // *always* verify the connection's origin and decide whether or not 
                // to accept it. 
                autoAcceptConnections: false//,
                //maxReceivedFrameSize: frameSize
            });
            wsServer.on('request', onRequest);
            
            // external properties
            _this.disconnect = disconnect;
            _this.onConnectionChanged = function(){};
            Object.defineProperty(
                _this,
                "server",
                {
                    get:function(){return server;}
                }
            );
            Object.defineProperty(
                _this,
                "frameSize",
                {
                    get:function(){return frameSize;}
                }
            );
            Object.defineProperty(
                _this,
                "connectionData",
                {
                    get:function(){return connectionData;},
                    set:function(value){
                        connectionData = value;
                    }
                }
            );
            Object.defineProperty(
                _this,
                "connectedClientIds",
                {
                    get:function(){
                        var result = [];
                        log(
                            "getting connectedClients\n"+
                            "connection0:"+connection0+"\n"+
                            "connection1:"+connection1+"\n"
                        );
                        if(connection0){
                            result.push(connection0.id);
                        }
                        if(connection1){
                            result.push(connection1.id);
                        }
                        return result;
                    }
                }
            );
            
        }
        var
            _this = this,
            wsServer = require('websocket').server,
            //frameSize = (4096*3232)+1024, // 4096 (bytes per audioContext porcessing [ap]) * 2 channel * 4 ? * 12 (ap per transfer)
            connectionData,
            connection0,connection1
        ;
        init();
    }
    
    Voip.ConectionData = function(ip0, data0, ip1, data1){        
        function init(){
            if(ip0 || data0){
                _this.connection0 = { ip:ip0, data:data0 };
            }
            if(ip1 || data1){
                _this.connection1 = { ip:ip1, data:data1 };
            }
        }
        var
            _this = this
        ;
        init();
    };
    return Voip;
})();

module.exports = Voip;