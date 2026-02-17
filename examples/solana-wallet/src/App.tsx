import { useAlien } from '@alien_org/react';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState } from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

const NETWORKS = ['devnet', 'mainnet-beta'] as const;
type Network = (typeof NETWORKS)[number];

function WalletContent() {
  const { publicKey, connected, connecting, disconnecting, wallet } =
    useWallet();
  const { isBridgeAvailable, authToken, contractVersion } = useAlien();

  return (
    <div className="app">
      <header className="header">
        <h1>Alien Wallet</h1>
        <p className="subtitle">Solana Provider Example</p>
      </header>

      <section className="card connect-card">
        <WalletMultiButton />

        {connecting && <p className="status-text">Connecting...</p>}
        {disconnecting && <p className="status-text">Disconnecting...</p>}
      </section>

      {connected && publicKey && (
        <section className="card wallet-card">
          <h2>Wallet Connected</h2>
          <div className="info-row">
            <span className="label">Address</span>
            <code className="address">{publicKey.toBase58()}</code>
          </div>
          {wallet && (
            <div className="info-row">
              <span className="label">Wallet</span>
              <span className="value">{wallet.adapter.name}</span>
            </div>
          )}
        </section>
      )}

      <section className="card status-card">
        <h2>Bridge Status</h2>
        <div className="info-row">
          <span className="label">Bridge</span>
          <span
            className={`badge ${isBridgeAvailable ? 'badge-ok' : 'badge-warn'}`}
          >
            {isBridgeAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <div className="info-row">
          <span className="label">Auth Token</span>
          <span className={`badge ${authToken ? 'badge-ok' : 'badge-muted'}`}>
            {authToken ? `${authToken.slice(0, 12)}...` : 'None'}
          </span>
        </div>
        <div className="info-row">
          <span className="label">Contract Version</span>
          <span className="value">{contractVersion ?? 'Unknown'}</span>
        </div>
      </section>

      {!isBridgeAvailable && (
        <section className="card hint-card">
          <p>
            Bridge is not available. Open this miniapp inside the Alien App to
            connect your wallet through the native bridge.
          </p>
          <p>
            When running outside the Alien App, you can still test the UI, but
            wallet operations will not work.
          </p>
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [network, setNetwork] = useState<Network>('devnet');
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Empty wallets array - Alien wallet is auto-discovered via wallet-standard
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="network-selector">
            {NETWORKS.map((n) => (
              <button
                key={n}
                type="button"
                className={`network-btn ${network === n ? 'active' : ''}`}
                onClick={() => setNetwork(n)}
              >
                {n === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
              </button>
            ))}
          </div>
          <WalletContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
