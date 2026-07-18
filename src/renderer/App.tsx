import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import BrowserPage from './pages/BrowserPage'
import { useAuthStore } from './stores/auth-store'

export default function App() {
  const session = useAuthStore((s) => s.session)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return session ? <BrowserPage /> : <LoginPage />
}
