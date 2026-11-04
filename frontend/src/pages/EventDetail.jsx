import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Layers3, UserRound, Handshake } from 'lucide-react';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { display, label, recordName, singular } from '../services/display';
import { useWorkspace, Loading, ErrorState } from '../components/WorkspaceContext';
import { DataTable } from '../components/DataTable';
import { Modal, DeleteModal } from '../components/Modal';
import { RecordForm } from '../components/RecordForm';

const relationNames = { servicios: 'evento_servicio', empleados: 'evento_empleado', proveedores: 'evento_proveedor' };
const tabs = [{ name: 'servicios', icon: Layers3 }, { name: 'empleados', icon: UserRound }, { name: 'proveedores', icon: Handshake }];

export default function EventDetail() {
  const { id } = useParams();
  const { schemas } = useWorkspace();
  const event = useResource(`/eventos/${id}`);
  const [tab, setTab] = useState('servicios');
  if (event.loading) return <Loading />;
  if (event.error) return <ErrorState error={event.error} retry={event.reload} />;
  return <>
    <Link className="back-link" to="/eventos"><ArrowLeft size={16} /> Volver a eventos</Link>
    <div className="page-heading"><div><p className="eyebrow">DETALLE DE PRODUCCIÓN · #{id}</p><h1>{recordName(event.data, schemas.eventos)}</h1><p className="subtitle">Información y recursos de este evento.</p></div>{Object.hasOwn(event.data, 'estado') && <span className="badge large">{label(String(event.data.estado))}</span>}</div>
    <section className="panel event-details"><h2>Información del evento</h2><dl>{schemas.eventos.columns.map((c) => <div key={c.name}><dt>{label(c.name)}</dt><dd>{display(event.data[c.name], c)}</dd></div>)}</dl></section>
    <section className="panel"><div className="resource-tabs" role="tablist" aria-label="Recursos del evento">{tabs.map(({ name, icon: Icon }) => <button key={name} id={`tab-${name}`} role="tab" aria-selected={tab === name} aria-controls="resource-panel" tabIndex={tab === name ? 0 : -1} onKeyDown={(e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = tabs[(tabs.findIndex((t) => t.name === tab) + (e.key === 'ArrowRight' ? 1 : 2)) % tabs.length].name; setTab(next); document.getElementById(`tab-${next}`)?.focus(); }
    }} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={17} />{label(name)}</button>)}</div><div role="tabpanel" id="resource-panel" aria-labelledby={`tab-${tab}`}><ResourcePanel key={tab} eventId={id} resource={tab} /></div></section>
  </>;
}

function ResourcePanel({ eventId, resource }) {
  const { schemas, notify } = useWorkspace();
  const schema = schemas[relationNames[resource]];
  const data = useResource(`/eventos/${eventId}/recursos/${resource}`);
  const eventFk = schema.foreignKeys.find((f) => f.table === 'eventos')?.column;
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const path = `/eventos/${eventId}/recursos/${resource}`;
  const keyOf = (row) => Object.fromEntries(schema.primaryKeys.map((key) => [key, row[key]]));
  const exists = editing && schema.primaryKeys.every((key) => editing[key] !== undefined);
  async function save(body) {
    await api(path, { method: exists ? 'PUT' : 'POST', body: exists ? { key: keyOf(editing), values: body } : body });
    setEditing(null); data.reload(); notify('Asignación guardada correctamente.');
  }
  async function remove() {
    setBusy(true); setError(null);
    try { await api(path, { method: 'DELETE', body: { key: keyOf(deleting) } }); setDeleting(null); data.reload(); notify('Recurso retirado del evento.'); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <>
    <div className="list-toolbar"><div><h2>{label(resource)} asignados</h2><p className="muted small">Administra los recursos de esta producción.</p></div><button className="button primary" onClick={() => setEditing({})}><Plus size={17} /> Asignar {singular[resource]}</button></div>
    {data.loading ? <Loading /> : data.error ? <ErrorState error={data.error} retry={data.reload} /> : <DataTable schema={schema} rows={data.data} exclude={[eventFk]} onEdit={schema.columns.some((c) => c.editable && !c.primary && c.name !== eventFk) ? setEditing : null} onDelete={(row) => { setError(null); setDeleting(row); }} />}
    {editing && <Modal title={`${exists ? 'Editar asignación de' : 'Asignar'} ${singular[resource]}`} busy={busy} onClose={() => setEditing(null)}><RecordForm schema={schema} record={exists ? editing : null} exclude={[eventFk]} onSave={save} onCancel={() => setEditing(null)} onBusy={setBusy} /></Modal>}
    {deleting && <DeleteModal title="Retirar recurso del evento" description="Se eliminará esta asignación. El registro del recurso seguirá disponible en su catálogo." busy={busy} error={error} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}
