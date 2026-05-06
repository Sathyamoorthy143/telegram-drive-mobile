// Minimal fs shim - no-op for React Native (GramJS doesn't need disk access on mobile)
module.exports = {
  readFileSync: function() { return ''; },
  writeFileSync: function() {},
  existsSync: function() { return false; },
  mkdirSync: function() {},
  readdirSync: function() { return []; },
  statSync: function() { return { isFile: function() { return false; }, isDirectory: function() { return false; } }; },
  unlinkSync: function() {},
  createReadStream: function() { return { on: function() { return this; }, pipe: function() { return this; } }; },
  createWriteStream: function() { return { on: function() { return this; }, write: function() {}, end: function() {} }; },
  promises: {
    readFile: async function() { return ''; },
    writeFile: async function() {},
    stat: async function() { return {}; },
    mkdir: async function() {},
  },
};
