import { BasisProvider } from 'react-state-basis'
import { useContext } from 'react'
import { AuthProvider, AuthContext } from './AuthContext'
import { ThemeProvider, ThemeContext } from './ThemeContext'
import { WeatherLab } from './WeatherLab'
import { BooleanEntanglement } from './BooleanEntanglement'
import { InfiniteCrashLab } from './InfiniteCrashLab'
import { StressLab } from './StressLab'
import './App.css'
import AnimationTests from './AnimationTests'
import { BasisToggle } from './BasisToggle'
import { InstanceCollisionCheck } from './InstanceCollisionCheck'

function GlobalNeuralController() {
  const { login, logout } = useContext(AuthContext)
  const { setTheme } = useContext(ThemeContext)

  const handleGlobalSync = () => {
    let i = 0;
    const interval = setInterval(() => {
      if (i % 2 === 0) {
        login({ name: 'Admin' });
        setTheme('dark');
      } else {
        logout();
        setTheme('light');
      }
      i++;
      if (i > 10) clearInterval(interval);
    }, 200);
  }

  return (
    <div style={{
      gridColumn: 'span 2',
      marginTop: '24px',
      padding: '32px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div>
        <div className="card-tag" style={{ fontSize: '12px', marginBottom: '8px' }}>SYSTEM_COMMAND_CENTER</div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Global Override</h2>
        <p className="mono" style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '10px', letterSpacing: '0.02em' }}>
          Simulating cross-context entanglement between Auth and Theme providers.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={handleGlobalSync}
          className="primary"
          style={{
            background: '#0f172a',
            color: '#fff',
            padding: '16px 32px',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.05em'
          }}
        >
          INITIATE_SYSTEM_SYNC
        </button>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header style={{ padding: '30px 40px', borderBottom: '1px solid var(--border)' }}>
      <div>
        <h1 className="mono" style={{ fontSize: '28px', margin: 0, fontWeight: 800, letterSpacing: '-1.5px' }}>
          BASIS<span style={{ color: 'var(--cyan)' }}>_LABS</span>
        </h1>
        <div className="card-tag" style={{ fontSize: '13px', marginTop: '6px', letterSpacing: '0.1em' }}>
          TEMPORAL_SIGNAL_CORE
        </div>
      </div>

      <button
        className="secondary"
        style={{ margin: 0, padding: '12px 24px', fontSize: '13px', fontWeight: 600 }}
        onClick={() => (window as any).printBasisReport()}
      >
        GENERATE_HEALTH_REPORT
      </button>
    </header>
  )
}

export default function App() {
  return (
    <BasisProvider debug={true}>
      <AuthProvider>
        <ThemeProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <div className="dashboard-grid" style={{ padding: '40px', gap: '32px' }}>
              <GlobalNeuralController />
              <WeatherLab />
              <BooleanEntanglement />
              <InfiniteCrashLab />
              <StressLab />
              <AnimationTests />
              <InstanceCollisionCheck/>
            </div>

            <div style={{
              marginTop: 'auto',
              padding: '30px',
              textAlign: 'center',
              opacity: 0.3,
              fontSize: '11px',
              letterSpacing: '0.2em'
            }} className="mono">
              [DEBUG_MODE_ACTIVE] // MONITORING_COLLINEAR_STATE_VECTORS
            </div>
          </div>
          <BasisToggle />
        </ThemeProvider>
      </AuthProvider>
    </BasisProvider>
  )
}