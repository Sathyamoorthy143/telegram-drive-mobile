import 'react-native-get-random-values';
import { Buffer } from 'buffer';

global.Buffer = Buffer;
global.process = global.process || require('process/browser');

// Mock window properties for GramJS
if (typeof window !== 'undefined') {
  if (!window.location) window.location = { protocol: 'https:' } as any;
  if (!window.addEventListener) window.addEventListener = () => {};
  if (!window.removeEventListener) window.removeEventListener = () => {};
}

const CryptoJS = require('crypto-js');
const globalAny = global as any;
globalAny.self = globalAny.self || {};
globalAny.self.crypto = globalAny.self.crypto || {};
globalAny.self.crypto.subtle = {
  digest: async function (algorithm: string, data: Uint8Array) {
    let algo = algorithm.toUpperCase() === 'SHA-1' ? CryptoJS.algo.SHA1 : CryptoJS.algo.SHA256;
    let hashAlgo = algo.create();
    const words = [];
    for (let i = 0; i < data.length; i += 4) {
      words.push((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | (data[i + 3]));
    }
    const wordArr = CryptoJS.lib.WordArray.create(words, data.length);
    hashAlgo.update(wordArr);
    const hash = hashAlgo.finalize();
    const hex = hash.toString(CryptoJS.enc.Hex);
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }
};

// Disable any warnings related to polyfills
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Possible Unhandled Promise Rejection', 'require cycle:']);
