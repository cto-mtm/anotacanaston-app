const es = {
  loading: 'Cargando…',
  retry: 'Reintentar',
  error: 'Algo salió mal',
}

// Typed against es: a missing or extra key here is a compile error.
const en: typeof es = {
  loading: 'Loading…',
  retry: 'Retry',
  error: 'Something went wrong',
}

export default { es, en }
