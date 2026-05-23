// Register happy-dom globals (window, document, etc.) for bun test.
// Loaded via `bunfig.toml` → `[test] preload = ["./tests/setup.ts"]`.
import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { clearBridgeEnvironment } from './test-utils';

GlobalRegistrator.register();

// Belt-and-suspenders: every test file already calls
// `clearBridgeEnvironment` in its own `beforeEach`/`afterEach`, but a single
// missed cleanup leaks `__miniAppsBridge__`/launch-param globals into the
// next file. A package-wide `afterEach` here means a forgotten cleanup is
// recoverable instead of cascading failures.
afterEach(() => {
  clearBridgeEnvironment();
});
