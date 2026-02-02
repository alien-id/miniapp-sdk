import { request, send } from '@alien_org/bridge';
import { isMethodSupported } from '@alien_org/contract';
import { useCallback, useMemo, useState } from 'react';
import { useAlien } from './useAlien';

/** Clipboard error codes from the host app. */
export type ClipboardErrorCode = 'permission_denied' | 'unavailable';

export interface UseClipboardOptions {
  /**
   * Timeout for clipboard read in milliseconds.
   * @default 5000
   */
  timeout?: number;
}

export interface UseClipboardReturn {
  /** Write text to clipboard. Fire-and-forget. */
  writeText: (text: string) => void;
  /** Read text from clipboard. Returns text or null on failure. */
  readText: () => Promise<string | null>;
  /** Whether a read operation is in progress. */
  isReading: boolean;
  /** Error code from the last failed read operation. */
  errorCode: ClipboardErrorCode | null;
  /** Whether clipboard methods are supported by the host app. */
  supported: boolean;
}

/**
 * Hook for clipboard operations.
 *
 * @example
 * ```tsx
 * function ClipboardDemo() {
 *   const { writeText, readText, isReading, errorCode, supported } = useClipboard();
 *
 *   if (!supported) return null;
 *
 *   return (
 *     <>
 *       <button onClick={() => writeText('Hello!')}>Copy</button>
 *       <button
 *         onClick={async () => {
 *           const text = await readText();
 *           if (text !== null) console.log('Pasted:', text);
 *         }}
 *         disabled={isReading}
 *       >
 *         Paste
 *       </button>
 *       {errorCode && <span>Error: {errorCode}</span>}
 *     </>
 *   );
 * }
 * ```
 */
export function useClipboard(
  options: UseClipboardOptions = {},
): UseClipboardReturn {
  const { timeout = 5000 } = options;
  const { contractVersion, isBridgeAvailable } = useAlien();

  const [isReading, setIsReading] = useState(false);
  const [errorCode, setErrorCode] = useState<ClipboardErrorCode | null>(null);

  const supported = contractVersion
    ? isMethodSupported('clipboard:write', contractVersion) &&
      isMethodSupported('clipboard:read', contractVersion)
    : true;

  const writeText = useCallback(
    (text: string) => {
      if (!isBridgeAvailable) return;
      if (
        contractVersion &&
        !isMethodSupported('clipboard:write', contractVersion)
      )
        return;
      send('clipboard:write', { text });
    },
    [isBridgeAvailable, contractVersion],
  );

  const readText = useCallback(async (): Promise<string | null> => {
    if (!isBridgeAvailable) return null;
    if (
      contractVersion &&
      !isMethodSupported('clipboard:read', contractVersion)
    )
      return null;

    setIsReading(true);
    setErrorCode(null);

    try {
      const response = await request(
        'clipboard:read',
        {},
        'clipboard:response',
        { timeout },
      );

      if (response.errorCode) {
        setErrorCode(response.errorCode);
        return null;
      }

      return response.text;
    } catch {
      return null;
    } finally {
      setIsReading(false);
    }
  }, [isBridgeAvailable, contractVersion, timeout]);

  return useMemo(
    () => ({ writeText, readText, isReading, errorCode, supported }),
    [writeText, readText, isReading, errorCode, supported],
  );
}
