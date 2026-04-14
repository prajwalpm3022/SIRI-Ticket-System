/**
 * Secure Storage Utility
 * Provides encryption/decryption using Web Crypto API
 */

/**
 * Secure Storage Utility
 * Provides encryption/decryption using Web Crypto API
 * @module utils/secureStorage
 */

const ENCRYPTION_KEY_NAME = "sessionKey";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

/**
 * Generates or retrieves encryption key
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey() {
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);

  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ["encrypt", "decrypt"]
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));

  return key;
}

/**
 * Encrypts data and stores it in localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to encrypt
 * @returns {Promise<void>}
 */
export async function encryptData(key, data) {
  if (!window.isSecureContext) {
    console.warn("Insecure context — storing data without encryption");
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }

  const encryptionKey = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encodedData
  );

  const encryptedObject = {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedData)),
  };

  localStorage.setItem(key, JSON.stringify(encryptedObject));
}

/**
 * Decrypts data from localStorage
 * @param {string} key - Storage key
 * @returns {Promise<any|null>}
 */
export async function decryptData(key) {
  try {
    const storedData = localStorage.getItem(key);
    if (!storedData) {
      return null;
    }

    // 🔐 IMPORTANT: insecure context → return plain JSON
    if (!window.isSecureContext) {
      return JSON.parse(storedData);
    }

    const encryptionKey = await getEncryptionKey();
    const { iv, data } = JSON.parse(storedData);

    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv) },
      encryptionKey,
      new Uint8Array(data)
    );

    const decodedData = new TextDecoder().decode(decryptedData);
    return JSON.parse(decodedData);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

/**
 * Removes encrypted data from storage
 * @param {string} key - Storage key
 */
export function removeEncryptedData(key) {
  localStorage.removeItem(key);
  localStorage.removeItem("users_id");
}

import CryptoJS from "crypto-js";

/**
 * Encrypts API payload (for backend)
 * @param {object} data
 * @returns {string}
 */
export function encryptApiPayload(data) {
  const key = import.meta.env.VITE_LOGIN_SECRET_KEY;

  if (!key) {
    throw new Error("VITE_LOGIN_SECRET_KEY is missing");
  }

  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}
/**
 * Secure Storage Utility
 * Provides encryption/decryption using Web Crypto API
 */
