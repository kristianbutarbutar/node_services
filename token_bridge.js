const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = 3007;
const MASTER_HOST = '127.0.0.1';
const MASTER_PORT = 8090;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware - Configured for Vite (5173) and local client/server (3000)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
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

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Helper function to forward JSON requests to the C++ Token Master socket server
function forwardToMaster(payloadObj, res) {
    const dataString = JSON.stringify(payloadObj);

    const options = {
        hostname: MASTER_HOST,
        port: MASTER_PORT,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString)
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let responseBody = '';

        proxyRes.on('data', (chunk) => {
            responseBody += chunk;
        });

        proxyRes.on('end', () => {
            try {
                let jsonResponse;
                if (responseBody.includes('HTTP/1.1')) {
                    const bodyIndex = responseBody.indexOf('\r\n\r\n');
                    const cleanBody = bodyIndex !== -1 ? responseBody.substring(bodyIndex + 4) : responseBody;
                    jsonResponse = JSON.parse(cleanBody);
                } else {
                    jsonResponse = JSON.parse(responseBody);
                }

                res.status(proxyRes.statusCode || 200).json(jsonResponse);
            } catch (err) {
                res.status(500).json({ error: 'Token service unavailable', details: 'Invalid JSON from Master', raw: responseBody });
            }
        });
    });

    proxyReq.on('error', (err) => {
        res.status(503).json({ error: 'Token service unavailable', details: err.message });
    });

    proxyReq.write(dataString);
    proxyReq.end();
}

// Unified token endpoint handling both generate and check actions
app.post('/api/token', (req, res) => {
    const { uid, action, duration, channel, token } = req.body;

    if (!uid || !action) {
        return res.status(400).json({ error: 'Bad Request', details: 'Missing required fields: uid or action' });
    }

    const payload = { uid, action };

    if (action === 'generate_token') {
        payload.duration = duration || 60;
        payload.channel = channel || 'api';
    } else if (action === 'check_token_expiration') {
        if (!token) {
            return res.status(400).json({ error: 'Bad Request', details: 'Missing token for expiration check' });
        }
        payload.token = token;
    } else {
        return res.status(400).json({ error: 'Bad Request', details: 'Invalid action specified' });
    }

    forwardToMaster(payload, res);
});

app.listen(PORT, () => {
    console.log(`[TOKEN BRIDGE] Express API Bridge running on http://localhost:${PORT}`);
});