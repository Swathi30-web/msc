import { useState } from 'react';
import { api, errMsg, logActivity, useList } from '../api';
import { useAuth } from '../auth';
import { Badge, Col, DataTable, Err, FilterSelect, Modal, State, statusTone } from '../ui';
import { NEXT, STATUSES, inWarranty, isActive, money, nextNo } from '../lib';
import type { Customer, Device, Invoice, SR, SparePart, Technician } from '../types';
import type { Role } from '../types';

const NEEDS_TECH = ['Technician Assigned', 'Repair in Progress', 'Quality Check', 'Ready for Pickup', 'Delivered'];
const NEEDS_DIAG = ['Quality Check', 'Ready for Pickup', 'Delivered'];
const PART_OK = ['Diagnosis', 'Technician Assigned', 'Repair in Progress', 'Quality Check'];

export function JobDetail({ sr, techs, parts, role, onClose, onChanged }:
  { sr: SR; techs: Technician[]; parts: SparePart[]; role: Role; onClose: () => void; onChanged: () => void }) {
  const [cur, setCur] = useState(sr);
  const [diag, setDiag] = useState(sr.diagnosis);
  const [est, setEst] = useState(String(sr.estimate));
  const [status, setStatus] = useState(sr.status);
  const [tech, setTech] = useState(String(sr.technicianId ?? ''));
  const [pid, setPid] = useState('');
  const [qty, setQty] = useState('1');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const fail = (m: string) => { setOk(''); setErr(m); };

  const save = async () => {
    setErr(''); setOk('');
    const e = Number(est);
    if (!Number.isFinite(e) || e < 0) return fail('Estimate must be a non-negative number');
    const tid = tech ? Number(tech) : null;
    if (status !== cur.status && !NEXT[cur.status].includes(status)) return fail('Invalid status change');
    if (NEEDS_TECH.includes(status) && !tid) return fail('Assign a technician first');
    if (NEEDS_DIAG.includes(status) && !diag.trim()) return fail('Enter a diagnosis before this status');
    try {
      const upd = await api.update<SR>('serviceRequests', cur.id, { diagnosis: diag, estimate: e, status, technicianId: tid });
      if (status !== cur.status) await logActivity(`${cur.jobNo}: ${cur.status} → ${status}`);
      setCur(upd); setOk('Saved'); onChanged();
    } catch (x) { fail(errMsg(x)); }
  };

  const addPart = async () => {
    setErr(''); setOk('');
    const p = parts.find((x) => x.id === Number(pid));
    const n = Number(qty);
    if (!p) return fail('Select a part');
    if (!Number.isInteger(n) || n < 1) return fail('Quantity must be a positive whole number');
    if (n > p.stock) return fail(`Only ${p.stock} of ${p.name} in stock`);
    try {
      await api.update('spareParts', p.id, { stock: p.stock - n });
      await api.create('inventoryTransactions', { partId: p.id, partName: p.name, serviceRequestId: cur.id, jobNo: cur.jobNo, qty: n, type: 'OUT', date: new Date().toISOString() });
      const upd = await api.update<SR>('serviceRequests', cur.id, { partsUsed: [...cur.partsUsed, { partId: p.id, name: p.name, qty: n, price: p.price }] });
      setCur(upd); setPid(''); setQty('1'); setOk('Part recorded and stock updated'); onChanged();
    } catch (x) { fail(errMsg(x)); }
  };

  return (
    <Modal wide title={`${cur.jobNo} · ${cur.issue}`} onClose={onClose}>
      <Err msg={err} />{ok && <div className="bg-green-50 text-green-700 border border-green-200 rounded p-2 text-sm my-2">{ok}</div>}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <label>Status<select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {[cur.status, ...NEXT[cur.status]].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Technician<select className="input" value={tech} disabled={role === 'technician'} onChange={(e) => setTech(e.target.value)}>
          <option value="">Unassigned</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="sm:col-span-2">Diagnosis<textarea className="input" rows={2} value={diag} onChange={(e) => setDiag(e.target.value)} /></label>
        <label>Cost Estimate (₹)<input className="input" type="number" min={0} value={est} onChange={(e) => setEst(e.target.value)} /></label>
      </div>
      <div className="flex justify-end mt-3"><button className="btn-primary" onClick={save}>Save changes</button></div>
      <h4 className="font-semibold mt-4 mb-1">Spare parts used</h4>
      {cur.partsUsed.map((p, i) => <div key={i} className="text-sm border-t py-1">{p.name} × {p.qty} — {money(p.qty * p.price)}</div>)}
      {!cur.partsUsed.length && <p className="text-sm text-slate-500">None recorded</p>}
      {PART_OK.includes(cur.status) && (
        <div className="flex gap-2 mt-2 items-end">
          <label className="text-sm flex-1">Part<select className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Select…</option>{parts.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}</select></label>
          <label className="text-sm w-20">Qty<input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <button className="btn" onClick={addPart}>Add</button>
        </div>
      )}
    </Modal>
  );
}

function CreateRequest({ customers, devices, srs, onClose, onDone }:
  { customers: Customer[]; devices: Device[]; srs: SR[]; onClose: () => void; onDone: () => void }) {
  const [cid, setCid] = useState('');
  const [did, setDid] = useState('');
  const [issue, setIssue] = useState('');
  const [err, setErr] = useState('');
  const devs = devices.filter((d) => String(d.customerId) === cid);
  const submit = async () => {
    if (!cid) return setErr('Select a customer');
    if (!did) return setErr('Select a device (register one under Devices first if none)');
    if (issue.trim().length < 5) return setErr('Describe the issue (at least 5 characters)');
    try {
      const jobNo = nextNo('JC', srs.map((s) => s.jobNo));
      const createdAt = new Date().toISOString();
      const sr = await api.create<SR>('serviceRequests', { jobNo, customerId: +cid, deviceId: +did, issue: issue.trim(), diagnosis: '', status: 'Job Card Created', technicianId: null, estimate: 0, partsUsed: [], createdAt });
      await api.create('jobCards', { jobNo, serviceRequestId: sr.id, createdAt });
      await logActivity(`${jobNo}: Device received, job card created`);
      onDone(); onClose();
    } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <Modal title="New Service Request" onClose={onClose}>
      <Err msg={err} />
      <div className="space-y-3 text-sm">
        <label className="block">Customer *<select className="input" value={cid} onChange={(e) => { setCid(e.target.value); setDid(''); }}>
          <option value="">Select…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}</select></label>
        <label className="block">Device *<select className="input" value={did} onChange={(e) => setDid(e.target.value)}>
          <option value="">Select…</option>{devs.map((d) => <option key={d.id} value={d.id}>{d.brand} {d.model}{inWarranty(d) ? ' (in warranty)' : ''}</option>)}</select></label>
        <label className="block">Issue *<textarea className="input" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} /></label>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button className="btn" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Create</button></div>
    </Modal>
  );
}

