// Minimal os shim
module.exports = {
  platform: function() { return 'android'; },
  type: function() { return 'Android'; },
  arch: function() { return 'arm64'; },
  tmpdir: function() { return '/tmp'; },
  homedir: function() { return '/'; },
  hostname: function() { return 'mobile'; },
  EOL: '\n',
  endianness: function() { return 'LE'; },
  cpus: function() { return []; },
  totalmem: function() { return 0; },
  freemem: function() { return 0; },
  networkInterfaces: function() { return {}; },
  release: function() { return '1.0.0'; },
};
