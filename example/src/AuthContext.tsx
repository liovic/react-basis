import { createContext, useState, type ReactNode } from 'react-state-basis'

export const AuthContext = createContext<any>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [isLogged, setIsLogged] = useState(false)

  const login = (data: any) => {
    setUser(data)
    setIsLogged(true) // ⚠️ BASIS ALERT: user and isLogged are linearly dependent
  }

  const logout = () => {
    setUser(null);
    setIsLogged(false);
  }

  return (
    <AuthContext.Provider value={{ user, isLogged, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}