import { useState } from 'react-state-basis'

export const BooleanEntanglement = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasData, setHasData] = useState(false)

  const runSimulation = () => {
    let count = 0;
    const interval = setInterval(() => {
      setIsLoading(true); setIsSuccess(false); setHasData(false);
      setTimeout(() => {
        setIsLoading(false); setIsSuccess(true); setHasData(true);
      }, 50);
      count++;
      if (count > 5) clearInterval(interval);
    }, 150);
  }

  return (
    <div style={{ padding: '15px', border: '1px solid #333', margin: '10px' }}>
      <h4>2. Boolean Entanglement</h4>
      <button onClick={runSimulation}>Trigger API Loop</button>
      <p>Status: {isLoading ? "..." : "IDLE"}</p>

      <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        Internal State: {isSuccess ? "SUCCESS" : ""} {hasData ? " | HAS_DATA" : ""}
      </div>
    </div>
  )
}