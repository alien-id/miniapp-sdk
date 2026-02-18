import { describe, expect, test } from 'bun:test';
import {
  base58Decode,
  base58Encode,
  base64Decode,
  base64Encode,
} from '../src/utils';

/**
 * Base58 test vectors sourced from:
 * - Known Solana addresses (on-chain programs)
 * - Bitcoin's base58check test vectors (raw base58 portion)
 * - Edge cases: leading zeros, empty, single byte
 */
describe('base58Decode', () => {
  test('decodes single zero byte ("1" -> [0x00])', () => {
    const result = base58Decode('1');
    expect(result).toEqual(new Uint8Array([0]));
  });

  test('decodes two zero bytes ("11" -> [0x00, 0x00])', () => {
    const result = base58Decode('11');
    expect(result).toEqual(new Uint8Array([0, 0]));
  });

  test('decodes "2" to [0x01]', () => {
    const result = base58Decode('2');
    expect(result).toEqual(new Uint8Array([1]));
  });

  test('decodes "1A" to [0x00, 0x09] (leading zero + value)', () => {
    const result = base58Decode('1A');
    expect(result).toEqual(new Uint8Array([0, 9]));
  });

  // Solana System Program: 32 zero bytes
  test('decodes System Program address (32 "1"s -> 32 zero bytes)', () => {
    const result = base58Decode('11111111111111111111111111111111');
    expect(result.length).toBe(32);
    expect(result).toEqual(new Uint8Array(32));
  });

  // Known Solana addresses (verified on-chain)
  test('decodes Solana Token Program address', () => {
    // TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
    const result = base58Decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    expect(result.length).toBe(32);
    // First and last bytes of the known Token Program pubkey
    expect(result[0]).toBe(0x06);
    expect(result[31]).toBe(0xa9);
  });

  test('decodes USDC mint address', () => {
    // EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
    const result = base58Decode('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(result.length).toBe(32);
  });

  test('throws on invalid character', () => {
    expect(() => base58Decode('0OIl')).toThrow();
  });
});

describe('base58Encode', () => {
  test('encodes single zero byte to "1"', () => {
    expect(base58Encode(new Uint8Array([0]))).toBe('1');
  });

  test('encodes two zero bytes to "11"', () => {
    expect(base58Encode(new Uint8Array([0, 0]))).toBe('11');
  });

  test('encodes [0x01] to "2"', () => {
    expect(base58Encode(new Uint8Array([1]))).toBe('2');
  });

  test('encodes 32 zero bytes to 32 "1"s', () => {
    const result = base58Encode(new Uint8Array(32));
    expect(result).toBe('1'.repeat(32));
  });

  test('encodes [0x00, 0x09] to "1A"', () => {
    expect(base58Encode(new Uint8Array([0, 9]))).toBe('1A');
  });
});

describe('base58 roundtrip', () => {
  // Known Solana program addresses
  const knownAddresses = [
    '11111111111111111111111111111111', // System Program
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
    'SysvarRent111111111111111111111111111111111', // Rent sysvar
  ];

  for (const address of knownAddresses) {
    test(`roundtrip: ${address.slice(0, 16)}...`, () => {
      const decoded = base58Decode(address);
      const reencoded = base58Encode(decoded);
      expect(reencoded).toBe(address);
    });
  }

  test('roundtrip: random 64-byte signature', () => {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    const encoded = base58Encode(bytes);
    const decoded = base58Decode(encoded);
    expect(decoded).toEqual(bytes);
  });

  test('roundtrip: random 32-byte pubkey', () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const encoded = base58Encode(bytes);
    const decoded = base58Decode(encoded);
    expect(decoded).toEqual(bytes);
  });
});

/**
 * Base64 test vectors from RFC 4648 Section 10:
 * https://datatracker.ietf.org/doc/html/rfc4648#section-10
 */
describe('base64Encode', () => {
  // RFC 4648 test vectors
  test('RFC 4648: empty -> ""', () => {
    expect(base64Encode(new Uint8Array([]))).toBe('');
  });

  test('RFC 4648: "f" -> "Zg=="', () => {
    expect(base64Encode(new Uint8Array([0x66]))).toBe('Zg==');
  });

  test('RFC 4648: "fo" -> "Zm8="', () => {
    expect(base64Encode(new Uint8Array([0x66, 0x6f]))).toBe('Zm8=');
  });

  test('RFC 4648: "foo" -> "Zm9v"', () => {
    expect(base64Encode(new Uint8Array([0x66, 0x6f, 0x6f]))).toBe('Zm9v');
  });

  test('RFC 4648: "foob" -> "Zm9vYg=="', () => {
    expect(base64Encode(new Uint8Array([0x66, 0x6f, 0x6f, 0x62]))).toBe(
      'Zm9vYg==',
    );
  });

  test('RFC 4648: "fooba" -> "Zm9vYmE="', () => {
    expect(base64Encode(new Uint8Array([0x66, 0x6f, 0x6f, 0x62, 0x61]))).toBe(
      'Zm9vYmE=',
    );
  });

  test('RFC 4648: "foobar" -> "Zm9vYmFy"', () => {
    expect(
      base64Encode(new Uint8Array([0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72])),
    ).toBe('Zm9vYmFy');
  });

  test('encodes all zero bytes', () => {
    expect(base64Encode(new Uint8Array([0, 0, 0]))).toBe('AAAA');
  });

  test('encodes all 0xFF bytes', () => {
    expect(base64Encode(new Uint8Array([0xff, 0xff, 0xff]))).toBe('////');
  });
});

describe('base64Decode', () => {
  // RFC 4648 test vectors (reverse)
  test('RFC 4648: "" -> empty', () => {
    expect(base64Decode('')).toEqual(new Uint8Array([]));
  });

  test('RFC 4648: "Zg==" -> "f"', () => {
    expect(base64Decode('Zg==')).toEqual(new Uint8Array([0x66]));
  });

  test('RFC 4648: "Zm8=" -> "fo"', () => {
    expect(base64Decode('Zm8=')).toEqual(new Uint8Array([0x66, 0x6f]));
  });

  test('RFC 4648: "Zm9v" -> "foo"', () => {
    expect(base64Decode('Zm9v')).toEqual(new Uint8Array([0x66, 0x6f, 0x6f]));
  });

  test('RFC 4648: "Zm9vYmFy" -> "foobar"', () => {
    expect(base64Decode('Zm9vYmFy')).toEqual(
      new Uint8Array([0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]),
    );
  });

  test('decodes all zeros', () => {
    expect(base64Decode('AAAA')).toEqual(new Uint8Array([0, 0, 0]));
  });

  test('decodes all 0xFF', () => {
    expect(base64Decode('////')).toEqual(new Uint8Array([0xff, 0xff, 0xff]));
  });
});

describe('base64 roundtrip', () => {
  test('roundtrip: Solana transaction-sized payload (1232 bytes)', () => {
    const bytes = new Uint8Array(1232);
    crypto.getRandomValues(bytes);
    const encoded = base64Encode(bytes);
    const decoded = base64Decode(encoded);
    expect(decoded).toEqual(bytes);
  });

  test('roundtrip: single byte values 0x00-0xFF', () => {
    for (let i = 0; i < 256; i++) {
      const bytes = new Uint8Array([i]);
      const encoded = base64Encode(bytes);
      const decoded = base64Decode(encoded);
      expect(decoded).toEqual(bytes);
    }
  });

  test('roundtrip: Ed25519 signature (64 bytes)', () => {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    const encoded = base64Encode(bytes);
    const decoded = base64Decode(encoded);
    expect(decoded).toEqual(bytes);
  });
});
