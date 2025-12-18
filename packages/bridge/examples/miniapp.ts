/**
 * Example: Using the bridge in a miniapp (webview content)
 *
 * This runs inside the webview and communicates with the host app.
 */

import { emit, on, request } from '@alm/bridge';

// ============================================
// 1. Listen to events from host app
// ============================================

// Subscribe to auth_data events from host
const unsubscribeAuth = on('auth_data', (payload) => {
  console.log('Received auth data from host:', payload);
  // payload: { token: string, req_id?: string }

  // Handle the auth data
  if (payload.token) {
    // Use the token for API calls, etc.
    console.log('Authenticated with token:', payload.token);
  }
});

// You can unsubscribe later
// unsubscribeAuth();

// ============================================
// 2. Send events to host app
// ============================================

// Emit an event to the host app
function notifyHostOfUserAction() {
  emit('user_action', {
    action: 'button_clicked',
    buttonId: 'submit',
    timestamp: Date.now(),
  });
}

// ============================================
// 3. Request data from host app (with response)
// ============================================

// Request auth data from host app
async function getAuthData() {
  try {
    const response = await request('get_auth_data', {
      token: 'refresh-token',
    });

    console.log('Received auth data:', response);
    // response: { token: string, req_id: string }

    return response;
  } catch (error) {
    console.error('Failed to get auth data:', error);
    throw error;
  }
}

// Request with custom req_id
async function getAuthDataWithCustomId() {
  const customReqId = 'my-custom-request-123';

  try {
    const response = await request(
      'get_auth_data',
      { token: 'refresh-token' },
      { reqId: customReqId },
    );

    console.log('Response with custom ID:', response);
    return response;
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Request with timeout
async function getAuthDataWithTimeout() {
  try {
    const response = await request(
      'get_auth_data',
      { token: 'refresh-token' },
      { timeout: 5000 }, // 5 second timeout
    );

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Request timed out');
    }
  }
}

// ============================================
// 4. Complete example: App initialization
// ============================================

async function initializeApp() {
  // Listen for auth updates
  on('auth_data', (payload) => {
    console.log('Auth updated:', payload);
    // Update UI, refresh data, etc.
  });

  // Request initial auth data
  try {
    const authData = await getAuthData();
    console.log('App initialized with auth:', authData);

    // Continue with app initialization
    // loadUserData();
    // renderUI();
  } catch (error) {
    console.error('Failed to initialize:', error);
    // Show error UI
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
