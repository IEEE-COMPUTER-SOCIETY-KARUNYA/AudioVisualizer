class SimpleAudioVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orb = null;
        this.particles = null;
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // Audio data
        this.audioData = {
            amplitude: 0,
            bass: 0,
            mid: 0,
            high: 0
        };
        
        this.init();
    }

    init() {
        try {
            console.log('Initializing Simple Audio Visualization...');
            
            this.setupScene();
            this.createOrb();
            this.createParticles();
            this.setupLights();
            this.initWebSocket();
            this.animate();
            
            this.updateStatus('Simple AI Ready');
            console.log('Simple Audio Visualization initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Simple Audio Visualization:', error);
            this.updateStatus('Initialization Failed');
        }
    }

    setupScene() {
        const canvas = document.getElementById('visualization-canvas');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        console.log('Scene setup complete');
    }

    createOrb() {
        // Simple sphere geometry
        const geometry = new THREE.SphereGeometry(3, 32, 16);
        
        // Simple material with basic color animation
        const material = new THREE.MeshPhongMaterial({
            color: 0x4A90E2,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        this.orb = new THREE.Mesh(geometry, material);
        this.scene.add(this.orb);
        
        console.log('Orb created');
    }

    createParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions around the orb
            const radius = 5 + Math.random() * 10;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Colors
            colors[i3] = 0.3 + Math.random() * 0.7;     // R
            colors[i3 + 1] = 0.6 + Math.random() * 0.4; // G
            colors[i3 + 2] = 1.0;                       // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        console.log('Particles created');
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Point lights
        const light1 = new THREE.PointLight(0x4A90E2, 1, 50);
        light1.position.set(10, 10, 10);
        this.scene.add(light1);
        
        const light2 = new THREE.PointLight(0xE74C3C, 0.5, 30);
        light2.position.set(-10, -10, 5);
        this.scene.add(light2);
        
        console.log('Lights setup complete');
    }

    initWebSocket() {
        try {
            this.wsClient = new WebSocketClient();
            
            this.wsClient.onAudioData = (data) => {
                this.processAudioData(data);
            };
            
            this.wsClient.onConnectionChange = (connected) => {
                this.updateStatus(connected ? 'Connected - Simple AI Active' : 'Disconnected');
            };
            
            console.log('WebSocket initialized');
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.updateStatus('WebSocket Failed');
        }
    }

    processAudioData(data) {
        if (!data) return;
        
        // Simple audio processing
        this.audioData.amplitude = data.amplitude || 0;
        
        // Simple frequency band calculation
        if (data.frequency && data.frequency.length > 0) {
            const freq = data.frequency;
            const third = Math.floor(freq.length / 3);
            
            this.audioData.bass = this.average(freq.slice(0, third));
            this.audioData.mid = this.average(freq.slice(third, third * 2));
            this.audioData.high = this.average(freq.slice(third * 2));
        }
        
        // Update UI bars
        this.updateFrequencyBars();
    }

    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    updateFrequencyBars() {
        const bars = document.querySelectorAll('.freq-bar');
        if (bars.length >= 3) {
            const values = [this.audioData.bass, this.audioData.mid, this.audioData.high];
            
            values.forEach((value, index) => {
                if (bars[index]) {
                    const height = Math.min(value * 100, 100);
                    bars[index].style.height = `${height}%`;
                    
                    const hue = index * 120; // Red, Green, Blue
                    bars[index].style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
                }
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const elapsed = this.clock.getElapsedTime();
        
        // Animate orb
        if (this.orb) {
            // Base rotation
            this.orb.rotation.y = elapsed * 0.5;
            this.orb.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
            
            // Audio-reactive scaling
            const scale = 1 + this.audioData.amplitude * 0.3;
            this.orb.scale.set(scale, scale, scale);
            
            // Color animation based on audio
            const hue = (elapsed * 0.1 + this.audioData.mid * 2) % 1;
            this.orb.material.color.setHSL(hue, 0.7, 0.5);
            
            // Brightness based on audio
            this.orb.material.emissive.setHSL(hue, 0.5, this.audioData.amplitude * 0.2);
        }
        
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.001;
            
            // Make particles react to audio
            const positions = this.particles.geometry.attributes.position.array;
            const time = elapsed * 0.5;
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                
                // Subtle movement based on audio
                positions[i + 1] = y + Math.sin(time + x * 0.1) * this.audioData.amplitude * 0.1;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Camera auto-rotation
        this.camera.position.x = Math.sin(elapsed * 0.1) * 15;
        this.camera.position.z = Math.cos(elapsed * 0.1) * 15;
        this.camera.lookAt(0, 0, 0);
        
        // Update FPS
        this.updateFPS();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    updateFPS() {
        const fps = Math.round(1 / this.clock.getDelta());
        const fpsElement = document.querySelector('.fps-counter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${fps}`;
        }
    }

    updateStatus(status) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        
        if (statusText) {
            statusText.textContent = status;
        }
        
        if (statusDot) {
            const isGood = status.includes('Ready') || status.includes('Active');
            statusDot.classList.toggle('connected', isGood);
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
        
        console.log('Simple Audio Visualization disposed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Simple Audio Visualization...');
    
    try {
        const visualization = new SimpleAudioVisualization();
        
        window.addEventListener('resize', () => {
            visualization.onResize();
        });
        
        window.addEventListener('beforeunload', () => {
            visualization.dispose();
        });
        
    } catch (error) {
        console.error('Critical error:', error);
        document.querySelector('.status-text').textContent = 'Failed to load';
    }
});