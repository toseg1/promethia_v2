import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/globals.css'
import { initializeSecurity } from './utils/secureStorage'

console.log('🚀 Debugging App component loading...')

// Initialize security settings
initializeSecurity()

// Test App component with error handling
function AppTest() {
  console.log('✅ AppTest rendering - testing App import')
  
  try {
    console.log('📦 Attempting to import App...')
    
    // Dynamic import with error handling
    const [AppComponent, setAppComponent] = React.useState<any>(null)
    const [error, setError] = React.useState<string | null>(null)
    
    React.useEffect(() => {
      const params = new URLSearchParams(window.location.search)
      const preview = params.get('preview')

      const loadComponent = async () => {
        try {
          if (import.meta.env.DEV && preview === 'event-cards') {
            console.log('🧩 Loading EventCardPreview...')
            const module = await import('./dev/EventCardPreview')
            setAppComponent(() => module.EventCardPreview || module.default)
          } else {
            const module = await import('./App.tsx')
            setAppComponent(() => module.default)
          }
        } catch (err: unknown) {
          console.error('❌ Failed to load entry component:', err)
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      }

      loadComponent()
    }, [])
    
    if (error) {
      return (
        <div style={{ 
          padding: '40px', 
          fontFamily: 'Arial',
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          <h2>App Loading Error:</h2>
          <p>{error}</p>
          <details>
            <summary>Click for details</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              Check browser console for full error details
            </pre>
          </details>
        </div>
      )
    }
    
    if (!AppComponent) {
      return (
        <div style={{ 
          padding: '40px', 
          fontFamily: 'Arial',
          backgroundColor: '#e3f2fd',
          color: '#1565c0'
        }}>
          <h2>Loading App component...</h2>
          <p>Please wait while the application loads.</p>
        </div>
      )
    }
    
    return <AppComponent />
    
  } catch (error: unknown) {
    console.error('❌ Critical error in AppTest:', error)
    return (
      <div style={{ 
        padding: '40px', 
        fontFamily: 'Arial',
        backgroundColor: '#ffebee',
        color: '#c62828'
      }}>
        <h2>Critical Error:</h2>
        <p>{error.message}</p>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppTest />
  </React.StrictMode>,
)
