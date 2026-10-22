import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import type { Role } from './types';

export const NAV: Record<Role, [string, string][]> = {
  admin: [['dashboard', 'Dashboard'], ['customers', 'Customers'], ['devices', 'Devices'], ['technicians', 'Technicians'], ['service-requests', 'Service Requests'], ['job-cards', 'Job Cards'], ['inventory', 'Inventory'], ['billing', 'Billing'], ['reports', 'Reports']],
  receptionist: [['dashboard', 'Dashboard'], ['customers', 'Customers'], ['devices', 'Devices'], ['service-requests', 'Service Requests'], ['job-cards', 'Job Cards']],
  technician: [['dashboard', 'Dashboard'], ['assigned-jobs', 'Assigned Jobs'], ['repair-updates', 'Repair Updates'], ['parts-used', 'Parts Used']],
  customer: [['dashboard', 'Dashboard'], ['devices', 'My Devices'], ['service-requests', 'Service Requests'], ['repair-status', 'Repair Status'], ['bills', 'Bills'], ['history', 'History']],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? 'block' : 'hidden'} md:block w-full md:w-60 bg-slate-900 text-slate-100 p-3 md:min-h-screen`}>
        <div className="font-bold text-lg mb-4">📱 Service Center</div>
        {NAV[user.role].map(([p, l]) => (
          <NavLink key={p} to={`/${user.role}/${p}`} onClick={() => setOpen(false)}
            className={({ isActive }) => `block px-3 py-2 rounded mb-1 ${isActive ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>{l}</NavLink>
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex justify-between items-center bg-white border-b px-4 py-2">
          <button className="md:hidden btn" onClick={() => setOpen(!open)}>☰</button>
          <span className="text-sm">{user.name} · <span className="capitalize">{user.role}</span></span>
          <button className="btn" onClick={logout}>Logout</button>
        </header>
        <main className="p-4"><Outlet /></main>
      </div>
    </div>
  );
}
