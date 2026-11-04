import { Link } from 'react-router-dom';
import { CalendarDays, Users, Layers3, UserRound, Handshake, ArrowUpRight, Plus, ArrowRight, CalendarCheck2 } from 'lucide-react';
import { useResource } from '../hooks/useResource';
import { useWorkspace, Loading, ErrorState } from '../components/WorkspaceContext';
import { label, recordName, display } from '../services/display';

const metrics = [
  { name: 'eventos', title: 'Eventos', icon: CalendarDays },
  { name: 'clientes', title: 'Clientes', icon: Users },
  { name: 'servicios', title: 'Servicios', icon: Layers3 },
  { name: 'empleados', title: 'Empleados', icon: UserRound },
  { name: 'proveedores', title: 'Proveedores', icon: Handshake },
];

export default function Dashboard() {
  const { schemas } = useWorkspace();
  const resource = useResource('/dashboard');
  return <>
    <div className="page-heading"><div><p className="eyebrow">TU PRODUCCIÓN, BAJO CONTROL</p><h1>Vista general<span className="gold-dot">.</span></h1><p className="subtitle">Una visión clara de todo lo que estás construyendo.</p></div><Link className="button primary" to="/eventos?nuevo=1"><Plus size={18} /> Crear evento</Link></div>
    {resource.loading ? <Loading /> : resource.error ? <section className="panel"><ErrorState error={resource.error} retry={resource.reload} /></section> : <>
      <section className="metrics" aria-label="Indicadores de la base de datos">{metrics.map(({ name, title, icon: Icon }) => <Link className="metric-card" key={name} to={`/${name}`}><div className="metric-top"><span className="metric-icon"><Icon size={19} /></span><ArrowUpRight size={16} /></div><p className="metric-number">{resource.data.counts[name].toLocaleString('es-CR')}</p><p className="metric-label">{title}</p><span className="metric-bottom">Ver {name}<ArrowRight size={13} /></span></Link>)}</section>
      <div className="dashboard-grid"><section className="panel upcoming"><div className="panel-heading"><div><p className="eyebrow">LO QUE SIGUE</p><h2>Próximos eventos</h2></div><Link to="/eventos" className="text-link">Ver todos <ArrowUpRight size={15} /></Link></div>
        {resource.data.upcoming.length ? <div className="event-list">{resource.data.upcoming.map((row) => {
          const schema = schemas.eventos;
          const dateField = schema.columns.find((c) => c.name === resource.data.dateColumn);
          const date = String(row[resource.data.dateColumn] ?? '');
          const locationField = schema.columns.find((c) => /^(lugar|ubicacion|lugar_evento)$/.test(c.name));
          return <Link className="event-row" key={row[schema.primaryKeys[0]]} to={`/eventos/${row[schema.primaryKeys[0]]}`}><div className="event-date"><strong>{date.slice(8, 10)}</strong><span>{date.slice(5, 7)} / {date.slice(0, 4)}</span></div><div className="event-info"><h3>{recordName(row, schema)}</h3><p>{display(row[dateField.name], dateField)}{locationField && row[locationField.name] ? ` · ${row[locationField.name]}` : ''}</p></div>{Object.hasOwn(row, 'estado') && <span className="badge">{label(String(row.estado))}</span>}<ArrowUpRight size={18} /></Link>;
        })}</div> : <div className="state upcoming-empty"><CalendarCheck2 size={34} /><h3>El próximo gran evento comienza aquí</h3><p>{resource.data.dateColumn ? 'No hay eventos programados para hoy o fechas posteriores.' : 'No hay un campo de fecha de evento identificado de forma inequívoca en el esquema.'}</p><Link className="button secondary" to="/eventos">Ir a eventos <ArrowRight size={16} /></Link></div>}
      </section><aside className="planning-card"><span className="planning-tag">LOGOS PRODUCCIONES</span><div className="planning-symbol" aria-hidden="true">L<span>·</span></div><h2>Grandes experiencias.<br /><em>Cada detalle cuenta.</em></h2><p>Conecta personas, servicios y recursos en una sola producción.</p><Link className="button gold-outline" to="/eventos">Planificar un evento <ArrowUpRight size={16} /></Link><span className="planning-caption">EVENT MANAGER / COSTA RICA</span></aside></div>
      <section className="quick-section"><p className="eyebrow">CONSTRUYE TU PRÓXIMA PRODUCCIÓN</p><div className="quick-grid">{metrics.filter((m) => m.name !== 'eventos').map(({ name, title, icon: Icon }) => <Link to={`/${name}?nuevo=1`} key={name} className="quick-link"><Icon size={20} /><div><strong>{title}</strong><span>Agregar {name === 'clientes' ? 'un cliente' : name === 'servicios' ? 'un servicio' : name === 'empleados' ? 'un empleado' : 'un proveedor'}</span></div><Plus size={17} /></Link>)}</div></section>
    </>}
    <footer className="page-footer"><span>Logos Producciones · Event Manager</span><span>Hecho para coordinar cada detalle.</span></footer>
  </>;
}
