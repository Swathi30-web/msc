import { useAuth } from '../auth';
import { useList } from '../api';
import { MAX_JOBS, isActive, money } from '../lib';
import { State } from '../ui';
import type { Activity, Payment, SR, SparePart, Technician } from '../types';

const PENDING = ['Device Received', 'Job Card Created', 'Diagnosis', 'Technician Assigned'];
const PROGRESS = ['Repair in Progress', 'Quality Check'];
const DONE = ['Ready for Pickup', 'Delivered'];

export default function Dashboard() {
  const { user } = useAuth();
  const sr = useList<SR>('serviceRequests');
  const te = useList<Technician>('technicians');
  const sp = useList<SparePart>('spareParts');
  const pay = useList<Payment>('payments');
  const act = useList<Activity>('activities');
  const staff = user.role === 'admin' || user.role === 'receptionist';
  const mine = sr.data.filter((s) =>
    user.role === 'technician' ? s.technicianId === user.technicianId : user.role === 'customer' ? s.customerId === user.customerId : true);
  const count = (st: string[]) => mine.filter((s) => st.includes(s.status)).length;
  const available = te.data.filter((t) => t.available && sr.data.filter((s) => s.technicianId === t.id && isActive(s)).length < MAX_JOBS).length;
  const cards: [string, string | number][] = [
    ['Total Service Requests', mine.length], ['Pending Repairs', count(PENDING)],
    ['Repairs in Progress', count(PROGRESS)], ['Completed Repairs', count(DONE)],
  ];
  if (staff) cards.push(['Available Technicians', available], ['Low-Stock Parts', sp.data.filter((p) => p.stock <= p.minStock).length]);
  if (user.role === 'admin') cards.push(['Total Revenue', money(pay.data.reduce((a, p) => a + p.amount, 0))]);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Welcome, {user.name}</h2>
      <State loading={sr.loading} error={sr.error || te.error || sp.error} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(([l, v]) => (
          <div key={l} className="card"><div className="text-sm text-slate-500">{l}</div><div className="text-2xl font-bold">{v}</div></div>
        ))}
      </div>
      {staff && (
        <div className="card mt-4">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          {act.data.slice(-8).reverse().map((a) => (
            <div key={a.id} className="text-sm border-t py-1.5">{a.message}<span className="text-slate-400 ml-2">{new Date(a.date).toLocaleString()}</span></div>
          ))}
          {!act.data.length && <p className="text-sm text-slate-500">No activity yet</p>}
        </div>
      )}
    </div>
  );
}
