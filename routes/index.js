

function log(message){
    console.log(
        "-------------------    voipDemo/routes/index.js   -------------------\n"+
        message
    );
}
var
    path = require("path"),
    libDir = path.join(__dirname, "..","lib"),
    //Messageing = require( path.join(libDir, "messageing.js") ),
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
        "_serverConfig:"+_serverConfig +"\n"+
        "_app:"+_app +"\n"
    );
    server  = _server;
    serverConfig  = _serverConfig;
    app  = _app;
    voip = new Voip(server);
};

exports.voipDemo = function(req, res){
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
            }
        }
    );
};

exports.not_found = function(req, res){
    //res.writeHead(404);
    res.status(404).send("page not found");
};


