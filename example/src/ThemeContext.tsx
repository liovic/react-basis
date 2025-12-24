import { createContext, useState, type ReactNode } from 'react-state-basis'

export const ThemeContext = createContext<any>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}