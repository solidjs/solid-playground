// Browser stand-in for Node's `assert`; Babel's helper-module-imports calls it as `assert(value, message)`.
function assert(value, message) {
  if (!value) throw new Error(message || 'Assertion failed');
}
assert.ok = assert;
module.exports = assert;
