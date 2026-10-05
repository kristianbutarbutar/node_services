const HeaderWrapper = require('./headerwrapper');
const HeaderUnwrapper = require('./headerunwrapper');

// 1. Define configuration and sample payload
/*const config = {
    publickey: 'pub_key_client_12345',
    privatekey: 'super_secret_shared_private_key_abc123',
    channel: 'api'
};*/
const config = {
privatekey:"9022_tDrAbDmvR5rW3SKotxzK8kbX1GfyCc6j61clZatx",
publickey:"9022_hE2ECQfMhSSX8nt7RtgaPkjO8qfbJmT4yfPXqj8g",
channel: 'api'
};

const samplePayload = {
    "id": "cc3ad6461d2d5de84d2cffdfdd4945a5183bd2d8b2f5e",
    "pid": "c9773576a1e48d747fbbf3ad95a7bb563aafe8a20c3df",
    "originalname": "html_dummy_doc_2_2026.pdf",
    "savedname": "files-1788682234849-207877827.pdf",
    "size": 70666,
    "mimetype": "application/pdf",
    "path": "/Users/admin/Documents/gemini_src_dev_react/fileuploads/files-1788682234849-207877827.pdf",
    "createdby": null,
    "createddate": "2026-09-06T08:10:34.928Z",
    "updatedby": null,
    "updateddate": "2026-09-06T08:10:34.928Z",
    "seq": 8
};

console.log('=== 1. ORIGINAL PAYLOAD ===');
console.log(JSON.stringify(samplePayload, null, 2));
console.log('\n--------------------------------------------------\n');

try {
    // 2. Wrap and encrypt the payload with HeaderWrapper
    console.log('Generating secure package via HeaderWrapper...');
    const securePackage = HeaderWrapper.generateSecurePackage({
        publickey: config.publickey,
        privatekey: config.privatekey,
        channel: config.channel,
        payload: samplePayload
    });

    console.log('\n=== 2. GENERATED SECURE PACKAGE ===');
    console.log(JSON.stringify(securePackage, null, 2));
    console.log('\n--------------------------------------------------\n');

    // 3. Unwrap and decrypt the package with HeaderUnwrapper
    console.log('Verifying headers and decrypting via HeaderUnwrapper...');
    const decryptedPayload = HeaderUnwrapper.decryptSecurePackage(
        securePackage,
        config.privatekey
    );

    console.log('\n=== 3. DECRYPTED PAYLOAD RESULT ===');
    console.log(JSON.stringify(decryptedPayload, null, 2));

    // 4. Verify integrity
    const isMatch = JSON.stringify(samplePayload) === JSON.stringify(decryptedPayload);
    console.log(`\nTest Verification: Payload Match -> **${isMatch ? 'SUCCESS' : 'FAILED'}**`);

} catch (error) {
    console.error('Test Failed with Error:', error.message);
}