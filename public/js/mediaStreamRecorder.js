

var MediaStreamRecorder = (function Recorder(){
    function log(message){
        console.log(
            "--------------- mediaStreamRecorder.js -------------------\n"+
            message
        );
    }
	function getMediaStreamLevelDiv(){
        function _Worker(){
            function log(message){
                console.log(
                    "--------------- mediaStreamLevelDiv _Worker -------------------\n"+
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
            audioContext = new AudioContext();
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
    function MediaStreamRecorder(){
        function stop(callback){
            function ondataavailable(event){
                callback(event.data);
                recordedData = event.data;
            }
            
            if(state == "recording"){
                mediaRecorder.ondataavailable= ondataavailable;
                mediaRecorder.stop();
                state = "stopped";
            }
        }
        function start(){
            if(mediaStream){
                if(state == "stopped"){
                    state = "recording";
                    recordedData = undefined;
                    mediaRecorder = new MediaRecorder(mediaStream);
                    mediaRecorder.start();
                }
            }else{
                throw "media stream not set";
            }
        }
        
        function init(){
            _this.stopRecording = stop;
            _this.startRecording = start;
            Object.defineProperty(
                _this,
                "mediaStream",
                {
                    get:function(){ return mediaStream;},
                    set:function(value){ mediaStream = value;}
                }
            );
            Object.defineProperty(
                _this,
                "state",
                {
                    get:function(){ return state;}
                }
            );
            Object.defineProperty(
                _this,
                "recordedData",
                {
                    get:function(){ return recordedData;}
                }
            );
        }
        var
            _this = this,
            mediaStream,
            state = "stopped",
            recordedData,
            mediaRecorder
        ;
        init();
    }
	MediaStreamRecorder.getMediaStreamLevelDiv = getMediaStreamLevelDiv;
	MediaStreamRecorder.getMicrophoneStream = function(callback){
        navigator.mediaDevices.getUserMedia({"audio":true})
            .then(
                function(stream){
                    //var
                    //    audioContext =VoipConnection.broadcastAudioContext;
                    //    mediaStream = audioContext.createMediaStreamSource(stream)
                    //;
                    //userAudioSource = mediaStream;
                    setTimeout( ()=>{callback(undefined, stream);}, 0);
                }
            ).catch(function(error){
                setTimeout( ()=>{callback(error);}, 0);
            }
        );
    };
    return MediaStreamRecorder;
})();