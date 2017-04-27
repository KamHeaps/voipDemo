

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
            var verified = verifyRequest(request);
            
            if (!verified) {
              // Make sure we only accept requests from an allowed origin 
              request.reject();
              log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            }else{
                var connection = request.accept('echo-protocol', request.origin); //'echo-protocol', request.origin);
                // set as connection0 or connection1
                if(verified == "connection0Verified"){
                    if(connection0){
                        connection0.close();
                    }
                    connection0 = connection;
                    connection0.name = "connection0";
                    log("connection0 set "+getRemoteAddress(request));
                }else if(verified == "connection1Verified"){
                    if(connection1){
                        connection1.close();
                    }
                    connection1 = connection;
                    connection1.name = "connection1";
                    log("connection1 set "+getRemoteAddress(request));
                }
                
                connection.on('message', function(message) {
                    if (message.type === 'utf8') {
                        log('received utf data.'+message.utf8Data);
                    }
                    else if (message.type === 'binary') {
                        if(connection.name == "connection0" && connection1){
                            connection1.sendBytes(message.binaryData);
                        }else if(connection.name == "connection1" &&  connection0){
                            connection0.sendBytes(message.binaryData);
                        }
                    }
                });
                connection.on('close', function(reasonCode, description) {
                    log(
                        "connection, "+this.name+", closed.\n"+
                        "Reason code:" +reasonCode+"\n description:"+description+"\n"+
                        "\naddress:"+ getRemoteAddress(request)
                    );
                    if(this.name == "connection0" && connection0 == this){
                        connection0 = undefined;
                    }else if(this.name == "connection1" && connection1 == this){
                        connection1 = undefined;
                    }
                });
            }
        }
        function disconnect(connection){
            if(connection0 && (!connection || connection == "connection0") ){
                connection0.close();
            }
            if(connection1 && (!connection || connection == "connection1") ){
                connection1.close();
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
                autoAcceptConnections: false,
                maxReceivedFrameSize: frameSize
            });
            wsServer.on('request', onRequest);
            
            // external properties
            _this.disconnect = disconnect;
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
            
        }
        var
            _this = this,
            wsServer = require('websocket').server,
            frameSize = (4096*2*4*12)+12, // 4096 (bytes per audioContext porcessing [ap]) * 2 channel * 4 ? * 12 (ap per transfer)
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