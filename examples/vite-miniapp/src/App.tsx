import {
  type EventName,
  type MethodName,
  useAlien,
  useEvent,
  useMethod,
} from '@alien-id/react';
import { useState } from 'react';
import './App.css';

interface EventLog {
  id: string;
  timestamp: Date;
  event: string;
  payload: unknown;
}

interface RequestLog {
  id: string;
  timestamp: Date;
  method: MethodName;
  requestPayload: unknown;
  response?: unknown;
  error?: string;
  status: 'pending' | 'success' | 'error';
}

type MethodEventPair = {
  method: MethodName;
  event: EventName;
  label: string;
  getPayload: () => Record<string, unknown>;
};

const METHOD_EVENT_PAIRS: MethodEventPair[] = [
  {
    method: 'auth.init:request',
    event: 'auth.init:response.token',
    label: 'Auth Init',
    getPayload: () => ({
      appId: 'my-app-id',
      challenge: `challenge-${Date.now()}`,
    }),
  },
  {
    method: 'ping:request',
    event: 'ping:response',
    label: 'Ping',
    getPayload: () => ({
      message: `Hello from miniapp at ${new Date().toLocaleTimeString()}`,
    }),
  },
];

function App() {
  const { isBridgeAvailable, authToken, contractVersion } = useAlien();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [customPayload, setCustomPayload] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<MethodEventPair>(
    METHOD_EVENT_PAIRS[0],
  );

  // Setup selected method
  const { execute, supported, error, data, isLoading } = useMethod(
    selectedPair.method,
    selectedPair.event,
  );

  // Listen for events from the host app
  useEvent(selectedPair.event, (payload: unknown) => {
    const newEvent: EventLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      event: selectedPair.event,
      payload,
    };
    setEvents((prev) => [newEvent, ...prev]);
  });

  const handleSendRequest = async (executeFn: typeof execute) => {
    let payload: Record<string, unknown>;

    try {
      if (customPayload.trim()) {
        payload = JSON.parse(customPayload);
      } else {
        payload = selectedPair.getPayload();
      }
    } catch (error) {
      alert(`Invalid JSON payload. ${(error as Error).message}`);
      return;
    }

    const requestId = crypto.randomUUID();
    const requestLog: RequestLog = {
      id: requestId,
      timestamp: new Date(),
      method: selectedPair.method,
      requestPayload: payload,
      status: 'pending',
    };

    setRequests((prev) => [requestLog, ...prev]);

    const response = await executeFn(
      payload as Parameters<typeof executeFn>[0],
      { timeout: 5000 },
    );

    setRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              response,
              status: response ? ('success' as const) : ('error' as const),
            }
          : req,
      ),
    );
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const clearRequests = () => {
    setRequests([]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Alien Miniapp SDK</h1>
        <p className="subtitle">Request & Event Example</p>
      </header>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-label">Bridge Status</div>
          <div
            className={`status-value ${isBridgeAvailable ? 'status-success' : 'status-warning'}`}
          >
            {isBridgeAvailable ? 'Available' : 'Not Available'}
          </div>
          {!isBridgeAvailable && (
            <div className="status-hint">
              Open this miniapp in Alien App to enable bridge communication
            </div>
          )}
        </div>

        <div className="status-card">
          <div className="status-label">Auth Token</div>
          <div
            className={`status-value ${authToken ? 'status-success' : 'status-info'}`}
          >
            {authToken ? 'Present' : 'Not Available'}
          </div>
          {authToken && (
            <div className="status-hint">
              Token: {authToken.substring(0, 20)}...
            </div>
          )}
        </div>

        <div className="status-card">
          <div className="status-label">Contract Version</div>
          <div className="status-value status-info">
            {contractVersion ?? 'Unknown'}
          </div>
        </div>
      </div>

      <div className="request-section">
        <h2>Send Request</h2>
        <div className="request-form">
          <div className="form-group">
            <label htmlFor="method-select">Method / Event Pair</label>
            <select
              id="method-select"
              value={METHOD_EVENT_PAIRS.findIndex(
                (p) => p.method === selectedPair.method,
              )}
              onChange={(e) => {
                const pair = METHOD_EVENT_PAIRS[Number(e.target.value)];
                setSelectedPair(pair);
                setCustomPayload('');
              }}
              className="form-select"
            >
              {METHOD_EVENT_PAIRS.map((pair, index) => (
                <option key={pair.method} value={index}>
                  {pair.label} ({pair.method} → {pair.event})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payload-input">
              Payload (JSON){' '}
              <span className="label-hint">Leave empty for default</span>
            </label>
            <textarea
              id="payload-input"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder={JSON.stringify(selectedPair.getPayload(), null, 2)}
              className="form-textarea"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => handleSendRequest(execute)}
              disabled={isLoading || !supported || !isBridgeAvailable}
              className="send-button"
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </button>
            {!supported && (
              <span className="form-error">
                Method not supported in current version
              </span>
            )}
            {!isBridgeAvailable && (
              <span className="form-error">Bridge not available</span>
            )}
          </div>

          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error.message}
            </div>
          )}

          {data && (
            <div className="success-banner">
              <strong>Last Response:</strong>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="requests-section">
        <div className="section-header">
          <h2>Request History</h2>
          <button
            type="button"
            onClick={clearRequests}
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
              <div
                key={request.id}
                className={`request-card ${request.status}`}
              >
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

      <div className="events-section">
        <div className="section-header">
          <h2>Received Events</h2>
          <button
            type="button"
            onClick={clearEvents}
            className="clear-button"
            disabled={events.length === 0}
          >
            Clear
          </button>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <p>No events received yet</p>
            <p className="empty-hint">
              Events from the host app will appear here when received
            </p>
          </div>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <span className="event-name">{event.event}</span>
                  <span className="event-time">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="event-payload">
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-section">
        <h3>How it works</h3>
        <p>
          This example demonstrates both <code>useMethod</code> and{' '}
          <code>useEvent</code> hooks from the React SDK.
        </p>
        <p>
          <strong>useMethod:</strong> Send methods to the host app and
          automatically wait for responses. The hook handles loading states,
          errors, and version checking.
        </p>
        <p>
          <strong>useEvent:</strong> Listen for events from the host app. Events
          can be responses to requests or standalone notifications. The hook
          handles subscription and cleanup automatically.
        </p>
      </div>
    </div>
  );
}

export default App;
