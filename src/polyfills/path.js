// Minimal path shim
module.exports = {
  join: function() { return Array.from(arguments).join('/'); },
  resolve: function() { return Array.from(arguments).join('/'); },
  dirname: function(p) { return p.split('/').slice(0, -1).join('/'); },
  basename: function(p) { return p.split('/').pop(); },
  extname: function(p) { var m = p.match(/\.[^.]+$/); return m ? m[0] : ''; },
  sep: '/',
  delimiter: ':',
  normalize: function(p) { return p; },
  isAbsolute: function(p) { return p.charAt(0) === '/'; },
  relative: function(from, to) { return to; },
  parse: function(p) { return { root: '', dir: '', base: p, ext: '', name: p }; },
};
