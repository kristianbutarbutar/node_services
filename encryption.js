async function encryptPaymentPayload(paymentData, rsaPublicKeyPem) {
    // 1. Convert PEM public key to CryptoKey
    const binaryDer = Uint8Array.from(
        atob(rsaPublicKeyPem.replace(/-----[^\n]+-----|\n/g, '')),
        c => c.charCodeAt(0)
    );
    const rsaKey = await crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );

    // 2. Generate ephemeral AES-GCM key & IV
    const aesKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Encrypt payment data with AES-GCM
    const encodedData = new TextEncoder().encode(JSON.stringify(paymentData));
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encodedData
    );

    // 4. Encrypt AES key with RSA Public Key
    const exportedAesRaw = await crypto.subtle.exportKey('raw', aesKey);
    const encryptedAesKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaKey,
        exportedAesRaw
    );

    // 5. Pack as Base64 payload
    return {
        iv: btoa(String.fromCharCode(...iv)),
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey))),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedData)))
    };
}