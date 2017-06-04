Voip with ppt (Push To Talk)for node.js


Client tested with Firefox.
Node server tested with raspberry Pi 3

- records natively compressed audio through HTML-5's MediaRecorder
- playback is through AudioContext and audioContext.createBufferSource()
- uses fixed audio buffer transfer size and playback buffer size
	(	see /public/voipClient.js
		const defaultAudioBufferSize = 250; // ms, size of the audioBuffer Recorded
	    	const defaultPlaybackBufferSize = 1000;  // ms, size of the playbackBuffer   
		
	 	Quality of service can be improved by dynamically changing these numbers based on 
		network latency 
	)

- external node packages are
	- express   (npm install express --save)
	- websocket ( npm install websocket --save, note: time and date must be correct for this to install)
	- body-parser (npm install express --save)
	- ejs (npm install ejs --save)

- also uses packages created by the author (Kam Heaps)
	- nuf_events (included in /node-modules)
	- nuf_messageing (included in /node-modules)

Thank you for using this code. 
Comments and suggestions are appreciated at Kheaps@gmx.com
