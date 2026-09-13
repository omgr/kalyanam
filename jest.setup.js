require("@testing-library/jest-dom");

// Dexie needs a real IndexedDB implementation; jsdom does not ship one.
require("fake-indexeddb/auto");

// fake-indexeddb clones every stored value with structuredClone, which jsdom
// does not expose. Use V8's serializer rather than a JSON round trip - JSON
// would turn every Date back into a string and the tests would be asserting
// against the very bug they exist to catch.
if (typeof globalThis.structuredClone !== "function") {
  const v8 = require("node:v8");
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}

// jsdom ships neither TextEncoder/TextDecoder nor SubtleCrypto; both are
// standard in every browser the app actually runs in.
const { TextEncoder, TextDecoder } = require("node:util");
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;

// crypto.randomUUID is not available in the jsdom environment.
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = require("node:crypto").webcrypto.subtle;
}
if (typeof globalThis.crypto.getRandomValues !== "function") {
  globalThis.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  };
}

// jsdom has no matchMedia. The app guards for this, but providing it here
// keeps tests exercising the normal path rather than the fallback.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  });
}