export function ServiceRequests() {
  const { user } = useAuth();
  const sr = useList<SR>('serviceRequests');
  const cu = useList<Customer>('customers');
  const dv = useList<Device>('devices');
  const te = useList<Technician>('technicians');
  const sp = useList<SparePart>('spareParts');
  const inv = useList<Invoice>('invoices');
  const [f, setF] = useState({ status: '', tech: '', from: '', pay: '' });
  const [open, setOpen] = useState<SR | null>(null);
  const [create, setCreate] = useState(false);
  const cust = (id: number) => cu.data.find((c) => c.id === id);
  const dev = (id: number) => dv.data.find((d) => d.id === id);
  const devName = (id: number) => { const d = dev(id); return d ? `${d.brand} ${d.model}` : '—'; };
  const payOf = (s: SR) => inv.data.find((i) => i.serviceRequestId === s.id)?.paymentStatus ?? 'No invoice';
  const rows = sr.data.filter((s) => (!f.status || s.status === f.status) && (!f.tech || String(s.technicianId) === f.tech)
    && (!f.from || s.createdAt.slice(0, 10) >= f.from) && (!f.pay || payOf(s) === f.pay));
  const reload = () => { sr.reload(); sp.reload(); te.reload(); inv.reload(); };
  const cols: Col<SR>[] = [
    { key: 'jobNo', label: 'Job No' },
    { key: 'customer', label: 'Customer', render: (s) => cust(s.customerId)?.name ?? '—', sort: (s) => cust(s.customerId)?.name ?? '' },
    { key: 'device', label: 'Device', render: (s) => devName(s.deviceId), sort: (s) => devName(s.deviceId) },
    { key: 'issue', label: 'Issue' },
    { key: 'status', label: 'Status', render: (s) => <Badge text={s.status} tone={statusTone(s.status)} /> },
    { key: 'tech', label: 'Technician', render: (s) => te.data.find((t) => t.id === s.technicianId)?.name ?? '—' },
    { key: 'pay', label: 'Payment', render: payOf },
    { key: 'createdAt', label: 'Date', render: (s) => s.createdAt.slice(0, 10) },
    { key: 'act', label: '', render: (s) => <button className="btn" onClick={() => setOpen(s)}>Manage</button> },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Service Requests</h2>
        <button className="btn-primary" onClick={() => setCreate(true)}>+ New Request</button>
      </div>
      <State loading={sr.loading} error={sr.error || cu.error || dv.error} />
      {!sr.loading && (
        <DataTable rows={rows} cols={cols}
          search={(s) => `${s.jobNo} ${cust(s.customerId)?.name} ${cust(s.customerId)?.phone} ${devName(s.deviceId)}`}
          toolbar={<>
            <FilterSelect label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <FilterSelect label="Technician" value={f.tech} onChange={(v) => setF({ ...f, tech: v })} options={te.data.map((t) => ({ value: t.id, label: t.name }))} />
            <FilterSelect label="Payment" value={f.pay} onChange={(v) => setF({ ...f, pay: v })} options={['No invoice', 'Unpaid', 'Partial', 'Paid'].map((s) => ({ value: s, label: s }))} />
            <label className="text-xs text-slate-500">From date<input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
          </>} />
      )}
      {create && <CreateRequest customers={cu.data} devices={dv.data} srs={sr.data} onClose={() => setCreate(false)} onDone={reload} />}
      {open && <JobDetail sr={open} techs={te.data} parts={sp.data} role={user.role} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

export function JobCards() {
  const jc = useList<{ id: number; jobNo: string; serviceRequestId: number; createdAt: string }>('jobCards');
  const sr = useList<SR>('serviceRequests');
  const cu = useList<Customer>('customers');
  const dv = useList<Device>('devices');
  const get = (id: number) => sr.data.find((s) => s.id === id);
  const [view, setView] = useState<SR | null>(null);
  const cname = (s?: SR) => cu.data.find((c) => c.id === s?.customerId)?.name ?? '—';
  const dname = (s?: SR) => { const d = dv.data.find((x) => x.id === s?.deviceId); return d ? `${d.brand} ${d.model}` : '—'; };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Job Cards</h2>
      <State loading={jc.loading} error={jc.error} />
      {!jc.loading && (
        <DataTable rows={jc.data} search={(j) => `${j.jobNo} ${cname(get(j.serviceRequestId))} ${dname(get(j.serviceRequestId))}`} cols={[
          { key: 'jobNo', label: 'Job Card' },
          { key: 'c', label: 'Customer', render: (j) => cname(get(j.serviceRequestId)) },
          { key: 'd', label: 'Device', render: (j) => dname(get(j.serviceRequestId)) },
          { key: 'i', label: 'Issue', render: (j) => get(j.serviceRequestId)?.issue ?? '—' },
          { key: 's', label: 'Status', render: (j) => { const s = get(j.serviceRequestId); return s ? <Badge text={s.status} tone={statusTone(s.status)} /> : '—'; } },
          { key: 'createdAt', label: 'Created', render: (j) => j.createdAt.slice(0, 10) },
          { key: 'v', label: '', render: (j) => <button className="btn" onClick={() => setView(get(j.serviceRequestId) ?? null)}>View</button> },
        ]} />
      )}
      {view && (
        <Modal title={`Job Card ${view.jobNo}`} onClose={() => setView(null)}>
          <div className="text-sm space-y-1">
            <p><b>Customer:</b> {cname(view)}</p><p><b>Device:</b> {dname(view)}</p><p><b>Issue:</b> {view.issue}</p>
            <p><b>Diagnosis:</b> {view.diagnosis || '—'}</p><p><b>Status:</b> {view.status}</p><p><b>Estimate:</b> {money(view.estimate)}</p>
          </div>
          <div className="flex justify-end mt-3"><button className="btn" onClick={() => window.print()}>Print</button></div>
        </Modal>
      )}
    </div>
  );
}

export function TechJobs({ mode }: { mode: 'assigned' | 'updates' | 'parts' }) {
  const { user } = useAuth();
  const sr = useList<SR>('serviceRequests', { technicianId: user.technicianId });
  const dv = useList<Device>('devices');
  const sp = useList<SparePart>('spareParts');
  const te = useList<Technician>('technicians');
  const [open, setOpen] = useState<SR | null>(null);
  const titles = { assigned: 'Assigned Jobs', updates: 'Repair Updates', parts: 'Parts Used' };
  const devName = (id: number) => { const d = dv.data.find((x) => x.id === id); return d ? `${d.brand} ${d.model}` : '—'; };
  const rows = mode === 'updates' ? sr.data.filter(isActive) : sr.data;
  const cols: Col<SR>[] = [
    { key: 'jobNo', label: 'Job No' }, { key: 'd', label: 'Device', render: (s) => devName(s.deviceId) },
    { key: 'issue', label: 'Issue' }, { key: 'status', label: 'Status', render: (s) => <Badge text={s.status} tone={statusTone(s.status)} /> },
    ...(mode === 'parts' ? [{ key: 'p', label: 'Parts Used', render: (s: SR) => s.partsUsed.map((p) => `${p.name} ×${p.qty}`).join(', ') || '—' }] : []),
    { key: 'a', label: '', render: (s) => <button className="btn" onClick={() => setOpen(s)}>{mode === 'parts' ? 'Add parts' : mode === 'updates' ? 'Update' : 'Open'}</button> },
  ];
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">{titles[mode]}</h2>
      <State loading={sr.loading} error={sr.error} />
      {!sr.loading && <DataTable rows={rows} cols={cols} search={(s) => `${s.jobNo} ${devName(s.deviceId)}`} />}
      {open && <JobDetail sr={open} techs={te.data} parts={sp.data} role="technician" onClose={() => setOpen(null)} onChanged={() => { sr.reload(); sp.reload(); }} />}
    </div>
  );
}
