// Provide a shim for the global object
if (typeof window !== 'undefined') {
  window.global = window;
}
module.exports = window.global; 