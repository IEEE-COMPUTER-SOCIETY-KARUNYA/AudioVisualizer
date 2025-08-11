import * as THREE from 'three';
import {GUI} from 'dat.gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';

// Shader sources
const vertexShaderSource = `
    uniform float u_time;
    uniform float u_frequency;
    
    void main() {
        vec3 newPosition = position;
        float displacement = sin(position.x * 10.0 + u_time) * 0.1;
        displacement += sin(position.y * 10.0 + u_time * 0.8) * 0.1;
        displacement += sin(position.z * 10.0 + u_time * 1.2) * 0.1;
        
        newPosition += normal * displacement * u_frequency * 0.01;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const fragmentShaderSource = `
    uniform float u_red;
    uniform float u_green;
    uniform float u_blue;
    uniform float u_time;
    uniform float u_frequency;
    
    void main() {
        float intensity = u_frequency / 255.0;
        vec3 color = vec3(u_red, u_green, u_blue);
        color *= (0.5 + intensity);
        
        // Add some pulsing based on frequency
        float pulse = sin(u_time * 2.0) * 0.2 + 0.8;
        color *= pulse;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

class MainVisualizer {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.mesh = null;
        this.uniforms = null;
        this.bloomComposer = null;
        this.clock = null;
        this.socket = null;
        
        this.params = {
            red: 1.0,
            green: 1.0,
            blue: 1.0,
            threshold: 0.5,
            strength: 0.5,
            radius: 0.8
        };
        
        this.audioData = {
            frequency: 0,
            amplitude: 0,
            bands: {}
        };
        
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.init();
        this.setupWebSocket();
    }
    
    init() {
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Setup scene and camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Setup post-processing
        const renderScene = new RenderPass(this.scene, this.camera);
        
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
        bloomPass.threshold = this.params.threshold;
        bloomPass.strength = this.params.strength;
        bloomPass.radius = this.params.radius;
        this.bloomPass = bloomPass;
        
        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.addPass(renderScene);
        this.bloomComposer.addPass(bloomPass);
        
        const outputPass = new OutputPass();
        this.bloomComposer.addPass(outputPass);
        
        // Setup camera position
        this.camera.position.set(0, -2, 14);
        this.camera.lookAt(0, 0, 0);
        
        // Setup uniforms for shaders
        this.uniforms = {
            u_time: {type: 'f', value: 0.0},
            u_frequency: {type: 'f', value: 0.0},
            u_red: {type: 'f', value: 1.0},
            u_green: {type: 'f', value: 1.0},
            u_blue: {type: 'f', value: 1.0}
        };
        
        // Create material and geometry
        const mat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            wireframe: true
        });
        
        const geo = new THREE.IcosahedronGeometry(4, 30);
        this.mesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.mesh);
        
        // Setup GUI
        this.setupGUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start clock
        this.clock = new THREE.Clock();
        
        // Start animation loop
        this.animate();
    }
    
    setupGUI() {
        const gui = new GUI();
        
        const colorsFolder = gui.addFolder('Colors');
        colorsFolder.add(this.params, 'red', 0, 1).onChange((value) => {
            this.uniforms.u_red.value = Number(value);
        });
        colorsFolder.add(this.params, 'green', 0, 1).onChange((value) => {
            this.uniforms.u_green.value = Number(value);
        });
        colorsFolder.add(this.params, 'blue', 0, 1).onChange((value) => {
            this.uniforms.u_blue.value = Number(value);
        });
        colorsFolder.open();
        
        const bloomFolder = gui.addFolder('Bloom');
        bloomFolder.add(this.params, 'threshold', 0, 1).onChange((value) => {
            this.bloomPass.threshold = Number(value);
        });
        bloomFolder.add(this.params, 'strength', 0, 3).onChange((value) => {
            this.bloomPass.strength = Number(value);
        });
        bloomFolder.add(this.params, 'radius', 0, 1).onChange((value) => {
            this.bloomPass.radius = Number(value);
        });
        bloomFolder.open();
    }
    
    setupEventListeners() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            const windowHalfX = window.innerWidth / 2;
            const windowHalfY = window.innerHeight / 2;
            this.mouseX = (e.clientX - windowHalfX) / 100;
            this.mouseY = (e.clientY - windowHalfY) / 100;
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.bloomComposer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    setupWebSocket() {
        // Connect to the server
        this.socket = io('http://localhost:8888', {
            transports: ['websocket']
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').className = 'connected';
            
            // Identify as visualization client
            this.socket.emit('client:ready', {
                clientId: 'visualizer_' + Date.now(),
                type: 'visualization',
                timestamp: Date.now()
            });
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            document.getElementById('connection-status').textContent = 'Disconnected';
            document.getElementById('connection-status').className = 'disconnected';
        });
        
        // Listen for audio data from admin console
        this.socket.on('audio:data', (data) => {
            if (data.frequencyData && Array.isArray(data.frequencyData)) {
                // Calculate average frequency
                let sum = 0;
                for (let i = 0; i < data.frequencyData.length; i++) {
                    sum += data.frequencyData[i];
                }
                this.audioData.frequency = sum / data.frequencyData.length;
            }
            
            if (data.amplitude !== undefined) {
                this.audioData.amplitude = data.amplitude;
            }
            
            if (data.bands) {
                this.audioData.bands = data.bands;
            }
        });
        
        this.socket.on('audio:play', (data) => {
            console.log('Audio started playing:', data);
        });
        
        this.socket.on('audio:pause', (data) => {
            console.log('Audio paused:', data);
            // Reset frequency when paused
            this.audioData.frequency = 0;
            this.audioData.amplitude = 0;
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update camera position based on mouse
        this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05;
        this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);
        
        // Update uniforms
        this.uniforms.u_time.value = this.clock.getElapsedTime();
        this.uniforms.u_frequency.value = this.audioData.frequency;
        
        // Rotate mesh based on audio
        const rotationSpeed = 0.001 + (this.audioData.amplitude * 0.01);
        this.mesh.rotation.x += rotationSpeed;
        this.mesh.rotation.y += rotationSpeed * 1.2;
        
        // Scale mesh based on bass frequencies
        if (this.audioData.bands.bass !== undefined) {
            const scale = 1 + (this.audioData.bands.bass * 0.5);
            this.mesh.scale.set(scale, scale, scale);
        }
        
        // Render
        this.bloomComposer.render();
    }
}

// Initialize visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new MainVisualizer();
});