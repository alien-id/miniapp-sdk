import { useState, useEffect } from 'react'
import { on, request } from '@alien-id/bridge'
import type { EventName, EventPayload } from '@alien-id/bridge'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

interface ReceivedEvent {
  name: EventName
  payload: EventPayload<EventName>
  timestamp: Date
}

function App() {
  const [count, setCount] = useState(0)
  const [receivedEvents, setReceivedEvents] = useState<ReceivedEvent[]>([])
  const [appId, setAppId] = useState('my-app-id')
  const [challenge, setChallenge] = useState('challenge-123')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Subscribe to events from the host app
    const unsubscribe = on('auth::init::token', (payload) => {
      console.log('Received event from host:', payload)
      setReceivedEvents((prev) => [
        {
          name: 'auth::init::token',
          payload,
          timestamp: new Date(),
        },
        ...prev,
      ])
    })

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  const handleSendMethod = async () => {
    setIsLoading(true)
    try {
      // Send method request to host app and wait for response event
      const response = await request(
        'auth::init::request',
        {
          appId,
          challenge,
        },
        'auth::init::token', // Response event name
        { timeout: 5000 }
      )
      console.log('Received response from host:', response)
    } catch (error) {
      console.error('Request failed:', error)
      // Add error to events list for visibility
      setReceivedEvents((prev) => [
        {
          name: 'auth::init::token' as EventName,
          payload: { 
            reqId: 'error',
            error: error instanceof Error ? error.message : String(error)
          } as EventPayload<EventName>,
          timestamp: new Date(),
        },
        ...prev,
      ])
    } finally {
      setIsLoading(false)
    }
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
      <h1>Vite + React + Bridge</h1>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="card">
        <h2>Bridge Communication</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
          Miniapp sends <strong>methods</strong> to host app and listens to <strong>events</strong> from host app
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="appId-input" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.87)',
            }}
          >
            App ID:
          </label>
          <input
            id="appId-input"
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            style={{
              padding: '0.5rem',
              width: '100%',
              maxWidth: '300px',
              marginBottom: '0.5rem',
              backgroundColor: '#1a1a1a',
              color: 'rgba(255, 255, 255, 0.87)',
              border: '1px solid #646cff',
              borderRadius: '8px',
            }}
          />
          <label 
            htmlFor="challenge-input" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.87)',
            }}
          >
            Challenge:
          </label>
          <input
            id="challenge-input"
            type="text"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            style={{
              padding: '0.5rem',
              width: '100%',
              maxWidth: '300px',
              marginBottom: '0.5rem',
              backgroundColor: '#1a1a1a',
              color: 'rgba(255, 255, 255, 0.87)',
              border: '1px solid #646cff',
              borderRadius: '8px',
            }}
          />
          <button onClick={handleSendMethod} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Method (auth::init::request)'}
          </button>
        </div>

        <div>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.87)' }}>
            Received Events ({receivedEvents.length})
          </h3>
          {receivedEvents.length === 0 ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              No events received yet. Events from the host app will appear here.
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
              {receivedEvents.map((event, index) => (
                <div
                  key={`${event.timestamp.getTime()}-${event.payload.reqId}-${index}`}
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
                    {event.name}
                  </div>
                  <div 
                    style={{ 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      marginBottom: '0.5rem' 
                    }}
                  >
                    {event.timestamp.toLocaleTimeString()}
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
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
