import { useState } from 'react';
import { useList } from '../api';
import { useAuth } from '../auth';
import { Badge, DataTable, State, statusTone } from '../ui';
import { FLOW, inWarranty, money } from '../lib';
import { InvoiceView, payTone } from './Billing';
import type { Customer, Device, Invoice, SR } from '../types';

type View = 'devices' | 'requests' | 'status' | 'bills' | 'history';
const TITLES: Record<View, string> = { devices: 'My Devices', requests: 'My Service Requests', status: 'Repair Status', bills: 'My Bills', history: 'Service History' };

export default function CustomerPortal({ view }: { view: View }) {
  const { user } = useAuth();
  const p = { customerId: user.customerId };
  const dv = useList<Device>('devices', p);
  const sr = useList<SR>('serviceRequests', p);
  const inv = useList<Invoice>('invoices', p);
  const cu = useList<Customer>('customers', { id: user.customerId });
  const [open, setOpen] = useState<Invoice | null>(null);
  const dname = (id: number) => { const d = dv.data.find((x) => x.id === id); return d ? `${d.brand} ${d.model}` : '—'; };
  const date = (s: SR) => s.createdAt.slice(0, 10);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">{TITLES[view]}</h2>
      <State loading={dv.loading || sr.loading || inv.loading} error={dv.error || sr.error || inv.error} />
      {view === 'devices' && (
        <DataTable rows={dv.data} cols={[
          { key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' }, { key: 'imei', label: 'IMEI / Serial' },
          { key: 'warrantyExpiry', label: 'Warranty', render: (d) => <Badge text={inWarranty(d) ? `Active till ${d.warrantyExpiry}` : 'Expired'} tone={inWarranty(d) ? 'green' : 'red'} /> },
        ]} />
      )}
      {view === 'requests' && (
        <DataTable rows={sr.data} search={(s) => `${s.jobNo} ${dname(s.deviceId)}`} cols={[
          { key: 'jobNo', label: 'Job No' }, { key: 'd', label: 'Device', render: (s) => dname(s.deviceId) }, { key: 'issue', label: 'Issue' },
          { key: 'status', label: 'Status', render: (s) => <Badge text={s.status} tone={statusTone(s.status)} /> }, { key: 'createdAt', label: 'Date', render: date },
        ]} />
      )}
      {view === 'status' && (
        <div className="space-y-3">
          {sr.data.map((s) => {
            const idx = FLOW.indexOf(s.status);
            return (
              <div key={s.id} className="card">
                <div className="flex justify-between flex-wrap gap-2 mb-2">
                  <b>{s.jobNo} · {dname(s.deviceId)}</b><Badge text={s.status} tone={statusTone(s.status)} />
                </div>
                {idx >= 0 ? (
                  <div className="flex gap-1">{FLOW.map((f, i) => <div key={f} title={f} className={`h-2 flex-1 rounded ${i <= idx ? 'bg-blue-600' : 'bg-slate-200'}`} />)}</div>
                ) : <p className="text-sm text-red-600">This request was closed: {s.status}</p>}
                <p className="text-sm text-slate-500 mt-1">{s.issue}</p>
              </div>
            );
          })}
          {!sr.data.length && !sr.loading && <p className="text-slate-500">No service requests yet.</p>}
        </div>
      )}
      {view === 'bills' && (
        <>
          <DataTable rows={inv.data} cols={[
            { key: 'invoiceNo', label: 'Invoice' }, { key: 'jobNo', label: 'Job' }, { key: 'date', label: 'Date' },
            { key: 'total', label: 'Total', render: (i) => money(i.total), sort: (i) => i.total },
            { key: 'paymentStatus', label: 'Payment', render: (i) => <Badge text={i.paymentStatus} tone={payTone(i.paymentStatus)} /> },
            { key: 'v', label: '', render: (i) => <button className="btn" onClick={() => setOpen(i)}>View</button> },
          ]} />
          {open && <InvoiceView inv={open} customer={cu.data[0]} onClose={() => setOpen(null)} />}
        </>
      )}
      {view === 'history' && (
        <DataTable rows={sr.data} cols={[
          { key: 'createdAt', label: 'Date', render: date }, { key: 'jobNo', label: 'Job' }, { key: 'd', label: 'Device', render: (s) => dname(s.deviceId) },
          { key: 'issue', label: 'Issue' }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'status', label: 'Status' },
          { key: 'p', label: 'Parts', render: (s) => s.partsUsed.map((x) => `${x.name}×${x.qty}`).join(', ') || '—' },
        ]} />
      )}
    </div>
  );
}
