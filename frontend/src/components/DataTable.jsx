import { Link } from 'react-router-dom';
import { Pencil, Trash2, ArrowUpRight, Inbox } from 'lucide-react';
import { display, label, recordName } from '../services/display';

export function DataTable({ schema, rows, onEdit, onDelete, eventLinks = false, exclude = [], emptyAction }) {
  const columns = schema.columns.filter((c) => !exclude.includes(c.name));
  if (!rows.length) return <div className="state"><Inbox size={32} /><h3>Todo listo para comenzar</h3><p>No hay registros para mostrar.</p>{emptyAction}</div>;
  return <div className="table-scroll"><table>
    <caption className="sr-only">Registros de {label(schema.name)}</caption>
    <thead><tr>{columns.map((c) => <th scope="col" key={c.name}>{c.primary ? `ID · ${label(c.name)}` : label(c.name)}</th>)}<th scope="col" className="actions-heading">Acciones</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={JSON.stringify(schema.primaryKeys.map((key) => row[key]))}>
      {columns.map((c) => <td key={c.name} className={c.primary ? 'id-cell' : ''}>{c.name === 'estado' ? <span className="badge">{display(row[c.name], c)}</span> : <span className="cell-value" title={display(row[c.name], c)}>{display(row[c.name], c)}</span>}</td>)}
      <td><div className="row-actions">
        {eventLinks && <Link className="icon-button" title="Ver detalle" aria-label={`Ver ${recordName(row, schema)}`} to={`/eventos/${row[schema.primaryKeys[0]]}`}><ArrowUpRight size={17} /></Link>}
        {onEdit && <button className="icon-button" onClick={() => onEdit(row)} title="Editar" aria-label={`Editar ${recordName(row, schema)}`}><Pencil size={16} /></button>}
        <button className="icon-button delete" onClick={() => onDelete(row)} title="Eliminar" aria-label={`Eliminar ${recordName(row, schema)}`}><Trash2 size={16} /></button>
      </div></td>
    </tr>)}</tbody>
  </table></div>;
}
