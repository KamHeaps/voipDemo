
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
        function getPlayerWorker(){
            function PlayerWorker(){
                function log(message){
                    console.log(
                        "--------------------   VoipPlayer.PlayerWorker   --------------------\n"+
                        message
                    );
                }
                function addArrayBuffer(arrayBuffer){
                    function arrayBufferToBufferData(arrayBuffer){
                        var
                            result = {
                                arrayBuffer:arrayBuffer
                            },
                            floatBufferSize,// in floats => bufferSize in bytes / 4 bytes/float
                            bufferIndex = 0,
                            uInt32s,
                            float32s
                        ;
                        uInt32s = new Uint32Array(arrayBuffer, bufferIndex, 4);
                        result.channelCount    = uInt32s[0];
                        result.sampleRate      = uInt32s[1];
                        result.bufferDataIndex = uInt32s[2];
                        result.bufferSize      = uInt32s[3];
                        bufferIndex += 16;
                        
                        float32s = new Float32Array(arrayBuffer, bufferIndex, 2);
                        result.startTime = float32s[0];
                        result.audioContextT0 = float32s[1];
                        bufferIndex += 8;
                        
                        floatBufferSize = result.bufferSize * 4096 / 4;// in floats => bufferSize in bytes / 4 bytes/float
                        result.float32Buffer0 = new Float32Array(arrayBuffer, bufferIndex, floatBufferSize);
                        bufferIndex += (floatBufferSize * 4);
                        result.float32Buffer1 = new Float32Array(arrayBuffer, bufferIndex, floatBufferSize);
                        return result;                    
                    }
                    var
                        bufferData = arrayBufferToBufferData(arrayBuffer)
                    ;
                    self.postMessage(
                        {
                            type:"bufferData",
                            data:{bufferData:bufferData}
                        }
                    );
                }
                function onMessage(event){
                    var messageObject = event.data;
                    switch(messageObject.type){
                        case "arrayBuffer":
                            addArrayBuffer(messageObject.data.arrayBuffer);
                            break;
                    }
                }
                
                function init(){
                    self.onmessage = onMessage;
                }
                
                init();
            }
            
            var
                workerString = ""+PlayerWorker,
                index0,
                index1,
                blob
            ;
            index0 = workerString.indexOf('{');
            index1 = workerString.lastIndexOf('}');
            workerString = workerString.substring(index0+1, index1-1);
            blob = new Blob([workerString], {type : 'application/javascript'});
            return new Worker( URL.createObjectURL(blob) );
        }
        function addArrayBuffer(arrayBuffer){
            worker.postMessage(
                {
                    type:"arrayBuffer",
                    data:{arrayBuffer:arrayBuffer}
                }
            );
        }
        function getAudioBuffer(bufferData){
            var
                audioBuffer = audioContext.createBuffer( bufferData.channelCount, bufferData.float32Buffer0.length, bufferData.sampleRate)
            ;
            audioBuffer.copyToChannel(bufferData.float32Buffer0, 0);
            audioBuffer.copyToChannel(bufferData.float32Buffer1, 1);
            return audioBuffer;
        }
        function loadBufferData(bufferData){
            function audioBufferEnded(){
                // this is sourceBuffer
                this.disconnect();
            }
            var
                audioBuffer = getAudioBuffer(bufferData),
                sourceBuffer,
                resetPlayerOffset = false,
                time = Date.now(),
                playTime,
                completeTime,
                currentTime = audioContext.currentTime
            ;
            resetPlayerOffset =
                //true ||
                state!= "playing" ||
                bufferData.bufferDataIndex === 0 ||
                bufferData.audioContextT0 != loadData.sourceAdioContextT0 ||
                (time - loadData.resetTime) > (32*1000)
            ;
            if(resetPlayerOffset){
                // playerOffset play now
                // playerOffset + bufferData.startTime = bufferCompletTime
                loadData.bufferCompleteTime =
                    (!loadData.bufferCompleteTime || loadData.bufferCompleteTime < currentTime)?currentTime: loadData.bufferCompleteTime;

                playerOffset = loadData.bufferCompleteTime - bufferData.startTime;
                loadData.sourceAdioContextT0 = bufferData.audioContextT0;
                loadData.resetTime = time;
                state = "playing";
            }
  
            sourceBuffer = audioContext.createBufferSource();
            sourceBuffer.onend = audioBufferEnded;
            sourceBuffer.buffer = audioBuffer;
            sourceBuffer.connect(audioContext.destination);
            playTime = loadData.bufferCompleteTime || playerOffset + bufferData.startTime;
            
            completeTime = playTime+sourceBuffer.buffer.duration;
            sourceBuffer.start(playTime);
            
            infoLog(11, "Current time:" + currentTime  );
            infoLog(12, "BufferDataIndex  :"+ bufferData.bufferDataIndex );
            infoLog(13, "ResetPlayerOffset:"+  resetPlayerOffset  );
            infoLog(14, "Playing   @ :" + playTime  );
            infoLog(15, "Last ends @ :" + loadData.bufferCompleteTime);
            infoLog(16, "playerOffset:" + playerOffset  );
            infoLog(17, "Buffer Size(seconds) :"+ sourceBuffer.buffer.duration);
            infoLog(18, "CompleteTime(seconds):"+ completeTime);
            
            infoLog(19, "Source audioContextT0:"+bufferData.audioContextT0 );
            infoLog(20, "bufferSize:"+bufferData.bufferSize+" * 4096 = "+ (bufferData.bufferSize * 4096)+" bytes => "+ (bufferData.bufferSize * 4096 * 0.000005669)+" seconds");
            
            if(loadData.lastBufferLoaded){
                var timeBetweenBuffers = (time-loadData.lastBufferLoaded)/1000;
                infoLog(21, "Time between buffers:"+ timeBetweenBuffers+" seconds" );
                var latency = timeBetweenBuffers - sourceBuffer.buffer.duration;
                infoLog(22, "Latency:"+ latency +" seconds");
            }
            if(playTime < audioContext.currentTime){
                infoLog(23, "Late Buffer! index:"+ bufferData.index+"\t, by "+(audioContext.currentTime-playTime)+" seconds" );
                if( (playTime + sourceBuffer.buffer.duration) <  audioContext.currentTime){
                    infoLog(24, "Missed entire buffer! index:"+ bufferData.index+" seconds" );
                }
            }
            if(bufferData.bufferDataIndex != (loadData.lastBufferIndex +1 ) ){
                infoLog(25, "Recieved buffer out of order, recieved index:"+bufferData.bufferDataIndex+" expected:"+(loadData.lastBufferIndex+1));
            }
            loadData.lastBufferLoaded = time;
            loadData.lastBufferIndex = bufferData.bufferDataIndex;
            loadData.bufferCompleteTime = completeTime;
        }
        function onWorkerMessage(event){
            var messageObject = event.data;
            switch(messageObject.type){
                case "bufferData":
                    loadBufferData(messageObject.data.bufferData);
                    break;
            }
        }
        
        function init(){
            // internal properties
            audioContext = VoipConnection.audioContext;
            audioContextLevelNode = new AudioContextLevelNode();
            audioContextLevelNode.scriptNode.connect(audioContext.destination);
            worker = getPlayerWorker();
            worker.onmessage = onWorkerMessage;
            audioContext = VoipConnection.audioContext;
            // external properties  
            _this.addArrayBuffer = addArrayBuffer;
            state = "stopped";
            Object.defineProperty(
                _this,
                "audioContextLevelNode",
                {
                    get:function(){return audioContextLevelNode;}
                }
            );
            loadData = {};
        }
        var
            _this = this,
            worker,
            audioContext,
            playerOffset,
            state,
            audioContextLevelNode,
            loadData
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
                //log('WebSocket Closed '+arg);
            };
            webSocket.onmessage = function(e) {
                onData(e.data);
            };
        }
        var sendTime;
        function send(arrayBuffer){
            // test delay
            var delay = Math.floor(250 * Math.random() );
            setTimeout(
                function(){
                    var time  = Date.now();
                    if(sendTime){
                        infoLog(04, "Time between sending buffers:"+ ((time - sendTime)/1000) +" seconds");
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
    function BroadcastAudioWorker(){
        function log(message){
            console.log(
                "------------  AudioWorker ------------\n"+
                message
            );
        }
        function getNewBufferData(startTime){
            
            var
                floatArrayDataBufferSize = bufferSize*4096/4, // samples of floats bufferSize in bytes/ 4 bytes per float
                arrayBufferLength =
                    // 16 bytes of Uint32s
                    4 + // bytes for channel count
                    4 + // bytes for sampleRate
                    4 + // bytes for the buffer index
                    4 + // bytes for the buffersize value ,  value * 4096 = buffersize
                    
                    // 8 bytes of Float32s
                    4 + // bytes of the start time,
                    4 + // source audioContext startTime time bytes of the start time, audioContextT0,
                    
                    // float Buffers
                    (2 * floatArrayDataBufferSize * 4), // bytes for 2 channels * bufferSize value * 4096 * 4 bytes per float32
                bufferData = {
                    index : 0,
                    arrayBuffer : new ArrayBuffer( arrayBufferLength )
                },
                bufferIndex = 0
            ;
            if(audioContextT0 === undefined){
                audioContextT0 = startTime;
                bufferDataIndex =0;
            }
            
            // 12 bytes of Uint8s
            bufferData.header = new Uint32Array(bufferData.arrayBuffer, bufferIndex , 4);
            bufferData.header[0] = 2;// channel count
            bufferData.header[1] = 44100;// samplerate
            bufferData.header[2] = bufferDataIndex++;// bufferDataIndex
            bufferData.header[3] = bufferSize;// bufferSize
            bufferIndex += 16;
            
            // 8 bytes of Float32s
            //                         new Float32Array( arraybuffer, offsets in bytes, length in floats)
            bufferData.float32Buffer = new Float32Array(bufferData.arrayBuffer, bufferIndex, 2);
            bufferData.float32Buffer[0] = startTime;
            bufferData.float32Buffer[1] = audioContextT0;
            bufferIndex += 8;
            
            bufferData.float32Buffer0 = new Float32Array(bufferData.arrayBuffer, bufferIndex, floatArrayDataBufferSize  );
            bufferIndex += (floatArrayDataBufferSize * 4);
            bufferData.float32Buffer1 = new Float32Array(bufferData.arrayBuffer, bufferIndex, floatArrayDataBufferSize );
            return bufferData;
        }
        
        function saveChannelData(bufferData){
            if(!currentBuffer){
                currentBuffer = getNewBufferData(bufferData.startTime);
            }
            currentBuffer.float32Buffer0.set(bufferData.channelData[0], currentBuffer.index);
            currentBuffer.float32Buffer1.set(bufferData.channelData[1], currentBuffer.index);
            currentBuffer.index += bufferData.channelData[0].length;
            if(currentBuffer.index >= currentBuffer.float32Buffer0.length ){
                completeBuffer = currentBuffer;
                currentBuffer = getNewBufferData(bufferData.startTime);
                sendBuffer(completeBuffer);
            }
        }
        function sendBuffer(bufferData){
            if(bufferData){
                self.postMessage(
                    {
                        type:"bufferData",
                        data:{ arrayBuffer:bufferData.arrayBuffer }
                    }
                );
            }
        }
        function start(){
            state = "started";
        }
        function stop(){
            state = "stopped";
            sendBuffers();
        }
        function onMessage(e){
            var messageObject = e.data;
            switch (messageObject.type) {
                case "saveChannelData":
                    saveChannelData(messageObject.data.bufferData);
                    break;
                case "bufferData":
                    _this.bufferSize = messageObject.data.bufferSize;
                    break;
                case "start":
                    start();
                    break;
                case "stop":
                    stop();
                    break;
            }
        }
        
        function  init(){
            self.onmessage = onMessage;
        }
        var
            bufferSize = 32,
            state = "stopped",
            currentBuffer,
            completeBuffer,
            audioContextT0,
            bufferDataIndex = 0
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
            audioContext = VoipConnection.audioContext;
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
    function VoipConnection(){
        function getAudioWorker(){
            var
                workerString = ""+BroadcastAudioWorker,
                index0,
                index1,
                blob
            ;
            index0 = workerString.indexOf('{');
            index1 = workerString.lastIndexOf('}');
            workerString = workerString.substring(index0+1, index1-1);
            blob = new Blob([workerString], {type : 'application/javascript'});
            return new Worker( URL.createObjectURL(blob) );
        }
        function onWorkerMessage(event){
             var
                messageObject = event.data
            ;
            switch(messageObject.type){
                case  "bufferData":
                     // buffer is [l,r,l,r....]
                    onWorkerData(messageObject.data.arrayBuffer);
                    break;
            }
        }
        function start(){
            if(node){
                node.disconnect();
            }
            if(mediaStream){
                mediaStream.connect(node);
                //node.connect(audioContext.destination);
                for(var i=0; i< recordingLevelDivs.length; i++){
                    recordingLevelDivs[0].audioNode = node;
                }
            }
        }
        function stop(){
            node.disconnect();
            node = undefined;
        }
        function onWorkerData(arrayBuffer){
            connection.send(arrayBuffer);
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
        function getPlaybackLevelDiv(){
            var level_div = getLevelDiv();
            level_div.audioContextLevelNode = voipPlayer.audioContextLevelNode;
            level_div.audioNode = VoipConnection.audioContext.destination;
            return level_div;
        }
        
        // ----------- VoipConnection -----------
        function init(){
            // set internal properties ----------------------------
            connection = new WebSocketConnection();
            connection.onData = onConnectionData;
            voipPlayer = new VoipPlayer();
            worker = getAudioWorker();
            worker.onmessage = onWorkerMessage;
            recordingLevelDivs = [];
            node = audioContext.createScriptProcessor(4096, 2, 2); // (bufferSize, inputChannels, outputChannels)
            var audioprocessTime;
            node.onaudioprocess = function(e) {
                var
                    bufferData = {
                        channelData:[],
                        startTime:this.context.currentTime
                    },
                    channelData,
                    c,
                    time= Date.now()
                ;
                if(audioprocessTime){
                    infoLog(1, "Time between audioprocess:"+ ((time - audioprocessTime)/1000 )+" seconds.");
                }
                for (c = 0; c < 2; c++) {
                    channelData = e.inputBuffer.getChannelData(c);
                    bufferData.channelData.push(
                        channelData
                    );
                    e.outputBuffer.copyToChannel(channelData, c);
                }
                worker.postMessage(
                    {
                        type:"saveChannelData",
                        data:{ bufferData:bufferData }
                    }
                );
                audioprocessTime = time;
            };

            // set external properties ----------------------------
            _this.startBroadcasting = start;
            _this.stopBroadcCasting = stop;
            
            _this.getRecordingLevelDiv = getRecordingLevelDiv;
            _this.getPlaybackLevelDiv  = getPlaybackLevelDiv;
            
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
                                    type:"setBufferSize",
                                    data:{ bufferSize:currentBufferSize }
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
            audioContext = VoipConnection.audioContext,
            connection,
            // buffer size based on 2 channel and 44100hz
            // min from sample is 4096 -> 44.1 samples/chanel every ms -> 4410-> (93ms) aprox 100ms sample size  93ms
            // 
            currentBufferSize = 4,// aprox 400ms sample buffer size = currentBufferSize*4096,
            voipPlayer,
            mediaStream,
            recordingLevelDivs
        ;
        init();
    }
    VoipConnection.getMicrophoneStream = function(callback){
        navigator.mediaDevices.getUserMedia({"audio":true})
            .then(
                function(stream){
                    var
                        audioCtx = VoipConnection.audioContext;
                        mediaStream = audioCtx.createMediaStreamSource(stream)
                    ;
                    userAudioSource = mediaStream;
                    setTimeout( ()=>{callback(undefined, mediaStream);}, 0);
                }
            ).catch(function(error){
                setTimeout( ()=>{callback(error);}, 0);
            }
        );
    };
    VoipConnection.getAudioBuffer = function(bufferData){
        var
            audioContext = VoipConnection.audioContext,
            audioBuffer = audioContext.createBuffer( bufferData.channelCount, bufferData.sampleCount, bufferData.sampleRate)
        ;
        audioBuffer.copyToChannel(bufferData.float32Buffer0, 0);
        audioBuffer.copyToChannel(bufferData.float32Buffer1, 1);
        return audioBuffer;
    };
    VoipConnection.audioContext = new AudioContext();
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