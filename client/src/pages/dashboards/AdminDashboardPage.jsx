import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BriefcaseBusiness, Check, Eye, FileText, Network, PhoneCall, Search, Trash2, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { Pagination } from '../../components/dashboard/DashboardTabs.jsx';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';
import { ResponsiveTable } from './MemberDashboardPage.jsx';

const sections = ['overview', 'customers', 'contractors', 'referral-management', 'enquiries'];
const pageSize = 25;

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const active = sections.includes(params.get('section')) ? params.get('section') : 'overview';
  const [userPage, setUserPage] = useState(1);
  const [callbackPage, setCallbackPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const memberRole = active === 'contractors' ? 'contractor' : 'customer';
  const memberLabel = memberRole === 'contractor' ? 'connector' : 'customer';
  const [referralStatus, setReferralStatus] = useState('pending');
  const memberSelectionKey = active === 'contractors' ? 'contractors' : 'customers';
  const [callbackSearch, setCallbackSearch] = useState('');
  const [callbackFilter, setCallbackFilter] = useState('');
  const [selected, setSelected] = useState({ customers: [], contractors: [], callbacks: [] });

  const summary = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: async () => (await api.get('/dashboard/admin')).data.data });
  const users = useQuery({ queryKey: ['admin-users', memberRole, userSearch, userPage], enabled: ['customers', 'contractors'].includes(active), queryFn: async () => (await api.get('/dashboard/admin/users', { params: { q: userSearch, role: memberRole, page: userPage, limit: pageSize } })).data });
  const callbacks = useQuery({ queryKey: ['admin-callback-requests', callbackSearch, callbackFilter, callbackPage], enabled: active === 'enquiries', queryFn: async () => (await api.get('/dashboard/admin/callback-requests', { params: { q: callbackSearch, status: callbackFilter, page: callbackPage, limit: pageSize } })).data });
  const referralRequests = useQuery({ queryKey: ['admin-referral-requests', referralStatus], enabled: active === 'referral-management', queryFn: async () => (await api.get('/dashboard/admin/referral-requests', { params: { status: referralStatus } })).data.data });
  const referralDecision = useMutation({ mutationFn: ({ id, status, rejectionReason }) => api.patch(`/dashboard/admin/referral-requests/${id}/decision`, { status, ...(rejectionReason ? { rejectionReason } : {}) }), onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-referral-requests'] }), queryClient.invalidateQueries({ queryKey: ['admin-users'] }), queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] })]) });
  const callbackStatus = useMutation({ mutationFn: ({ id, status }) => api.patch(`/dashboard/admin/callback-requests/${id}/status`, { status }), onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-callback-requests'] }), queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] })]) });
  const deleteRecords = useMutation({ mutationFn: ({ type, ids, reason }) => api.delete('/dashboard/admin/records', { data: { type, ids, reason } }), onSuccess: (_data, variables) => { setSelected((current) => ({ ...current, [variables.selectionKey || variables.type]: [] })); return Promise.all([queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] }), queryClient.invalidateQueries({ queryKey: ['admin-users'] }), queryClient.invalidateQueries({ queryKey: ['admin-callback-requests'] })]); } });

  function toggleSelection(type, id) { setSelected((current) => ({ ...current, [type]: current[type].includes(id) ? current[type].filter((item) => item !== id) : [...current[type], id] })); }
  function toggleAll(type, ids) { setSelected((current) => { const allSelected = ids.every((id) => current[type].includes(id)); return { ...current, [type]: allSelected ? current[type].filter((id) => !ids.includes(id)) : [...new Set([...current[type], ...ids])] }; }); }
  function selection(type, ids, label) { return { ids, selected: selected[type], label, toggle: (id) => toggleSelection(type, id), toggleAll: (visibleIds) => toggleAll(type, visibleIds) }; }
  function confirmDelete(type, label, selectionKey = type) { const count = selected[selectionKey].length; if (!count) return; const reason = window.prompt(`Reason for deleting ${count} selected ${label}?`); if (!reason || reason.trim().length < 3) return; if (window.confirm(`Delete ${count} selected ${label}? This action cannot be undone.`)) deleteRecords.mutate({ type, ids: selected[selectionKey], reason: reason.trim(), selectionKey }); }

  if (summary.isLoading) return <div className="shell route-loading">Loading admin data…</div>;
  if (summary.isError) return <div className="shell route-loading"><h1>Admin dashboard unavailable</h1><p>{apiMessage(summary.error)}</p></div>;
  const data = summary.data;

  return <DashboardShell role="admin" title="Admin">
    <header className="admin-page-heading"><span className="eyebrow">Admin dashboard</span><h1>{sectionTitle(active)}</h1><p>{sectionDescription(active)}</p></header>

    {active === 'overview' && <section className="metric-grid admin-metrics" aria-label="Key totals">
      <Metric label="Customers" value={data.metrics.totalCustomers} to="/admin/dashboard?section=customers" icon={UserRound}/>
      <Metric label="Connectors" value={data.metrics.totalContractors} to="/admin/dashboard?section=contractors" icon={BriefcaseBusiness}/>
      <Metric label="Tracking orders" value={data.metrics.totalApplications} to="/admin/applications" icon={FileText}/>
      <Metric label="Enquiries" value={data.metrics.totalCallbackRequests || 0} to="/admin/dashboard?section=enquiries" icon={PhoneCall}/>
    </section>}

    {['customers', 'contractors'].includes(active) && <section className="dashboard-card tab-panel" role="tabpanel">
      <div className="card-heading"><div><span className="eyebrow">{memberLabel} directory</span><h2>All registered {memberLabel}s</h2><p>Search the directory and open an account for its complete details.</p></div>{memberRole === 'customer' ? <UserRound/> : <BriefcaseBusiness/>}</div>
      <div className="dashboard-filters"><label><Search/><input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserPage(1); }} placeholder={`Search ${memberLabel}s by name, email, phone, or code`}/></label></div>
      {users.isLoading ? <div className="empty-state">Loading {memberLabel}s…</div> : users.isError ? <p className="form-error">{apiMessage(users.error)}</p> : <>
        <SelectionBar count={selected[memberSelectionKey].length} label={`${memberLabel}s`} pending={deleteRecords.isPending} error={deleteRecords.isError ? apiMessage(deleteRecords.error) : ''} onDelete={() => confirmDelete('users', `${memberLabel} accounts`, memberSelectionKey)}/><ResponsiveTable columns={memberRole === 'contractor' ? ['Name', 'Contact', 'Referral code', 'Approved referrals', 'Joined', 'Action'] : ['Name', 'Contact', 'Customer type', 'Status', 'Joined', 'Action']} rows={(users.data?.data || []).map((user) => memberRole === 'contractor' ? [<span key="name"><Link className="table-link" to={`/admin/users/${user._id}`}>{user.fullName}</Link><small>{user.profile?.businessName || user.profile?.contractorId}</small></span>, <span key="contact">{user.email || 'No email'}<small>{user.mobile}</small></span>, user.referralCode || 'Generated after first sign-in', user.approvedReferralCount || 0, formatDate(user.createdAt), <Link key="details" className="button button-outline table-action" to={`/admin/users/${user._id}`}><Eye size={15}/> View</Link>] : [<span key="name"><Link className="table-link" to={`/admin/users/${user._id}`}>{user.fullName}</Link><small>{user.profile?.customerId}</small></span>, <span key="contact">{user.email || 'No email'}<small>{user.mobile}</small></span>, user.profile?.customerType === 'nri' ? 'NRI Customer' : 'Indian Customer', humanize(user.status), formatDate(user.createdAt), <Link key="details" className="button button-outline table-action" to={`/admin/users/${user._id}`}><Eye size={15}/> View</Link>])} empty={`No ${memberLabel}s match the current search.`} selection={selection(memberSelectionKey, (users.data?.data || []).map((user) => user._id), `${memberLabel} account`)}/>
        <Pagination page={userPage} pages={users.data?.meta?.pages} total={users.data?.meta?.total} onChange={setUserPage} label={`${memberLabel}s`}/>
      </>}
    </section>}

    {active === 'referral-management' && <section className="dashboard-card tab-panel" role="tabpanel"><div className="card-heading"><div><span className="eyebrow">Connector referrals</span><h2>Referral Management</h2><p>Approve or reject connector attribution requests submitted during customer registration.</p></div><Network/></div><div className="dashboard-tabs" role="tablist">{['pending', 'approved', 'rejected'].map((status) => <button type="button" role="tab" aria-selected={referralStatus === status} className={referralStatus === status ? 'active' : ''} onClick={() => setReferralStatus(status)} key={status}>{humanize(status)}</button>)}</div>{referralDecision.isError && <p className="form-error">{apiMessage(referralDecision.error)}</p>}{referralRequests.isLoading ? <div className="empty-state">Loading referrals…</div> : referralRequests.isError ? <p className="form-error">{apiMessage(referralRequests.error)}</p> : <ResponsiveTable columns={['Customer', 'Email', 'Phone', 'Customer type', 'Connector', 'Code', 'Registered', 'Status', 'Action']} rows={(referralRequests.data || []).map((item) => [item.customer?.user?.fullName || '—', item.customer?.user?.email || '—', item.customer?.user?.mobile || '—', item.customer?.customerType === 'nri' ? 'NRI Customer' : 'Indian Customer', item.connector?.user?.fullName || '—', item.referralCode, formatDate(item.createdAt), <span key="status">{humanize(item.status)}{item.rejectionReason && <small>{item.rejectionReason}</small>}</span>, item.status === 'pending' ? <div className="button-row" key="actions"><button type="button" className="button button-gold table-action" disabled={referralDecision.isPending} onClick={() => referralDecision.mutate({ id: item._id, status: 'approved' })}><Check size={15}/> Approve</button><button type="button" className="button danger-button table-action" disabled={referralDecision.isPending} onClick={() => { const reason = window.prompt('Enter the rejection reason'); if (reason?.trim().length >= 3) referralDecision.mutate({ id: item._id, status: 'rejected', rejectionReason: reason.trim() }); }}><X size={15}/> Reject</button></div> : item.status === 'approved' ? formatDate(item.approvedAt) : item.rejectionReason || '—'])} empty={`No ${referralStatus} referrals.`}/>}</section>}

    {active === 'enquiries' && <section className="dashboard-card tab-panel" role="tabpanel">
      <div className="card-heading"><div><span className="eyebrow">Website enquiries</span><h2>Callback requests</h2><p>Requests received from the homepage and service pages.</p></div><PhoneCall/></div>
      <div className="dashboard-filters"><label><Search/><input value={callbackSearch} onChange={(event) => { setCallbackSearch(event.target.value); setCallbackPage(1); }} placeholder="Search name or mobile number"/></label><select aria-label="Filter callback requests by status" value={callbackFilter} onChange={(event) => { setCallbackFilter(event.target.value); setCallbackPage(1); }}><option value="">All statuses</option>{['new', 'scheduled', 'completed', 'cancelled'].map((status) => <option value={status} key={status}>{humanize(status)}</option>)}</select></div>
      {callbackStatus.isError && <p className="form-error">{apiMessage(callbackStatus.error)}</p>}
      {callbacks.isLoading ? <div className="empty-state">Loading enquiries…</div> : callbacks.isError ? <p className="form-error">{apiMessage(callbacks.error)}</p> : <><SelectionBar count={selected.callbacks.length} label="enquiries" pending={deleteRecords.isPending} error={deleteRecords.isError ? apiMessage(deleteRecords.error) : ''} onDelete={() => confirmDelete('callbacks', 'enquiries')}/><ResponsiveTable columns={['Name', 'Mobile', 'Service', 'Received', 'Status']} rows={(callbacks.data?.data || []).map((item) => [item.name, <a key="mobile" className="table-link" href={`tel:+${item.mobile.replace(/\D/g, '')}`}>{item.mobile}</a>, item.service?.name || 'General enquiry', formatDate(item.createdAt), <select className="table-status-select" key="status" value={item.status} disabled={callbackStatus.isPending} onChange={(event) => callbackStatus.mutate({ id: item._id, status: event.target.value })}>{['new', 'scheduled', 'completed', 'cancelled'].map((status) => <option value={status} key={status}>{humanize(status)}</option>)}</select>])} empty="No enquiries match the current filters." selection={selection('callbacks', (callbacks.data?.data || []).map((item) => item._id), 'enquiry')}/><Pagination page={callbackPage} pages={callbacks.data?.meta?.pages} total={callbacks.data?.meta?.total} onChange={setCallbackPage} label="enquiries"/></>}
    </section>}

  </DashboardShell>;
}

function sectionTitle(section) {
  return { overview: 'Overview', customers: 'Customers', contractors: 'Connectors', 'referral-management': 'Referral Management', enquiries: 'Enquiries' }[section];
}

function sectionDescription(section) {
  return { overview: 'The important numbers, with direct access to each section.', customers: 'Registered customer accounts.', contractors: 'Registered connector accounts and approved referral totals.', 'referral-management': 'Review pending, approved, and rejected connector referrals.', enquiries: 'Website callback requests.' }[section];
}

function Metric({ label, value = 0, to, icon: Icon }) {
  return <Link className="metric-card metric-card-link" to={to}><span className="metric-card-label"><Icon size={18}/>{label}</span><strong>{value}</strong><small>Open →</small></Link>;
}

function SelectionBar({ count, label, pending, error, onDelete }) {
  return <>{count > 0 && <div className="selection-toolbar"><strong>{count} {label} selected</strong><button type="button" className="button danger-button" onClick={onDelete} disabled={pending}><Trash2 size={16}/>{pending ? 'Deleting…' : 'Delete selected'}</button></div>}{error && <p className="form-error">{error}</p>}</>;
}
