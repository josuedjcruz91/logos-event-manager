import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { allRecords } from '../services/api';
import { label, recordName } from '../services/display';
import { useWorkspace } from './WorkspaceContext';

export function RecordForm({ schema, record, exclude = [], onSave, onCancel, onBusy }) {
  const { schemas } = useWorkspace();
  const fields = schema.columns.filter((c) => c.editable && !exclude.includes(c.name) && !(record && c.primary));
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((c) => [c.name, record?.[c.name] ?? ''])));
  const [options, setOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionError, setOptionError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const referenceTables = [...new Set(fields.filter((c) => c.references).map((c) => c.references.table))].join(',');
  useEffect(() => {
    const controller = new AbortController();
    const tables = referenceTables ? referenceTables.split(',') : [];
    Promise.all(tables.map(async (name) => [name, await allRecords(name, controller.signal)])).then((entries) => {
      if (!controller.signal.aborted) { setOptions(Object.fromEntries(entries)); setLoadingOptions(false); }
    }).catch((err) => { if (!controller.signal.aborted) { setOptionError(err); setLoadingOptions(false); } });
    return () => controller.abort();
  }, [referenceTables]);
  async function submit(event) {
    event.preventDefault();
    setError(null); setBusy(true); onBusy?.(true);
    try {
      const body = {};
      for (const field of fields) {
        let value = values[field.name];
        if (value === '' && !record && field.default !== null) continue;
        if (value === '' && field.nullable) value = null;
        body[field.name] = value;
      }
      await onSave(body);
    } catch (err) { setError(err); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <form onSubmit={submit}>
    <div className="form-body">
      <p className="form-hint">Los campos con <span aria-hidden="true">*</span> son obligatorios.</p>
      {schema.name === 'evento_empleado' && <div className="inline-note">La especialidad principal pertenece al empleado. La función asignada indica su responsabilidad en este evento.</div>}
      {loadingOptions && <p role="status">Cargando opciones…</p>}
      {optionError && <p role="alert" className="form-error">{optionError.message}</p>}
      <div className="form-grid">{fields.map((field) => {
        const required = !field.nullable && field.default === null;
        const id = `field-${field.name}`;
        const fieldError = error?.details?.[field.name];
        const common = { id, name: field.name, value: values[field.name] ?? '', required, disabled: busy,
          'aria-invalid': Boolean(fieldError), 'aria-describedby': fieldError ? `${id}-error` : undefined,
          onChange: (e) => setValues((previous) => ({ ...previous, [field.name]: e.target.value })) };
        let input;
        if (field.references) {
          const reference = field.references;
          input = <select {...common} disabled={busy || loadingOptions || Boolean(optionError)}><option value="">Seleccionar {label(reference.table).toLowerCase()}</option>{(options[reference.table] || []).map((row) => <option key={row[reference.column]} value={row[reference.column]}>{recordName(row, schemas[reference.table])} · #{row[reference.column]}</option>)}</select>;
        } else if (field.options) {
          input = <select {...common}><option value="">{field.default !== null ? `Predeterminado: ${field.default}` : 'Seleccionar'}</option>{field.options.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>;
        } else if (/text/.test(field.dataType)) {
          input = <textarea {...common} rows={3} maxLength={field.maxLength ? Number(field.maxLength) : undefined} />;
        } else {
          const numeric = /^(tinyint|smallint|mediumint|int|bigint|decimal|numeric|float|double)$/.test(field.dataType);
          const type = field.dataType === 'date' ? 'date' : ['datetime', 'timestamp'].includes(field.dataType) ? 'datetime-local' : field.dataType === 'time' ? 'text' : numeric ? 'number' : /correo|email/.test(field.name) ? 'email' : /telefono/.test(field.name) ? 'tel' : 'text';
          input = <input {...common} type={type} value={type === 'datetime-local' ? String(common.value).replace(' ', 'T') : common.value} placeholder={field.default !== null ? `Predeterminado: ${field.default}` : field.dataType === 'time' ? 'HH:MM:SS' : undefined} step={numeric ? (/int/.test(field.dataType) ? '1' : 'any') : undefined} min={numeric && /unsigned/.test(field.type) ? '0' : undefined} maxLength={field.maxLength ? Number(field.maxLength) : undefined} />;
        }
        return <div className={`field ${/text/.test(field.dataType) ? 'wide' : ''}`} key={field.name}><label htmlFor={id}>{label(field.name)}{required && <span className="required"> *</span>}</label>{input}{fieldError && <small className="field-error" id={`${id}-error`}>{fieldError}</small>}</div>;
      })}</div>
      {error && <p className="form-error" role="alert">{error.message}</p>}
    </div>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancelar</button><button type="submit" className="button primary" disabled={busy || loadingOptions || Boolean(optionError)}><Save size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
  </form>;
}
