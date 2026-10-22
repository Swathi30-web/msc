import type { Device, SR } from './types';

export const FLOW = ['Device Received', 'Job Card Created', 'Diagnosis', 'Technician Assigned', 'Repair in Progress', 'Quality Check', 'Ready for Pickup', 'Delivered'];
export const STATUSES = [...FLOW, 'Cancelled', 'Repair Failed'];
export const NEXT: Record<string, string[]> = {
  'Device Received': ['Job Card Created', 'Cancelled'],
  'Job Card Created': ['Diagnosis', 'Cancelled'],
  'Diagnosis': ['Technician Assigned', 'Cancelled'],
  'Technician Assigned': ['Repair in Progress', 'Cancelled'],
  'Repair in Progress': ['Quality Check', 'Repair Failed', 'Cancelled'],
  'Quality Check': ['Ready for Pickup', 'Repair in Progress', 'Repair Failed'],
  'Ready for Pickup': ['Delivered'],
  'Delivered': [], 'Cancelled': [], 'Repair Failed': [],
};
export const MAX_JOBS = 3;
export const PHONE = /^\+?\d{10,13}$/;
export const IMEI = /^(\d{15}|[A-Za-z0-9]{8,20})$/;
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number) => '₹' + (n || 0).toFixed(2);
export const inWarranty = (d?: Device) => !!d && d.warrantyStart <= today() && today() <= d.warrantyExpiry;
export const isActive = (s: SR) => !['Delivered', 'Cancelled', 'Repair Failed'].includes(s.status);
export const partsCost = (s: SR) => s.partsUsed.reduce((a, p) => a + p.qty * p.price, 0);
export const nextNo = (prefix: string, existing: string[]) =>
  `${prefix}-${Math.max(10000, ...existing.map((x) => parseInt(x.split('-')[1]) || 0)) + 1}`;
