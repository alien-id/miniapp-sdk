import {
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  request,
  send,
} from '@alien-id/miniapps-bridge';
import {
  SOLANA_CHAINS,
  type SolanaChain,
  WALLET_ERROR,
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
import { AlienWalletError } from './errors';
import { icon } from './icon';
import {
  base58Decode,
  base58Encode,
  base64Decode,
  base64Encode,
} from './utils';

// `.includes(string)` against a tuple of literals fails typecheck because
// the tuple's element type is the narrow union, not `string`. Widening for
// the call only is the standard idiom — narrower than asserting the
// argument at the call site.
function isSolanaChain(chain: string): chain is SolanaChain {
  return (SOLANA_CHAINS as readonly string[]).includes(chain);
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

/**
 * Wrap a host-provided string decode (base58 or base64) so malformed input
 * from the native side surfaces as a typed `AlienWalletError` instead of a
 * raw `Error` / `RangeError` leaking the underlying codec stack.
 */
function safeDecode(
  kind: 'publicKey' | 'signedTransaction' | 'signature',
  decoder: (str: string) => Uint8Array,
  str: string,
): Uint8Array {
  try {
    return decoder(str);
  } catch (err) {
    throw new AlienWalletError(
      WALLET_ERROR.INTERNAL_ERROR,
      `Host returned invalid ${kind}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

type AlienSolanaWalletFeatures = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignTransactionFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignMessageFeature;

export class AlienSolanaWallet implements Wallet {
  readonly version = '1.0.0' as const;
  readonly name = 'Alien' as const;
  readonly icon = icon;
  readonly chains = SOLANA_CHAINS;

  #accounts: AlienSolanaAccount[] = [];
  #listeners: {
    [E in StandardEventsNames]?: Set<StandardEventsListeners[E]>;
  } = {};

  // Built once for reference-stability. Wallet adapters often memoize
  // derived state keyed on the features object; rebuilding it on every
  // access would defeat that caching. The wallet-standard spec doesn't
  // strictly require stability (reference impls like Ghost rebuild each
  // access) — this is a defensive perf win, not a correctness fix.
  readonly #features: AlienSolanaWalletFeatures;

  constructor() {
    this.#features = {
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

  get accounts(): readonly WalletAccount[] {
    return this.#accounts;
  }

  get features(): AlienSolanaWalletFeatures {
    return this.#features;
  }

  #connect: StandardConnectMethod = async ({ silent } = {}) => {
    if (this.#accounts.length > 0) {
      return { accounts: this.accounts };
    }

    if (silent) {
      // Deliberate divergence from reference impls (e.g. Ghost) that forward
      // `silent` to the host as `onlyIfTrusted`, letting a returning user
      // silently reconnect a previously-authorised session. The
      // `wallet.solana:connect` contract method has no field to carry this
      // flag yet — until it does, we short-circuit to "no cached accounts"
      // instead of round-tripping the bridge and risking a UI prompt the
      // caller asked us to suppress. TODO: forward `silent` once the
      // contract gains the field.
      return { accounts: [] };
    }

    try {
      const response = await request(
        'wallet.solana:connect',
        {},
        'wallet.solana:connect.response',
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

      // Decode once at the bridge boundary so codec failures surface as
      // typed wallet errors; the account constructor then validates the
      // 32-byte length on the decoded bytes.
      const publicKey = safeDecode(
        'publicKey',
        base58Decode,
        response.publicKey,
      );
      const account = new AlienSolanaAccount(publicKey, response.publicKey);
      this.#accounts = [account];
      this.#emit('change', { accounts: this.accounts });

      return { accounts: this.accounts };
    } catch (error) {
      throw normalizeWalletError(error);
    }
  };

  #disconnect: StandardDisconnectMethod = async () => {
    if (this.#accounts.length === 0) return;

    // Best-effort notify the host; local state is the source of truth for
    // wallet-standard so we always clear accounts regardless of the result.
    const result = send.ifAvailable('wallet.solana:disconnect', {});
    if (!result.ok) {
      console.debug(
        '[@alien-id/miniapps-solana-provider] disconnect not delivered to host:',
        result.error,
      );
    }
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
    try {
      const outputs: SolanaSignTransactionOutput[] = [];

      for (const input of inputs) {
        this.#assertAccount(input.account);

        // `chain` is optional in wallet-standard's SolanaSignTransactionInput,
        // but when callers pass it we still defend against runtime CAIP
        // values that aren't on Solana — mirrors the unconditional guard in
        // signAndSendTransaction.
        if (input.chain && !isSolanaChain(input.chain)) {
          throw new AlienWalletError(
            WALLET_ERROR.INVALID_PARAMS,
            `Unsupported Solana chain "${input.chain}". Expected one of: ${SOLANA_CHAINS.join(', ')}.`,
          );
        }

        const transactionBase64 = base64Encode(input.transaction);

        const response = await request(
          'wallet.solana:sign.transaction',
          { transaction: transactionBase64 },
          'wallet.solana:sign.transaction.response',
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
          signedTransaction: safeDecode(
            'signedTransaction',
            base64Decode,
            response.signedTransaction,
          ),
        });
      }

      return outputs;
    } catch (error) {
      throw normalizeWalletError(error);
    }
  };

  #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (
    ...inputs
  ) => {
    try {
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

        outputs.push({
          signature: safeDecode('signature', base58Decode, response.signature),
        });
      }

      return outputs;
    } catch (error) {
      throw normalizeWalletError(error);
    }
  };

  #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    try {
      const outputs: SolanaSignMessageOutput[] = [];

      for (const input of inputs) {
        this.#assertAccount(input.account);

        const messageBase58 = base58Encode(input.message);

        const response = await request(
          'wallet.solana:sign.message',
          { message: messageBase58 },
          'wallet.solana:sign.message.response',
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

        // Guard against the host signing with a different key than the one
        // the dapp requested. A mismatch breaks the wallet-standard contract
        // and can silently route signatures to the wrong account.
        if (response.publicKey !== input.account.address) {
          throw new AlienWalletError(
            WALLET_ERROR.INTERNAL_ERROR,
            `Sign message responder publicKey ${response.publicKey} does not match requested account ${input.account.address}.`,
          );
        }

        outputs.push({
          signedMessage: input.message,
          signature: safeDecode('signature', base58Decode, response.signature),
          signatureType: 'ed25519',
        });
      }

      return outputs;
    } catch (error) {
      throw normalizeWalletError(error);
    }
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
