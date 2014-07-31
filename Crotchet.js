/*
* CrotchetJS
* Author: Javier Sánchez Riquelme  
* Author webkitGetUserMediaite: http://javiersr.com
* 
*/

var CROTCHET = { REVISION: '1' };

navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
	window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function( callback ){
		window.setTimeout(callback, 1000 / 60);
	};
})();

CROTCHET.update=function(){};

CROTCHET.mainGain = null;

CROTCHET.setGlobalVolume = function(val){
	if(val>=0)
		CROTCHET.mainGain.gain.value=val/100;	
	else console.log("Error on setGlobalVolume, invalid value");
};

CROTCHET.connections = new Array();
CROTCHET.root = 0;


CROTCHET.mediaNodes = new Array();

//INIT AUDIO CONTEXT FUNCTION

CROTCHET.initContext = function(){

	var createContext = (window.AudioContext ||
		window.webkitAudioContext || 
		window.mozAudioContext || 
		window.oAudioContext || 
		window.msAudioContext);

	if(createContext){
		CROTCHET.context = new createContext();
		CROTCHET.root = new CROTCHET.Node(null, null);
	}

	else 
		alert("Your browser cannot use Audio API so this site will not work correctly for you.");

}


//NODE BASIC CLASS

CROTCHET.Node = function(node, input){
	this.node = node;
	this.connections = new Array();
	this.connectedTo = input;
};

CROTCHET.Node.prototype = {
	connectNode: function(con){
		this.node.connect(con.node);
		this.connections.push(con);

	},

	setOut: function(out){

		if(this.connections!=null&&this.connections.length>0){
			this.connections[0].setOut(out);
		}

		else{
			if(CROTCHET.mainGain==null){
				CROTCHET.mainGain = CROTCHET.context.createGain();
			}
			this.node.connect(CROTCHET.mainGain);
			CROTCHET.mainGain.connect(out);
		}
	}
}


//MEDIA NODE CLASS (MP3, WAV, ...)

CROTCHET.MediaNode = function(node, input){
	this.base = CROTCHET.Node;
	this.base(node,input);
	this.loaded = false;
	this.name = null;
	this.played = false;
	this.changeSpeed = function(val){
		if(val>0)
			this.node.playbackRate.value = val/100;	
		else console.log("Speed cannot be negative set a value greater than 0");
	}
	this.setLoopable = function(bool, startSecs, endSecs){
		this.node.loop = false;
		if(startSecs!=undefined&&startSecs!=null&&endSecs!=undefined&&endSecs!=null&&startSecs>=0&&endSecs>=0){
			this.node.loopStart = startSecs;
			this.node.loopEnd = endSecs;	
		}
	}

	this.onEnd = function(callback){
		this.node.onended=callback;
	}
}

CROTCHET.MediaNode.prototype = new CROTCHET.Node;


//ANALYSIS NODE CLASstartSecs!=undefined&&startSecs!=null&&S

CROTCHET.AnalyserNode = function(node, input){
	this.base = CROTCHET.Node;
	this.base(node,input);

	this.setFftSize = function(fftSize){
		if(fftSize!=undefined&&fftSize!=null){
			if(fftSize%2==0)
				this.node.fftSize = fftSize;
			else console.log("Error in fftSize in setFftSize(fftSize)");
		}
	};
	this.getByteSpectrum = function(minDb,maxDb){
		if(minDb!=undefined&&minDb!=null&&maxDb!=undefined&&maxDb!=null){
			this.node.maxDecibels = maxDb;
			this.node.minDecibels = minDb;
		}

		var frequencyData = new Uint8Array(this.node.frequencyBinCount);
		this.node.getByteFrequencyData(frequencyData);
		return frequencyData;
	};
	this.getFloatSpectrum = function(){
		var frequencyData = new Float32Array(this.node.frequencyBinCount);
		this.node.getFloatFrequencyData(frequencyData);
		return frequencyData;
	};
	this.getFloatWaveform= function(){
		var frequencyData = new Float32Array(this.node.frequencyBinCount);
		this.node.getFloatTimeDomainData(frequencyData);
		return frequencyData;
	};

	this.getByteWaveform = function(minDb,maxDb){
		if(minDb!=undefined&&minDb!=null&&maxDb!=undefined&&maxDb!=null){
			this.node.maxDecibels = maxDb;
			this.node.minDecibels = minDb;
		}

		var frequencyData = new Uint8Array(this.node.frequencyBinCount);
		this.node.getByteTimeDomainData(frequencyData);
		return frequencyData;
	}

}

CROTCHET.AnalyserNode.prototype = new CROTCHET.Node;

CROTCHET.createAnalyser = function(fftSize){

	var analyser = CROTCHET.context.createAnalyser();

	if(fftSize!=undefined&&fftSize!=null){
		if(fftSize%2==0)
			analyser.fftSize = fftSize;
		else console.log("Error in fftSize in createAnalyser(fftSize)");
	}

	var a = new CROTCHET.AnalyserNode(analyser, null);
	return a;
}

//FILTER NODE CLASS

