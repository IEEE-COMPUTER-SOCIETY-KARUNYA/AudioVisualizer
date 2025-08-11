class LiquidAudioVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Main liquid orb
        this.liquidOrb = null;
        this.ribbons = [];
        
        // Particles
        this.ambientParticles = null;
        this.reactiveParticles = [];
        
        // Audio processing
        this.audioProcessor = null;
        this.wsClient = null;
        
        // Animation
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // Performance monitoring
        this.performanceMonitor = {
            fps: 60,
            frameCount: 0,
            lastTime: performance.now()
        };
        
        // Audio uniforms (6-band system)
        this.audioUniforms = {
            time: { value: 0 },
            audioAmplitude: { value: 0 },
            subBass: { value: 0 },        // 20-60Hz
            bass: { value: 0 },           // 60-250Hz  
            lowMid: { value: 0 },         // 250-1000Hz
            highMid: { value: 0 },        // 1000-4000Hz
            presence: { value: 0 },       // 4000-8000Hz
            brilliance: { value: 0 }      // 8000-20000Hz
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('Setting up scene...');
            await this.setupScene();
            
            console.log('Creating liquid orb...');
            await this.createLiquidOrb();
            
            console.log('Creating ribbons...');
            await this.createRibbons();
            
            console.log('Creating particle systems...');
            await this.createParticleSystems();
            
            console.log('Setting up lighting...');
            await this.setupLighting();
            
            console.log('Setting up post-processing...');
            await this.setupPostProcessing();
            
            console.log('Setting up controls...');
            this.setupControls();
            
            console.log('Initializing audio processor...');
            this.initAudioProcessor();
            
            console.log('Initializing WebSocket...');
            this.initWebSocket();
            
            console.log('Starting animation loop...');
            this.animate();
            
            // Update status to show success
            this.updateConnectionStatus(false, 'Liquid AI Ready');
            
            console.log('Liquid AI Orb initialization complete!');
        } catch (error) {
            console.error('Critical error during initialization:', error);
            this.updateConnectionStatus(false, 'Initialization Failed');
            throw error;
        }
    }

    async setupScene() {
        const canvas = document.getElementById('visualization-canvas');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000033, 0.001);
        
        // Camera with better positioning for liquid orb
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 0, 15);
        
        // Renderer with enhanced settings for liquid metal
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Enable required WebGL extensions
        this.renderer.getContext().getExtension('OES_standard_derivatives');
        this.renderer.getContext().getExtension('EXT_shader_texture_lod');
    }

    async createLiquidOrb() {
        try {
            // High-resolution IcoSphere (subdivisions: 6 for ~80k vertices)
            const geometry = new THREE.IcosahedronGeometry(5, 6);
            geometry.computeVertexNormals();
            geometry.computeTangents();
            
            // Check if shaders are available
            if (!window.liquidOrbVertexShader || !window.liquidOrbFragmentShader) {
                throw new Error('Liquid orb shaders not loaded');
            }
            
            // Apply the liquid metal shader
            const material = new THREE.ShaderMaterial({
                uniforms: this.audioUniforms,
                vertexShader: window.liquidOrbVertexShader,
                fragmentShader: window.liquidOrbFragmentShader,
                transparent: false,
                side: THREE.DoubleSide,
                extensions: {
                    derivatives: true
                }
            });
            
            this.liquidOrb = new THREE.Mesh(geometry, material);
            this.liquidOrb.castShadow = true;
            this.liquidOrb.receiveShadow = true;
            this.scene.add(this.liquidOrb);
            
            console.log(`Liquid orb created with ${geometry.attributes.position.count} vertices`);
        } catch (error) {
            console.error('Failed to create liquid orb:', error);
            
            // Create fallback simple orb
            const geometry = new THREE.SphereGeometry(5, 32, 16);
            const material = new THREE.MeshPhongMaterial({
                color: 0x4A90E2,
                shininess: 100,
                transparent: true,
                opacity: 0.8
            });
            
            this.liquidOrb = new THREE.Mesh(geometry, material);
            this.liquidOrb.castShadow = true;
            this.liquidOrb.receiveShadow = true;
            this.scene.add(this.liquidOrb);
            
            console.log('Created fallback sphere orb');
        }
    }

    async createRibbons() {
        try {
            const ribbonCount = 4;
            
            for (let i = 0; i < ribbonCount; i++) {
                const ribbon = this.createSingleRibbon(i, ribbonCount);
                if (ribbon) {
                    this.ribbons.push(ribbon);
                    this.scene.add(ribbon);
                }
            }
            
            console.log(`Created ${this.ribbons.length} ribbons`);
        } catch (error) {
            console.error('Failed to create ribbons:', error);
            // Continue without ribbons
        }
    }

    createSingleRibbon(index, total) {
        try {
            // Create twisted ribbon geometry
            const points = [];
            const segments = 100;
            const radius = 2.5;
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const angle = t * Math.PI * 4 + (index / total) * Math.PI * 2;
                const y = (t - 0.5) * 8;
                const r = radius * (1 + Math.sin(t * Math.PI * 3) * 0.3);
                
                points.push(new THREE.Vector3(
                    Math.cos(angle) * r,
                    y,
                    Math.sin(angle) * r
                ));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.1, 8, false);
            
            let ribbonMaterial;
            
            // Check if ribbon shaders are available
            if (window.ribbonVertexShader && window.ribbonFragmentShader) {
                ribbonMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        ...this.audioUniforms
                    },
                    vertexShader: window.ribbonVertexShader,
                    fragmentShader: window.ribbonFragmentShader,
                    transparent: true,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                });
            } else {
                // Fallback material
                ribbonMaterial = new THREE.MeshBasicMaterial({
                    color: 0x4A90E2,
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending
                });
            }
            
            const ribbon = new THREE.Mesh(tubeGeometry, ribbonMaterial);
            ribbon.rotation.y = (index / total) * Math.PI * 2;
            
            return ribbon;
        } catch (error) {
            console.error(`Failed to create ribbon ${index}:`, error);
            return null;
        }
    }

    async createParticleSystems() {
        this.createAmbientParticles();
    }

    createAmbientParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const iridescent = [
            [0.290, 0.565, 0.886], // Blue
            [0.608, 0.349, 0.714], // Purple
            [0.953, 0.612, 0.071], // Orange
            [0.102, 0.737, 0.612], // Teal
            [0.906, 0.298, 0.235]  // Red
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Distribute around orb
            const radius = 8 + Math.random() * 12;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Iridescent colors
            const colorIndex = Math.floor(Math.random() * iridescent.length);
            const color = iridescent[colorIndex];
            colors[i3] = color[0];
            colors[i3 + 1] = color[1];
            colors[i3 + 2] = color[2];
            
            sizes[i] = Math.random() * 0.03 + 0.01;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.ambientParticles = new THREE.Points(geometry, material);
        this.scene.add(this.ambientParticles);
    }

    async setupLighting() {
        // HDRI environment (simulated)
        const loader = new THREE.CubeTextureLoader();
        
        // Key directional light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        this.scene.add(keyLight);
        
        // Audio-reactive fill lights
        this.fillLight1 = new THREE.PointLight(0x4A90E2, 0.5, 30);
        this.fillLight1.position.set(-10, 0, 0);
        this.scene.add(this.fillLight1);
        
        this.fillLight2 = new THREE.PointLight(0xE74C3C, 0.5, 30);
        this.fillLight2.position.set(10, 0, 0);
        this.scene.add(this.fillLight2);
        
        // Rim light
        const rimLight = new THREE.SpotLight(0xffffff, 2.0);
        rimLight.position.set(0, 0, 15);
        rimLight.angle = 0.5;
        rimLight.penumbra = 0.5;
        this.scene.add(rimLight);
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
    }

    async setupPostProcessing() {
        // Load post-processing scripts if available
        if (typeof THREE.EffectComposer !== 'undefined') {
            this.composer = new THREE.EffectComposer(this.renderer);
            
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            // Bloom pass for liquid metal glow
            if (typeof THREE.UnrealBloomPass !== 'undefined') {
                this.bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    1.5,  // strength
                    0.5,  // radius  
                    0.8   // threshold
                );
                this.composer.addPass(this.bloomPass);
            }
            
            // FXAA for antialiasing
            if (typeof THREE.FXAAShader !== 'undefined') {
                const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
                fxaaPass.material.uniforms['resolution'].value.x = 1 / window.innerWidth;
                fxaaPass.material.uniforms['resolution'].value.y = 1 / window.innerHeight;
                this.composer.addPass(fxaaPass);
            }
        }
        
        console.log('Post-processing setup completed');
    }

    setupControls() {
        // Orbit controls for camera interaction (if available)
        if (typeof THREE.OrbitControls !== 'undefined') {
            try {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.autoRotate = true;
                this.controls.autoRotateSpeed = 0.5;
                this.controls.minDistance = 8;
                this.controls.maxDistance = 25;
                this.controls.enablePan = false;
                console.log('OrbitControls initialized successfully');
            } catch (error) {
                console.warn('OrbitControls failed to initialize:', error);
                this.controls = null;
            }
        } else {
            console.warn('OrbitControls not available, using basic camera');
            this.controls = null;
            
            // Add basic mouse interaction
            this.setupBasicCameraControls();
        }
    }
    
    setupBasicCameraControls() {
        let mouseX = 0;
        let mouseY = 0;
        
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Apply smooth camera movement in animate loop
        this.basicCameraTarget = { x: 0, y: 0 };
        this.mouseInteraction = { x: mouseX, y: mouseY };
    }

    initAudioProcessor() {
        this.audioProcessor = new AudioProcessor();
        this.audioProcessor.onDataUpdate = (data) => {
            this.updateVisualization(data);
        };
    }

    initWebSocket() {
        this.wsClient = new WebSocketClient();
        this.wsClient.onAudioData = (data) => {
            this.audioProcessor.processAudioData(data);
        };
        
        this.wsClient.onConnectionChange = (connected) => {
            this.updateConnectionStatus(connected);
        };
    }

    updateVisualization(audioData) {
        if (!audioData) return;
        
        // Update 6-band frequency system
        const bands = this.extractSixBands(audioData);
        
        // Smooth the audio data
        this.audioUniforms.audioAmplitude.value = this.smooth(audioData.amplitude, this.audioUniforms.audioAmplitude.value, 0.85);
        this.audioUniforms.subBass.value = this.smooth(bands.subBass, this.audioUniforms.subBass.value, 0.9);
        this.audioUniforms.bass.value = this.smooth(bands.bass, this.audioUniforms.bass.value, 0.85);
        this.audioUniforms.lowMid.value = this.smooth(bands.lowMid, this.audioUniforms.lowMid.value, 0.8);
        this.audioUniforms.highMid.value = this.smooth(bands.highMid, this.audioUniforms.highMid.value, 0.7);
        this.audioUniforms.presence.value = this.smooth(bands.presence, this.audioUniforms.presence.value, 0.6);
        this.audioUniforms.brilliance.value = this.smooth(bands.brilliance, this.audioUniforms.brilliance.value, 0.5);
        
        // Update lighting based on audio
        this.fillLight1.intensity = 0.5 + bands.bass * 0.5;
        this.fillLight2.intensity = 0.5 + bands.highMid * 0.5;
        
        // Beat detection effects
        if (audioData.beat) {
            this.triggerBeatEffect(bands);
        }
        
        // Update UI frequency bars
        this.updateFrequencyBars(bands);
    }

    extractSixBands(audioData) {
        if (!audioData.frequency) {
            return {
                subBass: 0, bass: 0, lowMid: 0, 
                highMid: 0, presence: 0, brilliance: 0
            };
        }
        
        const freq = audioData.frequency;
        const sampleRate = 44100;
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / freq.length;
        
        const getBandEnergy = (minFreq, maxFreq) => {
            const startBin = Math.floor(minFreq / binWidth);
            const endBin = Math.floor(maxFreq / binWidth);
            let sum = 0;
            let count = 0;
            
            for (let i = startBin; i <= endBin && i < freq.length; i++) {
                sum += freq[i];
                count++;
            }
            
            return count > 0 ? sum / count : 0;
        };
        
        return {
            subBass: getBandEnergy(20, 60),      // Sub-bass
            bass: getBandEnergy(60, 250),        // Bass  
            lowMid: getBandEnergy(250, 1000),    // Low-mid
            highMid: getBandEnergy(1000, 4000),  // High-mid
            presence: getBandEnergy(4000, 8000), // Presence
            brilliance: getBandEnergy(8000, 20000) // Brilliance
        };
    }

    triggerBeatEffect(bands) {
        // Radial pulse for kick drum (sub-bass/bass)
        if (bands.subBass > 0.7 || bands.bass > 0.6) {
            gsap.to(this.liquidOrb.scale, {
                x: 1.2,
                y: 1.2, 
                z: 1.2,
                duration: 0.2,
                ease: "elastic.out(1, 0.3)",
                yoyo: true,
                repeat: 1
            });
        }
        
        // Twist deformation for snare (mid frequencies)
        if (bands.lowMid > 0.5 || bands.highMid > 0.5) {
            this.ribbons.forEach((ribbon, index) => {
                gsap.to(ribbon.rotation, {
                    y: ribbon.rotation.y + Math.PI / 4,
                    duration: 0.15,
                    ease: "power3.out"
                });
            });
        }
        
        // Particle burst for hi-hats (high frequencies)
        if (bands.presence > 0.4 || bands.brilliance > 0.4) {
            this.createReactiveParticleBurst();
        }
    }

    createReactiveParticleBurst() {
        const burstCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(burstCount * 3);
        const velocities = new Float32Array(burstCount * 3);
        const colors = new Float32Array(burstCount * 3);
        
        for (let i = 0; i < burstCount; i++) {
            const i3 = i * 3;
            
            // Start from orb surface
            const radius = 5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Outward velocity
            const speed = 2 + Math.random() * 3;
            velocities[i3] = positions[i3] / radius * speed;
            velocities[i3 + 1] = positions[i3 + 1] / radius * speed;
            velocities[i3 + 2] = positions[i3 + 2] / radius * speed;
            
            // Bright colors
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i3 + 2] = 0.4 + Math.random() * 0.6;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Animate particles
        gsap.to(material, {
            opacity: 0,
            duration: 2,
            ease: "power2.out",
            onComplete: () => {
                this.scene.remove(particles);
                geometry.dispose();
                material.dispose();
            }
        });
        
        // Store reference for physics update
        particles.userData = { velocities: velocities };
        this.reactiveParticles.push(particles);
        
        // Remove from array after animation
        setTimeout(() => {
            const index = this.reactiveParticles.indexOf(particles);
            if (index > -1) {
                this.reactiveParticles.splice(index, 1);
            }
        }, 2000);
    }

    updateFrequencyBars(bands) {
        const bars = document.querySelectorAll('.freq-bar');
        if (bars.length !== 5) return;
        
        const bandValues = [
            bands.bass,
            bands.lowMid, 
            bands.highMid,
            bands.presence,
            bands.brilliance
        ];
        
        bars.forEach((bar, index) => {
            const height = Math.min(bandValues[index] * 100, 100);
            bar.style.height = `${height}%`;
            
            // Color based on frequency band
            const hue = (index / bars.length) * 280 + 200; // Blue to purple range
            bar.style.backgroundColor = `hsl(${hue}, 80%, 60%)`;
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        
        // Update time uniform
        this.audioUniforms.time.value = elapsed;
        
        // Update controls or basic camera
        if (this.controls) {
            this.controls.update();
        } else if (this.mouseInteraction) {
            // Basic camera auto-rotation and mouse interaction
            this.camera.position.x = Math.sin(elapsed * 0.1) * 15 + this.mouseInteraction.x * 2;
            this.camera.position.y = this.mouseInteraction.y * 3;
            this.camera.position.z = Math.cos(elapsed * 0.1) * 15;
            this.camera.lookAt(0, 0, 0);
        }
        
        // Animate ambient particles
        if (this.ambientParticles) {
            this.ambientParticles.rotation.y += 0.001;
            
            const positions = this.ambientParticles.geometry.attributes.position.array;
            const time = elapsed * 0.3;
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                
                // Gentle floating motion
                positions[i + 1] = y + Math.sin(time + x * 0.1 + z * 0.1) * 0.01;
            }
            
            this.ambientParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update reactive particles physics
        this.reactiveParticles.forEach(particles => {
            if (particles.userData.velocities) {
                const positions = particles.geometry.attributes.position.array;
                const velocities = particles.userData.velocities;
                
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += velocities[i] * delta;
                    positions[i + 1] += velocities[i + 1] * delta;
                    positions[i + 2] += velocities[i + 2] * delta;
                    
                    // Apply gravity and drag
                    velocities[i + 1] -= 0.1 * delta; // gravity
                    velocities[i] *= 0.98; // drag
                    velocities[i + 1] *= 0.98;
                    velocities[i + 2] *= 0.98;
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
            }
        });
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        // Render with post-processing if available, otherwise basic render
        if (this.composer) {
            // Update bloom based on audio
            if (this.bloomPass) {
                this.bloomPass.strength = 1.5 + this.audioUniforms.brilliance.value * 2.0;
                this.bloomPass.threshold = 0.8 - this.audioUniforms.audioAmplitude.value * 0.3;
            }
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updatePerformanceMetrics() {
        this.performanceMonitor.frameCount++;
        const now = performance.now();
        
        if (now - this.performanceMonitor.lastTime >= 1000) {
            this.performanceMonitor.fps = Math.round((this.performanceMonitor.frameCount * 1000) / (now - this.performanceMonitor.lastTime));
            this.performanceMonitor.frameCount = 0;
            this.performanceMonitor.lastTime = now;
            
            const fpsElement = document.querySelector('.fps-counter');
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${this.performanceMonitor.fps}`;
            }
        }
    }

    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) {
            statusDot.classList.toggle('connected', connected);
        }
        
        if (statusText) {
            statusText.textContent = connected ? 'Connected - Liquid AI Ready' : 'Disconnected';
        }
    }

    smooth(newValue, oldValue, factor) {
        return oldValue * factor + newValue * (1 - factor);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer size if available
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
        
        // Update bloom pass size if available
        if (this.bloomPass) {
            this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        }
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Dispose geometries and materials
        this.scene.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.audioProcessor) {
            this.audioProcessor.dispose();
        }
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all scripts to load
    setTimeout(() => {
        try {
            console.log('Initializing Liquid Audio Visualization...');
            const visualization = new LiquidAudioVisualization();
            
            window.addEventListener('resize', () => {
                visualization.onResize();
            });
            
            window.addEventListener('beforeunload', () => {
                visualization.dispose();
            });
            
            console.log('Liquid Audio Visualization initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Liquid Audio Visualization:', error);
            
            // Fallback to basic visualization
            document.querySelector('.status-text').textContent = 'Loading fallback visualization...';
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }, 500);
});