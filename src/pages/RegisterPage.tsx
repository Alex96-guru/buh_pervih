import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthPageLayout } from './AuthPageLayout'
import { RegisterForm } from '../components/auth/RegisterForm'
import { CABINET_PATH, useAuth } from '../lib/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(CABINET_PATH, { replace: true })
  }, [loading, isAuthenticated, navigate])

  return (
    <AuthPageLayout>
      <RegisterForm onSwitchToLogin={() => navigate('/login')} />
    </AuthPageLayout>
  )
}