CROTCHET.FilterNode = function(node, input){

	this.base = CROTCHET.Node;
	this.base(node,input);

	this.setQ = function(val){
		if(val>0 && val<=1000)
			this.node.Q.value=val;
	};

	this.setGain = function(val){
		if(val>=-40&&val<=40)
			this.filter.gain.value=val;
	};
	this.setType = function(val){

		switch(val.toUpperCase()){

			case "NOTCH": this.node.type= "notch";
			break;

			case "LOWPASS": this.node.type= "lowpass"
			break;

			case "HIGHPASS": this.node.type= "highpass";
			break;

			case "BANDPASS": this.node.type= "bandpass";
			break;

			case "ALLPASS": this.node.type= "allpass";
			break;

			case "HIGHSELF": this.node.type= "highself";
			break;

			case "LOWSHELF": this.node.type= "lowshelf";
			break;

			case "PEAKING": this.node.type= "peaking";
			break;

		}
	};
}

CROTCHET.FilterNode.prototype = new CROTCHET.Node;

CROTCHET.createFilter = function(type, frequency, q, gain){

	var filter = CROTCHET.context.createBiquadFilter();

	switch(type.toUpperCase()){

		case "NOTCH": filter.type= filter.NOTCH;
		break;

		case "LOWPASS": filter.type= filter.LOWPASS;
		break;

		case "HIGHPASS": filter.type= filter.HIGHPASS;
		break;

		case "BANDPASS": filter.type= filter.BANDPASS;
		break;

		case "ALLPASS": filter.type= filter.ALLPASS;
		break;

		case "HIGHSELF": filter.type= filter.HIGHSELF;
		break;

		case "LOWSHELF": filter.type= filter.LOWSHELF;
		break;

		case "PEAKING": filter.type= filter.PEAKING;
		break;
	}

	filter.frequency.value = frequency;
	filter.Q.value = q;
	filter.gain.value = gain;

	var f = new CROTCHET.FilterNode(filter, null);
	return f;
}


//OSCILLATOR NODE CLASS

CROTCHET.OscillatorNode = function(node, input){
	this.base = CROTCHET.Node;
	this.base(node,input);
	this.connected=false;

	this.start = function(time){
		if(!this.connected){
			this.setOut(CROTCHET.context.destination);
		}
		if(time!=undefined&&time!=null)
			this.node.start(time);
		else this.node.start(0);
	};
	this.stop = function(time){
		if(time!=undefined&&time!=null)
			this.node.stop(time);
		else this.node.stop(0);
	};
	this.setFrequency = function(frec){
		this.node.frequency.value=frec;
	};
	this.setType = function(type){
		switch(type.toLowerCase()){
		case "square": this.node.type = "square";
		break;
		case "line": this.node.type = "line";
		break;
		case "triangle": this.node.type = "triangle";
		break;
		case "sawtooth": this.node.type = "sawtooth";
		break;
		case "custom": this.node.type = "custom";
		break;
	}

	if(type.toUpperCase()=="CUSTOM"){
		//...
	}

	}
	this.detune = function(val){
		this.node.detune.value=val;
	};
}

CROTCHET.OscillatorNode.prototype = new CROTCHET.Node;

CROTCHET.createOscillator = function(frec, type, custom){

	var oscillator = CROTCHET.context.createOscillator();
	oscillator.frequency.value = frec;
	switch(type.toUpperCase()){
		case "SQUARE": oscillator.type = oscillator.SQUARE;
		break;
		case "SINE": oscillator.type = oscillator.SQUARE;
		break;
		case "TRIANGLE": oscillator.type = oscillator.SQUARE;
		break;
		case "SAWTOOTH": oscillator.type = oscillator.SAWTOOTH;
		break;
		case "CUSTOM": oscillator.type = oscillator.CUSTOM;
		break;
	}
	oscillator.type=type;
	if(type=="custom"){

	}

	var o = new CROTCHET.OscillatorNode(oscillator,null);
	return o;
}


//GAIN NODE CLASS 

CROTCHET.GainNode = function(node, input){
	this.base = CROTCHET.Node;
	this.base(node,input);
	this.setGain = function(val){
		this.node.gain.value=val/100;
	};
}

CROTCHET.GainNode.prototype = new CROTCHET.Node;

CROTCHET.createGain = function(val){

	var gain = CROTCHET.context.createGain();
	if(val!=undefined&&val!=null)
		gain.gain.value = val/100;
	else gain.gain.value=1;

	var g = new CROTCHET.GainNode(gain, null);
	return g;
}

//END NODE CLASSES

//MICROPHONE OBJECt

CROTCHET.microphoneObject = new function(){};

CROTCHET.microphoneObject.initMicro = function() {
	navigator.getUserMedia({audio: true},
		this.onStream.bind(this),
		this.onStreamError.bind(this));
};

CROTCHET.microphoneObject.addConnections = function(connection){
	if(typeof connection == Array)
		this.conns = connection;
	else{
		this.conns = new Array();
		this.conns.push(connection);
	}
}

