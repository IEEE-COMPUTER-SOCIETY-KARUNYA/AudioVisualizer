const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

const connectedClients = new Map();
let adminSocket = null;
let currentAudioState = {
    isPlaying: false,
    audioId: null,
    timestamp: null
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    connectedClients.set(socket.id, {
        id: socket.id,
        type: 'unknown',
        connectedAt: Date.now()
    });
    
    broadcastServerStatus();
    
    socket.on('client:ready', (data) => {
        console.log('Client ready:', data);
        
        connectedClients.set(socket.id, {
            ...connectedClients.get(socket.id),
            type: data.type || 'visualization',
            clientId: data.clientId
        });
        
        if (data.type === 'admin') {
            adminSocket = socket;
            console.log('Admin console connected');
        }
        
        if (currentAudioState.isPlaying) {
            socket.emit('audio:play', currentAudioState);
        }
        
        broadcastServerStatus();
    });
    
    socket.on('audio:play', (data) => {
        console.log('Audio play event:', data);
        
        currentAudioState = {
            isPlaying: true,
            audioId: data.audioId,
            timestamp: data.timestamp
        };
        
        socket.broadcast.emit('audio:play', data);
    });
    
    socket.on('audio:pause', (data) => {
        console.log('Audio pause event:', data);
        
        currentAudioState.isPlaying = false;
        
        socket.broadcast.emit('audio:pause', data);
    });
    
    socket.on('audio:data', (data) => {
        socket.broadcast.emit('audio:data', data);
    });
    
    socket.on('audio:stream', (data) => {
        socket.broadcast.emit('audio:stream', data);
    });
    
    socket.on('performance:metrics', (data) => {
        console.log('Performance metrics from client:', data);
        
        if (adminSocket && adminSocket.id !== socket.id) {
            adminSocket.emit('client:metrics', {
                ...data,
                socketId: socket.id
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        if (adminSocket && adminSocket.id === socket.id) {
            adminSocket = null;
            console.log('Admin console disconnected');
            currentAudioState.isPlaying = false;
        }
        
        connectedClients.delete(socket.id);
        broadcastServerStatus();
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

function broadcastServerStatus() {
    const visualizationClients = Array.from(connectedClients.values())
        .filter(client => client.type === 'visualization').length;
    
    const status = {
        connectedClients: visualizationClients,
        adminConnected: adminSocket !== null,
        serverTime: Date.now()
    };
    
    io.emit('server:status', status);
}

setInterval(() => {
    broadcastServerStatus();
}, 5000);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Main Visualizer: http://localhost:${PORT}/`);
    console.log(`Admin Console: http://localhost:${PORT}/admin`);
});