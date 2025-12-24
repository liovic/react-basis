import { useState, useEffect, useMemo } from 'react-state-basis'

export const WeatherLab = () => {
  const [celsius, setCelsius] = useState(20)
  const [fahrenheit, setFahrenheit] = useState(68) // ❌ Redundant Basis

  // This will trigger 💡 CAUSAL LINK hint
  useEffect(() => {
    setFahrenheit(celsius * 1.8 + 32)
  }, [celsius])

  // ✅ This is mathematically correct projection
  const kelvin = useMemo(() => celsius + 273.15, [celsius])

  return (
    <div style={{ padding: '15px', border: '1px solid #333', margin: '10px' }}>
      <h4>1. Weather Causal Lab</h4>
      <button onClick={() => setCelsius(Math.floor(Math.random() * 40))}>Update Temp</button>
      <p>{celsius}°C | {fahrenheit}°F | {kelvin}K</p>
    </div>
  )
}