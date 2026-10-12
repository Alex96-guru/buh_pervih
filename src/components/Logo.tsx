import { cn } from '../lib/cn'

/**
 * Компактная версия логотипа из макета: 278x48 в шапке и футере,
 * 208x36 в мобильной шапке.
 *
 * Отдаём заранее уменьшенные копии вместо исходных 1911x330: браузер ужимал
 * оригинал почти в семь раз и картинка выглядела мылом. Варианты 2x и 3x —
 * для плотных экранов, браузер выбирает нужный сам по sizes.
 */
export function Logo({ className, sizes = '278px' }: { className?: string; sizes?: string }) {
  return (
    <img
      src="/logo/logo-compact-556.png"
      srcSet="/logo/logo-compact-278.png 278w, /logo/logo-compact-556.png 556w, /logo/logo-compact-834.png 834w"
      sizes={sizes}
      alt="Бухгалтерия Первых"
      className={cn('object-contain select-none', className)}
      draggable={false}
    />
  )
}
