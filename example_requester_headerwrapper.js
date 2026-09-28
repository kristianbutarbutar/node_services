const express = require('express');
const headerApiRouter = require('./headerapi');

const app = express();
app.use(express.json());

// Mount the router
app.use('/api', headerApiRouter);

const HeaderUnwrapper = require('./headerunwrapper');

// Simulated secure package received from the API response
const receivedPackage = {
    headers: {
        timestamp: "2026-09-28T00:32:45.123Z",
        nonce: "a1b2c3d4...",
        channel: "api",
        correlationId: "5f847248-...",
        encryption: {
            algorithm: "aes-256-gcm",
            iv: "...",
            authTag: "..."
        },
        publicKeyRef: "my-public-key",
        signature: "..."
    },
    payload: {
        encryptedData: "..."
    }
};

try {
    const privateKey = "your-secure-private-key";
    
    // Open and decrypt package
    const originalPayload = HeaderUnwrapper.decryptSecurePackage(receivedPackage, privateKey);
    console.log("Successfully decrypted payload:", originalPayload);
} catch (error) {
    console.error("Decryption or validation failed:", error.message);
}

app.listen(3000, () => {
    console.log('Secure Header API server running on port 3000');
});

