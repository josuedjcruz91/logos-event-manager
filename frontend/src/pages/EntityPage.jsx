import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { label, singular, recordName } from '../services/display';
import { useWorkspace, Loading, ErrorState } from '../components/WorkspaceContext';
import { Modal, DeleteModal } from '../components/Modal';
import { RecordForm } from '../components/RecordForm';
import { DataTable } from '../components/DataTable';

const descriptions = {
  clientes: 'Cada gran evento comienza con una buena relación.',
  eventos: 'Planifica cada detalle. Coordina todos los recursos.',
  servicios: 'El catálogo que da vida a cada producción.',
  empleados: 'El talento detrás de una experiencia extraordinaria.',
  proveedores: 'Los aliados que hacen posible cada producción.',
};

export default function EntityPage({ name }) {
  const { schemas, notify } = useWorkspace();
  const schema = schemas[name];
  const [params, setParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const resource = useResource(`/${name}?limit=20&offset=${offset}`);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(params.get('nuevo') === '1' ? {} : null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  useEffect(() => { if (params.has('nuevo')) setParams({}, { replace: true }); }, [params, setParams]);
  async function save(body) {
    const id = editing[schema.primaryKeys[0]];
    await api(`/${name}${id !== undefined ? `/${id}` : ''}`, { method: id !== undefined ? 'PUT' : 'POST', body });
    setEditing(null); resource.reload(); notify(`${label(singular[name])} ${id !== undefined ? 'actualizado' : 'creado'} correctamente.`);
  }
  async function remove() {
    setBusy(true); setDeleteError(null);
    try {
      await api(`/${name}/${deleting[schema.primaryKeys[0]]}`, { method: 'DELETE' });
      setDeleting(null); if (resource.data.length === 1 && offset > 0) setOffset(Math.max(0, offset - 20)); else resource.reload();
      notify('Registro eliminado correctamente.');
    } catch (error) { setDeleteError(error); }
    finally { setBusy(false); }
  }
  const rows = (resource.data || []).filter((row) => Object.values(row).some((value) => String(value ?? '').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))));
  const createButton = <button className="button primary" onClick={() => setEditing({})}><Plus size={18} /> Nuevo {singular[name]}</button>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">GESTIÓN · LOGOS PRODUCCIONES</p><h1>{label(name)}</h1><p className="subtitle">{descriptions[name]}</p></div>{createButton}</div>
    <section className="panel"><div className="list-toolbar"><div className="list-title"><h2>Todos los {name}</h2>{resource.meta && <span className="count">{resource.meta.total}</span>}</div><div className="toolbar-controls"><label className="search-field"><Search size={17} /><input aria-label="Buscar en esta página" placeholder="Buscar en esta página…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className="icon-button" title="Actualizar" aria-label="Actualizar listado" onClick={resource.reload}><RefreshCw size={17} /></button></div></div>
      {resource.loading ? <Loading /> : resource.error ? <ErrorState error={resource.error} retry={resource.reload} /> : <DataTable schema={schema} rows={rows} onEdit={setEditing} onDelete={(row) => { setDeleteError(null); setDeleting(row); }} eventLinks={name === 'eventos'} emptyAction={!search ? createButton : null} />}
      {resource.meta && <div className="table-footer"><span>{resource.meta.total === 0 ? 'Sin registros' : `${offset + 1}–${Math.min(offset + 20, resource.meta.total)} de ${resource.meta.total} registros`}</span><div><button className="icon-button" aria-label="Página anterior" disabled={offset === 0 || resource.loading} onClick={() => setOffset((v) => Math.max(0, v - 20))}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Página siguiente" disabled={offset + 20 >= resource.meta.total || resource.loading} onClick={() => setOffset((v) => v + 20)}><ChevronRight size={18} /></button></div></div>}
    </section>
    {editing && <Modal title={`${editing[schema.primaryKeys[0]] !== undefined ? 'Editar' : 'Nuevo'} ${singular[name]}`} onClose={() => setEditing(null)} busy={busy}><RecordForm schema={schema} record={editing[schema.primaryKeys[0]] !== undefined ? editing : null} onSave={save} onCancel={() => setEditing(null)} onBusy={setBusy} /></Modal>}
    {deleting && <DeleteModal title={`Eliminar ${singular[name]}`} description={`¿Deseas eliminar «${recordName(deleting, schema)}»?`} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} error={deleteError} />}
  </>;
}
