/**
 * Пока сайт не запущен, кнопки никуда не ведут: достаточно поставить false.
 * Якорные ссылки внутри страницы (#services и т.п.) продолжают работать —
 * они ведут по самой же странице и ничего не ломают.
 */
export const LINKS_ENABLED = false

type LinkProps = {
  href?: string
  target?: '_blank'
  rel?: string
}

/**
 * force — для отдельных ссылок, которые должны работать и при выключенных
 * остальных (например, написать в MAX).
 */
export function linkProps(href?: string, options?: { force?: boolean }): LinkProps {
  if (!href) return {}

  const isInPage = href.startsWith('#')
  if (!LINKS_ENABLED && !isInPage && !options?.force) return {}

  return href.startsWith('http')
    ? { href, target: '_blank', rel: 'noreferrer' }
    : { href }
}
