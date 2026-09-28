const crypto = require('crypto');

class HeaderUnwrapper {
    /**
     * Verifies the secure headers and decrypts the payload.
     * @param {Object} securePackage - The package received from the server { headers, payload }
     * @param {string} privatekey - The shared secret private key
     * @returns {Object} The original decrypted plaintext payload
     */
    static decryptSecurePackage(securePackage, privatekey) {
        const { headers, payload } = securePackage;
        const { timestamp, nonce, channel, correlationId, encryption, signature } = headers;

        // 1. Verify HMAC Signature
        const signaturePayload = `${timestamp}.${nonce}.${channel}.${correlationId}`;
        const expectedSignature = crypto
            .createHmac('sha256', privatekey || process.env.DEFAULT_PRIVATE_KEY)
            .update(signaturePayload)
            .digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        const isSignatureValid = crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );

        if (!isSignatureValid) {
            throw new Error('Security Error: Header signature verification failed. Payload may have been tampered with.');
        }

        // 2. Validate Timestamp (Optional check against replay attacks, e.g., max 5 minutes old)
        const requestTime = new Date(timestamp).getTime();
        const currentTime = Date.now();
        const maxTimeSkewMs = 5 * 60 * 1000; // 5 minutes

        if (Math.abs(currentTime - requestTime) > maxTimeSkewMs) {
            throw new Error('Security Error: Request timestamp is outside the acceptable window (possible replay attack).');
        }

        // 3. Derive the secret key
        const secretKey = crypto.createHash('sha256').update(privatekey || process.env.DEFAULT_PRIVATE_KEY).digest();

        // 4. Decrypt the payload using AES-256-GCM
        const decipher = crypto.createDecipheriv(
            encryption.algorithm,
            secretKey,
            Buffer.from(encryption.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryption.authTag, 'hex'));

        let decrypted = decipher.update(payload.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // 5. Parse back to original JSON object
        return JSON.parse(decrypted);
    }
}

module.exports = HeaderUnwrapper;