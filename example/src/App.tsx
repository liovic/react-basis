import { BasisProvider, useContext } from 'react-state-basis'
import { AuthProvider, AuthContext } from './AuthContext'
import { ThemeProvider, ThemeContext } from './ThemeContext'
import { WeatherLab } from './WeatherLab'
import { BooleanEntanglement } from './BooleanEntanglement'
import { InfiniteCrashLab } from './InfiniteCrashLab'

function GlobalNeuralController() {
  const { login, logout } = useContext(AuthContext)
  const { setTheme } = useContext(ThemeContext)

  const handleGlobalSync = () => {
    // ⚠️ CROSS-CONTEXT REDUNDANCY
    // Changing user i theme at the same time from 2 providers
    let i = 0;
    const interval = setInterval(() => {
      if (i % 2 === 0) {
        login({ name: 'Admin' }); setTheme('dark');
      } else {
        logout(); setTheme('light');
      }
      i++;
      if (i > 10) clearInterval(interval);
    }, 200);
  }

  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <button
        onClick={handleGlobalSync}
        style={{ padding: '15px', background: '#00ff41', color: '#000', fontWeight: 'bold' }}
      >
        INITIATE GLOBAL SYNC (Cross-Context Test)
      </button>
      <br />
      <button
        onClick={() => (window as any).printBasisReport()}
        style={{ marginTop: '10px', background: '#3498db', color: '#fff' }}
      >
        Generate System Health Report
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BasisProvider debug={true}>
      <AuthProvider>
        <ThemeProvider>
          <div style={{
            background: '#050505', minHeight: '100vh', color: '#00ff41',
            padding: '40px', fontFamily: '"Courier New", monospace'
          }}>
            <h1 style={{ borderBottom: '2px solid #00ff41' }}>BASIS v0.2.3</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <WeatherLab />
              <BooleanEntanglement />
              <InfiniteCrashLab />
            </div>

            <GlobalNeuralController />

            <div style={{ marginTop: '30px', color: '#888', fontSize: '12px' }}>
              [SYSTEM] Watching for collinear state vectors in multi-dimensional space...
            </div>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </BasisProvider>
  )
}