export type Role = 'admin' | 'receptionist' | 'technician' | 'customer';
export interface User { id: number; username: string; password: string; name: string; role: Role; customerId?: number; technicianId?: number }
export interface Customer { id: number; name: string; phone: string; email: string; address: string }
export interface Device { id: number; customerId: number; brand: string; model: string; imei: string; warrantyStart: string; warrantyExpiry: string }
export interface Technician { id: number; name: string; phone: string; specialization: string; available: boolean }
export interface PartUsed { partId: number; name: string; qty: number; price: number }
export interface SR { id: number; jobNo: string; customerId: number; deviceId: number; issue: string; diagnosis: string; status: string; technicianId: number | null; estimate: number; partsUsed: PartUsed[]; createdAt: string }
export interface SparePart { id: number; name: string; sku: string; stock: number; minStock: number; price: number }
export interface Invoice { id: number; invoiceNo: string; serviceRequestId: number; jobNo: string; customerId: number; serviceCharge: number; partsCost: number; total: number; paidAmount: number; paymentStatus: 'Unpaid' | 'Partial' | 'Paid'; paymentMethod: string; date: string }
export interface Payment { id: number; invoiceId: number; invoiceNo: string; amount: number; method: string; date: string }
export interface InvTxn { id: number; partId: number; partName: string; serviceRequestId: number; jobNo: string; qty: number; type: string; date: string }
export interface Activity { id: number; message: string; date: string }
