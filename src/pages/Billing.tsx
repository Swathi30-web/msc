import { useState } from 'react';
import { api, errMsg, logActivity, useList } from '../api';
import { Badge, DataTable, Err, FilterSelect, Modal, State } from '../ui';
import { inWarranty, money, nextNo, partsCost, today } from '../lib';
import type { Customer, Device, Invoice, SR } from '../types';

export function InvoiceView({ inv, customer, onClose }: { inv: Invoice; customer?: Customer; onClose: () => void }) {
  return (
    <Modal title={`Invoice ${inv.invoiceNo}`} onClose={onClose}>
      <div className="text-sm space-y-1">
        <p><b>Customer:</b> {customer?.name ?? '—'}</p><p><b>Job Card:</b> {inv.jobNo}</p><p><b>Date:</b> {inv.date}</p>
        <table className="w-full mt-2"><tbody>
          <tr className="border-t"><td className="py-1">Service charge</td><td className="text-right">{money(inv.serviceCharge)}</td></tr>
          <tr className="border-t"><td className="py-1">Spare parts</td><td className="text-right">{money(inv.partsCost)}</td></tr>
          <tr className="border-t font-bold"><td className="py-1">Total</td><td className="text-right">{money(inv.total)}</td></tr>
          <tr className="border-t"><td className="py-1">Paid ({inv.paymentMethod || '—'})</td><td className="text-right">{money(inv.paidAmount)}</td></tr>
          <tr className="border-t"><td className="py-1">Balance</td><td className="text-right">{money(inv.total - inv.paidAmount)}</td></tr>
        </tbody></table>
      </div>
      <div className="flex justify-end mt-3"><button className="btn" onClick={() => window.print()}>Print</button></div>
    </Modal>
  );
}

export const payTone = (s: string) => (s === 'Paid' ? 'green' : s === 'Partial' ? 'amber' : 'red');

