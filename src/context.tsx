// src/context.tsx
import React, { createContext, useContext, ReactNode } from 'react';

const BasisContext = createContext({ debug: false });

const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';

interface BasisProviderProps {
  children: ReactNode;
  debug?: boolean;
}

export const BasisProvider: React.FC<BasisProviderProps> = ({ children, debug = true }) => {
  if (isWeb) {
    (window as any)._basis_debug = debug;
  }

  return (
    <BasisContext.Provider value={{ debug }}>
      {children}
      {(debug && isWeb) && (
        <div style={{ 
          position: 'fixed', bottom: 10, right: 10, background: 'black', color: '#0f0', 
          padding: '5px 10px', fontSize: '10px', fontFamily: 'monospace', 
          border: '1px solid #0f0', zIndex: 99999, borderRadius: '4px', pointerEvents: 'none'
        }}>
          BASIS_ENGINE: ACTIVE
        </div>
      )}
    </BasisContext.Provider>
  );
};

export const useBasisConfig = () => useContext(BasisContext);