/**
 * Пока сайт не запущен, внешние ссылки никуда не ведут: достаточно поставить false.
 * Внутренние (/login, /#services) продолжают работать — они ведут по самому
 * сайту и ничего не ломают.
 */
export const LINKS_ENABLED = false

function isInternal(href: string): boolean {
  return href.startsWith('#') || href.startsWith('/')
}

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

  if (!LINKS_ENABLED && !isInternal(href) && !options?.force) return {}

  return href.startsWith('http')
    ? { href, target: '_blank', rel: 'noreferrer' }
    : { href }
}
