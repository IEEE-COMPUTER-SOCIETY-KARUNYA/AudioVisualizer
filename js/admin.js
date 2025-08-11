class AdminConsole {
    constructor() {
        this.socket = null;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.analyser = null;
        this.isPlaying = false;
        this.isBroadcasting = false;
        this.currentFile = null;
        this.animationId = null;
        
        this.init();
    }

    init() {
        this.setupAudioContext();
        this.setupWebSocket();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
    }

    setupWebSocket() {
        this.socket = io('http://localhost:8888', {
            transports: ['websocket']
        });

        this.socket.on('connect', () => {
            console.log('Admin console connected to server');
            this.updateConnectionStatus(true);
            
            // Identify as admin client
            this.socket.emit('client:ready', {
                clientId: 'admin_' + Date.now(),
                type: 'admin',
                timestamp: Date.now()
            });
        });

        this.socket.on('disconnect', () => {
            console.log('Admin console disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('server:status', (data) => {
            this.updateClientCount(data.connectedClients || 0);
        });
    }

    setupEventListeners() {
        const fileInput = document.getElementById('audioFileInput');
        const uploadArea = document.getElementById('uploadArea');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const broadcastBtn = document.getElementById('broadcastBtn');
        const waveformCanvas = document.getElementById('waveformCanvas');

        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });

        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        broadcastBtn.addEventListener('click', () => {
            this.toggleBroadcast();
        });

        if (waveformCanvas) {
            waveformCanvas.addEventListener('click', (e) => {
                this.seekToPosition(e);
            });
        }
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
    }

    async handleFileUpload(file) {
        if (!this.validateFile(file)) {
            alert('Invalid file format or size. Please upload MP3, WAV, OGG, or M4A files under 50MB.');
            return;
        }

        this.currentFile = file;
        this.showUploadProgress();

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.hideUploadProgress();
            this.showPlayer();
            this.updateTrackInfo(file.name);
            this.drawWaveform();
            
            console.log('Audio file loaded successfully');
        } catch (error) {
            console.error('Error loading audio file:', error);
            this.hideUploadProgress();
            alert('Error loading audio file. Please try another file.');
        }
    }

    validateFile(file) {
        const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'];
        const maxSize = 50 * 1024 * 1024;
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
        
        return (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) && file.size <= maxSize;
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
        const progressFill = document.querySelector('.progress-fill');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = progress + '%';
            
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 100);
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
        document.querySelector('.progress-fill').style.width = '0%';
    }

    showPlayer() {
        document.getElementById('playerSection').style.display = 'block';
        document.getElementById('frequencyMonitor').style.display = 'block';
    }

    updateTrackInfo(filename) {
        document.querySelector('.track-title').textContent = filename;
        const duration = this.formatTime(this.audioBuffer.duration);
        document.querySelector('.track-details').textContent = `0:00 / ${duration}`;
        document.getElementById('totalTime').textContent = duration;
    }

    drawWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const data = this.audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.moveTo(0, amp);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            ctx.lineTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        
        ctx.stroke();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audioBuffer) return;

        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = document.getElementById('volumeSlider').value / 100;
        
        this.audioSource.connect(gainNode);
        gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        this.audioSource.start(0);
        this.isPlaying = true;
        
        this.updatePlayButton(true);
        this.startVisualization();
        
        if (this.isBroadcasting) {
            this.startBroadcasting();
        }
        
        this.audioSource.onended = () => {
            this.stop();
        };
        
        this.socket.emit('audio:play', {
            timestamp: Date.now(),
            audioId: this.currentFile.name
        });
    }

    pause() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
        }
        
        this.isPlaying = false;
        this.updatePlayButton(false);
        this.stopVisualization();
        
        this.socket.emit('audio:pause', {
            timestamp: Date.now(),
            position: this.audioContext.currentTime
        });
    }

    stop() {
        this.isPlaying = false;
        this.updatePlayButton(false);
        this.stopVisualization();
        
        document.getElementById('currentTime').textContent = '0:00';
        document.querySelector('.playhead').style.left = '0%';
    }

    setVolume(value) {
        if (this.audioSource) {
            
        }
    }

    seekToPosition(event) {
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = x / canvas.width;
        
        
    }

    toggleBroadcast() {
        this.isBroadcasting = !this.isBroadcasting;
        const btn = document.getElementById('broadcastBtn');
        
        if (this.isBroadcasting) {
            btn.classList.add('broadcasting');
            btn.querySelector('span').textContent = 'Stop Broadcasting';
            
            if (this.isPlaying) {
                this.startBroadcasting();
            }
        } else {
            btn.classList.remove('broadcasting');
            btn.querySelector('span').textContent = 'Start Broadcasting';
            this.stopBroadcasting();
        }
    }

    startBroadcasting() {
        if (!this.analyser) return;
        
        const sendAudioData = () => {
            if (!this.isBroadcasting || !this.isPlaying) return;
            
            const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            const waveformData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.analyser.getByteFrequencyData(frequencyData);
            this.analyser.getByteTimeDomainData(waveformData);
            
            const amplitude = this.calculateAmplitude(waveformData);
            const bands = this.calculateFrequencyBands(frequencyData);
            
            this.socket.emit('audio:data', {
                frequencyData: Array.from(frequencyData),
                waveformData: Array.from(waveformData),
                amplitude: amplitude,
                bands: bands,
                timestamp: Date.now()
            });
            
            requestAnimationFrame(sendAudioData);
        };
        
        sendAudioData();
    }

    stopBroadcasting() {
        
    }

    startVisualization() {
        const canvas = document.getElementById('frequencyCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const draw = () => {
            if (!this.isPlaying) return;
            
            this.animationId = requestAnimationFrame(draw);
            
            const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(frequencyData);
            
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / frequencyData.length) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < frequencyData.length; i++) {
                barHeight = (frequencyData[i] / 255) * canvas.height;
                
                const hue = (i / frequencyData.length) * 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
            
            this.updateTimeDisplay();
        };
        
        draw();
    }

    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    calculateAmplitude(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / data.length);
    }

    calculateFrequencyBands(data) {
        const bands = {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            high: 0
        };
        
        const ranges = {
            subBass: [0, 10],
            bass: [10, 50],
            lowMid: [50, 100],
            mid: [100, 400],
            highMid: [400, 800],
            high: [800, data.length]
        };
        
        for (const [band, range] of Object.entries(ranges)) {
            let sum = 0;
            for (let i = range[0]; i < range[1] && i < data.length; i++) {
                sum += data[i] / 255;
            }
            bands[band] = sum / (range[1] - range[0]);
        }
        
        return bands;
    }

    updateTimeDisplay() {
        if (!this.audioContext || !this.audioBuffer) return;
        
        const currentTime = this.audioContext.currentTime;
        const duration = this.audioBuffer.duration;
        const percentage = (currentTime / duration) * 100;
        
        document.getElementById('currentTime').textContent = this.formatTime(currentTime);
        document.querySelector('.playhead').style.left = percentage + '%';
    }

    updatePlayButton(playing) {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.connection-status .status-indicator');
        const text = document.querySelector('.connection-status .status-text');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    updateClientCount(count) {
        document.querySelector('.client-count').textContent = count;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const adminConsole = new AdminConsole();
    window.adminConsole = adminConsole;
});