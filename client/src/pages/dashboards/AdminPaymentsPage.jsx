import { useQuery } from '@tanstack/react-query';
import { CreditCard, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';
import { ResponsiveTable } from './MemberDashboardPage.jsx';

export function AdminPaymentsPage() {
  const payments = useQuery({ queryKey: ['admin-connector-payments'], queryFn: async () => (await api.get('/payments/admin/connector-registrations', { params: { limit: 100 } })).data });
  return <DashboardShell role="admin" title="Connector Payments"><header className="admin-page-heading"><span className="eyebrow">Admin dashboard</span><h1>Connector Payments</h1><p>Every connector registration payment and its account-creation result.</p></header><section className="dashboard-card tab-panel"><div className="card-heading"><div><span className="eyebrow">Razorpay records</span><h2>Registration payments</h2><p>An account is created only after a verified successful payment.</p></div><CreditCard/></div>{payments.isLoading ? <div className="empty-state">Loading payments…</div> : payments.isError ? <p className="form-error">{apiMessage(payments.error)}</p> : <ResponsiveTable columns={['Connector', 'Contact', 'Amount', 'Status', 'Razorpay payment ID', 'Started', 'Paid', 'Account']} rows={(payments.data?.data || []).map((item) => [item.fullName, <span key="contact">{item.email || 'No email'}<small>{item.mobile}</small></span>, `₹${(item.amountPaise / 100).toFixed(2)}`, humanize(item.status), item.providerPaymentId || '—', formatDate(item.createdAt), item.paidAt ? formatDate(item.paidAt) : '—', item.connectorUser ? <Link key="account" className="button button-outline table-action" to={`/admin/users/${item.connectorUser._id}`}><Eye size={15}/> View</Link> : item.failureReason || 'Not created'])} empty="No connector registration payments yet."/>}</section></DashboardShell>;
}
