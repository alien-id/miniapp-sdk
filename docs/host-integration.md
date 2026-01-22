# Host App Integration

This document describes what the Alien App (host) must inject into the WebView to enable miniapp communication.

## Window Interface

The host app must inject the following globals into `window` **before the miniapp loads**:

```typescript
interface Window {
  __miniAppsBridge__: {
    postMessage: (data: string) => void;
  };
  __ALIEN_AUTH_TOKEN__?: string;
  __ALIEN_CONTRACT_VERSION__?: string;
  __ALIEN_HOST_VERSION__?: string;
  __ALIEN_PLATFORM__?: string;
  __ALIEN_START_PARAM__?: string;
}
```

## Field Descriptions

| Field | Required | Description |
| ----- | -------- | ----------- |
| `__miniAppsBridge__` | Yes | Communication bridge for method calls from miniapp to host |
| `__ALIEN_AUTH_TOKEN__` | Yes | JWT authentication token for the current user |
| `__ALIEN_CONTRACT_VERSION__` | Yes | Semantic version of the supported contract (e.g., `'0.0.14'`). Must match the latest version from the contract JSON schemas |
| `__ALIEN_HOST_VERSION__` | No | Host app version for telemetry/compatibility (e.g., `'1.2.3'`) |
| `__ALIEN_PLATFORM__` | No | Platform identifier: `'ios'` or `'android'` |
| `__ALIEN_START_PARAM__` | No | Custom data passed via deep link (referral codes, campaign tracking, etc.) |

## Message Bridge

The `__miniAppsBridge__.postMessage` receives JSON-stringified messages from the miniapp:

```typescript
// Method request (miniapp -> host)
{
  type: 'method',
  name: 'payment:request',
  payload: {
    reqId: 'abc123',
    recipient: '0x...',
    amount: '1000000',
    token: 'SOL',
    network: 'solana',
    invoice: 'order-456'
  }
}
```

## Sending Events to Miniapp

To send events from host to miniapp, use `window.postMessage`:

```javascript
// Payment response (host -> miniapp)
window.postMessage({
  type: 'event',
  name: 'payment:response',
  payload: {
    reqId: 'abc123',
    status: 'paid',
    txHash: '5XyZ...'
  }
}, '*');
```

## Version Compatibility

The `__ALIEN_CONTRACT_VERSION__` value must match the latest version from the contract package JSON schemas. This is the highest version your host app supports.

| Version | Methods Added |
| ------- | ------------- |
| 0.0.1   | `auth.init:request` |
| 0.0.8   | `ping:request` |
| 0.0.9   | `app:ready` |
| 0.0.14  | `miniapp:close.ack`, `host.back.button:toggle`, `payment:request` |
