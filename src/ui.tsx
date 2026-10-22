import { ReactNode, useMemo, useState } from 'react';
import { api, errMsg } from './api';

const TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-700',
};
export const Badge = ({ text, tone = 'slate' }: { text: string; tone?: string }) =>
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>{text}</span>;
export const statusTone = (s: string) =>
  ['Delivered', 'Ready for Pickup'].includes(s) ? 'green' : ['Cancelled', 'Repair Failed'].includes(s) ? 'red'
  : ['Repair in Progress', 'Quality Check'].includes(s) ? 'blue' : 'amber';

export const Err = ({ msg }: { msg: string }) =>
  msg ? <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2 text-sm my-2">{msg}</div> : null;
export const State = ({ loading, error }: { loading: boolean; error: string }) =>
  loading ? <p className="p-4 text-slate-500">Loading…</p> : <Err msg={error} />;

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center overflow-auto p-4" onClick={onClose}>
      <div className={`card w-full mt-8 ${wide ? 'max-w-3xl' : 'max-w-xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">{title}</h3><button className="btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface Col<T> { key: string; label: string; render?: (r: T) => ReactNode; sort?: (r: T) => string | number }

export function DataTable<T extends { id: number }>({ rows, cols, search, toolbar }:
  { rows: T[]; cols: Col<T>[]; search?: (r: T) => string; toolbar?: ReactNode }) {
  const [q, setQ] = useState('');
  const [sk, setSk] = useState('');
  const [asc, setAsc] = useState(true);
  const view = useMemo(() => {
    let r = rows;
    if (q && search) r = r.filter((x) => search(x).toLowerCase().includes(q.toLowerCase()));
    const c = cols.find((c) => c.key === sk);
    if (c) {
      const g = (x: T): any => (c.sort ? c.sort(x) : String((x as any)[c.key] ?? ''));
      r = [...r].sort((a, b) => { const A = g(a), B = g(b); return (A > B ? 1 : A < B ? -1 : 0) * (asc ? 1 : -1); });
    }
    return r;
  }, [rows, q, sk, asc, cols, search]);
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-end">
        {search && <input className="input max-w-xs !mt-0" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
        {toolbar}
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>{cols.map((c) =>
            <th key={c.key} className="th cursor-pointer select-none" onClick={() => { setAsc(sk === c.key ? !asc : true); setSk(c.key); }}>
              {c.label}{sk === c.key ? (asc ? ' ▲' : ' ▼') : ''}</th>)}</tr></thead>
          <tbody>
            {view.map((r) => <tr key={r.id} className="border-t">{cols.map((c) =>
              <td key={c.key} className="td">{c.render ? c.render(r) : String((r as any)[c.key] ?? '')}</td>)}</tr>)}
            {!view.length && <tr><td className="td text-center text-slate-500" colSpan={cols.length}>No records found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const FilterSelect = ({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void; options: { value: string | number; label: string }[] }) => (
  <label className="text-xs text-slate-500">{label}
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

export interface Field {
  name: string; label: string; type?: 'text' | 'number' | 'date' | 'email' | 'select' | 'checkbox' | 'textarea';
  required?: boolean; options?: { value: string | number; label: string }[]; validate?: (v: any, form: any) => string | undefined;
}

export function Crud<T extends { id: number }>({ resource, title, fields, cols, search, blank, res, readonly, toolbar, before }: {
  resource: string; title: string; fields: Field[]; cols: Col<T>[]; search?: (r: T) => string; blank: object;
  res: { data: T[]; loading: boolean; error: string; reload: () => Promise<void> };
  readonly?: boolean; toolbar?: ReactNode; before?: ReactNode;
}) {
  const [form, setForm] = useState<any | null>(null);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    for (const f of fields) {
      const v = form[f.name];
      if (f.required && (v === '' || v == null)) return setErr(`${f.label} is required`);
      const m = f.validate?.(v, form);
      if (m) return setErr(m);
    }
    try {
      if (form.id) await api.update(resource, form.id, form); else await api.create(resource, form);
      await res.reload(); setForm(null); setErr('');
    } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (r: T) => {
    if (!confirm('Delete this record?')) return;
    try { await api.remove(resource, r.id); await res.reload(); } catch (e) { setErr(errMsg(e)); }
  };
  const allCols: Col<T>[] = readonly ? cols : [...cols, { key: 'actions', label: 'Actions', render: (r) =>
    <div className="flex gap-1">
      <button className="btn" onClick={() => { setErr(''); setForm({ ...r }); }}>Edit</button>
      <button className="btn text-red-600" onClick={() => del(r)}>Delete</button>
    </div> }];
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {!readonly && <button className="btn-primary" onClick={() => { setErr(''); setForm({ ...blank }); }}>+ Add</button>}
      </div>
      <State loading={res.loading} error={res.error} />
      {before}
      {!res.loading && <DataTable rows={res.data} cols={allCols} search={search} toolbar={toolbar} />}
      {form && (
        <Modal title={form.id ? `Edit ${title}` : `Add ${title}`} onClose={() => setForm(null)}>
          <Err msg={err} />
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <label key={f.name} className={`text-sm ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                {f.label}{f.required && ' *'}
                {f.type === 'select' ? (
                  <select className="input" value={String(form[f.name] ?? '')}
                    onChange={(e) => set(f.name, f.options!.find((o) => String(o.value) === e.target.value)?.value ?? '')}>
                    <option value="">Select…</option>
                    {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" className="ml-2" checked={!!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                ) : f.type === 'textarea' ? (
                  <textarea className="input" rows={2} value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
                ) : (
                  <input className="input" type={f.type ?? 'text'} value={form[f.name] ?? ''}
                    onChange={(e) => set(f.name, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
