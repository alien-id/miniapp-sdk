import type { MethodName } from '@alien-id/miniapps-contract';
import { useCallable } from '@alien-id/miniapps-react';

interface CallabilityBannerProps {
  method: MethodName;
}

/**
 * Demonstrates the three Callability branches exhaustively. The Solana
 * connect flow gates on `wallet.solana:connect` — if the host's Contract
 * Version doesn't cover it, the connect button should be disabled and
 * this banner explains why.
 */
export function CallabilityBanner({ method }: CallabilityBannerProps) {
  const callability = useCallable(method);

  if (callability.callable) {
    return (
      <section className="card callability-card callability-ok">
        <h2>Method callable</h2>
        <p>
          <code>{method}</code> is ready to call on this host.
        </p>
      </section>
    );
  }

  if (callability.reason === 'no-bridge') {
    return (
      <section className="card callability-card callability-warn">
        <h2>Bridge unavailable</h2>
        <p>
          Open this miniapp inside the Alien App to call <code>{method}</code>.
          In dev mode the bridge is absent, so the wallet operations route
          through Reown / wallet-adapter fallbacks instead of the Alien wallet.
        </p>
      </section>
    );
  }

  return (
    <section className="card callability-card callability-warn">
      <h2>Host outdated</h2>
      <p>
        <code>{method}</code> requires Alien App Contract Version{' '}
        <code>{callability.needs}</code>, but the host provides{' '}
        <code>{callability.has}</code>. Update the Alien App to use this wallet.
      </p>
    </section>
  );
}
