class LiquidMetalVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.liquidOrb = null;
        this.ribbons = [];
        this.particles = null;
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // Audio data with 6-band system
        this.audioData = {
            amplitude: 0,
            subBass: 0,     // 20-60Hz - scale pulsing
            bass: 0,        // 60-250Hz - large deformations  
            lowMid: 0,      // 250-1000Hz - ribbon twisting
            highMid: 0,     // 1000-4000Hz - surface detail
            presence: 0,    // 4000-8000Hz - iridescence
            brilliance: 0   // 8000-20000Hz - sparkles
        };
        
        // Iridescent color palette
        this.colors = {
            blue: new THREE.Color(0x4A90E2),
            purple: new THREE.Color(0x9B59B6),
            red: new THREE.Color(0xE74C3C),
            orange: new THREE.Color(0xF39C12),
            teal: new THREE.Color(0x1ABC9C)
        };
        
        this.init();
    }

    init() {
        try {
            console.log('Initializing Liquid Metal Visualization...');
            
            this.setupScene();
            this.createLiquidOrb();
            this.createRibbons();
            this.createParticles();
            this.setupLights();
            this.initWebSocket();
            this.animate();
            
            this.updateStatus('Liquid Metal AI Ready');
            console.log('Liquid Metal Visualization initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Liquid Metal Visualization:', error);
            this.updateStatus('Initialization Failed');
        }
    }

    setupScene() {
        const canvas = document.getElementById('visualization-canvas');
        
        // Scene with dark gradient background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        this.scene.fog = new THREE.FogExp2(0x000033, 0.002);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 0, 20);
        
        // Renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        console.log('Scene setup complete');
    }

    createLiquidOrb() {
        // High-resolution sphere for smooth deformation
        const geometry = new THREE.IcosahedronGeometry(5, 4); // ~5k vertices
        geometry.computeVertexNormals();
        
        // Create custom liquid metal material
        const material = new THREE.MeshPhysicalMaterial({
            color: this.colors.blue,
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            reflectivity: 1.0,
            transmission: 0.1,
            thickness: 0.5,
            ior: 1.45,
            envMapIntensity: 2.0
        });
        
        this.liquidOrb = new THREE.Mesh(geometry, material);
        this.liquidOrb.castShadow = true;
        this.liquidOrb.receiveShadow = true;
        this.scene.add(this.liquidOrb);
        
        // Store original vertex positions for deformation
        this.originalPositions = geometry.attributes.position.array.slice();
        this.noiseOffsets = new Float32Array(geometry.attributes.position.count);
        for (let i = 0; i < this.noiseOffsets.length; i++) {
            this.noiseOffsets[i] = Math.random() * Math.PI * 2;
        }
        
        console.log(`Liquid orb created with ${geometry.attributes.position.count} vertices`);
    }

    createRibbons() {
        const ribbonCount = 3;
        
        for (let i = 0; i < ribbonCount; i++) {
            const ribbon = this.createSingleRibbon(i, ribbonCount);
            if (ribbon) {
                this.ribbons.push(ribbon);
                this.scene.add(ribbon);
            }
        }
        
        console.log(`Created ${this.ribbons.length} ribbons`);
    }

    createSingleRibbon(index, total) {
        try {
            // Create twisted ribbon path
            const points = [];
            const segments = 50;
            const radius = 2.5;
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const angle = t * Math.PI * 3 + (index / total) * Math.PI * 2;
                const y = (t - 0.5) * 6;
                const r = radius * (0.8 + Math.sin(t * Math.PI * 2) * 0.2);
                
                points.push(new THREE.Vector3(
                    Math.cos(angle) * r,
                    y,
                    Math.sin(angle) * r
                ));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.05, 6, false);
            
            // Iridescent ribbon material
            const ribbonMaterial = new THREE.MeshPhysicalMaterial({
                color: Object.values(this.colors)[index % 5],
                metalness: 0.8,
                roughness: 0.2,
                transparent: true,
                opacity: 0.7,
                transmission: 0.3,
                thickness: 0.2,
                emissive: Object.values(this.colors)[index % 5],
                emissiveIntensity: 0.1
            });
            
            const ribbon = new THREE.Mesh(tubeGeometry, ribbonMaterial);
            ribbon.rotation.y = (index / total) * Math.PI * 2;
            
            return ribbon;
        } catch (error) {
            console.error(`Failed to create ribbon ${index}:`, error);
            return null;
        }
    }

    createParticles() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const colorValues = Object.values(this.colors);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Distribute around orb
            const radius = 8 + Math.random() * 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Iridescent particle colors
            const color = colorValues[Math.floor(Math.random() * colorValues.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            sizes[i] = Math.random() * 0.02 + 0.005;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.01,
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        console.log('Particles created');
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Key directional light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);
        
        // Audio-reactive point lights
        this.audioLights = [];
        
        const light1 = new THREE.PointLight(this.colors.blue.getHex(), 0.8, 30);
        light1.position.set(-10, 0, 0);
        this.scene.add(light1);
        this.audioLights.push(light1);
        
        const light2 = new THREE.PointLight(this.colors.purple.getHex(), 0.8, 30);
        light2.position.set(10, 0, 0);
        this.scene.add(light2);
        this.audioLights.push(light2);
        
        const light3 = new THREE.PointLight(this.colors.orange.getHex(), 0.6, 25);
        light3.position.set(0, 10, 5);
        this.scene.add(light3);
        this.audioLights.push(light3);
        
        console.log('Lighting setup complete');
    }

    initWebSocket() {
        try {
            this.wsClient = new WebSocketClient();
            
            this.wsClient.onAudioData = (data) => {
                this.processAudioData(data);
            };
            
            this.wsClient.onConnectionChange = (connected) => {
                this.updateStatus(connected ? 'Connected - Liquid Metal Active' : 'Disconnected');
            };
            
            console.log('WebSocket initialized');
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.updateStatus('WebSocket Failed');
        }
    }

    processAudioData(data) {
        if (!data) return;
        
        // Extract 6-band frequency data
        this.audioData.amplitude = this.smooth(data.amplitude || 0, this.audioData.amplitude, 0.85);
        
        if (data.frequency && data.frequency.length > 0) {
            const freq = data.frequency;
            const bands = this.extract6Bands(freq);
            
            this.audioData.subBass = this.smooth(bands.subBass, this.audioData.subBass, 0.9);
            this.audioData.bass = this.smooth(bands.bass, this.audioData.bass, 0.85);
            this.audioData.lowMid = this.smooth(bands.lowMid, this.audioData.lowMid, 0.8);
            this.audioData.highMid = this.smooth(bands.highMid, this.audioData.highMid, 0.75);
            this.audioData.presence = this.smooth(bands.presence, this.audioData.presence, 0.7);
            this.audioData.brilliance = this.smooth(bands.brilliance, this.audioData.brilliance, 0.65);
        }
        
        this.updateFrequencyBars();
    }

    extract6Bands(freq) {
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
            subBass: getBandEnergy(20, 60),
            bass: getBandEnergy(60, 250),
            lowMid: getBandEnergy(250, 1000),
            highMid: getBandEnergy(1000, 4000),
            presence: getBandEnergy(4000, 8000),
            brilliance: getBandEnergy(8000, 20000)
        };
    }

    smooth(newValue, oldValue, factor) {
        return oldValue * factor + newValue * (1 - factor);
    }

    updateFrequencyBars() {
        const bars = document.querySelectorAll('.freq-bar');
        if (bars.length >= 3) {
            const values = [this.audioData.bass, this.audioData.highMid, this.audioData.brilliance];
            
            values.forEach((value, index) => {
                if (bars[index]) {
                    const height = Math.min(value * 100, 100);
                    bars[index].style.height = `${height}%`;
                    
                    // Iridescent colors for bars
                    const hues = [240, 280, 320]; // Blue to purple to pink
                    bars[index].style.backgroundColor = `hsl(${hues[index]}, 80%, ${50 + value * 30}%)`;
                }
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const elapsed = this.clock.getElapsedTime();
        
        // Update liquid orb deformation
        if (this.liquidOrb) {
            this.updateLiquidDeformation(elapsed);
            this.updateLiquidMaterial(elapsed);
        }
        
        // Animate ribbons
        this.ribbons.forEach((ribbon, index) => {
            ribbon.rotation.y += (0.002 + this.audioData.lowMid * 0.01);
            ribbon.rotation.z = Math.sin(elapsed + index) * 0.2;
            
            // Update ribbon material
            const intensity = 0.1 + this.audioData.presence * 0.3;
            ribbon.material.emissiveIntensity = intensity;
        });
        
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.0005;
            
            // Audio-reactive particle movement
            const positions = this.particles.geometry.attributes.position.array;
            const time = elapsed * 0.3;
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                
                positions[i + 1] = y + Math.sin(time + x * 0.05 + z * 0.05) * this.audioData.brilliance * 0.2;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update audio-reactive lighting
        this.audioLights.forEach((light, index) => {
            const audioValue = [this.audioData.bass, this.audioData.highMid, this.audioData.presence][index] || 0;
            light.intensity = 0.8 + audioValue * 1.5;
            
            // Orbit lights around the orb
            const angle = elapsed * (0.2 + index * 0.1) + index * (Math.PI * 2 / 3);
            const radius = 12 + Math.sin(elapsed + index) * 2;
            light.position.x = Math.cos(angle) * radius;
            light.position.z = Math.sin(angle) * radius;
            light.position.y = Math.sin(elapsed * 0.3 + index) * 3;
        });
        
        // Camera auto-rotation
        const cameraRadius = 20 + Math.sin(elapsed * 0.1) * 2;
        this.camera.position.x = Math.sin(elapsed * 0.05) * cameraRadius;
        this.camera.position.z = Math.cos(elapsed * 0.05) * cameraRadius;
        this.camera.position.y = Math.sin(elapsed * 0.03) * 5;
        this.camera.lookAt(0, 0, 0);
        
        this.updateFPS();
        this.renderer.render(this.scene, this.camera);
    }

    updateLiquidDeformation(elapsed) {
        const geometry = this.liquidOrb.geometry;
        const positions = geometry.attributes.position.array;
        
        // Apply multi-layer noise deformation
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = i / 3;
            const originalX = this.originalPositions[i];
            const originalY = this.originalPositions[i + 1];
            const originalZ = this.originalPositions[i + 2];
            
            // Calculate normal
            const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
            const nx = originalX / length;
            const ny = originalY / length;
            const nz = originalZ / length;
            
            // Layer 1: Bass-driven large waves
            const noise1 = Math.sin(elapsed * 0.5 + originalX * 0.3 + this.noiseOffsets[vertex]);
            const displacement1 = noise1 * this.audioData.bass * 0.3;
            
            // Layer 2: Mid-frequency surface detail
            const noise2 = Math.sin(elapsed * 1.2 + originalY * 0.8 + this.noiseOffsets[vertex] * 2);
            const displacement2 = noise2 * this.audioData.highMid * 0.15;
            
            // Layer 3: High-frequency fine detail
            const noise3 = Math.sin(elapsed * 2.0 + originalZ * 1.5 + this.noiseOffsets[vertex] * 3);
            const displacement3 = noise3 * this.audioData.brilliance * 0.08;
            
            // Sub-bass scale pulsing
            const scalePulse = 1.0 + this.audioData.subBass * 0.2;
            
            // Apply displacement along normal
            const totalDisplacement = (displacement1 + displacement2 + displacement3) * scalePulse;
            
            positions[i] = originalX * scalePulse + nx * totalDisplacement;
            positions[i + 1] = originalY * scalePulse + ny * totalDisplacement;
            positions[i + 2] = originalZ * scalePulse + nz * totalDisplacement;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    updateLiquidMaterial(elapsed) {
        const material = this.liquidOrb.material;
        
        // Iridescent color cycling based on presence frequency
        const colorPhase = elapsed * 0.1 + this.audioData.presence * 2;
        const colorIndex = Math.floor(colorPhase * 5) % 5;
        const colorKeys = Object.keys(this.colors);
        const currentColor = this.colors[colorKeys[colorIndex]];
        const nextColor = this.colors[colorKeys[(colorIndex + 1) % 5]];
        
        const blend = (colorPhase * 5) % 1;
        material.color.lerpColors(currentColor, nextColor, blend);
        
        // Emissive intensity based on amplitude
        material.emissiveIntensity = this.audioData.amplitude * 0.2;
        material.emissive.copy(material.color).multiplyScalar(0.3);
        
        // Metalness and roughness variation
        material.metalness = 0.9 - this.audioData.brilliance * 0.2;
        material.roughness = 0.1 + this.audioData.highMid * 0.15;
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
        
        console.log('Liquid Metal Visualization disposed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Liquid Metal Visualization...');
    
    try {
        const visualization = new LiquidMetalVisualization();
        
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