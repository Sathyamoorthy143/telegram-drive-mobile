// Minimal util shim
module.exports = {
  inherits: function(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: { value: ctor, enumerable: false, writable: true, configurable: true }
      });
    }
  },
  deprecate: function(fn) { return fn; },
  inspect: function(obj) { return JSON.stringify(obj); },
  isArray: Array.isArray,
  isBoolean: function(v) { return typeof v === 'boolean'; },
  isNull: function(v) { return v === null; },
  isNumber: function(v) { return typeof v === 'number'; },
  isString: function(v) { return typeof v === 'string'; },
  isUndefined: function(v) { return typeof v === 'undefined'; },
  isObject: function(v) { return typeof v === 'object' && v !== null; },
  isFunction: function(v) { return typeof v === 'function'; },
  promisify: function(fn) {
    return function() {
      var args = Array.from(arguments);
      return new Promise(function(resolve, reject) {
        args.push(function(err, result) { if (err) reject(err); else resolve(result); });
        fn.apply(null, args);
      });
    };
  },
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : class { encode(s) { return new Uint8Array(0); } },
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : class { decode(b) { return ''; } },
};
