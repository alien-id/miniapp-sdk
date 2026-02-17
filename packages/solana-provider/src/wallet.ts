import { request, send } from '@alien_org/bridge';
import {
  type SolanaChain,
  WALLET_ERROR,
  type WalletSolanaErrorCode,
} from '@alien_org/contract';
import type {
  SolanaSignAndSendTransactionFeature,
  SolanaSignAndSendTransactionMethod,
  SolanaSignAndSendTransactionOutput,
  SolanaSignMessageFeature,
  SolanaSignMessageMethod,
  SolanaSignMessageOutput,
  SolanaSignTransactionFeature,
  SolanaSignTransactionMethod,
  SolanaSignTransactionOutput,
} from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type {
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature,
  StandardEventsListeners,
  StandardEventsNames,
  StandardEventsOnMethod,
} from '@wallet-standard/features';

import { AlienSolanaAccount } from './account';
import { icon } from './icon';
import {
  base58Decode,
  base58Encode,
  base64Decode,
  base64Encode,
} from './utils';

const SOLANA_CHAINS = [
  'solana:mainnet',
  'solana:devnet',
  'solana:testnet',
] as const;

export class AlienWalletError extends Error {
  readonly code: WalletSolanaErrorCode;

  constructor(code: WalletSolanaErrorCode, message?: string) {
    super(message ?? `Wallet error: ${code}`);
    this.name = 'AlienWalletError';
    this.code = code;
  }
}

export class AlienSolanaWallet implements Wallet {
  readonly version = '1.0.0' as const;
  readonly name = 'Alien' as const;
  readonly icon = icon;
  readonly chains = SOLANA_CHAINS;

  #accounts: AlienSolanaAccount[] = [];
  #listeners: {
    [E in StandardEventsNames]?: Set<StandardEventsListeners[E]>;
  } = {};

  get accounts(): readonly WalletAccount[] {
    return this.#accounts;
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignTransactionFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignMessageFeature {
    return {
      'standard:connect': {
        version: '1.0.0',
        connect: this.#connect,
      },
      'standard:disconnect': {
        version: '1.0.0',
        disconnect: this.#disconnect,
      },
      'standard:events': {
        version: '1.0.0',
        on: this.#on,
      },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: this.#signTransaction,
      },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: this.#signAndSendTransaction,
      },
      'solana:signMessage': {
        version: '1.0.0',
        signMessage: this.#signMessage,
      },
    };
  }

  #connect: StandardConnectMethod = async ({ silent } = {}) => {
    if (this.#accounts.length > 0) {
      return { accounts: this.accounts };
    }

    if (silent) {
      return { accounts: [] };
    }

    const response = await request(
      'wallet.solana:connect',
      {},
      'wallet.solana:connect.response',
      { timeout: 60000 },
    );

    if (response.errorCode) {
      throw new AlienWalletError(response.errorCode, response.errorMessage);
    }

    if (!response.publicKey) {
      throw new AlienWalletError(
        WALLET_ERROR.INTERNAL_ERROR,
        'No public key in connect response',
      );
    }

    const account = new AlienSolanaAccount(response.publicKey);
    this.#accounts = [account];
    this.#emit('change', { accounts: this.accounts });

    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectMethod = async () => {
    if (this.#accounts.length === 0) return;

    send('wallet.solana:disconnect', {} as Record<string, never>);
    this.#accounts = [];
    this.#emit('change', { accounts: this.accounts });
  };

  #on: StandardEventsOnMethod = (event, listener) => {
    let listeners = this.#listeners[event];
    if (!listeners) {
      listeners = new Set();
      this.#listeners[event] = listeners;
    }
    listeners.add(listener);

    return () => {
      this.#listeners[event]?.delete(listener);
    };
  };

  #assertAccount(account: WalletAccount): void {
    if (!this.#accounts.some((a) => a.address === account.address)) {
      throw new AlienWalletError(
        WALLET_ERROR.INTERNAL_ERROR,
        'Account not connected',
      );
    }
  }

  #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    const outputs: SolanaSignTransactionOutput[] = [];

    for (const input of inputs) {
      this.#assertAccount(input.account);

      const transactionBase64 = base64Encode(input.transaction);

      const response = await request(
        'wallet.solana:sign.transaction',
        { transaction: transactionBase64 },
        'wallet.solana:sign.transaction.response',
        { timeout: 60000 },
      );

      if (response.errorCode) {
        throw new AlienWalletError(response.errorCode, response.errorMessage);
      }

      if (!response.signedTransaction) {
        throw new AlienWalletError(
          WALLET_ERROR.INTERNAL_ERROR,
          'No signed transaction in response',
        );
      }

      outputs.push({
        signedTransaction: base64Decode(response.signedTransaction),
      });
    }

    return outputs;
  };

  #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (
    ...inputs
  ) => {
    const outputs: SolanaSignAndSendTransactionOutput[] = [];

    for (const input of inputs) {
      this.#assertAccount(input.account);

      const transactionBase64 = base64Encode(input.transaction);

      const response = await request(
        'wallet.solana:sign.send',
        {
          transaction: transactionBase64,
          chain: input.chain as SolanaChain,
          options: input.options
            ? {
                skipPreflight: input.options.skipPreflight,
                preflightCommitment: input.options.preflightCommitment as
                  | 'processed'
                  | 'confirmed'
                  | 'finalized'
                  | undefined,
                commitment: input.options.commitment as
                  | 'processed'
                  | 'confirmed'
                  | 'finalized'
                  | undefined,
                minContextSlot: input.options.minContextSlot,
                maxRetries: input.options.maxRetries,
              }
            : undefined,
        },
        'wallet.solana:sign.send.response',
        { timeout: 60000 },
      );

      if (response.errorCode) {
        throw new AlienWalletError(response.errorCode, response.errorMessage);
      }

      if (!response.signature) {
        throw new AlienWalletError(
          WALLET_ERROR.INTERNAL_ERROR,
          'No signature in response',
        );
      }

      // Response signature is base58-encoded, decode to bytes
      outputs.push({
        signature: base58Decode(response.signature),
      });
    }

    return outputs;
  };

  #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    const outputs: SolanaSignMessageOutput[] = [];

    for (const input of inputs) {
      this.#assertAccount(input.account);

      const messageBase58 = base58Encode(input.message);

      const response = await request(
        'wallet.solana:sign.message',
        { message: messageBase58 },
        'wallet.solana:sign.message.response',
        { timeout: 60000 },
      );

      if (response.errorCode) {
        throw new AlienWalletError(response.errorCode, response.errorMessage);
      }

      if (!response.signature || !response.publicKey) {
        throw new AlienWalletError(
          WALLET_ERROR.INTERNAL_ERROR,
          'No signature or publicKey in response',
        );
      }

      outputs.push({
        signedMessage: input.message,
        signature: base58Decode(response.signature),
        signatureType: 'ed25519',
      });
    }

    return outputs;
  };

  #emit<E extends StandardEventsNames>(
    event: E,
    ...args: Parameters<StandardEventsListeners[E]>
  ): void {
    const listeners = this.#listeners[event];
    if (listeners) {
      for (const listener of listeners) {
        // Type is guaranteed correct by #on's StandardEventsOnMethod signature
        (listener as (...a: Parameters<StandardEventsListeners[E]>) => void)(
          ...args,
        );
      }
    }
  }
}
