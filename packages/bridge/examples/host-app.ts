/**
 * Example: Using the bridge in a host app (native app with webview)
 *
 * This runs in the native app and communicates with the miniapp webview.
 *
 * Note: This is pseudocode - adapt to your specific platform:
 * - iOS: WKWebView with message handlers
 * - Android: WebView with JavaScript interface
 * - Electron: webContents.sendMessage / ipcRenderer
 * - React Native: react-native-webview
 */

// ============================================
// Platform-specific webview setup
// ============================================

// Example interface - adapt to your platform
interface WebView {
  postMessage(message: unknown): void;
  addEventListener(
    event: 'message',
    handler: (event: MessageEvent) => void,
  ): void;
}

// Your webview instance (platform-specific)
declare const webview: WebView;

// ============================================
// 1. Listen for messages from miniapp
// ============================================

// Message format: { type: 'event' | 'method', name: string, payload: object }

webview.addEventListener('message', (event: MessageEvent) => {
  const { type, name, payload } = event.data;

  if (type === 'method') {
    // Handle method requests from miniapp
    handleMethodRequest(name, payload);
  } else if (type === 'event') {
    // Handle events from miniapp
    handleEvent(name, payload);
  }
});

// ============================================
// 2. Handle method requests from miniapp
// ============================================

function handleMethodRequest(methodName: string, payload: unknown) {
  const params = payload as { token?: string; req_id?: string };
  const reqId = params.req_id;

  switch (methodName) {
    case 'get_auth_data': {
      // Process the request
      handleGetAuthData(params.token, reqId);
      break;
    }

    default:
      console.warn(`Unknown method: ${methodName}`);
      // Optionally send error response
      sendErrorResponse(methodName, reqId, `Unknown method: ${methodName}`);
  }
}

async function handleGetAuthData(
  token: string | undefined,
  reqId: string | undefined,
) {
  if (!reqId) {
    console.error('Missing req_id in request');
    return;
  }

  try {
    // Your business logic here
    // e.g., validate token, fetch user data, etc.
    const authToken = await fetchAuthToken(token);

    // Send response back to miniapp
    sendEventToMiniapp('auth_data', {
      token: authToken,
      req_id: reqId, // Include req_id so miniapp can match the response
    });
  } catch (error) {
    console.error('Failed to get auth data:', error);
    // Send error response
    sendEventToMiniapp('auth_data', {
      token: '',
      req_id: reqId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================
// 3. Handle events from miniapp
// ============================================

function handleEvent(eventName: string, payload: unknown) {
  switch (eventName) {
    case 'user_action': {
      const action = payload as {
        action: string;
        buttonId?: string;
        timestamp?: number;
      };
      console.log('User action from miniapp:', action);

      // Handle the action
      // e.g., track analytics, update native UI, etc.
      trackUserAction(action);
      break;
    }

    default:
      console.log(`Received event: ${eventName}`, payload);
  }
}

function trackUserAction(action: { action: string; buttonId?: string }) {
  // Your analytics/tracking logic
  console.log('Tracking:', action);
}

// ============================================
// 4. Send events to miniapp
// ============================================

function sendEventToMiniapp(eventName: string, payload: unknown) {
  webview.postMessage({
    type: 'event',
    name: eventName,
    payload,
  });
}

function sendErrorResponse(
  methodName: string,
  reqId: string | undefined,
  error: string,
) {
  if (!reqId) return;

  // Find the corresponding response event name
  // TODO: Use proper method -> event mapping
  const responseEvent = 'auth_data'; // This should match the method's response event

  sendEventToMiniapp(responseEvent, {
    req_id: reqId,
    error,
  });
}

// ============================================
// 5. Example: Send auth update to miniapp
// ============================================

function notifyMiniappOfAuthUpdate(newToken: string) {
  sendEventToMiniapp('auth_data', {
    token: newToken,
    // No req_id needed for one-way events
  });
}

// ============================================
// 6. Platform-specific implementations
// ============================================

// iOS (WKWebView)
/*
import WebKit

class WebViewDelegate: NSObject, WKScriptMessageHandler {
  func userContentController(_ userContentController: WKUserContentController, 
                            didReceive message: WKScriptMessage) {
    if let data = message.body as? [String: Any] {
      handleMessage(data)
    }
  }
  
  func sendToWebView(_ message: [String: Any]) {
    let json = try? JSONSerialization.data(withJSONObject: message)
    let jsonString = String(data: json!, encoding: .utf8)
    webView.evaluateJavaScript("window.postMessage(\(jsonString!), '*')")
  }
}
*/

// Android (WebView)
/*
webView.addJavascriptInterface(new BridgeInterface(), "NativeBridge")

class BridgeInterface {
  @JavascriptInterface
  fun postMessage(message: String) {
    val data = JSONObject(message)
    handleMessage(data)
  }
  
  fun sendToWebView(message: JSONObject) {
    webView.evaluateJavascript("window.postMessage($message, '*')", null)
  }
}
*/

// React Native (react-native-webview)
/*
import { WebView } from 'react-native-webview';

<WebView
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    handleMessage(data);
  }}
  injectedJavaScript={`
    window.addEventListener('message', (event) => {
      // Handle messages from webview
    });
  `}
/>

// Send to webview
webViewRef.current?.postMessage(JSON.stringify({
  type: 'event',
  name: 'auth_data',
  payload: { token: '...' }
}));
*/

// ============================================
// Helper functions
// ============================================

async function fetchAuthToken(
  refreshToken: string | undefined,
): Promise<string> {
  // Your implementation
  // e.g., API call, token refresh, etc.
  return 'new-auth-token-123';
}

function handleMessage(data: { type: string; name: string; payload: unknown }) {
  const { type, name, payload } = data;

  if (type === 'method') {
    handleMethodRequest(name, payload);
  } else if (type === 'event') {
    handleEvent(name, payload);
  }
}
