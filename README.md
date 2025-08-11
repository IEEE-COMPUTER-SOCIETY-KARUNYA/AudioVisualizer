# Audio Reactive AI Voice Assistant UI

A sophisticated audio-reactive visualization system with AI voice assistant aesthetic, featuring real-time frequency analysis and dynamic 3D animations built with Three.js, WebGL, and Web Audio API.

## Features

### 🎵 Audio Visualization
- **3D Reactive Sphere**: Central AI orb that morphs and pulses with audio
- **Real-time Frequency Analysis**: Advanced FFT processing with 6 frequency bands
- **Dynamic Particle System**: 8000+ particles responding to audio energy
- **Custom Shaders**: GLSL shaders for iridescent effects and noise displacement
- **Beat Detection**: Intelligent beat detection with visual ring effects

### 🎛️ Admin Console
- **Drag & Drop Upload**: Support for MP3, WAV, OGG, M4A files (up to 50MB)
- **Waveform Visualization**: Interactive waveform with playback controls
- **Real-time Broadcasting**: Stream audio data to visualization clients
- **Performance Monitoring**: FPS and latency tracking
- **Multi-client Support**: Broadcast to multiple visualization instances

### 🌐 WebSocket Communication
- **Real-time Sync**: Synchronized playback across all connected clients
- **Low Latency**: <20ms audio processing latency
- **Automatic Reconnection**: Robust connection handling
- **Performance Metrics**: Client performance monitoring

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/audio-reactive-ai-ui.git
   cd audio-reactive-ai-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Visualization: http://localhost:3000/
   - Admin Console: http://localhost:3000/admin

## Usage

### Admin Console
1. Open the admin console at `http://localhost:3000/admin`
2. Upload an audio file using drag & drop or file picker
3. Use playback controls to play/pause the audio
4. Click "Start Broadcasting" to stream audio data to visualization clients
5. Monitor connected clients and performance metrics

### Visualization
1. Open the visualization at `http://localhost:3000/`
2. The system will automatically connect to the WebSocket server
3. When admin starts broadcasting, the visualization will respond to audio
4. Watch the 3D sphere morph, particles dance, and frequency bars react

## Technical Architecture

### Frontend
- **Three.js**: 3D rendering engine
- **GSAP**: High-performance animations
- **Web Audio API**: Real-time audio processing
- **WebSocket Client**: Real-time communication
- **Custom Shaders**: GLSL vertex and fragment shaders

### Backend
- **Node.js + Express**: Web server
- **Socket.io**: WebSocket communication
- **CORS**: Cross-origin resource sharing

### Performance Targets
- **60 FPS**: Smooth visualization rendering
- **<20ms Latency**: Real-time audio processing
- **<200MB Memory**: Efficient memory usage
- **<3s Load Time**: Fast initial load

## Browser Requirements

- **Chrome 90+**: Recommended for best performance
- **Firefox 88+**: Full WebGL 2.0 support
- **Safari 14+**: WebGL and Web Audio API support
- **Edge 90+**: Chromium-based Edge

## Development

### Development Server
```bash
npm run dev
```
Uses nodemon for automatic server restarts during development.

### Project Structure
```
audio_UI/
├── index.html          # Main visualization page
├── admin.html          # Admin console interface
├── server.js           # WebSocket server
├── package.json        # Dependencies and scripts
├── js/
│   ├── visualization.js    # Main visualization controller
│   ├── audio-processor.js  # Web Audio API integration
│   ├── websocket-client.js # WebSocket communication
│   ├── admin.js           # Admin console functionality
│   └── shaders.js         # GLSL shader code
└── styles/
    ├── visualization.css   # Visualization page styles
    └── admin.css          # Admin console styles
```

## Customization

### Audio Processing
Modify frequency bands in `audio-processor.js`:
```javascript
this.frequencyBands = {
    subBass: { min: 20, max: 60 },
    bass: { min: 60, max: 250 },
    // ... customize as needed
};
```

### Visual Effects
Edit shader code in `shaders.js` to create custom visual effects:
```glsl
// Modify displacement calculation
float displacement = noise * noiseAmp;
displacement += bassEnergy * 0.5 * sin(position.y * 2.0 + time);
```

### Performance Tuning
Adjust particle count and geometry detail:
```javascript
const particleCount = 8000; // Reduce for better performance
const geometry = new THREE.IcosahedronGeometry(8, 5); // Lower subdivision
```

## Troubleshooting

### Common Issues
1. **No audio visualization**: Check browser audio permissions
2. **WebSocket connection failed**: Ensure server is running on port 3000
3. **Poor performance**: Try reducing particle count or geometry detail
4. **Audio file won't upload**: Check file format (MP3, WAV, OGG, M4A) and size (<50MB)

### Performance Optimization
- Close other browser tabs to free up GPU resources
- Use Chrome for best WebGL performance
- Reduce browser zoom level to improve rendering performance
- Ensure adequate GPU memory for complex scenes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js community for excellent documentation
- Web Audio API specification contributors
- GSAP for high-performance animations
- Socket.io for reliable WebSocket communication