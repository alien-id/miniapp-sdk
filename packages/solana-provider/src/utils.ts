import bs58 from 'bs58';

/** Encode a Uint8Array to a base64 string. */
export function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Decode a base64 string to a Uint8Array. */
export function base64Decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

/** Decode a base58 string to a Uint8Array. */
export function base58Decode(str: string): Uint8Array {
  return bs58.decode(str);
}

/** Encode a Uint8Array to a base58 string. */
export function base58Encode(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}
