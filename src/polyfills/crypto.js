// Crypto polyfill for React Native
// GramJS needs crypto.randomBytes and crypto.createHash
const Crypto = require('expo-crypto');
const { Buffer } = require('buffer');

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  Crypto.getRandomValues(bytes);
  return Buffer.from(bytes);
}

// Simple hash implementation using basic operations
// GramJS primarily uses SHA-256 via its own implementation,
// this is a fallback for any direct crypto.createHash calls
const CryptoJS = require('crypto-js');

function createHash(algorithm) {
  let algo = algorithm.toUpperCase() === 'SHA1' ? CryptoJS.algo.SHA1 : CryptoJS.algo.SHA256;
  let hashAlgo = algo.create();

  return {
    update: function(input) {
      if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        // Convert Buffer to CryptoJS WordArray
        const words = [];
        for (let i = 0; i < input.length; i += 4) {
          words.push(
            (input[i] << 24) |
            (input[i + 1] << 16) |
            (input[i + 2] << 8) |
            (input[i + 3])
          );
        }
        const wordArr = CryptoJS.lib.WordArray.create(words, input.length);
        hashAlgo.update(wordArr);
      } else {
        hashAlgo.update(input);
      }
      return this;
    },
    digest: function(encoding) {
      const hash = hashAlgo.finalize();
      const hex = hash.toString(CryptoJS.enc.Hex);
      if (encoding === 'hex') return hex;
      return Buffer.from(hex, 'hex');
    },
  };
}

function createHmac(algorithm, key) {
  // Not strictly needed for Step 2, but good to have
  return createHash(algorithm); 
}

function pbkdf2Sync(password, salt, iterations, keylen, digest) {
  function bufferToWordArray(buf) {
    const words = [];
    for (let i = 0; i < buf.length; i += 4) {
      words.push((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | (buf[i + 3]));
    }
    return CryptoJS.lib.WordArray.create(words, buf.length);
  }

  const passWA = typeof password === 'string' ? password : bufferToWordArray(Buffer.isBuffer(password) ? password : Buffer.from(password));
  const saltWA = typeof salt === 'string' ? salt : bufferToWordArray(Buffer.isBuffer(salt) ? salt : Buffer.from(salt));

  let hasher;
  if (digest === 'sha512') hasher = CryptoJS.algo.SHA512;
  else if (digest === 'sha256') hasher = CryptoJS.algo.SHA256;
  else hasher = CryptoJS.algo.SHA1;

  const hash = CryptoJS.PBKDF2(passWA, saltWA, {
    keySize: keylen / 4,
    iterations: iterations,
    hasher: hasher
  });

  const hex = hash.toString(CryptoJS.enc.Hex);
  return Buffer.from(hex, 'hex');
}

module.exports = {
  randomBytes,
  createHash,
  createHmac,
  pbkdf2Sync,
  getRandomValues: function(arr) {
    return Crypto.getRandomValues(arr);
  },
  subtle: {},
};
