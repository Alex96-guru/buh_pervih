type LinkProps = {
  href?: string
  target?: '_blank'
  rel?: string
}

/** Внешние адреса открываются отдельно, ссылки внутри сайта — в текущей вкладке. */
export function linkProps(href?: string, _options?: { force?: boolean }): LinkProps {
  if (!href) return {}

  return href.startsWith('http')
    ? { href, target: '_blank', rel: 'noreferrer' }
    : { href }
}
