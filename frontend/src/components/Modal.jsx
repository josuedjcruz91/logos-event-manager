import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export function Modal({ title, onClose, busy = false, children }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-header"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}

export function DeleteModal({ title, description, onConfirm, onClose, busy, error }) {
  return <Modal title={title} onClose={onClose} busy={busy}>
    <div className="delete-content"><div className="danger-icon"><AlertTriangle size={24} /></div><p>{description}</p><p className="muted">Esta acción es permanente. Se aplicarán las restricciones y reglas de eliminación de la base de datos a los registros relacionados.</p>{error && <p role="alert" className="form-error">{error.message}</p>}</div>
    <div className="form-actions"><button className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button></div>
  </Modal>;
}
