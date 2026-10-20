import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { CATALOG_PATH } from './lib/catalog'
import { CONTACTS_PATH } from './lib/content'
import { AboutPage } from './pages/AboutPage'
import { AdminPage } from './pages/AdminPage'
import { CabinetPage } from './pages/CabinetPage'
import { CatalogPage } from './pages/CatalogPage'
import { ContactsPage } from './pages/ContactsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ServicePage } from './pages/ServicePage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path={CATALOG_PATH} element={<CatalogPage />} />
          <Route path={`${CATALOG_PATH}/:slug`} element={<ServicePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path={CONTACTS_PATH} element={<ContactsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cabinet" element={<CabinetPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Неизвестный адрес — показываем главную, чтобы не ловить пустой экран. */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
