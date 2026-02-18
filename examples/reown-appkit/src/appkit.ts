import { solana, solanaDevnet } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';

const solanaAdapter = new SolanaAdapter();

// Get a free project ID at https://cloud.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'YOUR_PROJECT_ID';

createAppKit({
  adapters: [solanaAdapter],
  networks: [solana, solanaDevnet],
  projectId,
  metadata: {
    name: 'Alien Wallet Example',
    description: 'Alien Wallet with Reown AppKit',
    url: 'https://app.alien.org',
    icons: [],
  },
  features: {
    analytics: false,
  },
});
