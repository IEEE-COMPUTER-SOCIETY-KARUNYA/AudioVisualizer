class AudioVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.particles = null;
        this.audioProcessor = null;
        this.wsClient = null;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.uniforms = {
            time: { value: 0 },
            audioData: { value: new Float32Array(128) },
            frequencyData: { value: new Float32Array(1024) },
            amplitude: { value: 0 },
            bassEnergy: { value: 0 },
            midEnergy: { value: 0 },
            highEnergy: { value: 0 }
        };
        
        this.init();
    }

    init() {
        this.setupScene();
        this.createSphere();
        this.createParticles();
        this.createLights();
        this.setupPostProcessing();
        this.setupEventListeners();
        this.initAudioProcessor();
        this.initWebSocket();
        this.animate();
    }

    setupScene() {
        const canvas = document.getElementById('visualization-canvas');
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 1, 100);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 30;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const gradientTexture = this.createGradientBackground();
        this.scene.background = gradientTexture;
    }

    createGradientBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        const gradient = context.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#0a0a1f');
        gradient.addColorStop(0.5, '#1a1a3e');
        gradient.addColorStop(1, '#000000');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        return texture;
    }

    createSphere() {
        const geometry = new THREE.IcosahedronGeometry(8, 5);
        geometry.computeVertexNormals();
        
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: window.vertexShader,
            fragmentShader: window.fragmentShader,
            transparent: true,
            wireframe: false,
            side: THREE.DoubleSide
        });
        
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);
        
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1
        });
        const wireframeMesh = new THREE.LineSegments(wireframe, wireMaterial);
        this.sphere.add(wireframeMesh);
    }

    createParticles() {
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = 15 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            colors[i3] = 0.5 + Math.random() * 0.5;
            colors[i3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i3 + 2] = 1.0;
            
            sizes[i] = Math.random() * 0.5 + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);
        
        this.orbitingLights = [];
        const lightColors = [0x00ff88, 0xff0088, 0x8800ff];
        
        for (let i = 0; i < 3; i++) {
            const light = new THREE.PointLight(lightColors[i], 1, 50);
            light.castShadow = true;
            this.scene.add(light);
            this.orbitingLights.push({
                light: light,
                angle: (Math.PI * 2 / 3) * i,
                radius: 20,
                speed: 0.5 + i * 0.1
            });
        }
        
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 10, 10);
        this.scene.add(rimLight);
    }

    setupPostProcessing() {
        
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
    }

    updateVisualization(audioData) {
        this.uniforms.audioData.value = audioData.waveform;
        this.uniforms.frequencyData.value = audioData.frequency;
        this.uniforms.amplitude.value = audioData.amplitude;
        this.uniforms.bassEnergy.value = audioData.bands.bass;
        this.uniforms.midEnergy.value = audioData.bands.mid;
        this.uniforms.highEnergy.value = audioData.bands.high;
        
        const bassScale = 1 + audioData.bands.bass * 0.3;
        gsap.to(this.sphere.scale, {
            x: bassScale,
            y: bassScale,
            z: bassScale,
            duration: 0.1,
            ease: "power2.out"
        });
        
        const rotationSpeed = 0.001 + audioData.amplitude * 0.01;
        this.sphere.rotation.y += rotationSpeed;
        this.sphere.rotation.x += rotationSpeed * 0.5;
        
        if (audioData.beat) {
            this.createBeatEffect();
        }
        
        this.updateFrequencyBars(audioData.bands);
    }

    createBeatEffect() {
        const ringGeometry = new THREE.RingGeometry(10, 12, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.scene.add(ring);
        
        gsap.to(ring.scale, {
            x: 3,
            y: 3,
            z: 3,
            duration: 0.8,
            ease: "power2.out"
        });
        
        gsap.to(ringMaterial, {
            opacity: 0,
            duration: 0.8,
            onComplete: () => {
                this.scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
            }
        });
    }

    updateFrequencyBars(bands) {
        const bars = document.querySelectorAll('.freq-bar');
        const bandValues = [
            bands.subBass,
            bands.bass,
            bands.lowMid,
            bands.mid,
            bands.high
        ];
        
        bars.forEach((bar, index) => {
            const height = bandValues[index] * 100;
            bar.style.height = `${height}%`;
            bar.style.backgroundColor = `hsl(${180 + bandValues[index] * 180}, 100%, 50%)`;
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        
        this.uniforms.time.value = elapsed;
        
        if (this.particles) {
            this.particles.rotation.y += 0.0005;
            const positions = this.particles.geometry.attributes.position.array;
            const time = elapsed * 0.5;
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                
                positions[i + 1] = y + Math.sin(time + x) * 0.01;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        this.orbitingLights.forEach((lightData, index) => {
            lightData.angle += lightData.speed * delta;
            lightData.light.position.x = Math.cos(lightData.angle) * lightData.radius;
            lightData.light.position.z = Math.sin(lightData.angle) * lightData.radius;
            lightData.light.position.y = Math.sin(elapsed + index) * 5;
            
            const intensity = 0.5 + this.uniforms.amplitude.value * 2;
            lightData.light.intensity = intensity;
        });
        
        this.updatePerformanceMetrics();
        this.renderer.render(this.scene, this.camera);
    }

    updatePerformanceMetrics() {
        const fps = Math.round(1 / this.clock.getDelta());
        document.querySelector('.fps-counter').textContent = `FPS: ${fps}`;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        
        document.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
            
            gsap.to(this.camera.position, {
                x: mouseX * 5,
                y: mouseY * 5,
                duration: 1
            });
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
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
        
        this.renderer.dispose();
        
        if (this.audioProcessor) {
            this.audioProcessor.dispose();
        }
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const visualization = new AudioVisualization();
    
    window.addEventListener('beforeunload', () => {
        visualization.dispose();
    });
});