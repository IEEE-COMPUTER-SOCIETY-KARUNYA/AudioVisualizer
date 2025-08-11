class FlowOrbVisualization {
    constructor() {
        // Flow Orb Three.js scene
        this.flowOrb = null;
        
        // Audio data with full frequency spectrum
        this.audioData = {
            amplitude: 0,
            frequencySpectrum: new Float32Array(512),
            smoothedSpectrum: new Float32Array(512),
            // 6-band system for enhanced visualization
            subBass: 0,     // 20-60Hz
            bass: 0,        // 60-250Hz
            lowMid: 0,      // 250-1000Hz
            highMid: 0,     // 1000-4000Hz
            presence: 0,    // 4000-8000Hz
            brilliance: 0   // 8000-20000Hz
        };
        
        this.smoothingFactors = {
            amplitude: 0.85,
            spectrum: 0.75,
            subBass: 0.9,
            bass: 0.85,
            lowMid: 0.8,
            highMid: 0.75,
            presence: 0.7,
            brilliance: 0.65
        };
        
        this.wsClient = null;
        this.animationId = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Liquid Glass Flow Orb...');
            
            // Create Enhanced Flow Orb with integrated frequency visualization
            await this.createLiquidGlassFlowOrb();
            
            // Setup interactions
            this.setupInteractions();
            
            // Initialize WebSocket
            this.initWebSocket();
            
            // Start animation loop
            this.animate();
            
            this.updateConnectionStatus(false, 'Ready');
            this.isInitialized = true;
            
            console.log('Liquid Glass Flow Orb initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Liquid Glass Flow Orb:', error);
            this.updateConnectionStatus(false, 'Error');
        }
    }

    async createLiquidGlassFlowOrb() {
        const canvas = document.getElementById('flow-orb-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        
        renderer.setSize(300, 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 8;
        
        // Create liquid glass central sphere
        const centralSphere = this.createLiquidGlassSphere();
        scene.add(centralSphere);
        
        // Create circular frequency visualization
        const frequencyCircle = this.createFrequencyCircle();
        scene.add(frequencyCircle);
        
        // Create flowing liquid lines
        const liquidFlowLines = this.createLiquidFlowSystem();
        scene.add(liquidFlowLines);
        
        // Create frequency bars in circular arrangement
        const circularFrequencyBars = this.createCircularFrequencyBars();
        scene.add(circularFrequencyBars);
        
        // Enhanced lighting for liquid glass effect
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        const pointLight1 = new THREE.PointLight(0x3B82F6, 2, 25);
        pointLight1.position.set(5, 5, 5);
        const pointLight2 = new THREE.PointLight(0x60A5FA, 1.5, 20);
        pointLight2.position.set(-5, -3, 8);
        const pointLight3 = new THREE.PointLight(0x2563EB, 1, 15);
        pointLight3.position.set(0, -5, 3);
        
        scene.add(ambientLight, pointLight1, pointLight2, pointLight3);
        
        this.flowOrb = {
            scene,
            camera,
            renderer,
            centralSphere,
            frequencyCircle,
            liquidFlowLines,
            circularFrequencyBars,
            pointLight1,
            pointLight2,
            pointLight3,
            timeline: gsap.timeline({ repeat: -1 })
        };
        
        // Ambient rotation animations
        this.flowOrb.timeline.to(liquidFlowLines.rotation, {
            y: Math.PI * 2,
            duration: 40,
            ease: "none"
        });
        
        this.flowOrb.timeline.to(frequencyCircle.rotation, {
            z: Math.PI * 2,
            duration: 30,
            ease: "none"
        }, 0);
        
        console.log('Liquid Glass Flow Orb created');
    }

    createLiquidGlassSphere() {
        const geometry = new THREE.IcosahedronGeometry(1.2, 4);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x3B82F6,
            metalness: 0.1,
            roughness: 0.05,
            transparent: true,
            opacity: 0.3,
            transmission: 0.9,
            thickness: 1.5,
            ior: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            emissive: 0x1E40AF,
            emissiveIntensity: 0.2
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.userData = {
            originalPositions: geometry.attributes.position.array.slice()
        };
        
        return sphere;
    }

    createFrequencyCircle() {
        const group = new THREE.Group();
        const radius = 2.5;
        const segments = 128; // Number of frequency segments
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Create frequency bar as a line extending inward
            const geometry = new THREE.CylinderGeometry(0.01, 0.02, 0.5, 6);
            const hue = (i / segments) * 0.3 + 0.55; // Blue spectrum
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(hue, 0.8, 0.6),
                transparent: true,
                opacity: 0.8,
                emissive: new THREE.Color().setHSL(hue, 0.8, 0.3),
                emissiveIntensity: 0.5
            });
            
            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(x, y, 0);
            bar.lookAt(0, 0, 0);
            bar.rotateX(Math.PI / 2);
            
            bar.userData = {
                angle: angle,
                index: i,
                originalLength: 0.5,
                originalColor: material.color.clone(),
                originalEmissive: material.emissive.clone()
            };
            
            group.add(bar);
        }
        
        return group;
    }

    createLiquidFlowSystem() {
        const group = new THREE.Group();
        const flowCount = 60;
        
        for (let i = 0; i < flowCount; i++) {
            const points = [];
            const segments = 25;
            
            // Create liquid flow paths
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const spiral = t * Math.PI * 8 + (i / flowCount) * Math.PI * 2;
                const radius = 1.8 + Math.sin(t * Math.PI * 2) * 0.4;
                const height = (t - 0.5) * 3 + Math.sin(spiral * 0.5) * 0.3;
                
                points.push(new THREE.Vector3(
                    Math.cos(spiral) * radius,
                    height,
                    Math.sin(spiral) * radius
                ));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, segments, 0.012, 8, false);
            
            // Liquid glass material
            const material = new THREE.MeshPhysicalMaterial({
                color: 0x60A5FA,
                metalness: 0.2,
                roughness: 0.1,
                transparent: true,
                opacity: 0.7,
                transmission: 0.3,
                thickness: 0.5,
                emissive: 0x2563EB,
                emissiveIntensity: 0.3
            });
            
            const flow = new THREE.Mesh(geometry, material);
            flow.userData = {
                originalPoints: points,
                index: i,
                phase: Math.random() * Math.PI * 2
            };
            
            group.add(flow);
        }
        
        return group;
    }

    createCircularFrequencyBars() {
        const group = new THREE.Group();
        const bandCount = 6;
        const barsPerBand = 12;
        const totalBars = bandCount * barsPerBand;
        
        const bandColors = [
            { color: 0xDC2626, name: 'subBass' },    // Red
            { color: 0xEA580C, name: 'bass' },       // Orange  
            { color: 0xCA8A04, name: 'lowMid' },     // Yellow
            { color: 0x16A34A, name: 'highMid' },    // Green
            { color: 0x2563EB, name: 'presence' },   // Blue
            { color: 0x7C3AED, name: 'brilliance' }  // Purple
        ];
        
        for (let band = 0; band < bandCount; band++) {
            const bandGroup = new THREE.Group();
            const innerRadius = 3.2 + band * 0.3;
            const bandColor = bandColors[band];
            
            for (let bar = 0; bar < barsPerBand; bar++) {
                const angle = (bar / barsPerBand) * Math.PI * 2;
                const x = Math.cos(angle) * innerRadius;
                const y = Math.sin(angle) * innerRadius;
                
                // Create liquid glass frequency bar
                const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.2);
                const material = new THREE.MeshPhysicalMaterial({
                    color: bandColor.color,
                    metalness: 0.3,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.8,
                    transmission: 0.2,
                    emissive: bandColor.color,
                    emissiveIntensity: 0.4
                });
                
                const barMesh = new THREE.Mesh(geometry, material);
                barMesh.position.set(x, y, 0);
                barMesh.userData = {
                    band: bandColor.name,
                    angle: angle,
                    originalScale: 1,
                    bandIndex: band,
                    barIndex: bar
                };
                
                bandGroup.add(barMesh);
            }
            
            group.add(bandGroup);
        }
        
        return group;
    }

    setupInteractions() {
        const orbWrapper = document.querySelector('[data-orb="flow"]');
        
        if (orbWrapper) {
            orbWrapper.addEventListener('click', () => {
                this.handleOrbClick();
            });
            
            orbWrapper.addEventListener('mouseenter', () => {
                this.handleOrbHover(true);
            });
            
            orbWrapper.addEventListener('mouseleave', () => {
                this.handleOrbHover(false);
            });
        }
        
        console.log('Interactions setup complete');
    }

    handleOrbClick() {
        const wrapper = document.querySelector('[data-orb="flow"]');
        
        // Ripple effect
        gsap.to(wrapper, {
            scale: 1.05,
            duration: 0.1,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        });
        
        // Liquid burst effect
        if (this.flowOrb) {
            gsap.to(this.flowOrb.centralSphere.scale, {
                x: 1.3,
                y: 1.3,
                z: 1.3,
                duration: 0.4,
                ease: "elastic.out(1, 0.3)",
                yoyo: true,
                repeat: 1
            });
        }
        
        console.log('Liquid Glass Flow orb clicked');
    }

    handleOrbHover(isHovering) {
        if (!this.flowOrb) return;
        
        // Increase light intensity and transmission on hover
        gsap.to(this.flowOrb.pointLight1, {
            intensity: isHovering ? 3 : 2,
            duration: 0.3
        });
        
        gsap.to(this.flowOrb.centralSphere.material, {
            transmission: isHovering ? 0.95 : 0.9,
            emissiveIntensity: isHovering ? 0.4 : 0.2,
            duration: 0.3
        });
    }

    initWebSocket() {
        try {
            this.wsClient = new WebSocketClient();
            
            this.wsClient.onAudioData = (data) => {
                this.processAudioData(data);
            };
            
            this.wsClient.onConnectionChange = (connected) => {
                this.updateConnectionStatus(connected, connected ? 'Connected' : 'Disconnected');
            };
            
            console.log('WebSocket initialized');
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.updateConnectionStatus(false, 'WebSocket Failed');
        }
    }

    processAudioData(data) {
        if (!data || !this.isInitialized) return;
        
        // Process frequency spectrum - handle both frequencyData and frequency fields
        const frequencyData = data.frequencyData || data.frequency;
        if (frequencyData && frequencyData.length > 0) {
            for (let i = 0; i < this.audioData.frequencySpectrum.length && i < frequencyData.length; i++) {
                const newValue = frequencyData[i] || 0;
                this.audioData.smoothedSpectrum[i] = this.smooth(
                    newValue, 
                    this.audioData.smoothedSpectrum[i], 
                    this.smoothingFactors.spectrum
                );
            }
        }
        
        // Extract 6-band frequency data
        const bands = this.extract6Bands(frequencyData || new Float32Array(1024));
        
        // Smooth the audio data
        this.audioData.amplitude = this.smooth(data.amplitude || 0, this.audioData.amplitude, this.smoothingFactors.amplitude);
        this.audioData.subBass = this.smooth(bands.subBass, this.audioData.subBass, this.smoothingFactors.subBass);
        this.audioData.bass = this.smooth(bands.bass, this.audioData.bass, this.smoothingFactors.bass);
        this.audioData.lowMid = this.smooth(bands.lowMid, this.audioData.lowMid, this.smoothingFactors.lowMid);
        this.audioData.highMid = this.smooth(bands.highMid, this.audioData.highMid, this.smoothingFactors.highMid);
        this.audioData.presence = this.smooth(bands.presence, this.audioData.presence, this.smoothingFactors.presence);
        this.audioData.brilliance = this.smooth(bands.brilliance, this.audioData.brilliance, this.smoothingFactors.brilliance);
        
        // Update Flow Orb visualization
        this.updateLiquidGlassVisualization();
    }

    extract6Bands(frequencyData) {
        const sampleRate = 44100;
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / frequencyData.length;
        
        const getBandEnergy = (minFreq, maxFreq) => {
            const startBin = Math.floor(minFreq / binWidth);
            const endBin = Math.floor(maxFreq / binWidth);
            let sum = 0;
            let count = 0;
            
            for (let i = startBin; i <= endBin && i < frequencyData.length; i++) {
                sum += frequencyData[i];
                count++;
            }
            
            return count > 0 ? sum / count / 255 : 0;
        };
        
        return {
            subBass: getBandEnergy(20, 60),
            bass: getBandEnergy(60, 250),
            lowMid: getBandEnergy(250, 1000),
            highMid: getBandEnergy(1000, 4000),
            presence: getBandEnergy(4000, 8000),
            brilliance: getBandEnergy(8000, 20000)
        };
    }

    updateLiquidGlassVisualization() {
        if (!this.flowOrb) return;
        
        const time = Date.now() * 0.001;
        
        // Update central liquid glass sphere
        this.updateLiquidSphere();
        
        // Update circular frequency visualization
        this.updateFrequencyCircle();
        
        // Update liquid flow lines
        this.updateLiquidFlows(time);
        
        // Update circular frequency bars
        this.updateCircularFrequencyBars();
        
        // Update lighting
        this.updateLighting();
    }

    updateLiquidSphere() {
        if (!this.flowOrb.centralSphere) return;
        
        // Scale with overall amplitude
        const scale = 1 + this.audioData.amplitude * 0.4;
        this.flowOrb.centralSphere.scale.setScalar(scale);
        
        // Liquid deformation based on frequency bands
        const geometry = this.flowOrb.centralSphere.geometry;
        const positions = geometry.attributes.position.array;
        const originalPositions = this.flowOrb.centralSphere.userData.originalPositions;
        
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = i / 3;
            const time = Date.now() * 0.002;
            
            // Multi-band deformation
            const deformation = 
                this.audioData.subBass * Math.sin(time + vertex * 0.1) * 0.1 +
                this.audioData.bass * Math.cos(time * 1.5 + vertex * 0.2) * 0.08 +
                this.audioData.presence * Math.sin(time * 3 + vertex * 0.3) * 0.05;
            
            positions[i] = originalPositions[i] * (1 + deformation);
            positions[i + 1] = originalPositions[i + 1] * (1 + deformation);
            positions[i + 2] = originalPositions[i + 2] * (1 + deformation);
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Update material properties
        this.flowOrb.centralSphere.material.emissiveIntensity = 0.2 + this.audioData.amplitude * 0.6;
        
        // Color shifting based on dominant frequencies
        const hue = 0.6 + this.audioData.highMid * 0.2;
        this.flowOrb.centralSphere.material.color.setHSL(hue, 0.8, 0.6);
        this.flowOrb.centralSphere.material.emissive.setHSL(hue, 0.9, 0.3);
    }

    updateFrequencyCircle() {
        if (!this.flowOrb.frequencyCircle) return;
        
        this.flowOrb.frequencyCircle.children.forEach((bar, index) => {
            const spectrumIndex = Math.floor((index / this.flowOrb.frequencyCircle.children.length) * this.audioData.smoothedSpectrum.length);
            const amplitude = this.audioData.smoothedSpectrum[spectrumIndex] / 255;
            
            // Scale bar based on frequency amplitude
            const scale = 0.5 + amplitude * 3;
            bar.scale.z = scale;
            
            // Color intensity
            bar.material.emissiveIntensity = 0.5 + amplitude * 1.5;
            bar.material.opacity = 0.8 + amplitude * 0.2;
            
            // Rotate bars slightly based on amplitude
            bar.rotation.z = amplitude * 0.2;
        });
    }

    updateLiquidFlows(time) {
        if (!this.flowOrb.liquidFlowLines) return;
        
        this.flowOrb.liquidFlowLines.children.forEach((flow, index) => {
            const flowData = flow.userData;
            
            // Multi-frequency response for liquid flow
            const bassResponse = this.audioData.bass * (1 + Math.sin(time * 2 + flowData.phase) * 0.5);
            const midResponse = this.audioData.lowMid * 0.8;
            const highResponse = this.audioData.brilliance * 0.6;
            
            // Scale and deformation
            const scale = 1 + bassResponse * 0.5 + midResponse * 0.3;
            flow.scale.setScalar(scale);
            
            // Vertical flow motion with multi-band influence
            const verticalMotion = Math.sin(time * 1.5 + flowData.phase + bassResponse * 4) * 0.4;
            const radialPulse = (1 + midResponse * 0.3);
            
            flow.position.y = verticalMotion;
            flow.scale.x = radialPulse;
            flow.scale.z = radialPulse;
            
            // Liquid transmission effect
            flow.material.transmission = 0.3 + highResponse * 0.4;
            flow.material.emissiveIntensity = 0.3 + bassResponse * 0.7;
            flow.material.opacity = 0.7 + this.audioData.presence * 0.3;
        });
    }

    updateCircularFrequencyBars() {
        if (!this.flowOrb.circularFrequencyBars) return;
        
        const bands = [
            this.audioData.subBass,
            this.audioData.bass,
            this.audioData.lowMid,
            this.audioData.highMid,
            this.audioData.presence,
            this.audioData.brilliance
        ];
        
        this.flowOrb.circularFrequencyBars.children.forEach((bandGroup, bandIndex) => {
            const bandValue = bands[bandIndex] || 0;
            
            bandGroup.children.forEach((bar, barIndex) => {
                // Create variation within each band
                const variation = 1 + Math.sin(Date.now() * 0.003 + barIndex * 0.5) * 0.3;
                const height = bandValue * variation * 2 + 0.2;
                
                bar.scale.z = height;
                bar.material.emissiveIntensity = 0.4 + bandValue * 1.2;
                bar.material.transmission = 0.2 + bandValue * 0.3;
                
                // Position bars outward based on amplitude
                const distance = 3.2 + bandIndex * 0.3 + bandValue * 0.5;
                const angle = bar.userData.angle;
                bar.position.x = Math.cos(angle) * distance;
                bar.position.y = Math.sin(angle) * distance;
            });
        });
    }

    updateLighting() {
        if (!this.flowOrb) return;
        
        // Reactive lighting based on audio
        this.flowOrb.pointLight1.intensity = 2 + this.audioData.bass * 3;
        this.flowOrb.pointLight2.intensity = 1.5 + this.audioData.presence * 2.5;
        this.flowOrb.pointLight3.intensity = 1 + this.audioData.brilliance * 2;
        
        // Color shifting lights
        const time = Date.now() * 0.001;
        const hue1 = (0.6 + this.audioData.highMid * 0.2 + Math.sin(time * 0.5) * 0.1) % 1;
        const hue2 = (0.55 + this.audioData.lowMid * 0.3 + Math.cos(time * 0.3) * 0.1) % 1;
        
        this.flowOrb.pointLight1.color.setHSL(hue1, 0.8, 0.6);
        this.flowOrb.pointLight2.color.setHSL(hue2, 0.7, 0.7);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Render Flow Orb
        if (this.flowOrb && this.flowOrb.renderer && this.flowOrb.scene && this.flowOrb.camera) {
            this.flowOrb.renderer.render(this.flowOrb.scene, this.flowOrb.camera);
        }
        
        this.updatePerformanceMetrics();
    }

    updatePerformanceMetrics() {
        const fps = Math.round(1 / (performance.now() - (this.lastFrameTime || performance.now())) * 1000);
        this.lastFrameTime = performance.now();
        
        const fpsElement = document.querySelector('.fps-counter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${fps}`;
        }
    }

    updateConnectionStatus(connected, message) {
        const statusDot = document.querySelector('.status-dot');
        
        if (statusDot) {
            statusDot.classList.toggle('connected', connected);
        }
        
        console.log(`Connection status: ${message}`);
    }

    smooth(newValue, oldValue, factor) {
        return oldValue * factor + newValue * (1 - factor);
    }

    onResize() {
        if (this.flowOrb && this.flowOrb.renderer) {
            const size = this.getOrbSize();
            this.flowOrb.renderer.setSize(size, size);
        }
    }

    getOrbSize() {
        if (window.innerWidth <= 768) return 200;
        if (window.innerWidth <= 1024) return 250;
        return 300;
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.flowOrb) {
            if (this.flowOrb.scene) {
                this.flowOrb.scene.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            
            if (this.flowOrb.renderer) {
                this.flowOrb.renderer.dispose();
            }
            
            if (this.flowOrb.timeline) {
                this.flowOrb.timeline.kill();
            }
        }
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
        
        console.log('Liquid Glass Flow Orb disposed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Liquid Glass Flow Orb...');
    
    try {
        const visualization = new FlowOrbVisualization();
        
        window.addEventListener('resize', () => {
            visualization.onResize();
        });
        
        window.addEventListener('beforeunload', () => {
            visualization.dispose();
        });
        
        // Enable dev mode with Ctrl+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                const metrics = document.querySelector('.performance-metrics');
                metrics.classList.toggle('show');
            }
        });
        
    } catch (error) {
        console.error('Critical error:', error);
        document.querySelector('.status-dot').style.background = '#EF4444';
    }
});