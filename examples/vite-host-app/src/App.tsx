import { useState, useEffect, useRef, useCallback } from 'react'
import type { MethodName, MethodPayload, EventName, EventPayload } from '@alien-id/bridge'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

interface ReceivedMethod {
  name: MethodName
  payload: MethodPayload<MethodName>
  timestamp: Date
}

function App() {
  const [receivedMethods, setReceivedMethods] = useState<ReceivedMethod[]>([])
  const [miniappUrl, setMiniappUrl] = useState('http://localhost:5173')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const sendEventToMiniapp = useCallback((eventName: EventName, payload: EventPayload<EventName>) => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('Cannot send event: iframe not ready')
      return
    }

    const message = {
      type: 'event' as const,
      name: eventName,
      payload,
    }

    console.log('Sending event to miniapp:', message)
    iframeRef.current.contentWindow.postMessage(message, '*')
  }, [])

  const handleMethod = useCallback((methodName: MethodName, payload: MethodPayload<MethodName>) => {
    console.log('Received method from miniapp:', methodName, payload)

    // Add to received methods list
    setReceivedMethods((prev) => [
      {
        name: methodName,
        payload,
        timestamp: new Date(),
      },
      ...prev,
    ])

    // Handle specific methods
    if (methodName === 'auth::init::request') {
      const methodPayload = payload as MethodPayload<'auth::init::request'>
      const { reqId, appId, challenge } = methodPayload

      console.log('Handling auth::init::request:', { appId, challenge, reqId })

      // Simulate some processing delay
      setTimeout(() => {
        // Send response event back to miniapp
        sendEventToMiniapp('auth::init::token', {
          token: `token-for-${appId}-${Date.now()}`,
          reqId,
        })
      }, 500)
    }
  }, [sendEventToMiniapp])

  useEffect(() => {
    // Listen for messages from the miniapp iframe
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (iframeRef.current?.contentWindow !== event.source) {
        return
      }

      let data: unknown = event.data

      // Handle stringified messages
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }

      // Verify message structure
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        'name' in data &&
        'payload' in data
      ) {
        const message = data as {
          type: 'event' | 'method'
          name: MethodName | EventName
          payload: MethodPayload<MethodName> | EventPayload<EventName>
        }

        if (message.type === 'method') {
          handleMethod(message.name as MethodName, message.payload as MethodPayload<MethodName>)
        }
      }
    }

    window.addEventListener('message', messageHandler)

    return () => {
      window.removeEventListener('message', messageHandler)
    }
  }, [handleMethod])

  const handleSendTestEvent = () => {
    const reqId = `test-${Date.now()}`
    sendEventToMiniapp('auth::init::token', {
      token: 'test-token-from-host',
      reqId,
    })
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Host App (Bridge Example)</h1>

      <div className="card">
        <h2>Host App Configuration</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
          Host app listens to <strong>methods</strong> from miniapp and sends <strong>events</strong> to miniapp
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="miniapp-url-input"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.87)',
            }}
          >
            Miniapp URL:
          </label>
          <input
            id="miniapp-url-input"
            type="text"
            value={miniappUrl}
            onChange={(e) => setMiniappUrl(e.target.value)}
            style={{
              padding: '0.5rem',
              width: '100%',
              maxWidth: '400px',
              marginBottom: '0.5rem',
              backgroundColor: '#1a1a1a',
              color: 'rgba(255, 255, 255, 0.87)',
              border: '1px solid #646cff',
              borderRadius: '8px',
            }}
          />
          <button onClick={handleSendTestEvent} style={{ marginTop: '0.5rem' }}>
            Send Test Event to Miniapp
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Miniapp (iframe)</h2>
        <div
          style={{
            border: '2px solid #646cff',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            minHeight: '500px',
          }}
        >
          <iframe
            ref={iframeRef}
            src={miniappUrl}
            style={{
              width: '100%',
              height: '500px',
              border: 'none',
            }}
            title="Miniapp"
          />
        </div>
      </div>

      <div className="card">
        <h2>Received Methods ({receivedMethods.length})</h2>
        {receivedMethods.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            No methods received yet. Methods from the miniapp will appear here.
          </p>
        ) : (
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #646cff',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
            }}
          >
            {receivedMethods.map((method, index) => (
              <div
                key={`${method.timestamp.getTime()}-${(method.payload as { reqId?: string }).reqId}-${index}`}
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#242424',
                  borderRadius: '4px',
                  border: '1px solid #646cff',
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.87)',
                  }}
                >
                  {method.name}
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {method.timestamp.toLocaleTimeString()}
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    overflow: 'auto',
                    color: 'rgba(255, 255, 255, 0.87)',
                    backgroundColor: '#1a1a1a',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #333',
                  }}
                >
                  {JSON.stringify(method.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="read-the-docs">
        Host app listens to methods from miniapp and responds with events
      </p>
    </>
  )
}

export default App
