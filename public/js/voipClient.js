
function infoLog(index, message){
    infoLabels[index].innerHTML = message;
}
var VoipConnection;
(function(){
function log(message){
    console.log("-----------------------   voip.js   -----------------------\n"+message);
}

VoipConnection = (function(){
    const defaultAudioBufferSize = 250; // ms, size of the audioBuffer Recorded
    const defaultPlaybackBufferSize = 1000;  // ms, size of the playbackBuffer  
    
    
    function VoipPlayer(){
        function setReceivedData(header, arrayBuffer, audioBuffer){
            var
                receivedTime = Date.now(),
                sourceT0 = new Date(header.sourceTime0),
                startTime = new Date(header.startTime)
            ;
            infoLog(11,"audioContext.currentTime:"+audioContext.currentTime);
            infoLog(12,"Index:"+header.index);
            infoLog(13,"Source T0:"+sourceT0);
            infoLog(14,"startTime:"+startTime);
            infoLog(15,"startTime in ms:"+(header.startTime - header.sourceTime0)+ "ms.");
            infoLog(16,"Time between recieved buffers:"+ (receivedTime-receivedData.lastReceived) +" ms");
            infoLog(17,"Audio package size:"+ arrayBuffer.byteLength +"bytes, "+(audioBuffer.duration * 1000) +" ms");
            infoLog(18,"Time between recieves:"+ (receivedTime-receivedData.lastReceived) +" ms");
            infoLog(29,"contextData.defaultBufferTime:"+ (contextData.defaultBufferTime/1000) +" sec.");
            receivedData.lastReceived =  receivedTime;
        }
        function addToAudioContectBuffer(header,buffer){
            function setSource(){
                
                source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(playtime);
            }
            function playNow(){
                playtime = currentTime + (contextData.defaultBufferTime/1000);
                contextData.sourceTime0 = header.sourceTime0;
                contextData.playOffset = playtime - (header.startTime/1000) ;
            }
            
            //  source start time
            //  |----------
            //       source playtime
			//        |--------------
            //
            //              Received buffer                Play buffer
			//						|--------  200ms ------------|
            //
			//						Buffer 0 or reset
			//						playTime0 = Now() + 200ms
			//						or
			//						sourcePlayTime  + playOffset = playTime
			//						sourcePlayTime0 + playOffset = playTime0 => playOffset = playTime0 - sourcePlayTime0
            var
                playtime,
                currentTime = audioContext.currentTime,
                source,
                completeTime,
                playNextTime,
                playScheduledTime,
                bufferedTime = contextData.lastCompleteTime - currentTime
            ;
            // three options for setting start time
            // - playNow
            //      play asap, i.e. current time + bufferTIme
            //      also resets contextData.sourceTime0, and contextData.playOffset
            // - playNext
            //      play when last buffer is complete
            // - playScheduled
            //      caculate when it should be played from its start time
            
            // display calcs
            playNextTime = contextData.lastCompleteTime;
            playScheduledTime = (header.startTime/1000) + contextData.playOffset;
            infoLog(20,"playNextTime:"+ playNextTime+",\tplayScheduledTime:"+playScheduledTime+",\t difference:"+(playNextTime - playScheduledTime) );
            infoLog(21,"last complete time :"+ (contextData.lastCompleteTime) );
            infoLog(22,"buffered time :"+ (bufferedTime ) );
            if(header.index === 0 || header.sourceTime0 != contextData.sourceTime0 ){
                playNow();
            }else{
                
                if(header.index == contextData.lastIndex+1){
                    if( bufferedTime < (contextData.defaultBufferTime/4000) ){
                        infoLog(23, "lost buffer, "+bufferedTime+" < "+(contextData.defaultBufferTime/4000)+" resetting time on index:"+header.index);
                        playNow();
                    }else{
                        infoLog(24, "using playNext time, "+playNextTime+" on index:"+header.index);
                        playtime = playNextTime;
                    }
                }
                else{
                    infoLog(25, "using playScheduledTime time, "+playScheduledTime+" on index:"+header.index);
                    playtime = playScheduledTime;
                }
            }
            completeTime = playtime +buffer.duration;
            infoLog(26,"Playtime:"+ playtime+" buffer.duration:"+ buffer.duration);
            if(currentTime < completeTime){
                setSource();
            }else{
                infoLog(27,"Buffer dropped, index:"+ header.index +" currentTime:"+currentTime+ " completeTime:"+completeTime );
            }
            contextData.lastIndex = header.index;
            contextData.lastCompleteTime = playtime + buffer.duration;
            contextData.currentBuffer =  (contextData.lastCompleteTime - currentTime);
            infoLog(28,"new buffer time:"+ contextData.currentBuffer +" sec.");
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
                body = arrayBuffer.slice(header.length*4,arrayBuffer.byteSize)
                //decodeT0 = Date.now()
            ;
            // decode data
            audioContext.decodeAudioData(body, function(buffer) {
                addToAudioContectBuffer(header,buffer );
                setReceivedData(header, arrayBuffer, buffer);
                //log("decode time:"+ (Date.now() - decodeT0));
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
            receivedData ={},
            contextData = {
                defaultBufferTime : defaultPlaybackBufferSize// ms
            }
        ;
        init();
    }
    function WebSocketConnection(){
        function connectToServer(){
            var
                url = "ws://"+location.host+"/data/"+messageingObject.clientId
            ;
            log("connectToServer:\n"+url);
            webSocket = new WebSocket(url, "echo-protocol");
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
                        sourceT0:timeToInts(headerData.sourceT0 || (headerData.sourceT0 = Date.now()) ),
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
                setTimeout(  intervalTimeout, bufferInterval );
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
                startTime: 0
            };
            _this.onData = onData;
            _this.start = start;
            Object.defineProperty(
                _this,
                "bufferInterval", // buffer interval in ms 
                {
                    get:function(){ return bufferInterval;},
                    set:function(value){ bufferInterval = Math.max(value, 1);}
                }
            );
        }
        var
            _this = this,
            headerData,
            bufferInterval = defaultAudioBufferSize
        ;
        init();
        
    }
    function getMediaStreamLevelDiv(){
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
        function onWorkerMessage(e){
            var
                messageObject = e.data,
                levels
            ;
            switch(messageObject.type){
                case "leveData":
                    levels = [messageObject.data[0]*100,messageObject.data[0]*100 ];
                    setLevels(levels);
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
        
        function init(){
            var
                worker =  new Worker(getWorkerFunctionUrl())
            ;
            // set internal properties
            audioContext = VoipConnection.broadcastAudioContext;
            worker.onmessage = onWorkerMessage;
            scriptNode = audioContext.createScriptProcessor(4096, 2, 2); // (bufferSize, inputChannels, outputChannels)
            scriptNode.onaudioprocess = function(e) {
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
            // mediaStreamLevelDiv init
            mediaStreamLevelDiv = document.createElement("div");
            mediaStreamLevelDiv.className = "level_div";
            mediaStreamLevelDiv.innerHTML =
                "<div class= 'channel_div channel0'>\n"+
                "   <div class= currentLevel_div></div>\n"+
                "   <div class= maxLevel_div></div>\n"+
                "</div>"+
                "<div class= 'channel_div channel1'>\n"+
                "   <div class= currentLevel_div></div>\n"+
                "   <div class= maxLevel_div></div>\n"+
                "</div>"
            ;
            channel0_div = mediaStreamLevelDiv.getElementsByClassName("channel_div")[0];
            currentLevel0_div = channel0_div.getElementsByClassName("currentLevel_div")[0];
            maxLevel0_div = channel0_div.getElementsByClassName("maxLevel_div")[0];
            
            channel1_div = mediaStreamLevelDiv.getElementsByClassName("channel_div")[1];
            currentLevel1_div = channel1_div.getElementsByClassName("currentLevel_div")[0];
            maxLevel1_div = channel1_div.getElementsByClassName("maxLevel_div")[0];
            
            maxResetTimeoutId = setTimeout(resetMaxs, 250);
            levelResetTimeoutId = setTimeout(resetLevels, 250);
            setLevels([0,0]);
            
            // -----------------------------------------------------------------------------
            Object.defineProperty (
                mediaStreamLevelDiv,
                "levels",
                {
                    get:function(){return levels;},
                    set:setLevels
                }
            );
            Object.defineProperty(
                mediaStreamLevelDiv,
                "audioContext",
                {
                    get:function(){return audioContext;}
                }
            );
            Object.defineProperty(
                mediaStreamLevelDiv,
                "scriptNode",
                {
                    get:function(){return scriptNode;}
                }
            );
            Object.defineProperty(
                mediaStreamLevelDiv,
                "mediaStream",
                {
                    get:function(){return mediaStream;},
                    set:function(value){
                        if(mediaStreamSource){
                            mediaStreamSource.disconnect(scriptNode);
                        }
                        mediaStream = value;
                        mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
                        mediaStreamSource.connect(scriptNode);
                    }
                }
            );
        }
        var
            audioContext,
            scriptNode,
            mediaStreamLevelDiv,
            mediaStream,
            mediaStreamSource,
            // html elements
            channel0_div, channel1_div,
            currentLevel0_div, maxLevel0_div,
            currentLevel1_div, maxLevel1_div,
            // level data    
            levels = [0,0],
            maxs = [0,0],
            // timeoutIds
            maxResetTimeoutId,
            levelResetTimeoutId
        ;
        init();
        return mediaStreamLevelDiv;
    }
    function VoipConnection(){
        function start(){
            if(mediaStream){
                var mediaStreamRecorder = new MediaStreamRecorder(mediaStream);
                mediaStreamRecorder.onData = onStreamData;
                mediaStreamRecorder.start();
            }
        }
        function setSentData(arrayBuffer){
            // display info about data sent
            var
                header = VoipConnection.getHeader(arrayBuffer),
                body = arrayBuffer.slice(header.length*4, arrayBuffer.byteSize),
                sourceT0 = new Date(header.sourceTime0),
                startTime = new Date(header.startTime),
                sendTime = Date.now(),
                intervalTime = sendTime-sendData.lastSent
            ;
            
            infoLog(1,"Index:"+header.index);
            infoLog(2,"Source T0:"+sourceT0);
            infoLog(3,"startTime:"+startTime);
            if(sendData.lastSent !== undefined){
                infoLog(4,"Time between sending buffers:"+ intervalTime);
            }
            infoLog(5,"Buffer size :"+ arrayBuffer.byteLength);
            VoipConnection.broadcastAudioContext.decodeAudioData(body, function(buffer) {
                infoLog(6,"Buffer size :"+ (buffer.duration*1000)+" ms");
                infoLog(7,"Send latency:"+ (intervalTime - (buffer.duration*1000))+" ms");
            });
            
            sendData.lastSent =  sendTime;
        }
        function onStreamData(arrayBuffer){
            // receivced data from stream
            connection.send(arrayBuffer);
            setSentData(arrayBuffer);
            //var bufferData = new AudioArrayBuffer(arrayBuffer);
            //infoLog(1, "Sending buffer index:"+ bufferData.index);
        }
        function onConnectionData(arrayBuffer){
            // receivced data connection
            voipPlayer.addArrayBuffer(arrayBuffer);
        }
        // ----------- VoipConnection -----------
        function init(){
            // set internal properties ----------------------------
            //var audioprocessTime;
            connection = new WebSocketConnection();
            connection.onData = onConnectionData;
            voipPlayer = new VoipPlayer();
            
            // set external properties ----------------------------
            _this.startBroadcasting = start;
            _this.stopBroadcasting = stop;
            Object.defineProperty(
                _this,
                "mediaStream",
                {
                    get:function(){return mediaStream;},
                    set:function(value){
                        mediaStream = value;
                    }
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
            connection,
            voipPlayer,
            mediaStream,
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
    
    VoipConnection.playAudioContext = new AudioContext();
    VoipConnection.broadcastAudioContext = new AudioContext();
    VoipConnection.getMediaStreamLevelDiv = getMediaStreamLevelDiv;
    return VoipConnection;
})(); // VoipConnection = (function(...){})();

})();
