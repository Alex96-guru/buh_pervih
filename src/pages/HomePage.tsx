import { AuthModal } from '../components/auth/AuthModal'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { AuthProvider } from '../lib/auth'
import { Audience } from '../sections/Audience'
import { Contacts } from '../sections/Contacts'
import { Faq } from '../sections/Faq'
import { Hero } from '../sections/Hero'
import { Process } from '../sections/Process'
import { Reviews } from '../sections/Reviews'
import { Services } from '../sections/Services'
import { Start } from '../sections/Start'
import { Team } from '../sections/Team'

export function HomePage() {
  return (
    <AuthProvider>
      <div className="min-h-full w-full bg-[var(--surface)]">
        <Header />
        <main>
          <Hero />
          <Start />
          <Services />
          <Audience />
          <Process />
          <Team />
          <Reviews />
          <Faq />
          <Contacts />
        </main>
        <Footer />
        <AuthModal />
      </div>
    </AuthProvider>
  )
}
