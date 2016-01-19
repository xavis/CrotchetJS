/*

 * CrotchetJS
 * Author: Javier Sánchez Riquelme
 * Author site: http://xaviscript.com

 * Pitch detection system: Chris Wilson - https://github.com/cwilso

 The MIT License (MIT)
 Copyright (c) 2014 Chris Wilson
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

var CROTCHET = {
  REVISION: '1'
};

navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

CROTCHET.update = function() {};

CROTCHET.mainGain = null;

CROTCHET.setGlobalVolume = function(val) {
  if (val >= 0)
    CROTCHET.mainGain.gain.value = val / 100;
  else console.log("Error on setGlobalVolume, invalid value");
};

CROTCHET.connections = new Array();
CROTCHET.root = 0;


CROTCHET.mediaNodes = new Array();

//INIT AUDIO CONTEXT FUNCTION

CROTCHET.initContext = function() {

  var createContext = (window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext);

  if (createContext) {
    CROTCHET.context = new createContext();
    CROTCHET.root = new CROTCHET.Node(null, null);
  } else
    alert("Your browser cannot use Audio API so this site will not work correctly for you.");

}


//NODE BASIC CLASS

CROTCHET.Node = function(node, input) {
  this.node = node;
  this.connections = [];
  this.connectedTo = input;
};

CROTCHET.Node.prototype = {
  connectNode: function(con) {
    this.node.connect(con.node);
    this.connections.push(con);

  },

  setOut: function(out) {

    if (this.connections != null && this.connections.length > 0) {
      this.connections[0].setOut(out);
    } else {
      if (CROTCHET.mainGain == null) {
        CROTCHET.mainGain = CROTCHET.context.createGain();
      }
      this.node.connect(CROTCHET.mainGain);
      CROTCHET.mainGain.connect(out);
    }
  }
}


//MEDIA NODE CLASS (MP3, WAV, ...)

CROTCHET.MediaNode = function(node, input) {
  this.base = CROTCHET.Node;
  this.base(node, input);
  this.loaded = false;
  this.name = null;
  this.played = false;
  this.changeSpeed = function(val) {
    if (val > 0)
      this.node.playbackRate.value = val / 100;
    else console.log("Speed cannot be negative set a value greater than 0");
  }
  this.setLoopable = function(bool, startSecs, endSecs) {
    this.node.loop = false;
    if (startSecs != undefined && startSecs != null && endSecs != undefined && endSecs != null && startSecs >= 0 && endSecs >= 0) {
      this.node.loopStart = startSecs;
      this.node.loopEnd = endSecs;
    }
  }

  this.onEnd = function(callback) {
    this.node.onended = callback;
  }
}

CROTCHET.MediaNode.prototype = new CROTCHET.Node;


//ANALYSIS NODE CLASstartSecs!=undefined&&startSecs!=null&&S

CROTCHET.AnalyserNode = function(node, input) {
  this.base = CROTCHET.Node;
  this.base(node, input);

  this.setFftSize = function(fftSize) {
    if (fftSize != undefined && fftSize != null) {
      if (fftSize % 2 == 0)
        this.node.fftSize = fftSize;
      else console.log("Error in fftSize in setFftSize(fftSize)");
    }
  };
  this.getByteSpectrum = function(minDb, maxDb) {
    if (minDb != undefined && minDb != null && maxDb != undefined && maxDb != null) {
      this.node.maxDecibels = maxDb;
      this.node.minDecibels = minDb;
    }

    var frequencyData = new Uint8Array(this.node.frequencyBinCount);
    this.node.getByteFrequencyData(frequencyData);
    return frequencyData;
  };
  this.getFloatSpectrum = function() {
    var frequencyData = new Float32Array(this.node.frequencyBinCount);
    this.node.getFloatFrequencyData(frequencyData);
    return frequencyData;
  };
  this.getFloatWaveform = function() {
    var frequencyData = new Float32Array(this.node.frequencyBinCount);
    this.node.getFloatTimeDomainData(frequencyData);
    return frequencyData;
  };

  this.getByteWaveform = function(minDb, maxDb) {
      if (minDb != undefined && minDb != null && maxDb != undefined && maxDb != null) {
        this.node.maxDecibels = maxDb;
        this.node.minDecibels = minDb;
      }

      var frequencyData = new Uint8Array(this.node.frequencyBinCount);
      this.node.getByteTimeDomainData(frequencyData);
      return frequencyData;
    },
    this.getPitch = function(time) {
      var cycles = [];

      if (!this.buf || this.buf.length != this.node.fftSize / 2) {
        this.buf = new Float32Array(this.node.fftSize / 2);
      }
      var buf = this.buf;
      this.node.getFloatTimeDomainData(buf);
      var ac = CROTCHET.utils.autoCorrelate(buf, CROTCHET.context.sampleRate);

      if (ac !== -1) {
        pitch = ac;
        var note = CROTCHET.utils.noteFromPitch(pitch);
        var noteName = CROTCHET.utils.noteStrings[note % 12];
        var detune = CROTCHET.utils.centsOffFromPitch(pitch, note);

        return {
          name: noteName,
          number: note,
          detune: detune
        };
      } else return -1;

    }

};

CROTCHET.AnalyserNode.prototype = new CROTCHET.Node;

CROTCHET.createAnalyser = function(fftSize) {

  var analyser = CROTCHET.context.createAnalyser();

  if (fftSize != undefined && fftSize != null) {
    if (fftSize % 2 == 0)
      analyser.fftSize = fftSize;
    else console.log("Error in fftSize in createAnalyser(fftSize)");
  } else {
    analyser.fftSize = 2048;
  }

  var a = new CROTCHET.AnalyserNode(analyser, null);
  return a;
}

//FILTER NODE CLASS

CROTCHET.FilterNode = function(node, input) {

  this.base = CROTCHET.Node;
  this.base(node, input);

  this.setQ = function(val) {
    if (val > 0 && val <= 1000)
      this.node.Q.value = val;
  };

  this.setGain = function(val) {
    if (val >= -40 && val <= 40)
      this.filter.gain.value = val;
  };
  this.setType = function(val) {

    switch (val.toUpperCase()) {

      case "NOTCH":
        this.node.type = "notch";
        break;

      case "LOWPASS":
        this.node.type = "lowpass"
        break;

      case "HIGHPASS":
        this.node.type = "highpass";
        break;

      case "BANDPASS":
        this.node.type = "bandpass";
        break;

      case "ALLPASS":
        this.node.type = "allpass";
        break;

      case "HIGHSELF":
        this.node.type = "highself";
        break;

      case "LOWSHELF":
        this.node.type = "lowshelf";
        break;

      case "PEAKING":
        this.node.type = "peaking";
        break;

    }
  };
}

CROTCHET.FilterNode.prototype = new CROTCHET.Node;

CROTCHET.createFilter = function(type, frequency, q, gain) {

  var filter = CROTCHET.context.createBiquadFilter();

  switch (type.toUpperCase()) {

    case "NOTCH":
      filter.type = filter.NOTCH;
      break;

    case "LOWPASS":
      filter.type = filter.LOWPASS;
      break;

    case "HIGHPASS":
      filter.type = filter.HIGHPASS;
      break;

    case "BANDPASS":
      filter.type = filter.BANDPASS;
      break;

    case "ALLPASS":
      filter.type = filter.ALLPASS;
      break;

    case "HIGHSELF":
      filter.type = filter.HIGHSELF;
      break;

    case "LOWSHELF":
      filter.type = filter.LOWSHELF;
      break;

    case "PEAKING":
      filter.type = filter.PEAKING;
      break;
  }

  filter.frequency.value = frequency;
  filter.Q.value = q;
  filter.gain.value = gain;

  var f = new CROTCHET.FilterNode(filter, null);
  return f;
}


//OSCILLATOR NODE CLASS

CROTCHET.OscillatorNode = function(node, input) {
  this.base = CROTCHET.Node;
  this.base(node, input);
  this.connected = false;

  this.start = function(time) {
    if (!this.connected) {
      this.setOut(CROTCHET.context.destination);
    }
    if (time != undefined && time != null)
      this.node.start(time);
    else this.node.start(0);
  };
  this.stop = function(time) {
    if (time != undefined && time != null)
      this.node.stop(time);
    else this.node.stop(0);
  };
  this.setFrequency = function(frec) {
    this.node.frequency.value = frec;
  };
  this.setType = function(type) {
    switch (type.toLowerCase()) {
      case "square":
        this.node.type = "square";
        break;
      case "line":
        this.node.type = "line";
        break;
      case "triangle":
        this.node.type = "triangle";
        break;
      case "sawtooth":
        this.node.type = "sawtooth";
        break;
      case "custom":
        this.node.type = "custom";
        break;
    }

    if (type.toUpperCase() == "CUSTOM") {
      //...
    }

  };
  this.detune = function(val) {
    this.node.detune.value = val;
  };
};

CROTCHET.OscillatorNode.prototype = new CROTCHET.Node;

CROTCHET.createOscillator = function(frec, type, custom) {

  var oscillator = CROTCHET.context.createOscillator();
  oscillator.frequency.value = frec;
  switch (type.toUpperCase()) {
    case "SQUARE":
      oscillator.type = oscillator.SQUARE;
      break;
    case "SINE":
      oscillator.type = oscillator.SQUARE;
      break;
    case "TRIANGLE":
      oscillator.type = oscillator.SQUARE;
      break;
    case "SAWTOOTH":
      oscillator.type = oscillator.SAWTOOTH;
      break;
    case "CUSTOM":
      oscillator.type = oscillator.CUSTOM;
      break;
  }
  oscillator.type = type;
  if (type == "custom") {

  }

  var o = new CROTCHET.OscillatorNode(oscillator, null);
  return o;
}


//GAIN NODE CLASS

CROTCHET.GainNode = function(node, input) {
  this.base = CROTCHET.Node;
  this.base(node, input);
  this.setGain = function(val) {
    this.node.gain.value = val / 100;
  };
}

CROTCHET.GainNode.prototype = new CROTCHET.Node;

CROTCHET.createGain = function(val) {

  var gain = CROTCHET.context.createGain();
  if (val != undefined && val != null)
    gain.gain.value = val / 100;
  else gain.gain.value = 1;

  var g = new CROTCHET.GainNode(gain, null);
  return g;
}

//END NODE CLASSES

//MICROPHONE OBJECt

CROTCHET.microphoneObject = new function() {};

CROTCHET.microphoneObject.initMicro = function() {
  navigator.getUserMedia({
      audio: true
    },
    this.onStream.bind(this),
    this.onStreamError.bind(this));
};

CROTCHET.microphoneObject.addConnections = function(connection) {
  if (typeof connection == Array)
    this.conns = connection;
  else {
    this.conns = new Array();
    this.conns.push(connection);
  }
}

CROTCHET.microphoneObject.start = function(inputs) {
  navigator.getUserMedia({
      audio: true
    },
    this.onStream.bind(this),
    this.onStreamError.bind(this));

  this.addConnections(inputs);

};

CROTCHET.microphoneObject.onStream = function(stream) {
  var input = CROTCHET.context.createMediaStreamSource(stream);
  CROTCHET.start(input, this);
}

CROTCHET.microphoneObject.onStreamError = function(e) {
  console.error('Error getting microphone', e);
};

CROTCHET.startMicrophone = function(conn) {
  var micro = CROTCHET.microphoneObject;
  if (conn != null && conn != undefined)
    micro.addConnections(conn);
  micro.initMicro();
}

CROTCHET.start = function(input, microObject) {
  var m = new CROTCHET.Node(input, CROTCHET.root);
  if (microObject.conns != null && microObject.conns != undefined) {
    for (var i = 0; i < microObject.conns.length; i++) {
      m.connectNode(microObject.conns[i]);
    }
  }
  var out = CROTCHET.context.destination;
  m.setOut(out);
}


CROTCHET.BufferLoader = function(context, urlList, nameList, callback, conn) {
  if (urlList.length == nameList.length) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.conn = conn;
    this.bufferList = new Array();
    this.loadCount = 0;
    this.nameList = nameList;
  } else
    alert("Error in media names and URLs");
}

CROTCHET.BufferLoader.prototype.loadBuffer = function(url, name, index) {
  // ASYNC LOAD BUFFER
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  var node = new CROTCHET.MediaNode(null, null);
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

    alert('BufferLoader: XHR error in file ' + url);
  }

  request.send();
};

CROTCHET.loadSounds = function(songArray, namesArray, conn) {
  bufferLoader = new CROTCHET.BufferLoader(CROTCHET.context, songArray, namesArray, onBufferLoaded, conn);
  bufferLoader.load();
}

function onBufferLoaded(bufferList, soundNode, conn) {
  var sources = new Array();
  var out = CROTCHET.context.destination;

  for (var i = 0; i < bufferList.length; i++) {
    var source = CROTCHET.context.createBufferSource();
    source.buffer = bufferList[i];
    soundNode.node = source;
    if (conn != null && conn != undefined)
      soundNode.connectNode(conn);
    else source.connect(out);
    sources.push(soundNode);
  }

  if (conn != null && conn != undefined) {
    conn.setOut(out);
  }

  for (var i = 0; i < sources.length; i++) {
    sources[i].loaded = true;
    console.log("Loaded " + "play$ound." + soundNode.name);
    var ev = new Event("play$ound." + soundNode.name);
    dispatchEvent(ev);
  }
}

CROTCHET.BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
    this.loadBuffer(this.urlList[i], this.nameList[i], i);
};


CROTCHET.findMedia = function(name) {

  for (var i = 0; i < CROTCHET.mediaNodes.length; i++) {
    if (CROTCHET.mediaNodes[i].name == name) {
      return CROTCHET.mediaNodes[i];
    }
  }
  console.log("Error finding sound: " + name);
  return undefined;

}

CROTCHET.play = function(name) {

  var sound = CROTCHET.findMedia(name);
  if (sound.loaded) {
    if (sound.played == false) {
      sound.node.start();
      sound.played = true;
    } else {
      var input = CROTCHET.context.createBufferSource();
      var con = sound.connections[0];
      var buf = sound.node.buffer;
      input.buffer = buf
      sound.node.stop(0);
      sound.node = input;
      sound.node.connect(con.node);
      sound.node.start();
      sound.played = true;
    }
  } else {
    addEventListener("play$ound." + name, function() {
      CROTCHET.play(name);
    });
  }
}

CROTCHET.stop = function(name) {
  var sound = CROTCHET.findMedia(name);
  if (sound.played) {
    var input = CROTCHET.context.createBufferSource();
    var con = sound.connections[0];
    var buf = sound.node.buffer;
    input.buffer = buf
    sound.node.stop(0);
    sound.node = input;
    sound.node.connect(con.node);
    sound.played = false;
  }
}

CROTCHET.setUpdate = function(func) {
  CROTCHET.update = func;
}

CROTCHET.frame = function() {
  CROTCHET.update();
  requestAnimationFrame(CROTCHET.frame);
}

CROTCHET.utils = {};

CROTCHET.utils.noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

CROTCHET.utils.noteFromPitch = function( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
};

CROTCHET.utils.frequencyFromNoteNumber = function( note ) {
	return 440 * Math.pow(2,(note-69)/12);
};

CROTCHET.utils.centsOffFromPitch = function( frequency, note ) {
	return Math.floor( 1200 * Math.log( frequency / CROTCHET.utils.frequencyFromNoteNumber( note ))/Math.log(2) );
};

CROTCHET.utils.autoCorrelate = function( buf, sampleRate ) {
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var lastCorrelation=1;
	for (var offset = 0; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>0.9) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1,
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
//	var best_frequency = sampleRate/best_offset;
};

CROTCHET.initContext();
