import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import type { Service } from './catalog'

type State<T> = { data: T | null; loading: boolean; error: string }

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Не удалось загрузить'
}

/** Весь каталог. reload — чтобы админка перечитала список после правки. */
export function useServices() {
  const [state, setState] = useState<State<Service[]>>({ data: null, loading: true, error: '' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    api
      .services()
      .then(({ services }) => {
        if (!cancelled) setState({ data: services, loading: false, error: '' })
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: messageOf(err) }))
      })

    return () => {
      cancelled = true
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { services: state.data, loading: state.loading, error: state.error, reload }
}

/** Одна услуга по адресу. notFound — чтобы страница могла увести в каталог. */
export function useService(slug: string) {
  const [state, setState] = useState<State<Service> & { notFound: boolean }>({
    data: null,
    loading: true,
    error: '',
    notFound: false,
  })

  useEffect(() => {
    let cancelled = false

    api
      .service(slug)
      .then(({ service }) => {
        if (!cancelled) setState({ data: service, loading: false, error: '', notFound: false })
      })
      .catch((err) => {
        if (cancelled) return
        const notFound = err instanceof ApiError && err.status === 404
        setState({ data: null, loading: false, error: messageOf(err), notFound })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { service: state.data, loading: state.loading, error: state.error, notFound: state.notFound }
}
