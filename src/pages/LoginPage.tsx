import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthPageLayout } from './AuthPageLayout'
import { LoginForm } from '../components/auth/LoginForm'
import { ADMIN_PATH, CABINET_PATH, useAuth } from '../lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, loading } = useAuth()

  // Авторизованному на странице входа делать нечего.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(isAdmin ? ADMIN_PATH : CABINET_PATH, { replace: true })
    }
  }, [loading, isAuthenticated, isAdmin, navigate])

  return (
    <AuthPageLayout>
      <LoginForm onSwitchToRegister={() => navigate('/register')} />
    </AuthPageLayout>
  )
}
