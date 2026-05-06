// Minimal net shim for GramJS
// GramJS uses net.Socket for TCP connections; in React Native it uses WebSocket instead
module.exports = {
  Socket: class Socket {
    constructor() {}
    connect() { return this; }
    write() {}
    end() {}
    destroy() {}
    on() { return this; }
    once() { return this; }
    removeListener() { return this; }
    setTimeout() {}
    setKeepAlive() {}
    setNoDelay() {}
    ref() {}
    unref() {}
  },
  createConnection: function() { return new module.exports.Socket(); },
  connect: function() { return new module.exports.Socket(); },
  createServer: function() { return {}; },
  isIP: function() { return 0; },
};
