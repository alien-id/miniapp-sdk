import { useState } from 'react'
import { useRequest } from '@alien-id/react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [appId, setAppId] = useState('my-app-id')
  const [challenge, setChallenge] = useState('challenge-123')

  // useRequest handles everything: sending request, listening for response, loading, and errors
  const { execute, isLoading, error, data } = useRequest(
    'auth.init:request',
    'auth.init:response.token',
  )

  const handleSendMethod = async () => {
    await execute(
      {
        appId,
        challenge,
      },
      { timeout: 5000 }
    )
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
            {isLoading ? 'Sending...' : 'Send Method (auth.init:request)'}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#3a1a1a',
              border: '1px solid #ff4444',
              borderRadius: '8px',
              color: '#ff8888',
            }}
          >
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {data && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
              border: '1px solid #646cff',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ color: 'rgba(255, 255, 255, 0.87)', marginBottom: '0.5rem' }}>
              Response
            </h3>
            <pre
              style={{
                margin: 0,
                fontSize: '0.85rem',
                overflow: 'auto',
                color: 'rgba(255, 255, 255, 0.87)',
                backgroundColor: '#242424',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #333',
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
