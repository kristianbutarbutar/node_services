const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const ip_api = require('./host');

// Global process error handlers to prevent sudden background crashes
process.on('uncaughtException', (err) => {
    console.error('[Load Balancer] CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Load Balancer] CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const WEBSOCKET_PORT = 3004;
const CHAT_API_URL = `${ip_api.api_3003}/api/chat`;

let serverOptions;
let server;
let wss;

try {
    // 1. Safely attempt to load SSL certificate and key files
    serverOptions = {
        key: fs.readFileSync('./certf/server.key'),
        cert: fs.readFileSync('./certf/server.cert')
    };
    console.log('[Security] SSL certificates loaded successfully.');
} catch (certError) {
    console.error('[CRITICAL ERROR] Failed to load SSL certificate files from "./certf/":', certError.message);
    process.exit(1); // Exit process since WSS requires valid certificates
}

try {
    // 2. Create HTTPS server wrapper for Secure WebSockets (WSS)
    server = https.createServer(serverOptions);
} catch (serverError) {
    console.error('[CRITICAL ERROR] Failed to create HTTPS server wrapper:', serverError.message);
    process.exit(1);
}

// 3. Capture runtime server errors (e.g. EADDRINUSE if port 3004 is already taken)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${WEBSOCKET_PORT} is already in use by another process.`);
    } else {
        console.error('[Server Error] HTTPS Server runtime error:', err.message);
    }
    process.exit(1);
});

try {
    // 4. Initialize WebSocket Server on top of the secure HTTPS server
    wss = new WebSocket.Server({ server });

    server.listen(WEBSOCKET_PORT, () => {
        console.log(`[Secure WebSocket Server] Running securely on wss://localhost:${WEBSOCKET_PORT}`);
    });
} catch (wsError) {
    console.error('[CRITICAL ERROR] Failed to initialize WebSocket Server:', wsError.message);
    process.exit(1);
}

// In-memory map to store active client connections indexed by UID
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const uid = urlParams.get('uid');

    console.log("urlParams: ", urlParams, ", uid=", uid);

    if (!uid) {
        console.warn('[WebSocket] Connection rejected: Missing UID in query parameters.');
        ws.close(4001, 'Unauthorized: Missing UID');
        return;
    }

    connectedClients.set(uid, ws);
    console.log(`[WebSocket] Client connected and registered -> UID: ${uid}`);

    ws.on('message', (msg) => {
        console.log(`[WebSocket] Message received from UID ${uid}:`, msg.toString());
        try {
            const parsedMessage = JSON.parse(msg.toString());

            if (parsedMessage.action) {
                const __clientShocket = connectedClients.get(parsedMessage.uid);

                if (__clientShocket && __clientShocket.readyState === ws.OPEN && isValidJSON(msg.toString())) {
                    (async () => {
                        try {
                            const __msg = JSON.parse(msg.toString());
                            const resp = await sendRequest(__msg);
                            console.log(`chatwebshocket > resp > uid = ${uid}, response > ${JSON.stringify(resp)}`);

                            if (__clientShocket && __clientShocket.readyState === WebSocket.OPEN) {
                                __clientShocket.send(JSON.stringify(resp));
                            } else {
                                console.warn("WebSocket is not open. Current readyState:", __clientShocket?.readyState);
                            }
                        } catch (error) {
                            console.error("Error processing chat websocket message:", error);
                        }
                    })();
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: 'Recipient not found or offline.' }));
                }
            }
        } catch (e) {
            console.error('Invalid JSON', e);
        }
    });

    ws.on('close', () => {
        connectedClients.delete(uid);
        console.log(`[WebSocket] Client disconnected -> UID: ${uid}`);
    });

    ws.on('error', (error) => {
        console.error(`[WebSocket Error] UID ${uid}:`, error.message);
    });
});

function isValidJSON(str) {
    if (typeof str !== 'string') return false;
    try {
        const parsed = JSON.parse(str);
        return parsed !== null && typeof parsed === 'object';
    } catch (e) {
        return false;
    }
}

async function sendRequest(input) {
    console.log("sendRequest > input > ", JSON.stringify(input));
    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[WebSocket] sendRequest Error:', error.message);
        return {
            status: 'error',
            message: 'Failed to communicate with chat API endpoint',
            details: error.message
        };
    }
}

function sendHelloToClient(uid, customMessage) {
    const clientSocket = connectedClients.get(uid);

    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        const payload = {
            action: 'push_hello',
            message: customMessage || `Hello! This is a pushed message for UID: ${uid}`,
            timestamp: new Date().toISOString()
        };

        clientSocket.send(JSON.stringify(payload));
        console.log(`[WebSocket] Successfully pushed message to UID: ${uid}`);
        return true;
    }

    console.warn(`[WebSocket] Failed to push message: Client with UID ${uid} is not connected.`);
    return false;
}

module.exports = {
    sendRequest,
    sendHelloToClient,
    connectedClients
};