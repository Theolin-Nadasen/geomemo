import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";

global.Buffer = Buffer;

// getRandomValues polyfill for React Native
try {
  if (typeof global.crypto === "undefined") {
    Object.defineProperty(global, "crypto", {
      configurable: true,
      enumerable: true,
      value: {
        getRandomValues: expoCryptoGetRandomValues,
      },
    });
  }
} catch (error) {
  console.error("Error applying crypto polyfill:", error);
}
