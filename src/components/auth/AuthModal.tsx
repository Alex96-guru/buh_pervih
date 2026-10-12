import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useAuth } from '../../lib/auth'

export function AuthModal() {
  const { modal, closeModal, openLogin, openRegister } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)

  // Escape закрывает, фон не прокручивается, фокус уходит внутрь окна.
  useEffect(() => {
    if (!modal) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeModal()
    }

    const { overflow, paddingRight } = document.body.style
    // Компенсируем исчезнувшую полосу прокрутки, иначе страница дёргается.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    document.addEventListener('keydown', onKeyDown)
    cardRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [modal, closeModal])

  if (!modal) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modal === 'login' ? 'Вход' : 'Регистрация'}
      onMouseDown={(event) => {
        // Закрываем только по клику мимо карточки, а не при выделении текста внутри.
        if (event.target === event.currentTarget) closeModal()
      }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#0B122099] px-4 py-10 backdrop-blur-[3px] lg:py-16"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative w-full max-w-[440px] outline-none"
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Закрыть"
          className="absolute -top-1 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-[#FFFFFF26] lg:-top-2 lg:-right-12"
        >
          <X size={24} />
        </button>

        {modal === 'login' ? (
          <LoginForm onSwitchToRegister={openRegister} />
        ) : (
          <RegisterForm onSwitchToLogin={openLogin} />
        )}
      </div>
    </div>
  )
}
