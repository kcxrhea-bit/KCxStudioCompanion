import { webcrypto } from 'node:crypto';

// Polyfill globalThis.crypto for Jest's Node environment.
// Electron renderer has this natively; Node < 19 does not.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
}
