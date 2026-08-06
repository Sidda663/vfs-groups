import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BriefcaseBusiness, CreditCard, FileText, Images, LayoutDashboard, LogOut, Menu, PhoneCall, Scale, UserCheck, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { humanize } from '../../utils/dashboard.js';
import { PoweredBy } from '../PoweredBy.jsx';

const adminLinks = [
  { label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard, section: 'overview' },
  { label: 'Customers', to: '/admin/dashboard?section=customers', icon: UserRound, section: 'customers' },
  { label: 'Connectors', to: '/admin/dashboard?section=contractors', icon: BriefcaseBusiness, section: 'contractors' },
  { label: 'Connector Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Referral Management', to: '/admin/dashboard?section=referral-management', icon: UserCheck, section: 'referral-management' },
  { label: 'Tracking Orders', to: '/admin/applications', icon: FileText },
  { label: 'Enquiries', to: '/admin/dashboard?section=enquiries', icon: PhoneCall, section: 'enquiries' },
  { label: 'Legal Services', to: '/admin/legal-services', icon: Scale },
  { label: 'Gallery', to: '/admin/content', icon: Images },
];

export function DashboardShell({ title, role, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const roleLabel = humanize(role);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); setSidebarOpen(false); }, [location.pathname, location.search]);
  const logout = useMutation({ mutationFn: () => api.post('/auth/logout'), onSuccess: () => { queryClient.clear(); navigate(`/${role === 'admin' ? 'admin' : role}/sign-in`, { replace: true }); } });

  return <div className={`dashboard-page dashboard-role-${role}`}>
    <header className="dashboard-header">
      <div><Link to="/" className="brand"><img src="/brand/vfs-groups-logo.png" alt="VFS Groups"/><span>VFS Groups<small>{roleLabel} workspace</small></span></Link></div>
      <div>{role === 'admin' && <button type="button" className="admin-sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-expanded={sidebarOpen} aria-controls="admin-sidebar" aria-label={sidebarOpen ? 'Close admin menu' : 'Open admin menu'}>{sidebarOpen ? <X/> : <Menu/>}</button>}<span>{title}</span><button type="button" className="button button-outline" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={17}/> Sign out</button></div>
    </header>
    {role === 'admin' ? <div className="admin-shell-layout">
      {sidebarOpen && <button type="button" className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close admin menu"/>}
      <aside id="admin-sidebar" className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="admin-sidebar-heading"><div><span className="eyebrow">Admin panel</span><strong>Manage</strong></div><button type="button" className="admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close admin menu"><X size={20}/></button></div>
        <nav>{adminLinks.map(({ label, to, icon: Icon, section }) => {
          const currentSection = new URLSearchParams(location.search).get('section') || 'overview';
          const active = section ? location.pathname === '/admin/dashboard' && currentSection === section : to !== '/' && location.pathname.startsWith(to);
          return <Link className={active ? 'active' : ''} to={to} key={label}><Icon size={18}/><span>{label}</span></Link>;
        })}</nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div> : <main className="dashboard-main">{children}</main>}
    <footer className="dashboard-footer"><PoweredBy compact/></footer>
  </div>;
}
