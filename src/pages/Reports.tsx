import { useState } from 'react';
import { useList } from '../api';
import { DataTable, State } from '../ui';
import { MAX_JOBS, STATUSES, isActive, money } from '../lib';
import type { Customer, Device, Invoice, Payment, SR, SparePart, Technician } from '../types';

const TABS = ['Service Requests', 'Technician Workload', 'Inventory', 'Revenue & Payments', 'Customer History'];

export default function Reports() {
  const [tab, setTab] = useState(TABS[0]);
  const [cid, setCid] = useState('');
  const sr = useList<SR>('serviceRequests');
  const te = useList<Technician>('technicians');
  const sp = useList<SparePart>('spareParts');
  const inv = useList<Invoice>('invoices');
  const pay = useList<Payment>('payments');
  const cu = useList<Customer>('customers');
  const dv = useList<Device>('devices');
  const cname = (id: number) => cu.data.find((c) => c.id === id)?.name ?? '—';
  const dname = (id: number) => { const d = dv.data.find((x) => x.id === id); return d ? `${d.brand} ${d.model}` : '—'; };
  const loading = sr.loading || te.loading || sp.loading || inv.loading || pay.loading;
  const revenue = pay.data.reduce((a, p) => a + p.amount, 0);
  const outstanding = inv.data.reduce((a, i) => a + (i.total - i.paidAmount), 0);
  const byMethod = ['Cash', 'Card', 'UPI', 'Bank Transfer'].map((m, i) => ({ id: i, method: m, total: pay.data.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0) }));
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Reports</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => <button key={t} className={t === tab ? 'btn-primary' : 'btn'} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <State loading={loading} error={sr.error || te.error || sp.error} />
      {!loading && tab === TABS[0] && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {STATUSES.map((s) => <div key={s} className="card text-sm"><div className="text-slate-500">{s}</div><div className="text-xl font-bold">{sr.data.filter((r) => r.status === s).length}</div></div>)}
          </div>
          <DataTable rows={sr.data} search={(s) => `${s.jobNo} ${cname(s.customerId)}`} cols={[
            { key: 'jobNo', label: 'Job' }, { key: 'c', label: 'Customer', render: (s) => cname(s.customerId) },
            { key: 'd', label: 'Device', render: (s) => dname(s.deviceId) }, { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Date', render: (s) => s.createdAt.slice(0, 10) },
          ]} />
        </div>
      )}
      {!loading && tab === TABS[1] && (
        <DataTable rows={te.data} cols={[
          { key: 'name', label: 'Technician' }, { key: 'specialization', label: 'Specialization' },
          { key: 'active', label: `Active (max ${MAX_JOBS})`, render: (t) => sr.data.filter((s) => s.technicianId === t.id && isActive(s)).length },
          { key: 'done', label: 'Completed', render: (t) => sr.data.filter((s) => s.technicianId === t.id && s.status === 'Delivered').length },
          { key: 'all', label: 'Total Assigned', render: (t) => sr.data.filter((s) => s.technicianId === t.id).length },
        ]} />
      )}
      {!loading && tab === TABS[2] && (
        <DataTable rows={sp.data} search={(p) => `${p.name} ${p.sku}`} cols={[
          { key: 'name', label: 'Part' }, { key: 'sku', label: 'SKU' }, { key: 'stock', label: 'Stock', sort: (p) => p.stock },
          { key: 'minStock', label: 'Threshold' }, { key: 'value', label: 'Stock Value', render: (p) => money(p.stock * p.price), sort: (p) => p.stock * p.price },
          { key: 'st', label: 'Status', render: (p) => (p.stock <= p.minStock ? '⚠ Low stock' : 'OK') },
        ]} />
      )}
      {!loading && tab === TABS[3] && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="card"><div className="text-sm text-slate-500">Revenue collected</div><div className="text-xl font-bold">{money(revenue)}</div></div>
            <div className="card"><div className="text-sm text-slate-500">Outstanding</div><div className="text-xl font-bold">{money(outstanding)}</div></div>
            {byMethod.slice(0, 2).map((m) => <div key={m.id} className="card"><div className="text-sm text-slate-500">{m.method}</div><div className="text-xl font-bold">{money(m.total)}</div></div>)}
          </div>
          <DataTable rows={pay.data} search={(p) => `${p.invoiceNo} ${p.method}`} cols={[
            { key: 'date', label: 'Date' }, { key: 'invoiceNo', label: 'Invoice' }, { key: 'method', label: 'Method' },
            { key: 'amount', label: 'Amount', render: (p) => money(p.amount), sort: (p) => p.amount },
          ]} />
        </div>
      )}
      {!loading && tab === TABS[4] && (
        <div>
          <label className="text-sm block mb-3 max-w-xs">Customer
            <select className="input" value={cid} onChange={(e) => setCid(e.target.value)}>
              <option value="">Select…</option>{cu.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {cid && (
            <DataTable rows={sr.data.filter((s) => String(s.customerId) === cid)} cols={[
              { key: 'jobNo', label: 'Job' }, { key: 'd', label: 'Device', render: (s) => dname(s.deviceId) }, { key: 'issue', label: 'Issue' },
              { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Date', render: (s) => s.createdAt.slice(0, 10) },
              { key: 'p', label: 'Parts', render: (s) => s.partsUsed.map((p) => `${p.name}×${p.qty}`).join(', ') || '—' },
            ]} />
          )}
        </div>
      )}
    </div>
  );
}
