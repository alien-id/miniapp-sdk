import { useAlien } from '@alien_org/react';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useState } from 'react';

function App() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { connection } = useAppKitConnection();
  const { isBridgeAvailable, authToken, contractVersion } = useAlien();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address || !connection) return;
    setLoadingBalance(true);
    try {
      const pubkey = new PublicKey(address);
      const lamports = await connection.getBalance(pubkey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [address, connection]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [isConnected, address, fetchBalance]);

  return (
    <div className="app">
      <header className="header">
        <h1>Alien Wallet</h1>
        <p className="subtitle">Reown AppKit Example</p>
      </header>

      <section className="card connect-card">
        {/* AppKit web component — renders connect/account button */}
        <appkit-button />
        <appkit-network-button />
      </section>

      {isConnected && address && (
        <section className="card wallet-card">
          <h2>Wallet Connected</h2>
          <div className="info-row">
            <span className="label">Address</span>
            <code className="address">{address}</code>
          </div>
          {caipNetwork && (
            <div className="info-row">
              <span className="label">Network</span>
              <span className="value">{caipNetwork.name}</span>
            </div>
          )}
          <div className="info-row">
            <span className="label">Balance</span>
            <span className="value">
              {loadingBalance
                ? 'Loading...'
                : balance !== null
                  ? `${balance.toFixed(4)} SOL`
                  : 'N/A'}
            </span>
          </div>
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
            Bridge is not available. Inside the Alien App, the Alien wallet
            appears automatically. Outside, you can connect any Solana wallet
            via Reown AppKit (WalletConnect, Phantom, etc.)
          </p>
        </section>
      )}
    </div>
  );
}

export default App;
