import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { CheckCircle2, X, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { useResource } from '../hooks/useResource';

const Workspace = createContext(null);
export const useWorkspace = () => useContext(Workspace);

export function WorkspaceProvider({ children }) {
  const schema = useResource('/schema');
  const [notice, setNotice] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  function notify(message) {
    clearTimeout(timer.current);
    setNotice(message);
    timer.current = setTimeout(() => setNotice(null), 5000);
  }
  return <Workspace.Provider value={{ schemas: schema.data, schema, notify }}>
    {children}
    {notice && <div className="toast" role="status"><CheckCircle2 size={20} /><span>{notice}</span><button className="icon-button" aria-label="Cerrar notificación" onClick={() => setNotice(null)}><X size={16} /></button></div>}
  </Workspace.Provider>;
}

export function Loading() { return <div className="state" role="status"><RefreshCw className="spin" size={26} /><p>Cargando información…</p></div>; }
export function ErrorState({ error, retry }) {
  return <div className="state error-state" role="alert"><AlertCircle size={28} /><h3>No pudimos cargar la información</h3><p>{error?.message}</p>{retry && <button className="button secondary" onClick={retry}><RefreshCw size={16} /> Reintentar</button>}</div>;
}
export function SchemaGate({ children }) {
  const { schema } = useWorkspace();
  if (schema.loading) return <Loading />;
  if (schema.error) return <div className="panel"><div className="panel-heading"><Database size={19} /><h2>Conexión de datos</h2></div><ErrorState error={schema.error} retry={schema.reload} /></div>;
  return children;
}
