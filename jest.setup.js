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

// crypto.randomUUID is not available in the jsdom environment.
if (!globalThis.crypto) globalThis.crypto = {};
if (typeof globalThis.crypto.getRandomValues !== "function") {
  globalThis.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  };
}
