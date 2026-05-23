import {
  BridgeBusyError,
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  request,
  send,
} from '@alien-id/miniapps-bridge';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useCallable, withSupportedAlias } from './useCallable';
import { useMounted } from './useMounted';

/** Clipboard error codes from the host app. */
export type ClipboardErrorCode = 'permission_denied' | 'unavailable';

export interface UseClipboardOptions {
  /**
   * Timeout for clipboard read in milliseconds.
   * @default 5000
   */
  timeout?: number;
}

/**
 * Outcome of a clipboard read.
 *
 * - `ok: true` — host returned text (possibly empty string).
 * - `ok: false, errorCode` — host-domain refusal (`permission_denied` /
 *   `unavailable`).
 * - `ok: false, error` — pre-call refusal or transport failure: typed
 *   {@link BridgeError} subclass (`BridgeUnavailableError`,
 *   `BridgeMethodUnsupportedError`, `BridgeTimeoutError`).
 */
export type ClipboardReadResult =
  | { ok: true; text: string }
  | { ok: false; errorCode: ClipboardErrorCode; error?: undefined }
  | { ok: false; errorCode?: undefined; error: BridgeError };

export interface UseClipboardReturn {
  /** Write text to clipboard. Fire-and-forget. */
  writeText: (text: string) => void;
  /**
   * Read text from clipboard. Resolves with a discriminated result so
   * callers can distinguish bridge/timeout failures from host-domain
   * clipboard refusals.
   */
  readText: () => Promise<ClipboardReadResult>;
  /** Whether a read operation is in progress. */
  isReading: boolean;
  /** Error code from the last failed read operation (host-domain only). */
  errorCode: ClipboardErrorCode | null;
  /**
   * Bridge error from the last failed read operation (pre-call refusal,
   * timeout, transport). Null when the last read succeeded or failed for
   * a host-domain reason.
   */
  error: BridgeError | null;
  /** Whether both clipboard methods are Callable. */
  callable: boolean;
}

/**
 * Hook for clipboard operations.
 */
export function useClipboard(
  options: UseClipboardOptions = {},
): UseClipboardReturn {
  const { timeout = 5000 } = options;
  const writeCallability = useCallable('clipboard:write');
  const readCallability = useCallable('clipboard:read');
  const callable = writeCallability.callable && readCallability.callable;

  const [isReading, setIsReading] = useState(false);
  const [errorCode, setErrorCode] = useState<ClipboardErrorCode | null>(null);
  const [error, setError] = useState<BridgeError | null>(null);
  const readingRef = useRef(false);
  const mounted = useMounted();

  const writeText = useCallback((text: string) => {
    // No local state to flicker; safe-track absorbs errors. Surface a dev
    // warning so consumers notice unavailable hosts during development.
    const result = send.ifAvailable('clipboard:write', { text });
    if (!result.ok && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[@alien-id/miniapps-react] clipboard:write not callable:',
        result.error,
      );
    }
  }, []);

  const readText = useCallback(async (): Promise<ClipboardReadResult> => {
    if (readingRef.current) {
      return { ok: false, error: new BridgeBusyError('clipboard:read') };
    }

    // Short-circuit pre-call refusal so `isReading` doesn't flicker and
    // callers see the typed bridge error directly.
    if (!readCallability.callable) {
      const bridgeError: BridgeError =
        readCallability.reason === 'no-bridge'
          ? new BridgeUnavailableError()
          : new BridgeMethodUnsupportedError(
              'clipboard:read',
              readCallability.has,
              readCallability.needs,
            );
      setErrorCode(null);
      setError(bridgeError);
      return { ok: false, error: bridgeError };
    }

    readingRef.current = true;
    setIsReading(true);
    setErrorCode(null);
    setError(null);

    try {
      const result = await request.ifAvailable(
        'clipboard:read',
        {},
        'clipboard:response',
        { timeout },
      );
      if (!result.ok) {
        const { error: bridgeError } = result;
        if (mounted.current) setError(bridgeError);
        return { ok: false, error: bridgeError };
      }
      if (result.data.errorCode) {
        if (mounted.current) setErrorCode(result.data.errorCode);
        return { ok: false, errorCode: result.data.errorCode };
      }
      // Protocol violation: host returned ok (no errorCode) but a null
      // text. Surface as a typed BridgeError instead of silently coercing
      // to '' — empty string is a legitimate clipboard payload that the
      // caller would otherwise be unable to distinguish from a bug.
      if (result.data.text == null) {
        const protoError = new BridgeError(
          "Host returned clipboard:response without a text or errorCode.",
        );
        if (mounted.current) setError(protoError);
        return { ok: false, error: protoError };
      }
      return { ok: true, text: result.data.text };
    } finally {
      readingRef.current = false;
      if (mounted.current) setIsReading(false);
    }
  }, [readCallability, timeout, mounted]);

  return useMemo(
    () =>
      withSupportedAlias({
        writeText,
        readText,
        isReading,
        errorCode,
        error,
        callable,
      }),
    [writeText, readText, isReading, errorCode, error, callable],
  );
}
