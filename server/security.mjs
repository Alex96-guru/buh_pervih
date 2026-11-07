const appOrigin = process.env.APP_ORIGIN?.replace(/\/$/, '') ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined)

function isLocalOrigin(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

if (process.env.NODE_ENV === 'production' && (!appOrigin || new URL(appOrigin).protocol !== 'https:')) {
  throw new Error('В production требуется APP_ORIGIN с HTTPS-адресом сайта')
}

export function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000')
  }
  next()
}

export function protectApi(req, res, next) {
  res.set('Cache-Control', 'no-store')
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const expected = appOrigin || `${req.protocol}://${req.get('host')}`
  let source = req.get('origin')
  if (!source) {
    try {
      source = new URL(req.get('referer')).origin
    } catch {
      source = null
    }
  }
  const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' &&
    isLocalOrigin(appOrigin) && isLocalOrigin(source) &&
    source === `${req.protocol}://${req.get('host')}`
  if ((!localDevelopmentOrigin && source !== expected) || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Запрос отклонён: неверный источник' })
  }
  next()
}
