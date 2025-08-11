class MultiOrbVisualization {
    constructor() {
        this.orbs = {};
        this.audioData = {
            bass: 0,     // 20-250Hz
            mid: 0,      // 250-2000Hz
            highMid: 0,  // 2000-8000Hz
            high: 0      // 8000-20000Hz
        };
        
        this.wsClient = null;
        this.masterTimeline = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Multi-Orb Voice Assistant...');
            
            // Initialize GSAP master timeline
            this.setupGSAP();
            
            // Create individual orbs
            await this.createFlowOrb();
            await this.createWaveformOrb();
            await this.createGeometricOrb();
            await this.createRadialOrb();
            
            // Setup interactions
            this.setupInteractions();
            
            // Initialize WebSocket
            this.initWebSocket();
            
            // Start animation loop
            this.animate();
            
            this.updateConnectionStatus(false, 'Ready');
            this.isInitialized = true;
            
            console.log('Multi-Orb Voice Assistant initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Multi-Orb Voice Assistant:', error);
            this.updateConnectionStatus(false, 'Error');
        }
    }

    setupGSAP() {
        // Create master timeline for synchronized animations
        this.masterTimeline = gsap.timeline({ repeat: -1 });
        
        // Global defaults
        gsap.defaults({
            ease: "power2.inOut",
            duration: 0.3
        });
        
        console.log('GSAP animation system initialized');
    }

    async createFlowOrb() {
        const canvas = document.getElementById('flow-orb-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        
        renderer.setSize(200, 200);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 5;
        
        // Create flow lines system
        const flowLines = this.createFlowLines();
        scene.add(flowLines);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        const pointLight = new THREE.PointLight(0x3B82F6, 1, 10);
        pointLight.position.set(0, 0, 3);
        scene.add(ambientLight, pointLight);
        
        this.orbs.flow = {
            scene,
            camera,
            renderer,
            flowLines,
            pointLight,
            timeline: gsap.timeline({ repeat: -1 }),
            audioReactive: {
                amplitude: 0,
                smoothedAmplitude: 0
            }
        };
        
        // Idle animation
        this.orbs.flow.timeline.to(flowLines.rotation, {
            y: Math.PI * 2,
            duration: 20,
            ease: "none"
        });
        
        console.log('Flow Orb created');
    }

    createFlowLines() {
        const group = new THREE.Group();
        const lineCount = 50;
        
        for (let i = 0; i < lineCount; i++) {
            const points = [];
            const segments = 20;
            
            // Create flowing bezier curve
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const angle = t * Math.PI * 4 + (i / lineCount) * Math.PI * 2;
                const radius = 1 + Math.sin(t * Math.PI * 3) * 0.5;
                
                points.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    (t - 0.5) * 3,
                    Math.sin(angle) * radius
                ));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, segments, 0.02, 6, false);
            const material = new THREE.MeshPhongMaterial({
                color: 0x3B82F6,
                transparent: true,
                opacity: 0.7,
                emissive: 0x1E40AF,
                emissiveIntensity: 0.2
            });
            
            const line = new THREE.Mesh(geometry, material);
            line.userData = { originalPoints: points, index: i };
            group.add(line);
        }
        
        return group;
    }

    async createWaveformOrb() {
        const canvas = document.getElementById('waveform-orb-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        
        renderer.setSize(200, 200);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 5;
        
        // Create waveform mesh
        const waveformMesh = this.createWaveformMesh();
        scene.add(waveformMesh);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        const pointLight = new THREE.PointLight(0x8B5CF6, 1, 10);
        pointLight.position.set(0, 0, 3);
        scene.add(ambientLight, pointLight);
        
        this.orbs.waveform = {
            scene,
            camera,
            renderer,
            waveformMesh,
            pointLight,
            timeline: gsap.timeline({ repeat: -1 }),
            audioReactive: {
                waveform: new Float32Array(128),
                smoothedWaveform: new Float32Array(128)
            }
        };
        
        console.log('Waveform Orb created');
    }

    createWaveformMesh() {
        const samples = 128;
        const geometry = new THREE.SphereGeometry(1.5, samples, samples/2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x8B5CF6,
            transparent: true,
            opacity: 0.8,
            emissive: 0x4C1D95,
            emissiveIntensity: 0.3,
            wireframe: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { originalPositions: geometry.attributes.position.array.slice() };
        
        return mesh;
    }

    async createGeometricOrb() {
        const canvas = document.getElementById('geometric-orb-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        
        renderer.setSize(200, 200);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 5;
        
        // Create geometric mesh
        const geometricMesh = this.createGeometricMesh();
        scene.add(geometricMesh);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        const pointLight = new THREE.PointLight(0xEC4899, 1, 10);
        pointLight.position.set(0, 0, 3);
        scene.add(ambientLight, pointLight);
        
        this.orbs.geometric = {
            scene,
            camera,
            renderer,
            geometricMesh,
            pointLight,
            timeline: gsap.timeline({ repeat: -1 }),
            audioReactive: {
                frequency: 0,
                smoothedFrequency: 0
            }
        };
        
        // Idle rotation
        this.orbs.geometric.timeline.to(geometricMesh.rotation, {
            x: Math.PI * 2,
            y: Math.PI * 2,
            duration: 15,
            ease: "none"
        });
        
        console.log('Geometric Orb created');
    }

    createGeometricMesh() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 1); // Low-poly look
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xEC4899,
            metalness: 0.3,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9,
            transmission: 0.1,
            thickness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { 
            originalPositions: geometry.attributes.position.array.slice(),
            faceCount: geometry.attributes.position.count / 3
        };
        
        return mesh;
    }

    async createRadialOrb() {
        const canvas = document.getElementById('radial-orb-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        
        renderer.setSize(200, 200);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 5;
        
        // Create radial line system
        const radialLines = this.createRadialLines();
        scene.add(radialLines);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        const pointLight = new THREE.PointLight(0xD4A574, 1, 10);
        pointLight.position.set(0, 0, 3);
        scene.add(ambientLight, pointLight);
        
        this.orbs.radial = {
            scene,
            camera,
            renderer,
            radialLines,
            pointLight,
            timeline: gsap.timeline({ repeat: -1 }),
            audioReactive: {
                amplitude: 0,
                smoothedAmplitude: 0
            }
        };
        
        // Idle rotation
        this.orbs.radial.timeline.to(radialLines.rotation, {
            z: Math.PI * 2,
            duration: 25,
            ease: "none"
        });
        
        console.log('Radial Orb created');
    }

    createRadialLines() {
        const group = new THREE.Group();
        const lineCount = 360;
        
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            const geometry = new THREE.CylinderGeometry(0.005, 0.005, 1, 4);
            const material = new THREE.MeshPhongMaterial({
                color: 0xD4A574,
                transparent: true,
                opacity: 0.8,
                emissive: 0xB45309,
                emissiveIntensity: 0.2
            });
            
            const line = new THREE.Mesh(geometry, material);
            line.position.x = Math.cos(angle) * 0.5;
            line.position.z = Math.sin(angle) * 0.5;
            line.rotation.z = angle - Math.PI / 2;
            line.userData = { angle: angle, originalLength: 1 };
            
            group.add(line);
        }
        
        return group;
    }

    setupInteractions() {
        // Add hover and click effects to orb wrappers
        const orbWrappers = document.querySelectorAll('.orb-wrapper');
        
        orbWrappers.forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                this.handleOrbClick(wrapper.dataset.orb);
            });
            
            wrapper.addEventListener('mouseenter', () => {
                this.handleOrbHover(wrapper.dataset.orb, true);
            });
            
            wrapper.addEventListener('mouseleave', () => {
                this.handleOrbHover(wrapper.dataset.orb, false);
            });
        });
        
        console.log('Interactions setup complete');
    }

    handleOrbClick(orbType) {
        const wrapper = document.querySelector(`[data-orb="${orbType}"]`);
        
        // Ripple effect
        gsap.to(wrapper, {
            scale: 1.1,
            duration: 0.1,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        });
        
        // Add active class temporarily
        wrapper.classList.add('active');
        setTimeout(() => wrapper.classList.remove('active'), 300);
        
        console.log(`${orbType} orb clicked`);
    }

    handleOrbHover(orbType, isHovering) {
        const orb = this.orbs[orbType];
        if (!orb) return;
        
        // Increase light intensity on hover
        gsap.to(orb.pointLight, {
            intensity: isHovering ? 1.5 : 1,
            duration: 0.3,
            ease: "power2.out"
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
        
        // Extract 4-band frequency data
        const bands = this.extract4Bands(data.frequency || new Float32Array(1024));
        
        // Smooth the audio data
        this.audioData.bass = this.smooth(bands.bass, this.audioData.bass, 0.9);
        this.audioData.mid = this.smooth(bands.mid, this.audioData.mid, 0.85);
        this.audioData.highMid = this.smooth(bands.highMid, this.audioData.highMid, 0.8);
        this.audioData.high = this.smooth(bands.high, this.audioData.high, 0.7);
        
        // Update individual orbs
        this.updateFlowOrb();
        this.updateWaveformOrb(data.waveform);
        this.updateGeometricOrb();
        this.updateRadialOrb();
    }

    extract4Bands(frequencyData) {
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
            
            return count > 0 ? sum / count : 0;
        };
        
        return {
            bass: getBandEnergy(20, 250),      // Flow Orb
            mid: getBandEnergy(250, 2000),     // Waveform Orb
            highMid: getBandEnergy(2000, 8000), // Geometric Orb
            high: getBandEnergy(8000, 20000)    // Radial Orb
        };
    }

    updateFlowOrb() {
        const orb = this.orbs.flow;
        if (!orb) return;
        
        // Update amplitude
        orb.audioReactive.smoothedAmplitude = this.smooth(
            this.audioData.bass,
            orb.audioReactive.smoothedAmplitude,
            0.85
        );
        
        // Update flow lines based on bass
        orb.flowLines.children.forEach((line, index) => {
            const amplitude = orb.audioReactive.smoothedAmplitude;
            
            // Scale based on amplitude
            const scale = 1 + amplitude * 0.5;
            line.scale.setScalar(scale);
            
            // Color intensity
            line.material.emissiveIntensity = 0.2 + amplitude * 0.8;
            
            // Flow speed variation
            const flowOffset = Date.now() * 0.001 + index * 0.1;
            line.position.y = Math.sin(flowOffset + amplitude * 2) * 0.2;
        });
        
        // Light intensity
        orb.pointLight.intensity = 1 + orb.audioReactive.smoothedAmplitude * 2;
    }

    updateWaveformOrb(waveformData) {
        const orb = this.orbs.waveform;
        if (!orb || !waveformData) return;
        
        // Update waveform geometry
        const geometry = orb.waveformMesh.geometry;
        const positions = geometry.attributes.position.array;
        const originalPositions = orb.waveformMesh.userData.originalPositions;
        
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = i / 3;
            const waveIndex = Math.floor((vertex / (positions.length / 3)) * waveformData.length);
            const waveValue = waveformData[waveIndex] || 0;
            
            // Calculate displacement
            const displacement = waveValue * 0.3 * this.audioData.mid;
            
            // Apply to vertex position
            positions[i] = originalPositions[i] + originalPositions[i] * displacement;
            positions[i + 1] = originalPositions[i + 1] + originalPositions[i + 1] * displacement;
            positions[i + 2] = originalPositions[i + 2] + originalPositions[i + 2] * displacement;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Update material
        orb.waveformMesh.material.emissiveIntensity = 0.3 + this.audioData.mid * 0.7;
        orb.pointLight.intensity = 1 + this.audioData.mid * 2;
    }

    updateGeometricOrb() {
        const orb = this.orbs.geometric;
        if (!orb) return;
        
        // Face extrusion based on high-mid frequencies
        const geometry = orb.geometricMesh.geometry;
        const positions = geometry.attributes.position.array;
        const originalPositions = orb.geometricMesh.userData.originalPositions;
        
        for (let i = 0; i < positions.length; i += 9) { // Each face has 3 vertices * 3 components
            const extrusion = this.audioData.highMid * 0.3;
            
            for (let j = 0; j < 9; j += 3) {
                const index = i + j;
                const normal = new THREE.Vector3(
                    originalPositions[index],
                    originalPositions[index + 1],
                    originalPositions[index + 2]
                ).normalize();
                
                positions[index] = originalPositions[index] + normal.x * extrusion;
                positions[index + 1] = originalPositions[index + 1] + normal.y * extrusion;
                positions[index + 2] = originalPositions[index + 2] + normal.z * extrusion;
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Color mapping
        const hue = this.audioData.highMid * 360;
        orb.geometricMesh.material.color.setHSL(hue / 360, 0.7, 0.5);
        orb.pointLight.intensity = 1 + this.audioData.highMid * 2;
    }

    updateRadialOrb() {
        const orb = this.orbs.radial;
        if (!orb) return;
        
        // Update radial lines
        orb.radialLines.children.forEach((line, index) => {
            const amplitude = this.audioData.high;
            
            // Line length extension
            const length = 1 + amplitude * 2;
            line.scale.y = length;
            
            // Line thickness
            line.scale.x = 1 + amplitude * 0.5;
            line.scale.z = 1 + amplitude * 0.5;
            
            // Opacity variation
            line.material.opacity = 0.8 + amplitude * 0.2;
            
            // Emissive intensity
            line.material.emissiveIntensity = 0.2 + amplitude * 0.8;
            
            // Burst effect on peaks
            if (amplitude > 0.7) {
                line.position.x = Math.cos(line.userData.angle) * (0.5 + amplitude * 0.5);
                line.position.z = Math.sin(line.userData.angle) * (0.5 + amplitude * 0.5);
            } else {
                line.position.x = Math.cos(line.userData.angle) * 0.5;
                line.position.z = Math.sin(line.userData.angle) * 0.5;
            }
        });
        
        orb.pointLight.intensity = 1 + this.audioData.high * 2;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Render all orbs
        Object.values(this.orbs).forEach(orb => {
            if (orb.renderer && orb.scene && orb.camera) {
                orb.renderer.render(orb.scene, orb.camera);
            }
        });
        
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
        // Update all orb renderers on resize
        Object.values(this.orbs).forEach(orb => {
            if (orb.renderer) {
                const size = this.getOrbSize();
                orb.renderer.setSize(size, size);
            }
        });
    }

    getOrbSize() {
        if (window.innerWidth <= 768) return 120;
        if (window.innerWidth <= 1024) return 150;
        if (window.innerWidth <= 1200) return 160;
        return 200;
    }

    dispose() {
        // Clean up all orbs
        Object.values(this.orbs).forEach(orb => {
            if (orb.scene) {
                orb.scene.traverse((child) => {
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
            
            if (orb.renderer) {
                orb.renderer.dispose();
            }
            
            if (orb.timeline) {
                orb.timeline.kill();
            }
        });
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
        
        if (this.masterTimeline) {
            this.masterTimeline.kill();
        }
        
        console.log('Multi-Orb Visualization disposed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Multi-Orb Voice Assistant...');
    
    try {
        const visualization = new MultiOrbVisualization();
        
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