import { useAlien } from '@alien-id/miniapps-react';

/**
 * Read-only summary of `useAlien()`'s context fields. Lets the example
 * surface bridge presence, auth token presence, and Contract Version
 * without cluttering `App.tsx`'s SDK demonstration with markup.
 */
export function StatusGrid() {
  const { isBridgeAvailable, authToken, contractVersion } = useAlien();

  return (
    <div className="status-grid">
      <div className="status-card">
        <div className="status-label">Bridge Status</div>
        <div
          className={`status-value ${isBridgeAvailable ? 'status-success' : 'status-warning'}`}
        >
          {isBridgeAvailable ? 'Available' : 'Not Available'}
        </div>
      </div>
      <div className="status-card">
        <div className="status-label">Auth Token</div>
        <div
          className={`status-value ${authToken ? 'status-success' : 'status-info'}`}
        >
          {authToken ? 'Present' : 'Not Available'}
        </div>
      </div>
      <div className="status-card">
        <div className="status-label">Contract Version</div>
        <div className="status-value status-info">
          {contractVersion ?? 'Unknown'}
        </div>
      </div>
    </div>
  );
}
