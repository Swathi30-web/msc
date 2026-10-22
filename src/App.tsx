import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './Layout';
import type { Role } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Customers, Devices, Technicians, Inventory } from './pages/Masters';
import { ServiceRequests, JobCards, TechJobs } from './pages/Requests';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import CustomerPortal from './pages/Customer';

const staff = {
  dashboard: <Dashboard />, customers: <Customers />, devices: <Devices />,
  'service-requests': <ServiceRequests />, 'job-cards': <JobCards />,
};
const PAGES: Record<Role, Record<string, ReactElement>> = {
  admin: { ...staff, technicians: <Technicians />, inventory: <Inventory />, billing: <Billing />, reports: <Reports /> },
  receptionist: staff,
  technician: {
    dashboard: <Dashboard />, 'assigned-jobs': <TechJobs mode="assigned" />,
    'repair-updates': <TechJobs mode="updates" />, 'parts-used': <TechJobs mode="parts" />,
  },
  customer: {
    dashboard: <Dashboard />, devices: <CustomerPortal view="devices" />, 'service-requests': <CustomerPortal view="requests" />,
    'repair-status': <CustomerPortal view="status" />, bills: <CustomerPortal view="bills" />, history: <CustomerPortal view="history" />,
  },
};

function Guard({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {(Object.keys(PAGES) as Role[]).map((role) => (
        <Route key={role} path={`/${role}`} element={<Guard role={role} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {Object.entries(PAGES[role]).map(([p, el]) => <Route key={p} path={p} element={el} />)}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
