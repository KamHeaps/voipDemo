

function log(message){
    console.log(
        "-------------------    voipDemo/routes/index.js   -------------------\n"+
        message
    );
}
function voipOnConnectionChanged(){
    
    var
        messageObject,
        connectedClientIds = voip.connectedClientIds,
        clientIds = [],
        clients = Object.values(messageing.clientManager.clients),
        i
    ;
    log( "connectedClients.length:\n"+connectedClientIds.length);
    for( i =0; i< connectedClientIds.length; i++){
        clientIds.push(connectedClientIds[i]);
    }
    log(
        "in voipOnConnectionChanged ************************************************\n"+
        "sending client ids:\n"+JSON.stringify(clientIds)+"\n"+
        "clients.length:"+clients.length
        
    );
    for( i=0; i< clients.length; i++){
        messageObject = new clients[i].send.MessageObject(
            "connectionClients",
            clients[i].id,
            "server",{
                clientIds:clientIds
            }
        );
        clients[i].send(messageObject);
        log("sending messageobject:\n"+ messageObject);
    }
}
function onMessage(event){
    log("recieved message, event:\n"+event);
    var
        messageObject = event.data.messageObject,
        reqObject = event.data.reqObject,
        destClient
    ;
    if(messageObject.dest.toLowerCase() != "server"){
        destClient = messageing.clientManager.getClient(messageObject.dest);
        if(destClient){
            destClient.send(messageObject);
        }
    }
    reqObject.sendSuccessfulResponse();
}

var
    path = require("path"),
    libDir = path.join(__dirname, "..","lib"),
    Messageing = require( "nuf_messageing"),
    messageing,
    Voip = require( path.join(libDir, "voip.js") ),
    voip,
    //sseStreamHandler = new ( require( path.join(libDir, "sseStreamHandler.js") ) )(),
    //u = require("nuf_utilities"),
    server, serverConfig, app
;

exports.init = function(_server, _serverConfig, _app){
    log(
        "init received..\n"+
        "_server:"+_server +"\n"+
        "_serverConfig:\n"+JSON.stringify(_serverConfig,undefined, "\t") +"\n"+
        "_app:"+_app +"\n"
    );
    server  = _server;
    serverConfig  = _serverConfig;
    app  = _app;
    voip = new Voip(server);
    messageing = new Messageing(_app, _serverConfig.url);
    messageing.onMessage = onMessage;
    voip.onConnectionChanged = voipOnConnectionChanged;
};

exports.voipDemo = function(req, res){
    var client = messageing.clientManager.getNewClient();
   
    log("setting messageingUrl:"+serverConfig.url);
    res.render(
        "home",
        {
            userData:{
                voipConnection:{
                    data0:"adskljhaslopiigbnlmgnbkfh",
                    data1:"bdskljhaslopiigbnlmgnbkfh",
                    data2:"cdskljhaslopiigbnlmgnbkfh",
                    data3:"ddskljhaslopiigbnlmgnbkfh"
                }
            },
            messageingObject:{  // messageingObject needed for messageingClient.js to connect
                clientId:client.id,
                messageingUrl:serverConfig.url
            }
        }
    );
};

exports.not_found = function(req, res){
    //res.writeHead(404);
    res.status(404).send("page not found");
};


