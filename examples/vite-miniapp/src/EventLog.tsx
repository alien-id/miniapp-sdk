export interface EventLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  payload: unknown;
}

interface EventLogProps {
  events: EventLogEntry[];
  onClear: () => void;
}

/**
 * Debug surface for events received from the host. Not part of the SDK —
 * the SDK demonstration lives in `App.tsx`; this component just renders
 * state the example accumulates locally.
 */
export function EventLog({ events, onClear }: EventLogProps) {
  return (
    <div className="events-section">
      <div className="section-header">
        <h2>Received Events</h2>
        <button
          type="button"
          onClick={onClear}
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
  );
}
