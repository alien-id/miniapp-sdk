export interface RequestLogEntry {
  id: string;
  timestamp: Date;
  method: string;
  requestPayload: unknown;
  response?: unknown;
  error?: string;
  status: 'pending' | 'success' | 'error';
}

interface RequestHistoryProps {
  requests: RequestLogEntry[];
  onClear: () => void;
}

/**
 * Debug surface for the example's request log. Not part of the SDK — the
 * SDK demonstration lives in `App.tsx`; this component just renders state
 * the example accumulates locally.
 */
export function RequestHistory({ requests, onClear }: RequestHistoryProps) {
  return (
    <div className="requests-section">
      <div className="section-header">
        <h2>Request History</h2>
        <button
          type="button"
          onClick={onClear}
          className="clear-button"
          disabled={requests.length === 0}
        >
          Clear
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📤</div>
          <p>No requests sent yet</p>
          <p className="empty-hint">
            Send a request using the form above to see it here
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.id} className={`request-card ${request.status}`}>
              <div className="request-header">
                <span className="request-method">{request.method}</span>
                <span className="request-time">
                  {request.timestamp.toLocaleTimeString()}
                </span>
                <span className={`request-status ${request.status}`}>
                  {request.status === 'pending' && '⏳ Pending'}
                  {request.status === 'success' && '✅ Success'}
                  {request.status === 'error' && '❌ Error'}
                </span>
              </div>
              <div className="request-details">
                <div className="request-payload">
                  <strong>Request:</strong>
                  <pre>{JSON.stringify(request.requestPayload, null, 2)}</pre>
                </div>
                {request.response !== undefined && (
                  <div className="request-response success">
                    <strong>Response:</strong>
                    <pre>{JSON.stringify(request.response, null, 2)}</pre>
                  </div>
                )}
                {request.error && (
                  <div className="request-response error">
                    <strong>Error:</strong>
                    <pre>{String(request.error)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
