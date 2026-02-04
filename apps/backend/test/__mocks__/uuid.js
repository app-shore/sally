// Mock implementation of uuid for Jest tests
// This is needed because uuid v13+ is pure ESM and Jest has issues with it

const { randomUUID } = require('crypto');

module.exports = {
  v4: () => randomUUID(),
  v1: () => randomUUID(),
  v3: () => randomUUID(),
  v5: () => randomUUID(),
  validate: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  parse: (uuid) => Buffer.from(uuid.replace(/-/g, ''), 'hex'),
  stringify: (buffer) => {
    const hex = buffer.toString('hex');
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
  },
};
