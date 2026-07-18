import { create } from 'zustand'
import type { AuthCredentials, AuthSession } from '@shared/types'

interface AuthState {
  session: AuthSession | null
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  login: (credentials: AuthCredentials) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: false,
  error: null,

  hydrate: async () => {
    const result = await window.api.getSession()
    if (result.ok) {
      set({ session: result.data })
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: null })
    const result = await window.api.login(credentials)
    if (!result.ok) {
      set({ loading: false, error: result.error })
      return false
    }
    set({ loading: false, session: result.data, error: null })
    return true
  },

  logout: async () => {
    await window.api.logout()
    set({ session: null })
  },
}))
