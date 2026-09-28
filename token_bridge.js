const express = require('express');
const net = require('net');
const app = express();

app.use(express.json());

const MASTER_HOST = '127.0.0.1';
const MASTER_P1_PORT = 8090;

const sendToMaster = (payload) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(MASTER_P1_PORT, MASTER_HOST, () => {
            client.write(JSON.stringify(payload));
        });

        client.on('data', (data) => {
            client.destroy();
            try {
                resolve(JSON.parse(data.toString()));
            } catch (err) {
                reject(new Error('Invalid JSON from Master'));
            }
        });

        client.on('error', (err) => {
            client.destroy();
            reject(err);
        });
    });
};

// API Endpoint: Generate Token
app.post('/api/tokens/generate', async (req, res) => {
    try {
        const { uid, duration, channel } = req.body;
        const payload = { action: 'generate_token', uid, duration: String(duration || 60), channel: channel || 'api' };
        const result = await sendToMaster(payload);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Token service unavailable', details: err.message });
    }
});

// API Endpoint: Check Token Expiration
app.post('/api/tokens/check', async (req, res) => {
    try {
        const { uid, token } = req.body;
        const payload = { action: 'check_token_expiration', uid, token };
        const result = await sendToMaster(payload);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Token validation service unavailable', details: err.message });
    }
});

app.listen(3007, () => {
    console.log('[TOKEN BRIDGE] Node.js bridge running on port 3007');
});