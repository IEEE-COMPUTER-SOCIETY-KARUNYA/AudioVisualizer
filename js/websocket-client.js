class WebSocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.clientId = this.generateClientId();
        this.onAudioData = null;
        this.onConnectionChange = null;
        this.performanceMonitor = new PerformanceMonitor();
        
        this.init();
    }

    init() {
        this.connect();
    }

    connect() {
        try {
            this.socket = io('http://localhost:8888', {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize WebSocket connection:', error);
            this.handleReconnect();
        }
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            
            this.socket.emit('client:ready', {
                clientId: this.clientId,
                type: 'visualization',
                timestamp: Date.now()
            });
            
            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            if (this.onConnectionChange) {
                this.onConnectionChange(false);
            }
        });

        this.socket.on('audio:play', (data) => {
            console.log('Received audio:play event', data);
            this.handleAudioPlay(data);
        });

        this.socket.on('audio:pause', (data) => {
            console.log('Received audio:pause event', data);
            this.handleAudioPause(data);
        });

        this.socket.on('audio:data', (data) => {
            this.handleAudioData(data);
        });

        this.socket.on('audio:stream', (data) => {
            this.handleAudioStream(data);
        });

        this.socket.on('server:status', (data) => {
            this.handleServerStatus(data);
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.handleError(error);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Reconnection attempt ${attemptNumber}`);
            this.reconnectAttempts = attemptNumber;
        });

        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect after maximum attempts');
            this.updateConnectionStatus(false, 'Connection failed');
        });
    }

    handleAudioPlay(data) {
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Playing audio...';
        }
    }

    handleAudioPause(data) {
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Audio paused';
        }
    }

    handleAudioData(data) {
        if (this.onAudioData) {
            console.log('Received audio data:', data); // Debug log
            const processedData = this.processIncomingData(data);
            this.onAudioData(processedData);
            
            this.performanceMonitor.recordLatency(data.timestamp);
        }
    }

    handleAudioStream(data) {
        if (data.chunk) {
            const audioData = this.decodeAudioChunk(data.chunk);
            if (this.onAudioData) {
                this.onAudioData(audioData);
            }
        }
    }

    handleServerStatus(data) {
        console.log('Server status:', data);
        
        const clientCount = data.connectedClients || 0;
        const clientsElement = document.querySelector('.connected-clients');
        if (clientsElement) {
            clientsElement.innerHTML = `<span class="client-count">${clientCount}</span> clients connected`;
        }
    }

    handleError(error) {
        console.error('WebSocket error:', error);
        
        if (!this.isConnected) {
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
    }

    processIncomingData(data) {
        const processed = {
            frequencyData: data.frequencyData ? new Uint8Array(data.frequencyData) : new Uint8Array(1024),
            frequency: data.frequencyData ? new Uint8Array(data.frequencyData) : new Uint8Array(1024), // Add both field names
            waveformData: data.waveformData ? new Uint8Array(data.waveformData) : new Uint8Array(1024),
            amplitude: data.amplitude || 0,
            timestamp: data.timestamp || Date.now()
        };
        
        if (data.bands) {
            processed.bands = data.bands;
        }
        
        return processed;
    }

    decodeAudioChunk(chunk) {
        const uint8Array = new Uint8Array(chunk);
        const float32Array = new Float32Array(uint8Array.buffer);
        
        return {
            frequencyData: float32Array.slice(0, 1024),
            waveformData: float32Array.slice(1024, 2048),
            amplitude: float32Array[2048] || 0,
            timestamp: Date.now()
        };
    }

    updateConnectionStatus(connected, message = null) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) {
            statusDot.classList.toggle('connected', connected);
            statusDot.classList.toggle('disconnected', !connected);
        }
        
        if (statusText) {
            if (message) {
                statusText.textContent = message;
            } else {
                statusText.textContent = connected ? 'Connected' : 'Disconnected';
            }
        }
    }

    sendPerformanceMetrics() {
        if (!this.isConnected) return;
        
        const metrics = this.performanceMonitor.getMetrics();
        
        this.socket.emit('performance:metrics', {
            clientId: this.clientId,
            fps: metrics.fps,
            latency: metrics.latency,
            memoryUsage: metrics.memory,
            timestamp: Date.now()
        });
    }

    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    emit(event, data) {
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
        } else {
            console.warn('Cannot emit event: WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

class PerformanceMonitor {
    constructor() {
        this.fpsHistory = [];
        this.latencyHistory = [];
        this.lastFrameTime = performance.now();
        this.maxHistorySize = 60;
        
        this.startMonitoring();
    }

    startMonitoring() {
        const monitor = () => {
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            const fps = 1000 / delta;
            
            this.fpsHistory.push(fps);
            if (this.fpsHistory.length > this.maxHistorySize) {
                this.fpsHistory.shift();
            }
            
            this.lastFrameTime = now;
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }

    recordLatency(serverTimestamp) {
        const latency = Date.now() - serverTimestamp;
        
        this.latencyHistory.push(latency);
        if (this.latencyHistory.length > this.maxHistorySize) {
            this.latencyHistory.shift();
        }
        
        const latencyElement = document.querySelector('.latency');
        if (latencyElement) {
            latencyElement.textContent = `Latency: ${latency}ms`;
        }
    }

    getMetrics() {
        const avgFps = this.fpsHistory.length > 0 
            ? this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length 
            : 60;
            
        const avgLatency = this.latencyHistory.length > 0
            ? this.latencyHistory.reduce((a, b) => a + b) / this.latencyHistory.length
            : 0;
            
        const memory = performance.memory 
            ? {
                used: performance.memory.usedJSHeapSize / 1048576,
                total: performance.memory.totalJSHeapSize / 1048576,
                limit: performance.memory.jsHeapSizeLimit / 1048576
            }
            : null;
            
        return {
            fps: Math.round(avgFps),
            latency: Math.round(avgLatency),
            memory: memory
        };
    }
}