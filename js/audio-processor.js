class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.frequencyArray = null;
        this.bufferLength = null;
        this.onDataUpdate = null;
        this.beatDetector = new BeatDetector();
        this.isInitialized = false;
        
        this.frequencyBands = {
            subBass: { min: 20, max: 60 },      // Sub-bass (orb scale pulsing)
            bass: { min: 60, max: 250 },        // Bass (large wave deformations)
            lowMid: { min: 250, max: 1000 },    // Low-mid (ribbon twisting)
            highMid: { min: 1000, max: 4000 },  // High-mid (surface complexity)
            presence: { min: 4000, max: 8000 }, // Presence (iridescence shift)
            brilliance: { min: 8000, max: 20000 } // Brilliance (sparkle, rim glow)
        };
        
        this.smoothingValues = {
            amplitude: 0,
            bands: {
                subBass: 0,
                bass: 0,
                lowMid: 0,
                highMid: 0,
                presence: 0,
                brilliance: 0
            }
        };
        
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.frequencyArray = new Float32Array(this.bufferLength);
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
        }
    }

    processAudioData(audioData) {
        if (!this.isInitialized) return;
        
        if (audioData.frequencyData) {
            this.frequencyArray = new Float32Array(audioData.frequencyData);
            this.dataArray = new Uint8Array(audioData.waveformData);
        }
        
        const processedData = this.analyzeAudio();
        
        if (this.onDataUpdate) {
            this.onDataUpdate(processedData);
        }
        
        return processedData;
    }

    processAudioStream(stream) {
        if (!this.isInitialized) return;
        
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        
        this.startAnalysis();
    }

    processAudioBuffer(buffer) {
        if (!this.isInitialized) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        source.start();
        
        this.startAnalysis();
    }

    startAnalysis() {
        const analyze = () => {
            if (!this.isInitialized) return;
            
            requestAnimationFrame(analyze);
            
            this.analyser.getByteTimeDomainData(this.dataArray);
            this.analyser.getFloatFrequencyData(this.frequencyArray);
            
            const processedData = this.analyzeAudio();
            
            if (this.onDataUpdate) {
                this.onDataUpdate(processedData);
            }
        };
        
        analyze();
    }

    analyzeAudio() {
        const amplitude = this.calculateAmplitude();
        const bands = this.calculateFrequencyBands();
        const beat = this.beatDetector.detect(amplitude);
        const peaks = this.detectPeaks();
        
        this.smoothingValues.amplitude = this.smooth(amplitude, this.smoothingValues.amplitude, 0.9);
        
        for (const band in bands) {
            this.smoothingValues.bands[band] = this.smooth(
                bands[band],
                this.smoothingValues.bands[band],
                0.85
            );
        }
        
        return {
            waveform: this.normalizeWaveform(),
            frequency: this.normalizeFrequency(),
            amplitude: this.smoothingValues.amplitude,
            bands: this.smoothingValues.bands,
            beat: beat,
            peaks: peaks,
            rawAmplitude: amplitude,
            rawBands: bands
        };
    }

    calculateAmplitude() {
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const normalized = (this.dataArray[i] - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / this.dataArray.length);
    }

    calculateFrequencyBands() {
        const nyquist = this.audioContext.sampleRate / 2;
        const bands = {};
        
        for (const [bandName, range] of Object.entries(this.frequencyBands)) {
            const startIndex = Math.floor((range.min / nyquist) * this.frequencyArray.length);
            const endIndex = Math.floor((range.max / nyquist) * this.frequencyArray.length);
            
            let sum = 0;
            let count = 0;
            
            for (let i = startIndex; i <= endIndex && i < this.frequencyArray.length; i++) {
                const value = Math.pow(10, this.frequencyArray[i] / 20);
                sum += value;
                count++;
            }
            
            bands[bandName] = count > 0 ? sum / count : 0;
        }
        
        return bands;
    }

    detectPeaks() {
        const peaks = [];
        const threshold = 0.7;
        
        for (let i = 1; i < this.frequencyArray.length - 1; i++) {
            const current = this.frequencyArray[i];
            const previous = this.frequencyArray[i - 1];
            const next = this.frequencyArray[i + 1];
            
            if (current > previous && current > next && current > threshold) {
                peaks.push({
                    index: i,
                    frequency: (i * this.audioContext.sampleRate) / (2 * this.frequencyArray.length),
                    magnitude: current
                });
            }
        }
        
        return peaks;
    }

    normalizeWaveform() {
        const normalized = new Float32Array(this.dataArray.length);
        for (let i = 0; i < this.dataArray.length; i++) {
            normalized[i] = (this.dataArray[i] - 128) / 128;
        }
        return normalized;
    }

    normalizeFrequency() {
        const normalized = new Float32Array(this.frequencyArray.length);
        const minDb = -100;
        const maxDb = -30;
        
        for (let i = 0; i < this.frequencyArray.length; i++) {
            const db = this.frequencyArray[i];
            normalized[i] = (db - minDb) / (maxDb - minDb);
            normalized[i] = Math.max(0, Math.min(1, normalized[i]));
        }
        
        return normalized;
    }

    smooth(newValue, oldValue, factor) {
        return oldValue * factor + newValue * (1 - factor);
    }

    dispose() {
        if (this.source) {
            this.source.disconnect();
        }
        if (this.analyser) {
            this.analyser.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

class BeatDetector {
    constructor() {
        this.history = [];
        this.historySize = 43;
        this.lastBeat = 0;
        this.cooldown = 100;
        this.threshold = 1.3;
    }

    detect(amplitude) {
        const now = Date.now();
        
        this.history.push(amplitude);
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
        
        if (this.history.length < this.historySize) {
            return false;
        }
        
        const average = this.history.reduce((a, b) => a + b) / this.history.length;
        const variance = this.history.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / this.history.length;
        const dynamicThreshold = average + Math.sqrt(variance) * this.threshold;
        
        if (amplitude > dynamicThreshold && now - this.lastBeat > this.cooldown) {
            this.lastBeat = now;
            return true;
        }
        
        return false;
    }

    reset() {
        this.history = [];
        this.lastBeat = 0;
    }
}