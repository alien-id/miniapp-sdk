// Positive control. This fixture must compile under `tsc --noEmit --strict`.
//
// It declares one entry for every concrete `MethodName`, mirroring the
// canonical `MethodResponseEvents` shape exported by the contract. If the
// shape requires exhaustive coverage (the desired behaviour), this fixture
// is the well-formed example.

import type { MethodName } from '../../../src/methods/types/method-types';
import type { MethodResponseEvents } from '../../../src/methods/types/response-event';

const _coverage: { [M in MethodName]: MethodResponseEvents[M] } = {
  'app:ready': undefined as never,
  'app:close': undefined as never,
  'host.back.button:toggle': undefined as never,
  'clipboard:write': undefined as never,
  'link:open': undefined as never,
  'haptic:impact': undefined as never,
  'haptic:notification': undefined as never,
  'haptic:selection': undefined as never,
  'wallet.solana:disconnect': undefined as never,
  'payment:request': 'payment:response',
  'clipboard:read': 'clipboard:response',
  'wallet.solana:connect': 'wallet.solana:connect.response',
  'wallet.solana:sign.transaction': 'wallet.solana:sign.transaction.response',
  'wallet.solana:sign.message': 'wallet.solana:sign.message.response',
  'wallet.solana:sign.send': 'wallet.solana:sign.send.response',
  'notifications:permission.request': 'notifications:permission.response',
};

export type _Coverage = typeof _coverage;