export default function Billing() {
  const inv = useList<Invoice>('invoices');
  const sr = useList<SR>('serviceRequests');
  const cu = useList<Customer>('customers');
  const dv = useList<Device>('devices');
  const [pf, setPf] = useState('');
  const [gen, setGen] = useState(false);
  const [sid, setSid] = useState('');
  const [charge, setCharge] = useState('');
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState('Cash');
  const [view, setView] = useState<Invoice | null>(null);
  const [err, setErr] = useState('');
  const cust = (id: number) => cu.data.find((c) => c.id === id);
  const eligible = sr.data.filter((s) => ['Ready for Pickup', 'Delivered'].includes(s.status) && !inv.data.some((i) => i.serviceRequestId === s.id));
  const pickSr = (v: string) => {
    setSid(v);
    const s = sr.data.find((x) => x.id === +v);
    if (s) setCharge(String(inWarranty(dv.data.find((d) => d.id === s.deviceId)) ? 0 : s.estimate));
  };
  const selected = sr.data.find((s) => s.id === +sid);

  const generate = async () => {
    const c = Number(charge);
    if (!selected) return setErr('Select a completed service request');
    if (!Number.isFinite(c) || c < 0) return setErr('Service charge must be a non-negative number');
    try {
      const pc = partsCost(selected);
      await api.create('invoices', { invoiceNo: nextNo('INV', inv.data.map((i) => i.invoiceNo)), serviceRequestId: selected.id, jobNo: selected.jobNo, customerId: selected.customerId, serviceCharge: c, partsCost: pc, total: c + pc, paidAmount: 0, paymentStatus: 'Unpaid', paymentMethod: '', date: today() });
      await logActivity(`${selected.jobNo}: invoice generated`);
      inv.reload(); setGen(false); setSid(''); setCharge(''); setErr('');
    } catch (x) { setErr(errMsg(x)); }
  };

  const pay = async () => {
    if (!payFor) return;
    const a = Number(amt), bal = payFor.total - payFor.paidAmount;
    if (!(a > 0)) return setErr('Enter a payment amount greater than 0');
    if (a > bal) return setErr(`Amount exceeds balance (${money(bal)})`);
    try {
      const paid = payFor.paidAmount + a;
      await api.create('payments', { invoiceId: payFor.id, invoiceNo: payFor.invoiceNo, amount: a, method, date: today() });
      await api.update('invoices', payFor.id, { paidAmount: paid, paymentMethod: method, paymentStatus: paid >= payFor.total ? 'Paid' : 'Partial' });
      await logActivity(`${payFor.invoiceNo}: payment ${money(a)} via ${method}`);
      inv.reload(); setPayFor(null); setErr('');
    } catch (x) { setErr(errMsg(x)); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Billing</h2>
        <button className="btn-primary" onClick={() => { setErr(''); setGen(true); }}>+ Generate Invoice</button>
      </div>
      <State loading={inv.loading} error={inv.error} />
      {!inv.loading && (
        <DataTable rows={inv.data.filter((i) => !pf || i.paymentStatus === pf)} search={(i) => `${i.invoiceNo} ${i.jobNo} ${cust(i.customerId)?.name}`}
          toolbar={<FilterSelect label="Payment" value={pf} onChange={setPf} options={['Unpaid', 'Partial', 'Paid'].map((s) => ({ value: s, label: s }))} />}
          cols={[
            { key: 'invoiceNo', label: 'Invoice' }, { key: 'jobNo', label: 'Job' },
            { key: 'c', label: 'Customer', render: (i) => cust(i.customerId)?.name ?? '—' },
            { key: 'total', label: 'Total', render: (i) => money(i.total), sort: (i) => i.total },
            { key: 'paidAmount', label: 'Paid', render: (i) => money(i.paidAmount), sort: (i) => i.paidAmount },
            { key: 'paymentStatus', label: 'Status', render: (i) => <Badge text={i.paymentStatus} tone={payTone(i.paymentStatus)} /> },
            { key: 'a', label: '', render: (i) => <div className="flex gap-1">
              <button className="btn" onClick={() => setView(i)}>View</button>
              {i.paymentStatus !== 'Paid' && <button className="btn" onClick={() => { setErr(''); setPayFor(i); setAmt(String(i.total - i.paidAmount)); }}>Pay</button>}
            </div> },
          ]} />
      )}
      {gen && (
        <Modal title="Generate Invoice" onClose={() => setGen(false)}>
          <Err msg={err} />
          <label className="text-sm block">Service request *<select className="input" value={sid} onChange={(e) => pickSr(e.target.value)}>
            <option value="">Select…</option>{eligible.map((s) => <option key={s.id} value={s.id}>{s.jobNo} · {s.issue}</option>)}</select></label>
          {!eligible.length && <p className="text-xs text-slate-500 mt-1">No completed requests awaiting an invoice.</p>}
          <label className="text-sm block mt-3">Service charge (₹) — 0 suggested if in warranty
            <input className="input" type="number" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} /></label>
          {selected && <p className="text-sm mt-2">Parts cost: {money(partsCost(selected))} · Total: {money(partsCost(selected) + (Number(charge) || 0))}</p>}
          <div className="flex justify-end gap-2 mt-4"><button className="btn" onClick={() => setGen(false)}>Cancel</button><button className="btn-primary" onClick={generate}>Generate</button></div>
        </Modal>
      )}
      {payFor && (
        <Modal title={`Record payment · ${payFor.invoiceNo}`} onClose={() => setPayFor(null)}>
          <Err msg={err} />
          <p className="text-sm mb-2">Balance: {money(payFor.total - payFor.paidAmount)}</p>
          <label className="text-sm block">Amount (₹)<input className="input" type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
          <label className="text-sm block mt-3">Method<select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {['Cash', 'Card', 'UPI', 'Bank Transfer'].map((m) => <option key={m}>{m}</option>)}</select></label>
          <div className="flex justify-end gap-2 mt-4"><button className="btn" onClick={() => setPayFor(null)}>Cancel</button><button className="btn-primary" onClick={pay}>Record</button></div>
        </Modal>
      )}
      {view && <InvoiceView inv={view} customer={cust(view.customerId)} onClose={() => setView(null)} />}
    </div>
  );
}
