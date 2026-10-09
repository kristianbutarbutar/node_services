const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const net = require('net');
const ip_api = require('./host');

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware - Configured for Vite (5173) and local client/server (3000)
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000', 'http://amgreat.id', 'https://amgreat.id', `${ip_api.api_3000}`, `${ip_api.api_3001}`, `${ip_api.front_end}`
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: Access denied for origin ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    credentials: true
}));

app.use(express.json());


const server = http.createServer(app);
//const io = new Server(server, { cors: { origin: "*" } });
const io = new Server(server, {
    path: '/callio', // Tells Socket.io to accept connections under the /callio prefix
    cors: { origin: "*" }
});

// Configuration parameters
const CPP_MASTER_HOST = `${ip_api.voice_server}`;
const CPP_MASTER_PORT = 8081; // Master Port P1
const QUERY_OBJECT_API_URL = `${ip_api.api_3000}/api/query-object`;//'http://localhost:3000/api/query-object';
const MAX_MASTER_RETRIES = 5;
const RETRY_DELAY_MS = 1000; // 1 second delay between retries

// Helper function to query Master Controller with retry logic (up to 5 attempts)
const queryMasterWithRetry = (payloadData, retriesLeft = MAX_MASTER_RETRIES) => {
    return new Promise((resolve, reject) => {
        const masterClient = new net.Socket();
        let responded = false;

        masterClient.connect(CPP_MASTER_PORT, CPP_MASTER_HOST, () => {
            masterClient.write(JSON.stringify(payloadData));
        });

        masterClient.on('data', (response) => {
            if (responded) return;
            responded = true;
            masterClient.destroy();
            try {
                const res = JSON.parse(response.toString());
                resolve(res);
            } catch (err) {
                reject(new Error('Invalid JSON response from master controller'));
            }
        });

        masterClient.on('error', (err) => {
            if (responded) return;
            responded = true;
            masterClient.destroy();

            if (retriesLeft > 1) {
                console.warn(`[BRIDGE] Master connection failed. Retries left: ${retriesLeft - 1}...`);
                setTimeout(() => {
                    queryMasterWithRetry(payloadData, retriesLeft - 1).then(resolve).catch(reject);
                }, RETRY_DELAY_MS);
            } else {
                reject(new Error('Max retries reached: Master controller unavailable'));
            }
        });
    });
};

io.on('connection', (socket) => {
    console.log('[BRIDGE] Concurrent React Native client connected:', socket.id);
    let cppVoiceSocket = null;

    const cleanupVoiceSocket = () => {
        if (cppVoiceSocket) {
            try {
                cppVoiceSocket.removeAllListeners();
                if (!cppVoiceSocket.destroyed) cppVoiceSocket.destroy();
            } catch (err) {
                console.error('[BRIDGE] Socket cleanup error:', err.message);
            }
            cppVoiceSocket = null;
        }
    };

    // 1. Client triggers voice call session
    socket.on('join_voice_call', (data) => {
        const { uid, touid } = data;
        console.log(`[BRIDGE] Processing voice call request for UID: ${uid}`);

        if (!uid || !touid) {
            socket.emit('voice_error', { message: 'UID or TUID is not available.' });
            return;
        }

        getObjectRecords({ uid, touid }).then((uid_tuid) => {
            if (!uid_tuid || !uid_tuid?.uid || !uid_tuid?.touid) {
                socket.emit('voice_error', { message: 'UID or TUID resolution failed.' });
                return;
            }

            const masterPayload = { action: "start_voice_call", uid: uid_tuid.uid, touid: uid_tuid.touid };

            // Request voice room from voice_server_master with 5 retries
            queryMasterWithRetry(masterPayload, MAX_MASTER_RETRIES)
                .then((res) => {
                    if (res.status === 'success') {
                        console.log(`[BRIDGE] Assigned Voice Node -> ${res.voice_host}:${res.voice_port} (Room: ${res.room_id})`);

                        cleanupVoiceSocket();
                        cppVoiceSocket = new net.Socket();

                        cppVoiceSocket.connect(res.voice_port, res.voice_host, () => {
                            const handshake = JSON.stringify({ action: "join_voice", room_id: res.room_id, uid: uid });
                            cppVoiceSocket.write(handshake);
                        });

                        cppVoiceSocket.on('data', (audioChunk) => {
                            socket.emit('audio_stream', audioChunk);
                        });

                        cppVoiceSocket.on('error', (err) => {
                            console.error('[BRIDGE VOICE NODE ERROR]:', err.message);
                            socket.emit('voice_error', { message: 'Voice node connection error' });
                            cleanupVoiceSocket();
                        });

                        cppVoiceSocket.on('close', () => {
                            console.log('[BRIDGE] Disconnected from C++ Voice Node');
                            cppVoiceSocket = null;
                        });

                        socket.emit('voice_room_ready', res);
                    } else {
                        socket.emit('voice_error', { message: 'Failed to allocate voice room.' });
                    }
                })
                .catch((err) => {
                    console.error('[BRIDGE MASTER ERROR]:', err.message);
                    socket.emit('voice_error', {
                        message: 'Voice service is currently unavailable. Please contact the administrator of the portal.'
                    });
                });

        }).catch((err) => {
            console.error('[BRIDGE RECORD ERROR]:', err.message);
            socket.emit('voice_error', { message: 'Failed to resolve user records.' });
        });
    });

    // 2. Receive microphone PCM buffer from React Native and pipe to C++ Voice Node
    socket.on('audio_stream', (audioChunk) => {
        if (cppVoiceSocket && !cppVoiceSocket.destroyed) {
            try {
                cppVoiceSocket.write(Buffer.from(audioChunk));
            } catch (err) {
                console.error('[BRIDGE AUDIO WRITE ERROR]:', err.message);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('[BRIDGE] Client disconnected:', socket.id);
        cleanupVoiceSocket();
    });
});

async function getObjectRecords(input) {
    if (!input || !input.uid) return {};

    const fetchRecord = async (idValue) => {
        if (!idValue) return '';
        const payload = {
            objectid: 'PORTAL_USER_FORM_ID',
            whereClause: [{ col_name: 'id', value: idValue }],
            filterColumns: ['uid']
        };

        try {
            const response = await fetch(QUERY_OBJECT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();
            return responseData?.data?.[0]?.uid || '';
        } catch (error) {
            console.error(`[getObjectRecords Error for id: ${idValue}]:`, error.message);
            return '';
        }
    };

    const __uid = await fetchRecord(input.uid);
    let __touid = [];

    if (input && Array.isArray(input.touid)) {
        const promises = input.touid.map(async (tuid) => await fetchRecord(tuid));
        const results = await Promise.all(promises);
        __touid = results.filter(id => id !== '');
    }

    return { uid: __uid, touid: __touid };
}

server.listen(3006, () => {
    console.log('[NODE.JS BRIDGE] Running on port 3006 with multi-request and retry protection');
});