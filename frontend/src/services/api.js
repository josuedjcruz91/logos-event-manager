const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function api(path, { body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté iniciado.');
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('La API no devolvió JSON. Revisa la URL del backend.'); }
  if (!response.ok) {
    const error = new Error(result.error?.message || 'No se pudo completar la solicitud.');
    error.details = result.error?.details;
    error.code = result.error?.code;
    throw error;
  }
  return result;
}

export async function allRecords(name, signal) {
  const rows = [];
  let page;
  do {
    page = await api(`/${name}?limit=200&offset=${rows.length}`, { signal });
    rows.push(...page.data);
  } while (rows.length < page.meta.total && page.data.length > 0);
  return rows;
}
