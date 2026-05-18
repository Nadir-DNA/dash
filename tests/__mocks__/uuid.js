// Mock for uuid package
let counter = 0;

function v4() {
  counter++;
  return `mock-uuid-${counter}-${Date.now()}`;
}

module.exports = {
  v4,
  v1: () => `mock-v1-${Date.now()}`,
  v3: (name, namespace) => `mock-v3-${name}-${namespace}`,
  v5: (name, namespace) => `mock-v5-${name}-${namespace}`,
};