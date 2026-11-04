import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useResource(path) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, meta: null, loading: true, error: null });
    api(path, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setState({ data: result.data, meta: result.meta, loading: false, error: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ data: null, meta: null, loading: false, error });
    });
    return () => controller.abort();
  }, [path, version]);
  return { ...state, reload };
}
