import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';

const vertexShaderSource = `
    uniform float u_time;
    uniform float u_frequency;
    varying vec2 vUv;
    varying float vDistortion;
    
    void main() {
        vUv = uv;
        float noise = sin(position.x * 10.0 + u_time) * 0.1;
        float distortion = u_frequency * 0.002;
        vec3 newPosition = position + normal * (noise + distortion);
        vDistortion = distortion;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const fragmentShaderSource = `
    uniform float u_red;
    uniform float u_green;
    uniform float u_blue;
    uniform float u_time;
    varying vec2 vUv;
    varying float vDistortion;
    
    void main() {
        float intensity = sin(vUv.y * 10.0 + u_time) * 0.5 + 0.5;
        vec3 color = vec3(u_red, u_green, u_blue) * (intensity + vDistortion);
        gl_FragColor = vec4(color, 1.0);
    }
`;

class AdminVisualizer {
    constructor() {
        this.container = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.mesh = null;
        this.uniforms = null;
        this.bloomComposer = null;
        this.clock = null;
        this.animationId = null;
        this.analyser = null;
        this.isInitialized = false;
        
        this.params = {
            red: 1.0,
            green: 1.0,
            blue: 1.0,
            threshold: 0.5,
            strength: 0.5,
            radius: 0.8
        };
    }

    init() {
        this.container = document.getElementById('visualizer-container');
        if (!this.container) return;

        const width = this.container.offsetWidth;
        const height = 400;

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            1000
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        const renderScene = new RenderPass(this.scene, this.camera);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height));
        bloomPass.threshold = this.params.threshold;
        bloomPass.strength = this.params.strength;
        bloomPass.radius = this.params.radius;
        this.bloomPass = bloomPass;

        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.addPass(renderScene);
        this.bloomComposer.addPass(bloomPass);

        const outputPass = new OutputPass();
        this.bloomComposer.addPass(outputPass);

        this.camera.position.set(0, -2, 14);
        this.camera.lookAt(0, 0, 0);

        this.uniforms = {
            u_time: {type: 'f', value: 0.0},
            u_frequency: {type: 'f', value: 0.0},
            u_red: {type: 'f', value: 1.0},
            u_green: {type: 'f', value: 1.0},
            u_blue: {type: 'f', value: 1.0}
        };

        const mat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource
        });

        const geo = new THREE.IcosahedronGeometry(4, 30);
        this.mesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.mesh);
        this.mesh.material.wireframe = true;

        this.clock = new THREE.Clock();
        
        this.setupControls();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        
        this.isInitialized = true;
    }

    setupControls() {
        const redSlider = document.getElementById('viz-red');
        const greenSlider = document.getElementById('viz-green');
        const blueSlider = document.getElementById('viz-blue');
        const bloomSlider = document.getElementById('viz-bloom');

        if (redSlider) {
            redSlider.addEventListener('input', (e) => {
                this.params.red = parseFloat(e.target.value);
                this.uniforms.u_red.value = this.params.red;
            });
        }

        if (greenSlider) {
            greenSlider.addEventListener('input', (e) => {
                this.params.green = parseFloat(e.target.value);
                this.uniforms.u_green.value = this.params.green;
            });
        }

        if (blueSlider) {
            blueSlider.addEventListener('input', (e) => {
                this.params.blue = parseFloat(e.target.value);
                this.uniforms.u_blue.value = this.params.blue;
            });
        }

        if (bloomSlider) {
            bloomSlider.addEventListener('input', (e) => {
                this.params.strength = parseFloat(e.target.value);
                this.bloomPass.strength = this.params.strength;
            });
        }
    }

    setAnalyser(analyser) {
        this.analyser = analyser;
    }

    start() {
        if (!this.isInitialized) return;
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            this.uniforms.u_time.value = this.clock.getElapsedTime();
            
            if (this.analyser) {
                const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(frequencyData);
                
                let sum = 0;
                for (let i = 0; i < frequencyData.length; i++) {
                    sum += frequencyData[i];
                }
                const averageFrequency = sum / frequencyData.length;
                this.uniforms.u_frequency.value = averageFrequency;
            }
            
            this.mesh.rotation.x += 0.001;
            this.mesh.rotation.y += 0.002;
            
            this.bloomComposer.render();
        };
        
        animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    show() {
        const section = document.getElementById('visualizerSection');
        if (section) {
            section.style.display = 'block';
            if (!this.isInitialized) {
                this.init();
            }
        }
    }

    hide() {
        const section = document.getElementById('visualizerSection');
        if (section) {
            section.style.display = 'none';
        }
        this.stop();
    }

    handleResize() {
        if (!this.container || !this.camera || !this.renderer || !this.bloomComposer) return;
        
        const width = this.container.offsetWidth;
        const height = 400;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.bloomComposer.setSize(width, height);
    }

    updateFromAudioData(data) {
        if (!this.isInitialized || !data) return;
        
        if (data.frequencyData && Array.isArray(data.frequencyData)) {
            let sum = 0;
            for (let i = 0; i < data.frequencyData.length; i++) {
                sum += data.frequencyData[i];
            }
            const averageFrequency = sum / data.frequencyData.length;
            this.uniforms.u_frequency.value = averageFrequency;
        }
        
        if (data.amplitude) {
            const ampBoost = data.amplitude * 50;
            this.uniforms.u_frequency.value = Math.max(this.uniforms.u_frequency.value, ampBoost);
        }
    }
}

window.adminVisualizer = new AdminVisualizer();

document.addEventListener('DOMContentLoaded', () => {
    if (window.adminConsole) {
        window.adminConsole.visualizer = window.adminVisualizer;
    }
});