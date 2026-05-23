import type {
  MethodPayload,
  MethodResponseEvent,
} from '@alien-id/miniapps-contract';
import { useMemo, useState } from 'react';

type DemoMethod = 'payment:request';
type DemoEvent = MethodResponseEvent<DemoMethod>;
type DemoPayload = Omit<MethodPayload<DemoMethod>, 'reqId'>;

interface RequestFormProps {
  method: DemoMethod;
  responseEvent: DemoEvent;
  callable: boolean;
  isLoading: boolean;
  error: Error | null | undefined;
  data: unknown;
  onSend: (payload: DemoPayload) => Promise<void>;
}

const buildDefaultPayload = (): DemoPayload => ({
  recipient: 'wallet-123',
  amount: '100',
  token: 'SOL',
  network: 'solana',
  invoice: `inv-${Date.now()}`,
  item: { title: 'Test Payment', iconUrl: '', quantity: 1 },
});

/**
 * Request form for the example. Wraps a parsed-JSON textarea, a Send
 * button, and the response display so `App.tsx` stays focused on wiring
 * SDK hooks together rather than on UI plumbing.
 */
export function RequestForm({
  method,
  responseEvent,
  callable,
  isLoading,
  error,
  data,
  onSend,
}: RequestFormProps) {
  const [customPayload, setCustomPayload] = useState('');
  const defaultPayloadPreview = useMemo(
    () => JSON.stringify(buildDefaultPayload(), null, 2),
    [],
  );

  const handleClick = async () => {
    let payload: DemoPayload;
    if (customPayload.trim()) {
      try {
        // Raw JSON from the textarea bypasses the type system on purpose —
        // production code should go through `buildDefaultPayload()`.
        payload = JSON.parse(customPayload) as DemoPayload;
      } catch (err) {
        alert(`Invalid JSON payload. ${(err as Error).message}`);
        return;
      }
    } else {
      payload = buildDefaultPayload();
    }
    await onSend(payload);
  };

  return (
    <div className="request-section">
      <h2>Send Request</h2>
      <div className="request-form">
        <div className="label-hint">
          Method: <code>{method}</code> → <code>{responseEvent}</code>
        </div>
        <textarea
          id="payload-input"
          value={customPayload}
          onChange={(e) => setCustomPayload(e.target.value)}
          placeholder={defaultPayloadPreview}
          className="form-textarea"
          rows={4}
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading || !callable}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send Request'}
        </button>
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error.message}
          </div>
        )}
        {data !== undefined && data !== null && (
          <div className="success-banner">
            <strong>Last Response:</strong>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export type { DemoEvent, DemoMethod, DemoPayload };
export { buildDefaultPayload };
