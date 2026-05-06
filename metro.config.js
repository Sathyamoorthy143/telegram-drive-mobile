const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Polyfill Node.js built-in modules for GramJS
config.resolver.extraNodeModules = {
  crypto: require.resolve('./src/polyfills/crypto.js'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  process: require.resolve('process/browser'),
  net: require.resolve('./src/polyfills/net.js'),
  os: require.resolve('./src/polyfills/os.js'),
  path: require.resolve('./src/polyfills/path.js'),
  fs: require.resolve('./src/polyfills/fs.js'),
  util: require.resolve('./src/polyfills/util.js'),
  tls: require.resolve('./src/polyfills/net.js'),
  http: require.resolve('./src/polyfills/net.js'),
  https: require.resolve('./src/polyfills/net.js'),
  zlib: require.resolve('./src/polyfills/empty.js'),
  assert: require.resolve('./src/polyfills/empty.js'),
  url: require.resolve('./src/polyfills/empty.js'),
  string_decoder: require.resolve('string_decoder/'),
  constants: require.resolve('./src/polyfills/constants.js'),
};

module.exports = config;