CROTCHET.microphoneObject.start = function(inputs) {
	navigator.getUserMedia({audio: true},
		this.onStream.bind(this),
		this.onStreamError.bind(this));

	this.addConnections(inputs);

}; 

CROTCHET.microphoneObject.onStream = function(stream) {
	var input = CROTCHET.context.createMediaStreamSource(stream);
	CROTCHET.start(input,this);
}

CROTCHET.microphoneObject.onStreamError = function(e) {
	console.error('Error getting microphone', e);
};

CROTCHET.startMicrophone = function(conn){
	var micro = CROTCHET.microphoneObject;
	if(conn!=null&&conn!=undefined)
		micro.addConnections(conn);
	micro.initMicro();
}

CROTCHET.start = function(input,microObject){
	var m = new CROTCHET.Node(input,CROTCHET.root);
	if(microObject.conns != null&&microObject.conns!=undefined){
		for(var i=0;i<microObject.conns.length;i++){
			m.connectNode(microObject.conns[i]);
		}
	}
	var out = CROTCHET.context.destination;
	m.setOut(out);
}


CROTCHET.BufferLoader = function(context, urlList, nameList, callback,conn) {
	if(urlList.length==nameList.length){
		this.context = context;
		this.urlList = urlList;
		this.onload = callback;
		this.conn = conn;
		this.bufferList = new Array();
		this.loadCount = 0;
		this.nameList = nameList;}
		else 
			alert("Error in media names and URLs");
	}

	CROTCHET.BufferLoader.prototype.loadBuffer = function(url, name, index) {
// ASYNC LOAD BUFFER
var request = new XMLHttpRequest();
request.open("GET", url, true);
request.responseType = "arraybuffer";
var node = new CROTCHET.MediaNode(null,null);
node.name = name;

CROTCHET.mediaNodes.push(node);

var loader = this;

request.onload = function() {
// ASYNC DECODE LOADED BUFFER

loader.context.decodeAudioData(
	request.response,
	function(buffer) {
		if (!buffer) {
			alert('error decoding file data: ' + url);
			return;
		}
		loader.bufferList[index] = buffer;
		if (++loader.loadCount == loader.urlList.length)
			loader.onload(loader.bufferList, node, loader.conn);
	},
	function(error) {
		console.error('decodeAudioData error', error);
	}
	);
}

request.onerror = function() {

	alert('BufferLoader: XHR error in file '+url);
}

request.send();
};

CROTCHET.loadSounds = function(songArray,namesArray,conn){
	bufferLoader = new CROTCHET.BufferLoader(CROTCHET.context,songArray,namesArray,onBufferLoaded,conn);
	bufferLoader.load();
}

function onBufferLoaded(bufferList, soundNode, conn){
	var sources = new Array();
	var out = CROTCHET.context.destination;

	for(var i=0;i<bufferList.length;i++){
		var source = CROTCHET.context.createBufferSource();
		source.buffer = bufferList[i];
		soundNode.node = source;
		if(conn!=null&&conn!=undefined)
			soundNode.connectNode(conn);
		else source.connect(out);
		sources.push(soundNode);
	}

	if(conn!=null&&conn!=undefined){
		conn.setOut(out);
	}

	for(var i=0;i<sources.length;i++){
		sources[i].loaded = true;
		console.log("Loaded "+"play$ound."+soundNode.name);
		var ev = new Event("play$ound."+soundNode.name);
		dispatchEvent(ev);
	}
}

CROTCHET.BufferLoader.prototype.load = function() {
	for (var i = 0; i < this.urlList.length; ++i)
		this.loadBuffer(this.urlList[i], this.nameList[i], i);
};


CROTCHET.findMedia = function(name){

	for(var i = 0; i<CROTCHET.mediaNodes.length;i++){
		if(CROTCHET.mediaNodes[i].name==name){
			return CROTCHET.mediaNodes[i];
		}
	}
	console.log("Error finding sound: "+name);
	return undefined;

}

CROTCHET.play = function(name){

	var sound = CROTCHET.findMedia(name);
	if(sound.loaded){
		if(sound.played==false){
			sound.node.start();
			sound.played=true;
		}
		else{
			var input = CROTCHET.context.createBufferSource();
			var con = sound.connections[0];
			var buf = sound.node.buffer;
			input.buffer = buf
			sound.node.stop(0);
			sound.node = input;
			sound.node.connect(con.node);
			sound.node.start();
			sound.played=true;
		}
	}

	else{
		addEventListener("play$ound."+name,function(){
			CROTCHET.play(name);
		});
	}
}

CROTCHET.stop = function(name){
	var sound = CROTCHET.findMedia(name);
	if(sound.played){
		var input = CROTCHET.context.createBufferSource();
		var con = sound.connections[0];
		var buf = sound.node.buffer;
		input.buffer = buf
		sound.node.stop(0);
		sound.node = input;
		sound.node.connect(con.node);
		sound.played=false;
	}
}

CROTCHET.setUpdate = function(func){
	CROTCHET.update = func;
}

CROTCHET.frame = function(){
	CROTCHET.update();
	requestAnimationFrame(CROTCHET.frame); 	 
}

CROTCHET.initContext();