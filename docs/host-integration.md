# Host App Integration

This document describes what the Alien App (host) must provide to enable miniapp communication.

## Required Window Globals

The host app must inject the following globals into the WebView:

### 1. Message Bridge

```javascript
window.__miniAppsBridge__ = {
  postMessage: function(data) {
    // Handle JSON string message from miniapp
    // data is a stringified { type, name, payload } object
  }
};
```

**Purpose:** Enables two-way communication between miniapp and host.

**Message Format:**
```typescript
// Method request (miniapp → host)
{
  type: 'method',
  name: 'auth.init:request',
  payload: { appId: string, challenge: string, reqId: string }
}

// Event (host → miniapp, via window.postMessage)
{
  type: 'event',
  name: 'auth.init:response.token',
  payload: { token: string, reqId: string }
}
```

### 2. Auth Token

```javascript
window.__ALIEN_AUTH_TOKEN__ = '<jwt-token>';
```

**Purpose:** Provides authentication token to the miniapp.

**When to inject:** Before or after page load. The SDK polls for changes.

**Example (Android):**
```kotlin
webView.evaluateJavascript(
    "window.__ALIEN_AUTH_TOKEN__ = '${token}';",
    null
)
```

**Example (iOS):**
```swift
webView.evaluateJavaScript(
    "window.__ALIEN_AUTH_TOKEN__ = '\(token)';"
)
```

### 3. Contract Version

```javascript
window.__ALIEN_CONTRACT_VERSION__ = '0.0.1';
```

**Purpose:** Declares which contract version the host app supports. Miniapps use this to check method compatibility.

**Format:** Semantic version string (`major.minor.patch`)

**When to inject:** Before page load (recommended) or early during page lifecycle.

**Example (Android):**
```kotlin
webView.evaluateJavascript(
    "window.__ALIEN_CONTRACT_VERSION__ = '0.0.1';",
    null
)
```

**Fallback behavior:** If not provided, the SDK assumes all methods are supported.

### 4. Host App Version (Optional)

```javascript
window.__ALIEN_HOST_VERSION__ = '1.2.3';
```

**Purpose:** Provides the host app's version to the miniapp for telemetry or compatibility checks.

**Format:** Version string (e.g., `1.2.3`)

### 5. Platform (Optional)

```javascript
window.__ALIEN_PLATFORM__ = 'ios'; // or 'android'
```

**Purpose:** Indicates which platform the miniapp is running on.

**Valid values:** `'ios'` or `'android'`

### 6. Start Parameter (Optional)

```javascript
window.__ALIEN_START_PARAM__ = 'referral123';
```

**Purpose:** Pass custom data to the miniapp (referral codes, campaign tracking, etc.).

**How it works:** Host app extracts the start parameter from the deep link and injects it into the window global before loading the miniapp.

**Usage in miniapp:**

```tsx
import { useLaunchParams } from '@alien-id/react';

function App() {
  const launchParams = useLaunchParams();

  if (launchParams?.startParam) {
    trackReferral(launchParams.startParam);
  }
}
```

## Complete Integration Example

### Android (Kotlin)

```kotlin
class MiniappWebViewClient : WebViewClient() {

    override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)

        // Inject launch params early
        view.evaluateJavascript("""
            window.__ALIEN_CONTRACT_VERSION__ = '0.0.1';
            window.__ALIEN_HOST_VERSION__ = '${BuildConfig.VERSION_NAME}';
            window.__ALIEN_PLATFORM__ = 'android';
        """.trimIndent(), null)
    }

    fun injectAuthToken(webView: WebView, token: String) {
        webView.evaluateJavascript(
            "window.__ALIEN_AUTH_TOKEN__ = '$token';",
            null
        )
    }
}

// Setup bridge interface
class MiniAppBridge(private val context: Context) {
    @JavascriptInterface
    fun postMessage(data: String) {
        // Parse and handle message from miniapp
        val message = JSONObject(data)
        when (message.getString("type")) {
            "method" -> handleMethod(message)
            "event" -> handleEvent(message)
        }
    }
}

// Add bridge to WebView
webView.addJavascriptInterface(MiniAppBridge(context), "__miniAppsBridge__")
```

### iOS (Swift)

```swift
class MiniappWebView: WKWebView {

    func setupBridge() {
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let script = """
            window.__miniAppsBridge__ = {
                postMessage: function(data) {
                    window.webkit.messageHandlers.bridge.postMessage(data);
                }
            };
            window.__ALIEN_CONTRACT_VERSION__ = '0.0.1';
            window.__ALIEN_HOST_VERSION__ = '\(appVersion)';
            window.__ALIEN_PLATFORM__ = 'ios';
        """

        let userScript = WKUserScript(
            source: script,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(userScript)
    }

    func injectAuthToken(_ token: String) {
        evaluateJavaScript("window.__ALIEN_AUTH_TOKEN__ = '\(token)';")
    }
}
```

## Sending Events to Miniapp

To send events from host to miniapp, use `window.postMessage`:

```kotlin
// Android
webView.evaluateJavascript("""
    window.postMessage({
        type: 'event',
        name: 'auth.init:response.token',
        payload: { token: '$token', reqId: '$reqId' }
    }, '*');
""".trimIndent(), null)
```

```swift
// iOS
webView.evaluateJavaScript("""
    window.postMessage({
        type: 'event',
        name: 'auth.init:response.token',
        payload: { token: '\(token)', reqId: '\(reqId)' }
    }, '*');
""")
```

## Version Compatibility

The contract version allows miniapps to gracefully handle feature availability:

| Version | Methods |
|---------|---------|
| 0.0.1   | `auth.init:request` |

When adding new methods:
1. Add them to the contract package
2. Update `releases.ts` with the version
3. Increment `__ALIEN_CONTRACT_VERSION__` in host app

Miniapps can check support before calling:
```tsx
const { supported, minVersion } = useMethodSupported('auth.init:request');

if (!supported) {
  return <div>Please update your app (requires v{minVersion})</div>;
}
```
