const crypto = require('crypto');

class HeaderWrapper {
    /**
     * Generates secure common header attributes and encrypts the payload.
     * @param {Object} params
     * @param {string} params.publickey - Requester or service public key identifier
     * @param {string} params.privatekey - Secret private key used for signing & encryption derivation
     * @param {string} params.channel - Channel type ('api' | 'clientapp' | 'portal')
     * @param {Object} params.payload - Plaintext payload data to be secured
     * @returns {Object} Contains secure headers and the encrypted payload
     */
    static generateSecurePackage({ publickey, privatekey, channel, payload }) {
        // Validate channel
        const validChannels = ['api', 'clientapp', 'portal'];
        if (!validChannels.includes(channel)) {
            throw new Error(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
        }

        // 1. Generate standard secure header attributes
        const timestamp = new Date().toISOString();
        const nonce = crypto.randomBytes(16).toString('hex');
        const correlationId = crypto.randomUUID();

        // 2. Derive a secure cryptographic key and encrypt the payload using AES-256-GCM
        const secretKey = crypto.createHash('sha256').update(privatekey || process.env.DEFAULT_PRIVATE_KEY).digest();
        const iv = crypto.randomBytes(12); // Recommended 12 bytes IV for GCM
        
        const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);
        let encryptedPayload = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
        encryptedPayload += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        // 3. Construct header attributes JSON object
        const headerAttributes = {
            timestamp,
            nonce,
            channel,
            correlationId,
            encryption: {
                algorithm: 'aes-256-gcm',
                iv: iv.toString('hex'),
                authTag
            },
            publicKeyRef: publickey || null
        };

        // 4. Generate HMAC signature to ensure integrity of the headers
        const signaturePayload = `${timestamp}.${nonce}.${channel}.${correlationId}`;
        const signature = crypto
            .createHmac('sha256', privatekey || process.env.DEFAULT_PRIVATE_KEY)
            .update(signaturePayload)
            .digest('hex');

        headerAttributes.signature = signature;

        return {
            headers: headerAttributes,
            payload: {
                encryptedData: encryptedPayload
            }
        };
    }
}

module.exports = HeaderWrapper;