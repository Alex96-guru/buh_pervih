import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

export function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--surface)]">
      <Header />
      <main className="mx-auto w-full max-w-[880px] flex-1 px-5 py-12 text-[16px] leading-7 text-[var(--ink)] lg:py-20">
        <h1 className="mb-8 text-[30px] leading-tight font-bold lg:text-[42px]">Обработка персональных данных</h1>
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[22px] font-bold">Кто обрабатывает данные</h2>
            <p>ООО ЦБО «Бухгалтерия Первых». Вопросы по данным можно направить на <a className="font-semibold text-[var(--accent)] underline" href="mailto:Buhpervih@yandex.ru">Buhpervih@yandex.ru</a>.</p>
          </section>
          <section>
            <h2 className="mb-2 text-[22px] font-bold">Что вы передаёте</h2>
            <p>При регистрации: имя, телефон, электронную почту, тип клиента и, если указаны, название компании и ИНН. При оформлении заказа: выбранные услуги, комментарий и прикреплённые файлы. В переписке: сообщения и файлы. Пароль хранится в виде хеша.</p>
          </section>
          <section>
            <h2 className="mb-2 text-[22px] font-bold">Для чего нужны данные</h2>
            <p>Чтобы создать личный кабинет, принять и выполнить заказ, связаться с вами, показать статус заказа и обеспечить переписку со специалистом. Для сохранения входа сайт использует cookie сессии.</p>
          </section>
          <section>
            <h2 className="mb-2 text-[22px] font-bold">Доступ к заказу</h2>
            <p>Данные заказа, сообщения и файлы доступны владельцу заказа и администратору сайта. Не отправляйте через сайт сведения, которые не нужны для вашей задачи.</p>
          </section>
          <section>
            <h2 className="mb-2 text-[22px] font-bold">Ваши вопросы</h2>
            <p>Если хотите уточнить, исправить или удалить свои данные, напишите на <a className="font-semibold text-[var(--accent)] underline" href="mailto:Buhpervih@yandex.ru">Buhpervih@yandex.ru</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
