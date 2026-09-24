import { createContext, useContext, useState, useEffect } from 'react'
import {
  getCurrentUser,
  fetchUserAttributes,
  signIn,
  signUp,
  confirmSignUp,
  signOut,
} from 'aws-amplify/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        await getCurrentUser()
        const attrs = await fetchUserAttributes()
        setUser({ email: attrs.email || null })
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function refreshUser() {
    try {
      await getCurrentUser()
      const attrs = await fetchUserAttributes()
      setUser({ email: attrs.email || null })
    } catch {
      setUser(null)
    }
  }

  async function login(email, password) {
    try {
      await signIn({ username: email, password })
      await refreshUser()
      return { success: true }
    } catch (err) {
      console.log('Nextplayer — sign in failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' }
    }
  }

  async function register(email, password) {
    try {
      const { nextStep } = await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      })
      return { success: true, needsConfirmation: nextStep.signUpStep === 'CONFIRM_SIGN_UP' }
    } catch (err) {
      console.log('Nextplayer — sign up failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Sign up failed' }
    }
  }

  async function confirmRegistration(email, code, password) {
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      await signIn({ username: email, password })
      await refreshUser()
      return { success: true }
    } catch (err) {
      console.log('Nextplayer — confirmation failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Confirmation failed' }
    }
  }

  async function logout() {
    try {
      await signOut()
    } catch (err) {
      console.log('Nextplayer — sign out failed:', err)
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, confirmRegistration, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
