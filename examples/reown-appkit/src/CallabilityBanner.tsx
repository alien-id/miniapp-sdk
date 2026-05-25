import type { MethodName } from '@alien-id/miniapps-contract';
import { useCallable } from '@alien-id/miniapps-react';

interface CallabilityBannerProps {
  method: MethodName;
}

/**
 * Demonstrates the three Callability branches exhaustively. Inside the
 * Alien App the host injects the bridge and `wallet.solana:connect` is
 * Callable; outside, AppKit transparently routes through other Solana
 * wallets and this banner explains the Alien-specific situation.
 */
export function CallabilityBanner({ method }: CallabilityBannerProps) {
  const callability = useCallable(method);

  if (callability.callable) {
    return (
      <section className="card callability-card callability-ok">
        <h2>Alien wallet ready</h2>
        <p>
          <code>{method}</code> is callable on this host — the Alien wallet can
          sign through the native bridge.
        </p>
      </section>
    );
  }

  if (callability.reason === 'no-bridge') {
    return (
      <section className="card callability-card callability-warn">
        <h2>Running outside the Alien App</h2>
        <p>
          The Alien bridge is not injected, so <code>{method}</code> is not
          callable. AppKit will fall back to any other Solana wallet you connect
          through this UI.
        </p>
      </section>
    );
  }

  return (
    <section className="card callability-card callability-warn">
      <h2>Alien App outdated</h2>
      <p>
        <code>{method}</code> needs Contract Version{' '}
        <code>{callability.needs}</code>, but the host provides{' '}
        <code>{callability.has}</code>. Update the Alien App to use the Alien
        wallet through this miniapp.
      </p>
    </section>
  );
}
