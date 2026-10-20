const crypto = require('crypto');

function createasymetrickey() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  return { private: privateKey, public: publicKey };
}

function encryptText({ key, value }) {
  if (!key || value === undefined || value === null) {
    throw new Error("Missing required parameters 'key' or 'value' for encryptText.");
  }

  const bufferValue = Buffer.from(String(value), 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    bufferValue
  );

  return encrypted.toString('base64');
}

function decryptText({ key, value }) {
  if (!key || !value) {
    throw new Error("Missing required parameters 'key' or 'value' for decryptText.");
  }

  const bufferValue = Buffer.from(value, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    bufferValue
  );

  return decrypted.toString('utf8');
}

module.exports = {
  createasymetrickey,
  encryptText,
  decryptText
};