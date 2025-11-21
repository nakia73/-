
// Simple wrapper for Web Crypto API (AES-GCM)

const ALGO = 'AES-GCM';
const SALT = 'kie-studio-salt-v1'; // Fixed salt for this app context

// Derive a crypto key from the text password
const getKey = async (password: string) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Convert ArrayBuffer to Base64
const buf2base64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Convert Base64 to Uint8Array
const base642buf = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

export const encrypt = async (text: string, secret: string): Promise<string> => {
  try {
    if (!text) return '';
    const key = await getKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: ALGO,
        iv: iv,
      },
      key,
      encoded
    );

    // Return format: IV:Ciphertext (both in base64)
    return `${buf2base64(iv.buffer)}:${buf2base64(encrypted)}`;
  } catch (e) {
    console.error("Encryption failed", e);
    return text; // Fallback to plain text on error (or throw)
  }
};

export const decrypt = async (encryptedText: string, secret: string): Promise<string> => {
  try {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

    const [ivB64, cipherB64] = encryptedText.split(':');
    if (!ivB64 || !cipherB64) return encryptedText;

    const key = await getKey(secret);
    const iv = base642buf(ivB64);
    const ciphertext = base642buf(cipherB64);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ALGO,
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn("Decryption failed (likely plain text or wrong key)", e);
    return encryptedText; // Return as-is if decryption fails (legacy plain text compatibility)
  }
};
