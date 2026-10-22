import { useState } from 'react';
import { useList } from '../api';
import { Badge, Crud, DataTable, Modal } from '../ui';
import { IMEI, MAX_JOBS, PHONE, inWarranty, isActive, money } from '../lib';
import type { Customer, Device, InvTxn, SR, SparePart, Technician } from '../types';

export function Customers() {
  const res = useList<Customer>('customers');
  return (
    <Crud<Customer> resource="customers" title="Customers" res={res}
      blank={{ name: '', phone: '', email: '', address: '' }}
      search={(c) => `${c.name} ${c.phone} ${c.email}`}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'phone', label: 'Phone', required: true, validate: (v) => (PHONE.test(v) ? undefined : 'Phone must be 10–13 digits') },
        { name: 'email', label: 'Email', type: 'email', validate: (v) => (!v || /^\S+@\S+\.\S+$/.test(v) ? undefined : 'Invalid email') },
        { name: 'address', label: 'Address', type: 'textarea', required: true },
      ]}
      cols={[
        { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' },
      ]} />
  );
}

export function Devices() {
  const res = useList<Device>('devices');
  const cu = useList<Customer>('customers');
  const sr = useList<SR>('serviceRequests');
  const [hist, setHist] = useState<Device | null>(null);
  const name = (id: number) => cu.data.find((c) => c.id === id)?.name ?? '—';
  return (
    <>
      <Crud<Device> resource="devices" title="Devices" res={res}
        blank={{ customerId: '', brand: '', model: '', imei: '', warrantyStart: '', warrantyExpiry: '' }}
        search={(d) => `${name(d.customerId)} ${d.brand} ${d.model} ${d.imei}`}
        fields={[
          { name: 'customerId', label: 'Customer', type: 'select', required: true, options: cu.data.map((c) => ({ value: c.id, label: c.name })) },
          { name: 'brand', label: 'Brand', required: true },
          { name: 'model', label: 'Model', required: true },
          { name: 'imei', label: 'IMEI / Serial', required: true, validate: (v) => (IMEI.test(v) ? undefined : 'IMEI must be 15 digits, or serial 8–20 letters/digits') },
          { name: 'warrantyStart', label: 'Warranty Start', type: 'date', required: true },
          { name: 'warrantyExpiry', label: 'Warranty Expiry', type: 'date', required: true,
            validate: (v, f) => (v < f.warrantyStart ? 'Warranty expiry cannot be before start date' : undefined) },
        ]}
        cols={[
          { key: 'customerId', label: 'Customer', render: (d) => name(d.customerId), sort: (d) => name(d.customerId) },
          { key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' }, { key: 'imei', label: 'IMEI / Serial' },
          { key: 'warrantyExpiry', label: 'Warranty', render: (d) =>
            <Badge text={inWarranty(d) ? `Active till ${d.warrantyExpiry}` : 'Expired'} tone={inWarranty(d) ? 'green' : 'red'} /> },
          { key: 'history', label: 'History', render: (d) => <button className="btn" onClick={() => setHist(d)}>View</button> },
        ]} />
      {hist && (
        <Modal title={`Service history · ${hist.brand} ${hist.model}`} onClose={() => setHist(null)}>
          <DataTable rows={sr.data.filter((s) => s.deviceId === hist.id)} cols={[
            { key: 'jobNo', label: 'Job' }, { key: 'issue', label: 'Issue' }, { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Date', render: (s) => s.createdAt.slice(0, 10) },
          ]} />
        </Modal>
      )}
    </>
  );
}

export function Technicians() {
  const res = useList<Technician>('technicians');
  const sr = useList<SR>('serviceRequests');
  const load = (id: number) => sr.data.filter((s) => s.technicianId === id && isActive(s)).length;
  return (
    <Crud<Technician> resource="technicians" title="Technicians" res={res}
      blank={{ name: '', phone: '', specialization: '', available: true }}
      search={(t) => `${t.name} ${t.specialization}`}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'phone', label: 'Phone', required: true, validate: (v) => (PHONE.test(v) ? undefined : 'Phone must be 10–13 digits') },
        { name: 'specialization', label: 'Specialization', required: true },
        { name: 'available', label: 'On duty', type: 'checkbox' },
      ]}
      cols={[
        { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'specialization', label: 'Specialization' },
        { key: 'load', label: 'Active Jobs', render: (t) => `${load(t.id)} / ${MAX_JOBS}`, sort: (t) => load(t.id) },
        { key: 'available', label: 'Availability', render: (t) => {
          const ok = t.available && load(t.id) < MAX_JOBS;
          return <Badge text={ok ? 'Available' : t.available ? 'Fully booked' : 'Off duty'} tone={ok ? 'green' : 'amber'} />;
        } },
      ]} />
  );
}

export function Inventory() {
  const res = useList<SparePart>('spareParts');
  const tx = useList<InvTxn>('inventoryTransactions');
  const low = res.data.filter((p) => p.stock <= p.minStock);
  const nonNeg = (label: string) => (v: number) => (Number.isInteger(v) && v >= 0 ? undefined : `${label} must be a whole number ≥ 0`);
  return (
    <div className="space-y-6">
      <Crud<SparePart> resource="spareParts" title="Spare Parts & Inventory" res={res}
        blank={{ name: '', sku: '', stock: 0, minStock: 1, price: 0 }}
        search={(p) => `${p.name} ${p.sku}`}
        before={low.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded p-3 mb-3 text-sm">
            ⚠ Low stock: {low.map((p) => `${p.name} (${p.stock})`).join(', ')}
          </div>
        )}
        fields={[
          { name: 'name', label: 'Part Name', required: true }, { name: 'sku', label: 'SKU', required: true },
          { name: 'stock', label: 'Stock Quantity', type: 'number', required: true, validate: nonNeg('Stock') },
          { name: 'minStock', label: 'Low-stock Threshold', type: 'number', required: true, validate: nonNeg('Threshold') },
          { name: 'price', label: 'Price (₹)', type: 'number', required: true, validate: (v) => (v > 0 ? undefined : 'Price must be greater than 0') },
        ]}
        cols={[
          { key: 'name', label: 'Part' }, { key: 'sku', label: 'SKU' }, { key: 'stock', label: 'Stock', sort: (p) => p.stock },
          { key: 'price', label: 'Price', render: (p) => money(p.price), sort: (p) => p.price },
          { key: 'status', label: 'Status', render: (p) => <Badge text={p.stock <= p.minStock ? 'Low stock' : 'OK'} tone={p.stock <= p.minStock ? 'red' : 'green'} /> },
        ]} />
      <div>
        <h3 className="font-semibold mb-2">Inventory Transactions</h3>
        <DataTable rows={tx.data} search={(t) => `${t.partName} ${t.jobNo}`} cols={[
          { key: 'date', label: 'Date', render: (t) => t.date.slice(0, 10) }, { key: 'partName', label: 'Part' },
          { key: 'jobNo', label: 'Job' }, { key: 'type', label: 'Type' }, { key: 'qty', label: 'Qty' },
        ]} />
      </div>
    </div>
  );
}
