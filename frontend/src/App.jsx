import { useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Layers3, UserRound, Handshake, Menu, X, ArrowUpRight, ChevronRight, MapPin } from 'lucide-react';
import { WorkspaceProvider, SchemaGate } from './components/WorkspaceContext';
import Dashboard from './pages/Dashboard';
import EntityPage from './pages/EntityPage';
import EventDetail from './pages/EventDetail';
import { label } from './services/display';

const navigation = [
  { path: '/', title: 'Vista general', icon: LayoutDashboard },
  { path: '/eventos', title: 'Eventos', icon: CalendarDays },
  { path: '/clientes', title: 'Clientes', icon: Users },
  { path: '/servicios', title: 'Servicios', icon: Layers3 },
  { path: '/empleados', title: 'Empleados', icon: UserRound },
  { path: '/proveedores', title: 'Proveedores', icon: Handshake },
];

export default function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const section = navigation.find((n) => n.path !== '/' && location.pathname.startsWith(n.path))?.title || 'Vista general';
  const today = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' }).format(new Date());
  return <WorkspaceProvider><a className="skip-link" href="#main-content">Ir al contenido</a><div className="app-shell">
    {open && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}><div className="brand"><Link to="/" aria-label="Logos Event Manager, inicio" onClick={() => setOpen(false)}><span className="brand-name">LOGOS<span>·</span></span><span className="brand-subtitle">EVENT MANAGER</span></Link><button className="icon-button mobile-close" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={20} /></button></div><div className="sidebar-rule" /><p className="nav-label">WORKSPACE</p><nav aria-label="Navegación principal">{navigation.map(({ path, title, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{title}</span>{path === '/' && <span className="nav-dot" />}</NavLink>)}</nav><div className="sidebar-bottom"><div className="workspace-card"><span className="workspace-avatar">LP</span><div><strong>Logos Producciones</strong><span><MapPin size={11} /> Costa Rica</span></div></div><div className="sidebar-caption"><span>ADMINISTRACIÓN LOCAL</span><span>v1.0</span></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div><div className="topbar-right"><span className="today">{today}</span><span className="local-chip"><span /> Entorno local</span><span className="header-monogram" aria-label="Logos Producciones">LP</span></div></header>
    <main id="main-content" tabIndex={-1}><SchemaGate><Routes><Route path="/" element={<Dashboard />} />{navigation.filter((n) => n.path !== '/').map((n) => <Route key={n.path} path={n.path} element={<EntityPage key={n.path} name={n.path.slice(1)} />} />)}<Route path="/eventos/:id" element={<EventDetail />} /><Route path="*" element={<div className="state"><h1>Página no encontrada</h1><Link className="button primary" to="/">Volver al inicio <ArrowUpRight size={17} /></Link></div>} /></Routes></SchemaGate></main>
    </div></div></WorkspaceProvider>;
}
