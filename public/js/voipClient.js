
function infoLog(index, message){
    infoLabels[index].innerHTML = message;
}
var VoipConnection;
(function(){
function log(message){
    console.log("-----------------------   voip.js   -----------------------\n"+message);
}

VoipConnection = (function(){
    function VoipPlayer(){
        function setReceivedData(header, arrayBuffer, audioBuffer){
            var
                receivedTime = Date.now(),
                sourceT0 = new Date(header.sourceTime0),
                startTime = new Date(header.startTime)
            ;
            infoLog(11,"Index:"+header.index);
            infoLog(12,"Source T0:"+sourceT0);
            infoLog(13,"startTime:"+startTime);
            if( receivedData.lastReceived !== undefined ){
                infoLog(14,"Time between recieved buffers:"+ (receivedTime-receivedData.lastReceived) +" ms");
            }
            infoLog(15,"Buffer size :"+ arrayBuffer.byteLength +"bytes");
            infoLog(16,"Buffer size :"+ (audioBuffer.duration * 1000) +" ms");
            receivedData.lastReceived =  receivedTime;
        }
        function addArrayBuffer(arrayBuffer){
            function getHeader(arraybuffer){
                function getTimeFromInts(int32Array){
                    var
                        str = "0x"+int32Array[0].toString(16),
                        str1 = int32Array[1].toString(16)
                    ;
                    while(str1.length<8){
                        str1 = "0"+str1;
                    }
                    return Number(str+str1);
                }
                var
                    header = {
                        length:new Int32Array(arraybuffer, 0, 1)[0],
                        index:new Int32Array(arraybuffer, 4, 1)[0]
                    },
                    sourceTime0 = getTimeFromInts( new Int32Array(arraybuffer, 8, 2) ),
                    startTime  = getTimeFromInts( new Int32Array(arraybuffer, 16, 2) )
                ;
                header.sourceTime0 = sourceTime0;
                header.startTime = startTime;
                return header;
            }
            
            var
                header = getHeader(arrayBuffer),
                body = arrayBuffer.slice(header.length*4,arrayBuffer.byteSize),
                source = audioContext.createBufferSource()
            ;
            // decode data
            audioContext.decodeAudioData(body, function(buffer) {
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start();
                setReceivedData(header, arrayBuffer, buffer);
            });
            
        }
        
        function init(){
            // internal properties
            audioContext = VoipConnection.playAudioContext;
            // external properties  
            _this.addArrayBuffer = addArrayBuffer;
            state = "stopped";
        }
        var
            _this = this,
            audioContext,
            receivedData ={}
        ;
        init();
    }
    function WebSocketConnection(){
        function connectToServer(){
            webSocket = new WebSocket("ws://"+location.host+"/data/"+Math.floor(10000*Math.random()), "echo-protocol");
            webSocket.binaryType = "arraybuffer";
            
            webSocket.onerror = function() {
                log('WebSocket Error');
                throw "Connection Error";
            };
            webSocket.onopen = function() {
                //log('WebSocket Connected');
            };
            webSocket.onclose = function(arg) {
                log('WebSocket Closed '+arg);
            };
            webSocket.onmessage = function(e) {
                onData(e.data);
            };
        }
        var sendTime;
        function send(arrayBuffer){
            // test delay
            var delay = 0;//Math.floor(250 * Math.random() );
            setTimeout(
                function(){
                    var time  = Date.now();
                    if(sendTime){
                        
                    }
                    webSocket.send(arrayBuffer);
                    sendTime = time;
                },
                delay
            );
        }
        function onData(data){
            if(_this.onData){
                _this.onData(data);
            }
        }
        
        function init(){
            _this.send = send;
            connectToServer();
        }
        var
            _this = this,
            webSocket
        ;
        init();
    }
    function AudioContextLevelNode(){
        function _Worker(){
            function log(message){
                console.log(
                    "--------------- AudioContextLevelNode _Worker -------------------\n"+
                    message
                );
            }
            function extractLevelData(bufferData){
                var
                    channelData = bufferData.channelData,
                    channel,
                    levels = [],
                    c, i, max
                ;
                for(c =0; c<channelData.length; c++){
                    max = 0;
                    channel = channelData[c];
                    for(i=0; i<channel.length; i++ ){
                        max = Math.max( Math.abs(channel[i]) );
                    }
                    levels[c] = max;
                }
                self.postMessage(
                    {
                        type:"leveData",
                        data:levels
                    }
                );
            }
            function onMessage(event){
                var message = event.data;
                switch(message.type){
                    case "extractLevelData":
                        extractLevelData(message.data.bufferData);
                        break;
                }
            }
            
            function init(){
                self.onmessage = onMessage;
            }
            init();
        }// _Worker ==========>>>>
        function onWorkerMessage(e){
            var messageObject = e.data;
            switch(messageObject.type){
                case "leveData":
                    _this.onLevelData(messageObject.data);
                    break;
            }
        }
        function getWorkerFunctionUrl(){
            var
                workerString = ""+_Worker,
                index0,
                index1,
                blob
            ;
            index0 = workerString.indexOf('{');
            index1 = workerString.lastIndexOf('}');
            workerString = workerString.substring(index0+1, index1-1);
            blob = new Blob([workerString], {type : 'application/javascript'});
            return URL.createObjectURL(blob);
        }
        function defaultOnLevelData(){}
        
        function init(){
            var
                worker =  new Worker(getWorkerFunctionUrl())
            ;
            // set internal properties
            audioContext = VoipConnection.broadcastAudioContext;
            worker.onmessage = onWorkerMessage;
            node = audioContext.createScriptProcessor(4096, 2, 2); // (bufferSize, inputChannels, outputChannels)
            node.onaudioprocess = function(e) {
                var
                    bufferData = {
                        channelData:[],
                        startTime:this.context.currentTime
                    },
                    channelData,
                    c
                ;
                for (c = 0; c < 2; c++) {
                    channelData = e.inputBuffer.getChannelData(c);
                    bufferData.channelData.push(
                        channelData
                    );
                    e.outputBuffer.copyToChannel(channelData, c);
                }
                worker.postMessage(
                    {
                        type:"extractLevelData",
                        data:{ bufferData:bufferData }
                    }
                );
            };
            worker.onmessge = onWorkerMessage;
            // set external property --------------------------
            _this.onLevelData = defaultOnLevelData;
            Object.defineProperty(
                _this,
                "audioContext",
                {
                    get:function(){return audioContext;}
                }
            );
            Object.defineProperty(
                _this,
                "scriptNode",
                {
                    get:function(){return node;}
                }
            );
        }
        var
            _this = this,
            node,
            audioContext
        ;
        init();
    }
    
    function MediaStreamRecorder(mediaStream){
        
        function onData(arrayBuffer){
            log("in MediaStreamRecorder default onData arrayBuffer:"+arrayBuffer.byteSize+"bytes.");
        }
        function start(){
            function getHeaderArrayBuffer(){
                function timeToInts(time){
                    var
                        str = time.toString(16),
                        result = []
                    ;
                    while(str.length<16){
                        str = "0"+str;
                    }
                    result.push(parseInt(str.substring(0,8), 16));
                    result.push(parseInt(str.substring(8), 16));
                    return result;
                }
                
                var
                    header = {
                        length:headerData.length,
                        index:headerData.index++,
                        sourceT0:timeToInts(headerData.sourceT0),
                        startTime:timeToInts(Date.now())
                    },
                    result = new ArrayBuffer(header.length*4),
                    int32Array = new Int32Array(result)
                ;
                int32Array[0] = header.length;
                int32Array[1] = header.index;
                int32Array[2] = header.sourceT0[0];
                int32Array[3] = header.sourceT0[1];
                int32Array[4] = header.startTime[0];
                int32Array[5] = header.startTime[1];
                return result;
            }
            function startRecorder(){
                headerArrayBuffer = getHeaderArrayBuffer();
                mediaRecorder.start();
                setTimeout(  intervalTimeout, bufferInterval*1000 );
            }
            function intervalTimeout(){
                mediaRecorder.stop();
            }
            function ondataavailable(e){
                var
                    fileReader = new FileReader(),
                    blob
                ;
                if(e.data.size > 0 ){
                    blob = new Blob([headerArrayBuffer, e.data]);
                    fileReader.onload = function() {
                        _this.onData(this.result);
                    };
                    fileReader.readAsArrayBuffer(blob);
                }
                startRecorder();
            }
            var
                mediaRecorder,
                bufferInterval = 0.1, // in seconds,
                headerArrayBuffer
            ;
            mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorder.ondataavailable = ondataavailable;
            startRecorder();
        }
        function init(){
            headerData = {
                length:6,
                index:0,
                sourceT0:Date.now(),
                startTime: 0
            };
            _this.onData = onData;
            _this.start = start;
        }
        var
            _this = this,
            headerData
        ;
        init();
        
    }
    function VoipConnection(){
        function start(){
            if(node){
                node.disconnect();
            }
            if(mediaStream){
                var
                    sourceNode = audioContext.createMediaStreamSource(mediaStream)
                ;
                sourceNode.connect(node);
                for(var i=0; i< recordingLevelDivs.length; i++){
                    recordingLevelDivs[0].audioNode = node;
                }
                var mediaStreamRecorder = new MediaStreamRecorder(mediaStream);
                mediaStreamRecorder.onData = onWorkerData;
                mediaStreamRecorder.start();
            }
        }
        function stop(){
            node.disconnect();
            node = undefined;
        }
        function setSentData(arrayBuffer){
            var
                header = VoipConnection.getHeader(arrayBuffer),
                sourceT0 = new Date(header.sourceTime0),
                startTime = new Date(header.startTime),
                sendTime = Date.now()
            ;
            
            infoLog(1,"Index:"+header.index);
            infoLog(2,"Source T0:"+sourceT0);
            infoLog(3,"startTime:"+startTime);
            if(sendData.lastSent !== undefined){
                infoLog(4,"Time between sending buffers:"+ (sendTime-sendData.lastSent));
            }
            infoLog(5,"Buffer size :"+ arrayBuffer.byteLength);
            sendData.lastSent =  sendTime;
        }
        function onWorkerData(arrayBuffer){
            connection.send(arrayBuffer);
            setSentData(arrayBuffer);
            //var bufferData = new AudioArrayBuffer(arrayBuffer);
            //infoLog(1, "Sending buffer index:"+ bufferData.index);
        }
        function onConnectionData(arrayBuffer){
            voipPlayer.addArrayBuffer(arrayBuffer);
        }
        function getLevelDiv(){
            function setMaxs(levels){
                var
                    leftString, _clearTimeouts = false
                ;
                if(maxs[0] <= levels[0]){
                    maxs[0] = levels[0];
                    leftString = "calc("+ Math.floor( maxs[0] )+"% - 2px)";
                    maxLevel0_div.style.left = leftString;
                    _clearTimeouts = true;
                }
                if(maxs[1] <= levels[1]){
                    maxs[1] = levels[1];
                    leftString = "calc("+ Math.floor( maxs[1] )+"% - 2px)";
                    maxLevel1_div.style.left = leftString;
                    _clearTimeouts = true;
                }
                if(_clearTimeouts){
                    clearTimeout( maxResetTimeoutId );
                    maxResetTimeoutId = setTimeout(resetMaxs, 250);
                }                   
            }
            function setLevels(values){
                clearTimeout(levelResetTimeoutId, 0);
                var
                    widthString,
                    level
                ;
                levels = [
                    Math.max(0, Math.min(100, values[0])),
                    Math.max(0, Math.min(100, values[1])),
                ];
                level = Math.floor(levels[0]);
                widthString = "calc( "+level+"% - 4px )";
                currentLevel0_div.style.width = widthString;
                
                level = Math.floor(levels[1]);
                widthString = "calc( "+level+"% - 4px )";
                currentLevel1_div.style.width = widthString;
                
                setMaxs(levels);
                levelResetTimeoutId = setTimeout(resetLevels, 250);
            }
            function resetMaxs(){
                maxs = [0,0];
                setMaxs(levels);
            }
            function resetLevels(){
                setLevels([0,0]);
                clearTimeout(levelResetTimeoutId, 0);
            }
            
            var
                audioContextLevelNode = new AudioContextLevelNode(audioContext),
                level_div = document.createElement("div"),
                channel0_div, channel1_div,
                currentLevel0_div, maxLevel0_div,
                currentLevel1_div, maxLevel1_div,
                levels = [0,0],
                maxs = [0,0],
                maxResetTimeoutId,
                levelResetTimeoutId,
                audioNode
            ;
            level_div.className = "level_div";
            level_div.innerHTML =
                "<div class= 'channel_div channel0'>\n"+
                "   <div class= currentLevel_div></div>\n"+
                "   <div class= maxLevel_div></div>\n"+
                "</div>"+
                "<div class= 'channel_div channel1'>\n"+
                "   <div class= currentLevel_div></div>\n"+
                "   <div class= maxLevel_div></div>\n"+
                "</div>"
            ;
            channel0_div = level_div.getElementsByClassName("channel_div")[0];
            currentLevel0_div = channel0_div.getElementsByClassName("currentLevel_div")[0];
            maxLevel0_div = channel0_div.getElementsByClassName("maxLevel_div")[0];
            
            channel1_div = level_div.getElementsByClassName("channel_div")[1];
            currentLevel1_div = channel1_div.getElementsByClassName("currentLevel_div")[0];
            maxLevel1_div = channel1_div.getElementsByClassName("maxLevel_div")[0];
            
            Object.defineProperty (
                level_div,
                "levels",
                {
                    get:function(){return levels;},
                    set:setLevels
                }
            );
            Object.defineProperty (
                level_div,
                "audioNode",
                {
                    get:function(){ return audioNode;},
                    set:function(value){
                        if(audioNode){
                            audioNode.disconnect(audioContextLevelNode.scriptNode);
                        }
                        audioNode = value;
                        audioNode.connect(audioContextLevelNode.scriptNode);
                    }
                }
            );
            Object.defineProperty (
                level_div,
                "audioContextLevelNode",
                {
                    get:function(){ return audioContextLevelNode;},
                    set:function(value){
                        audioContextLevelNode.onLevelData = function(){};
                        audioContextLevelNode = value;
                        audioContextLevelNode.onLevelData = function(levelData){
                            levelData[0]*= 100;
                            levelData[1]*= 100;
                            level_div.levels = levelData;
                        };
                    }
                }
            );
            maxResetTimeoutId = setTimeout(resetMaxs, 250);
            levelResetTimeoutId = setTimeout(resetLevels, 250);
            setLevels([0,0]);
            audioContextLevelNode.onLevelData = function(levelData){
                levelData[0]*= 100;
                levelData[1]*= 100;
                level_div.levels = levelData;
            };
            return level_div;
        }
        function getRecordingLevelDiv(){
            var level_div = getLevelDiv();
            recordingLevelDivs.push(level_div);
            return level_div;
        }
        // ----------- VoipConnection -----------
        function init(){
            // set internal properties ----------------------------
            connection = new WebSocketConnection();
            connection.onData = onConnectionData;
            voipPlayer = new VoipPlayer();
            //worker = getAudioWorker();
            //worker.onmessage = onWorkerMessage;
            recordingLevelDivs = [];
            node = audioContext.createScriptProcessor(audioArrayBufferInfoData.audioBufferSize, 2, 2); // (bufferSize, inputChannels, outputChannels)
            
            var audioprocessTime;
            node.onaudioprocess = function(e) {
                var
                    inputBuffer = e.inputBuffer,
                    bufferData = {
                        channelData:[],
                        startTime:audioContext.currentTime - inputBuffer.duration
                    },
                    channelData,
                    c,
                    time= Date.now()
                ;
                if(audioprocessTime){
                    
                }
                setTimeout(
                    function(){
                        
                        for (c = 0; c < audioArrayBufferInfoData.channelCount; c++) {
                            channelData = e.inputBuffer.getChannelData(c);
                            bufferData.channelData.push(
                                channelData
                            );
                        }
                        /*
                        worker.postMessage(
                            {
                                type:"saveChannelData",
                                data:{ bufferData:bufferData }
                            }
                        );
                        */
                    }, inputBuffer.duration*2/3*1000 // delay is to make sure all of the buffer is collected.
                );
                for (c = 0; c < 2; c++) {
                    e.outputBuffer.copyToChannel(e.inputBuffer.getChannelData(c), c);
                }
                audioprocessTime = time;
            };
            // set external properties ----------------------------
            _this.startBroadcasting = start;
            _this.stopBroadcCasting = stop;
            _this.getRecordingLevelDiv = getRecordingLevelDiv;
            
            Object.defineProperty(
                _this,
                "mediaStream",
                {
                    get:function(){return mediaStream;},
                    set:function(value){
                        if( mediaStream ){
                            node.disconnect();
                        }
                        mediaStream = value;
                    }
                    
                }
            );
            Object.defineProperty(
                _this,
                "scriptNode",
                {
                    get:function(){return node;},
                }
            );
            Object.defineProperty(
                _this,
                "bufferSize",
                {
                    get:function(){return currentBufferSize;},
                    set:function(value){
                        value = Math.max( Math.ceiling(value/4096), 1)* 4096;
                        if(value != currentBufferSize){
                            currentBufferSize = value;
                            worker.postMessage(
                                {
                                    type:"bufferSize",
                                    bufferSize:currentBufferSize
                                }
                            );
                        }
                    }
                }
            );
        }
        var
            _this = this,
            worker,
            node,
            audioContext = VoipConnection.broadcastAudioContext,
            connection,
            // buffer size based on 2 channel and 44100hz
            // min from sample is 4096 -> 44.1 samples/chanel every ms -> 4410-> (93ms) aprox 100ms sample size  93ms
            // 
            currentBufferSize = 1,// aprox 400ms sample buffer size = currentBufferSize*4096,
            voipPlayer,
            mediaStream,
            recordingLevelDivs,
            audioArrayBufferInfoData = {
                channelCount : 1,
                sampleRate : 44100,
                bufferIndex : 0,
                audioBufferSize:4096,
                audioBufferCount:4,
                startTime:0,
                audioContextT0:0
            },
            sendData = {}
        ;
        init();
    }
    VoipConnection.getHeader = function(arraybuffer){
        function getTimeFromInts(int32Array){
            var
                str = "0x"+int32Array[0].toString(16),
                str1 = int32Array[1].toString(16)
            ;
            while(str1.length<8){
                str1 = "0"+str1;
            }
            return Number(str+str1);
        }
        var
            header = {
                length:new Int32Array(arraybuffer, 0, 1)[0],
                index:new Int32Array(arraybuffer, 4, 1)[0]
            },
            sourceTime0 = getTimeFromInts( new Int32Array(arraybuffer, 8, 2) ),
            startTime  = getTimeFromInts( new Int32Array(arraybuffer, 16, 2) )
        ;
        header.sourceTime0 = sourceTime0;
        header.startTime = startTime;
        return header;
    };
    VoipConnection.getMicrophoneStream = function(callback){
        navigator.mediaDevices.getUserMedia({"audio":true})
            .then(
                function(stream){
                    var
                        audioContext =VoipConnection.broadcastAudioContext;
                        mediaStream = audioContext.createMediaStreamSource(stream)
                    ;
                    userAudioSource = mediaStream;
                    setTimeout( ()=>{callback(undefined, mediaStream);}, 0);
                }
            ).catch(function(error){
                setTimeout( ()=>{callback(error);}, 0);
            }
        );
    };
    VoipConnection.getAudioBuffer = function(audioContext, bufferData){
        var
            audioBuffer = audioContext.createBuffer( bufferData.channelCount, bufferData.sampleCount, bufferData.sampleRate)
        ;
        audioBuffer.copyToChannel(bufferData.float32Buffer0, 0);
        audioBuffer.copyToChannel(bufferData.float32Buffer1, 1);
        return audioBuffer;
    };
    VoipConnection.playAudioContext = new AudioContext();
    VoipConnection.broadcastAudioContext = new AudioContext();
    VoipConnection.getBufferData = function(arrayBuffer){
        var
            result = {
                arrayBuffer:arrayBuffer
            },
            uInt32s,
            float32Array,
            bufferIndex = 0
        ;
        // 16 bytes of Uint32s
        //        new Uint32Array(arrayBuffer, bufferIndex, size in Uint32s)
        uInt32s = new Uint32Array(arrayBuffer, bufferIndex, 4);
        result.channelCount    = uInt32s[0];
        result.sampleRate      = uInt32s[1];
        result.bufferDataIndex = uInt32s[2];
        result.bufferSize      = uInt32s[3];
        bufferIndex = 16;
        
        // 8 bytes of Uint16s
        //                 new Float32Array(arrayBuffer, bufferIndex, size in Float32s)
        float32Array     = new Float32Array(arrayBuffer, bufferIndex, 2);
        result.startTime = float32Array[0];
        result.audioContextT0 = float32Array[1];
        bufferIndex += 8;
        
        // 2 float32buffers
        //                      new Float32Array(arrayBuffer, bufferIndex, size in Float32s)
        result.float32Buffer0 = new Float32Array(arrayBuffer, bufferIndex, result.bufferSize * 4096);
        bufferIndex += result.bufferSize * 4096 * 4;
        result.float32Buffer1 = new Float32Array(arrayBuffer, 16 + (result.bufferSize * 4096*4), result.bufferSize * 4096);
        
        result.toString = function(){
            var
                strResult =
                    "bufferData, bufferDataIndex:"+result.bufferDataIndex+", source audioContextT0:"+result.audioContextT0+", startTime:"+result.startTime+", bufferSize:"+(result.bufferSize*4096*4)+", float32Buffer.length:"+result.float32Buffer0.length
            ;
            return strResult;
        };
        return result;
    };
    return VoipConnection;
})(); // Voip = (function(...){})();

})();