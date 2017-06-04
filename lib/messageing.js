
var
    path = require("path"),
    u = require("nuf_utilities"),
    libDir = path.join(__dirname, "..","lib"),
    Event = require(path.join(libDir, "event.js") )
;

var Messageing = (function(){
    function log(message){
        console.log(
            "------  /lib/messageing.js  ------\n"+
            message+"\n"+
            "----------------------------------"
        );
    }
    var ClientManager = (function(){
        var KnownClients = (function(){
            function KnownClients(){
                function getNextClientId(){
                    function generateId(){
                        var alpha = "abcdefghjklmnpqrstuvwxyzABCDEFGJKLMNPQRSTUVWXYZ1234567890";
                        var result = "";
                        
                        for(var i=0; i < 47; i++){
                            result += alpha[Math.floor(alpha.length * Math.random()) ];
                        }
                        return result;
                    }
                    
                    var id = generateId();
                    while(clients[id]){
                        id = generateId();
                    }
                    return id;
                }
                function getNewClient(clientManager){
                    var
                        client = new Client(clientManager,getNextClientId())
                        //{
                        //    state:"",
                        //    id:getNextClientId(),
                        //    dispose: function(){
                        //        log("deleting client id:"+this.id);
                        //        delete knownClients[this.id];
                        //    }
                        //}
                    ;
                    Event.addEventEmitter(client);
                    clients[client.id] = client;
                    return client;
                }
                function removeClient(clientId){
                    delete clients[clientId];
                }
                
                function init(){
                    clients = {};
                    _this.getNewClient = getNewClient;
                    _this.removeClient = removeClient;
                    Object.defineProperty(
                        _this,
                        "clients",
                        { get:function(){ return clients;} }
                    );
                    
                }
                var
                    _this = this,
                    clients
                ;
                init();
            }
            return KnownClients;
        })();
        function Client(clientManager, id){
            function dispose(){
                 state = "disposed";
                _this.manager.removeClient(_this.id);
                reqObject.res.end();
            }
            function send(messageObject){
                if(state == "connected"){
                    reqObject.res.write("id: " + Date.now() + "\ndata: " + messageObject.stringify()+"\n\n");
                }
            }
            
            function init(){
                Event.addEventEmitter(_this);
                _this.dispose = dispose;
                _this.send = send;
                _this.send.MessageObject = MessageObject;
                
                state = "connecting";
                Object.defineProperty(
                    _this,
                    "id",
                    {
                        get:function(){return id;},
                    }
                );
                Object.defineProperty(
                    _this,
                    "ip",
                    {
                        get:function(){
                            var ip;
                            if(reqObject && reqObject.req){
                                ip = reqObject.req.ip;
                            }
                            return ip;
                        },
                    }
                );
                Object.defineProperty(
                    _this,
                    "reqObject",
                    {
                        get:function(){return reqObject;},
                        set:function(value){
                            reqObject = value;
                            state = "connected";
                        }
                    }
                );
                Object.defineProperty(
                    _this,
                    "state",
                    {
                        get:function(){return state;},
                    }
                );
                Object.defineProperty(
                    _this,
                    "clientManager",
                    {
                        get:function(){return clientManager;},
                    }
                );
            }
            var
                _this = this,
                reqObject,
                state
            ;
            init();
        }
        function ClientManager(){
            function getNewClient(){
                var
                    client = knownClients.getNewClient(_this)
                ;
                client.manager = _this;
                _this.on.emitEvent("newClient",{client:client});
                return client;
            }
            function getClient(clientId){
                return knownClients.clients[clientId];
            }
            function getClients(){
                var
                    clients = knownClients.clients,
                    keys = Object.keys(clients), key,
                    i,
                    result = {}
                ;
                for(i =0; i< keys.length; i++){
                    key = keys[i];
                    result[key] = clients[key];
                }
                return result;
            }
            function removeClient(clientId){
                knownClients.removeClient(clientId);
            }
            function init(){
                Event.addEventEmitter(_this);
                knownClients = new KnownClients();
                _this.getNewClient = getNewClient;
                _this.getClient = getClient;
                _this.removeClient = removeClient;
                Object.defineProperty(
                    _this,
                    "clients",
                    {
                        get:function(){ return getClients(); }
                    }
                );
            }
            var
                _this = this,
                knownClients
            ;
            init();
        }
        return ClientManager;
    })();
    var ReqObject = (function(){
        function ReqObject(req, res){
            function sendSuccessfulResponse(responseMessageObject){
                responseMessageObject =
                    responseMessageObject ||
                    new MessageObject(
                        "serverResponse",
                        undefined,
                        "server",
                        {
                            "message":"Success"
                        }
                    );
                res.writeHead(200, {
                    'Content-Type': "application/json",
                    "Cache-Control": "no-cache",
                });
                log("sending sendSuccessfulResponse ");
                res.end(responseMessageObject.stringify());
            }
            function sendFailedResponse(responseMessageObject){
                responseMessageObject =
                    responseMessageObject ||
                    new MessageObject(
                        "serverResponse",
                        undefined,
                        "server",
                        {
                            "message":"Failed"
                        },
                        { "error": "Failed"}
                    );
                res.writeHead(400, {
                    'Content-Type': "application/json",
                    "Cache-Control": "no-cache",
                });
                res.end(responseMessageObject.stringify());
            }
            
            function init(){
                _this.req = req;
                _this.res = res;
                _this.sendSuccessfulResponse = sendSuccessfulResponse;
                _this.sendFailedResponse = sendFailedResponse;
            }
            
            var
                _this = this
            ;
            init();
        }
        return ReqObject;
    })();
    var MessageObject = (function(){    
        function MessageObject(type, dest, source, data, flags){
            function stringify(){
                return JSON.stringify({type:type, dest:dest, source:source, data:data, flags:flags});
            }
            function toString(){
                return u.getObjectString(_this);
            }
            function init(){
                flags = flags || {};
                _this.type = type;
                _this.dest = dest;
                _this.source = source;
                _this.data = data;
                _this.flags = flags;
                _this.stringify = stringify;
                _this.toString = toString;
            }
            var
                _this = this
            ;
            init();
        }
        MessageObject.fromString = function (str){
            var
                json = JSON.parse(str)
            ;
            return new MessageObject(json.type, json.dest, json.source, json.data, json.flags);
        };
        
        return MessageObject;
    })();  
    function Messageing(url){
        function onSSEConnect(req, res){
            var
                urlClientId = req.params.clientId,
                client = clientManager.getClient(urlClientId),
                timeout = 1000 * 60* 60 * 24 * 7, // one week timeout
                event
            ;
            if(client){
                client.reqObject = new ReqObject(req, res);
                // set timeout
                req.socket.setTimeout(timeout);
                // client disconnect
                req.on("close", function() {
                    var event = new Event("closed", client);
                    client.on.emitEvent(event);
                    log("client "+client.id+" connection closed");
                });
                
                // set headers
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                });
                event = new Event("connected", client);
                log("in emitting connected event:"+urlClientId);
                client.on.emitEvent(event);
            }else{
                res.writeHead(400);
                res.end();
            }
        }
        function onPostMessage(req, res){
            function getMessageObject(){
                var message = "";
                req.setEncoding('utf8');
                req.on('data', function(chunk) {
                    message += chunk;
                });
                req.on(
                    'end',
                    function(){
                        var
                            messageObject,
                            reqObject = new ReqObject(req, res),
                            urlClientId = req.params.clientId
                        ;
                        try{
                            messageObject = MessageObject.fromString(message);
                        }finally{
                            if(messageObject){
                                _this.on.emitEvent(
                                    "message",
                                    {
                                        messageObject:messageObject,
                                        urlClientId:urlClientId,
                                        reqObject:reqObject
                                    }
                                );
                            }else{
                                _this.on.emitEvent(
                                    "textMessage",
                                    {
                                        textMessage:message,
                                        urlClientId:urlClientId,
                                        reqObject : new ReqObject(req, res)
                                    }
                                );
                            }
                        }
                    }
                );
            }
            getMessageObject();
        }
        function appInit(app){
            var
                preUrlStr = (url[url.length-1] === "/")?url.substring(0,url.length-1):url,
                postUrl = preUrlStr+"/post/:clientId?",
                sseUrl = preUrlStr+"/sseClientConnect/:clientId?"
            ;
            log("adding app urls..\npreUrlStr:"+preUrlStr+"\npostUrl:"+postUrl+"\nsseUrl:"+sseUrl);
            app.get(sseUrl,onSSEConnect);
            app.post(postUrl,onPostMessage);
            
        }
        function defaultOnMessage(event){
            log(
                "messaging default onMessage received an unhandled messageObject.\n"+
                "event:"+event
            );
        }
        function defaultOnTextMessage(event){
            log(
                "messaging default onTextMessage received ab unhandled text message.\n"+
                "event:"+event
            );
        }
        
        function init(){
            Event.addEventEmitter(_this);
            url = url || "/";
            clientManager = new ClientManager();
            _this.appInit = appInit;
            _this.onMessage = defaultOnMessage;
            _this.onTextMessage = defaultOnTextMessage;
            
            // external properties
            Object.defineProperty(
                _this,
                "clientManager",
                 {
                    get:function(){ return clientManager;}
                 }
            );
        }
        var
            _this = this,
            clientManager            
        ;
        init();
    }
    Messageing.MessageObject = MessageObject;
    return  Messageing;
})();

module.exports = Messageing;