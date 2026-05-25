import type { MethodName } from '@alien-id/miniapps-contract';
import { useCallable } from '@alien-id/miniapps-react';

interface CallabilityBannerProps {
  method: MethodName;
}

/**
 * Demonstrates the three Callability branches exhaustively:
 *   - `{ callable: true }`              → green, "ready"
 *   - `{ callable: false, reason: 'no-bridge' }`     → "open in Alien App"
 *   - `{ callable: false, reason: 'host-outdated' }` → "update Alien App"
 *
 * TypeScript narrowing on `callability.reason` means the `needs` / `has`
 * fields are only readable in the host-outdated branch.
 */
export function CallabilityBanner({ method }: CallabilityBannerProps) {
  const callability = useCallable(method);

  if (callability.callable) {
    return (
      <div className="callability-banner callability-ok">
        <strong>Ready.</strong> <code>{method}</code> is callable on this host.
      </div>
    );
  }

  if (callability.reason === 'no-bridge') {
    return (
      <div className="callability-banner callability-warn">
        <strong>Bridge unavailable.</strong> Open this miniapp inside the Alien
        App to call <code>{method}</code>.
      </div>
    );
  }

  return (
    <div className="callability-banner callability-warn">
      <strong>Host outdated.</strong> <code>{method}</code> requires Contract
      Version <code>{callability.needs}</code>, host provides{' '}
      <code>{callability.has}</code>. Update the Alien App.
    </div>
  );
}
