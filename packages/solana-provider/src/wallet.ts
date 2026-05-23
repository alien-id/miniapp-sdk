import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  request,
  send,
} from '@alien-id/miniapps-bridge';
import {
  type SolanaChain,
  WALLET_ERROR,
  type WalletSolanaErrorCode,
} from '@alien-id/miniapps-contract';
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

function isSolanaChain(chain: string): chain is SolanaChain {
  return (SOLANA_CHAINS as readonly string[]).includes(chain);
}

export class AlienWalletError extends Error {
  readonly code: WalletSolanaErrorCode;

  constructor(code: WalletSolanaErrorCode, message?: string) {
    super(message ?? `Wallet error: ${code}`);
    this.name = 'AlienWalletError';
    this.code = code;
  }
}

function normalizeWalletError(error: unknown): AlienWalletError {
  if (error instanceof AlienWalletError) {
    return error;
  }

  // Strict Track now gates on Callability and throws typed bridge errors
  // immediately. Map them to wallet-standard codes with actionable messages
  // so wallet adapters can surface "open in Alien App" / "update Alien App"
  // UI instead of a generic "Internal error".
  if (error instanceof BridgeMethodUnsupportedError) {
    return new AlienWalletError(
      WALLET_ERROR.INTERNAL_ERROR,
      `Alien App needs to be updated to v${error.minVersion} to use this wallet feature (host is v${error.contractVersion}).`,
    );
  }

  if (error instanceof BridgeUnavailableError) {
    return new AlienWalletError(
      WALLET_ERROR.INTERNAL_ERROR,
      'Alien App bridge is not available. Open this miniapp inside Alien App.',
    );
  }

  if (error instanceof BridgeTimeoutError) {
    return new AlienWalletError(
      WALLET_ERROR.REQUEST_EXPIRED,
      `Alien App did not respond to ${error.method} within ${error.timeout}ms.`,
    );
  }

  if (error instanceof Error) {
    return new AlienWalletError(WALLET_ERROR.INTERNAL_ERROR, error.message);
  }

  return new AlienWalletError(WALLET_ERROR.INTERNAL_ERROR, String(error));
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
    ).catch((error) => {
      throw normalizeWalletError(error);
    });

    if (response.errorCode) {
      throw new AlienWalletError(response.errorCode, response.errorMessage);
    }

    if (!response.publicKey) {
      throw new AlienWalletError(
        WALLET_ERROR.INTERNAL_ERROR,
        'No public key in connect response',
      );
    }

    // base58Decode (via the account constructor) throws on malformed input.
    // Map that to a typed wallet error so adapters get a coherent failure
    // instead of a raw bs58 stack.
    let account: AlienSolanaAccount;
    try {
      account = new AlienSolanaAccount(response.publicKey);
    } catch (err) {
      throw new AlienWalletError(
        WALLET_ERROR.INTERNAL_ERROR,
        `Host returned invalid publicKey: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    this.#accounts = [account];
    this.#emit('change', { accounts: this.accounts });

    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectMethod = async () => {
    if (this.#accounts.length === 0) return;

    send.ifAvailable('wallet.solana:disconnect', {});
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
      ).catch((error) => {
        throw normalizeWalletError(error);
      });

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

      if (!isSolanaChain(input.chain)) {
        throw new AlienWalletError(
          WALLET_ERROR.INVALID_PARAMS,
          `Unsupported Solana chain "${input.chain}". Expected one of: ${SOLANA_CHAINS.join(', ')}.`,
        );
      }

      const transactionBase64 = base64Encode(input.transaction);

      const response = await request(
        'wallet.solana:sign.send',
        {
          transaction: transactionBase64,
          chain: input.chain,
          options: input.options
            ? {
                skipPreflight: input.options.skipPreflight,
                preflightCommitment: input.options.preflightCommitment,
                commitment: input.options.commitment,
                minContextSlot: input.options.minContextSlot,
                maxRetries: input.options.maxRetries,
              }
            : undefined,
        },
        'wallet.solana:sign.send.response',
      ).catch((error) => {
        throw normalizeWalletError(error);
      });

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
      ).catch((error) => {
        throw normalizeWalletError(error);
      });

      if (response.errorCode) {
        throw new AlienWalletError(response.errorCode, response.errorMessage);
      }

      if (!response.signature || !response.publicKey) {
        throw new AlienWalletError(
          WALLET_ERROR.INTERNAL_ERROR,
          'No signature or publicKey in response',
        );
      }

      // Guard against the host signing with a different key than the one the
      // dapp requested. A mismatch breaks the wallet-standard contract and can
      // silently route signatures to the wrong account.
      if (response.publicKey !== input.account.address) {
        throw new AlienWalletError(
          WALLET_ERROR.INTERNAL_ERROR,
          `Sign message responder publicKey ${response.publicKey} does not match requested account ${input.account.address}.`,
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
