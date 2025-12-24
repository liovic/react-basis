import { useState, useEffect } from 'react-state-basis'

export const Weather = () => {
  const [celsius, setCelsius] = useState(20)
  const [fahrenheit, setFahrenheit] = useState(68)

  // Engine will call "CAUSAL LINK" because useEffect changing fahrenheit
  useEffect(() => {
    setFahrenheit(celsius * 1.8 + 32)
  }, [celsius])

  return (
    <div style={{ padding: '15px', border: '1px solid #00ff41', margin: '10px' }}>
      <h4>Causal Tracker (Weather)</h4>
      <button onClick={() => setCelsius(Math.floor(Math.random() * 40))}>
        Random Temp
      </button>
      <p>{celsius}°C / {fahrenheit}°F</p>
    </div>
  )
}