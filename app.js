function log(message){
    console.log(
        "-------------------    ./voipDemo/app.js    -------------------\n"+
        message
    );
}

var
    server = require('http').createServer(),
    path = require("path"),
    express = require("express"),
    bodyParser = require('body-parser'),
    routes = require(path.join(__dirname, "routes")),
    app = express(),
    serverConfig = require('./voipConfig.json').serverConfig
;

serverConfig.directories = {
    views : path.join(__dirname, "views"),
    routes : path.join(__dirname, "routes"),
    public : path.join(__dirname, "public"),
};

// app setup
// templates use .ejs 
app.set("view engine", "ejs");
app.set('views', [serverConfig.directories.views]);
log("serverConfig.directories.public:\n"+serverConfig.directories.public);
app.use( express.static( serverConfig.directories.public ) );
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// initialize routes 
routes.init(server, serverConfig, app );
// covers
//  app.get('/sseClientConnect', routes.sseClientConnect); 


// Routes
// gets
app.get("/voipDemo", routes.voipDemo);

server.on('request', app);
server.listen(serverConfig.port, function () { log('Listening on ' + server.address().port); });

// default response for get and must be last added
app.get("*", routes.not_found);

