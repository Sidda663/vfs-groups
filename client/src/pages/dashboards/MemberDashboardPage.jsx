import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clipboard, Eye, FileText, Share2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { LocationFields } from '../../components/LocationFields.jsx';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { Pagination } from '../../components/dashboard/DashboardTabs.jsx';
import { INDIA_COUNTRY } from '../../data/indiaLocations.js';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';

const pageSize = 10;
const activeStatuses = new Set(['submitted', 'new', 'contacted', 'documents_pending', 'documents_received', 'under_internal_review', 'additional_information_required', 'submitted_to_provider', 'under_provider_review']);
const customerStatusGuide = {
  submitted: { title: 'Application received', description: 'We have received your application. No action is needed from you right now.' },
  new: { title: 'Application received', description: 'Your application is registered and waiting for the first review.' },
  contacted: { title: 'We contacted you', description: 'Our team has contacted you to confirm your application details.' },
  documents_pending: { title: 'Documents needed', description: 'Please keep the requested documents ready. Our team will tell you exactly what to share and how to send them.' },
  documents_received: { title: 'Documents received', description: 'We received your documents. You do not need to send them again unless our team asks.' },
  under_internal_review: { title: 'Application under review', description: 'Our team is checking your application and documents. No action is needed right now.' },
  additional_information_required: { title: 'More information needed', description: 'We need some additional details. Please follow the latest message from our team below.' },
  submitted_to_provider: { title: 'Sent to the bank or provider', description: 'Your application has been sent to the bank or service provider for their review.' },
  under_provider_review: { title: 'Bank or provider is reviewing', description: 'The bank or service provider is checking your application. We will update you when they respond.' },
  approved: { title: 'Application approved', description: 'Good news—your application has been approved. Our team will contact you about the next step.' },
  rejected: { title: 'Application not approved', description: 'The application was not approved. Please read the latest message or contact our team for clarification.' },
  disbursed_or_policy_issued: { title: 'Application completed', description: 'Your loan was disbursed or your policy/service was issued successfully.' },
  closed: { title: 'Application closed', description: 'This application has been completed and closed.' },
  cancelled: { title: 'Application cancelled', description: 'This application was cancelled. Contact our team if you need help starting again.' },
};

export function MemberDashboardPage({ portal }) {
  const [copied, setCopied] = useState(false);
  const [referralPage, setReferralPage] = useState(1);
  const dashboard = useQuery({ queryKey: ['dashboard', portal], queryFn: async () => (await api.get(`/dashboard/${portal}`)).data.data });
  const customerDraft = useQuery({ queryKey: ['customer-application-draft', dashboard.data?.user?._id], enabled: portal === 'customer' && Boolean(dashboard.data?.user?._id), queryFn: async () => (await api.get('/applications/customer/draft')).data.data, retry: false });
  const customerApplications = useQuery({ queryKey: ['customer-application-tracking'], enabled: portal === 'customer', queryFn: async () => (await api.get('/applications/customer/tracking')).data.data, retry: false });
  const registrations = useQuery({ queryKey: ['member-page', portal, 'referred-users', referralPage], enabled: portal === 'contractor', queryFn: async () => (await api.get(`/dashboard/${portal}/referred-users`, { params: { page: referralPage, limit: pageSize } })).data });

  if (dashboard.isLoading) return <div className="shell route-loading">Loading your dashboard…</div>;
  if (dashboard.isError) return <div className="shell route-loading"><h1>Dashboard unavailable</h1><p>{apiMessage(dashboard.error)}</p></div>;

  const data = dashboard.data;
  if (portal === 'contractor') return <ConnectorDashboard data={data} copied={copied} setCopied={setCopied} registrations={registrations} page={referralPage} setPage={setReferralPage}/>;
  return <CustomerDashboard data={data} draft={customerDraft} applications={customerApplications}/>;
}

function ConnectorDashboard({ data, copied, setCopied, registrations, page, setPage }) {
  const shareUrl = `${window.location.origin}/customer/sign-up?ref=${data.user.referralCode}`;
  async function copy(value) { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  async function share() { if (navigator.share) await navigator.share({ title: 'VFS Groups referral', text: 'Register with my VFS Groups referral code.', url: shareUrl }); else await copy(shareUrl); }
  return <DashboardShell role="contractor" title={data.user.fullName}>
    <section className="dashboard-welcome connector-dashboard-welcome"><div><span className="eyebrow">Connector dashboard</span><h1>Welcome, {data.user.fullName}</h1><p>Share your referral code with customers. Their account registration and Admin decision will appear below.</p></div><div className="referral-code-card"><span>Your permanent referral code</span><strong>{data.user.referralCode}</strong><div><button type="button" onClick={() => copy(data.user.referralCode)}><Clipboard size={16}/>{copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={share}><Share2 size={16}/>Share</button></div></div></section>
    <section className="metric-grid connector-referral-metrics" aria-label="Referral totals"><Metric label="Customers who used your code" value={data.metrics.totalReferrals}/><Metric label="Approved" value={data.metrics.approvedReferrals}/><Metric label="Pending" value={data.metrics.pendingReferrals}/><Metric label="Rejected" value={data.metrics.rejectedReferrals}/></section>
    <ConnectorCustomerForm/>
    <PaginatedPanel title="Customers who used your referral code" eyebrow="Referral activity" query={registrations} page={page} onPage={setPage} label="customer referrals" columns={['Customer name', 'Account created', 'Status', 'Decision date']} row={(user) => [user.fullName, formatDate(user.createdAt), humanize(user.referralStatus), user.approvedAt || user.rejectedAt ? formatDate(user.approvedAt || user.rejectedAt) : 'Awaiting Admin']} empty="No customer has created an account using your referral code yet."/>
  </DashboardShell>;
}

function ConnectorCustomerForm() {
  const queryClient = useQueryClient(); const [open, setOpen] = useState(false);
  const form = useForm({ defaultValues: { fullName: '', mobile: '', email: '', password: '', confirmPassword: '', country: INDIA_COUNTRY, city: '', state: '', customerType: 'indian', consent: false } });
  const create = useMutation({ mutationFn: async (values) => { const payload = { ...values }; delete payload.confirmPassword; return (await api.post('/dashboard/contractor/customers', payload)).data.data; }, onSuccess: () => { form.reset(); return Promise.all([queryClient.invalidateQueries({ queryKey: ['dashboard', 'contractor'] }), queryClient.invalidateQueries({ queryKey: ['member-page', 'contractor', 'referred-users'] })]); } });
  if (!open) return <section className="dashboard-card connector-create-customer"><div><span className="eyebrow">Create an account for a customer</span><h2>Add a Customer directly</h2><p>Create the account while assisting the Customer. It is automatically approved under your referral code and updates your count.</p></div><button type="button" className="button button-gold" onClick={() => setOpen(true)}>Create Customer Account</button></section>;
  return <section className="dashboard-card dashboard-section connector-customer-form"><div className="card-heading"><div><span className="eyebrow">Direct Customer registration</span><h2>Create Customer Account</h2><p>The Customer must be present, choose their password privately, and consent to account creation.</p></div><button type="button" className="text-button" onClick={() => { setOpen(false); create.reset(); }}>Close</button></div><form className="dashboard-form" onSubmit={form.handleSubmit((values) => create.mutate(values))}><div className="form-grid"><Field label="Customer full name" register={form.register('fullName', { required: 'Enter the Customer name', minLength: { value: 2, message: 'Enter at least 2 characters' } })} error={form.formState.errors.fullName}/><Field label="Mobile number" type="tel" register={form.register('mobile', { required: 'Enter the mobile number', pattern: { value: /^\+?[1-9]\d{9,14}$/, message: 'Enter a valid mobile number' } })} error={form.formState.errors.mobile}/><Field label="Email (optional)" type="email" register={form.register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} error={form.formState.errors.email}/><label>Customer type<select {...form.register('customerType')}><option value="indian">Indian Customer</option><option value="nri">NRI Customer</option></select></label><LocationFields form={form}/><Field label="Customer password" type="password" register={form.register('password', { required: 'Enter a password', minLength: { value: 10, message: 'Use at least 10 characters' }, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, message: 'Include uppercase, lowercase, and a number' } })} error={form.formState.errors.password}/><Field label="Confirm password" type="password" register={form.register('confirmPassword', { required: 'Confirm the password', validate: (value) => value === form.getValues('password') || 'Passwords do not match' })} error={form.formState.errors.confirmPassword}/></div><label className="checkbox"><input type="checkbox" {...form.register('consent', { required: 'Customer consent is required' })}/><span>The Customer is present and consents to creation of this account under my referral code.</span></label>{form.formState.errors.consent && <small className="field-error">{form.formState.errors.consent.message}</small>}{create.isError && <p className="form-error">{apiMessage(create.error)}</p>}{create.isSuccess && <p className="form-success">{create.data.message} The Customer can now sign in using their mobile/email and password.</p>}<button className="button button-gold" disabled={create.isPending}>{create.isPending ? 'Creating account…' : 'Create Customer Account'}</button></form></section>;
}

function CustomerDashboard({ data, draft, applications }) {
  const items = applications.data || [];
  const inProgress = items.filter((item) => activeStatuses.has(item.status)).length;
  const approved = items.filter((item) => ['approved', 'disbursed_or_policy_issued'].includes(item.status)).length;
  const documentsRequired = items.filter((item) => ['documents_pending', 'additional_information_required'].includes(item.status)).length;
  return <DashboardShell role="customer" title={data.user.fullName}>
    <section className="dashboard-welcome customer-dashboard-welcome"><div><span className="eyebrow">Customer dashboard</span><h1>Welcome, {data.user.fullName}</h1><p>Start an application and follow every update published by the VFS team.</p></div></section>
    <section className="metric-grid customer-tracking-metrics" aria-label="Application totals"><Metric label="Total applications" value={items.length}/><Metric label="In progress" value={inProgress}/><Metric label="Documents required" value={documentsRequired}/><Metric label="Approved" value={approved}/></section>
    <section className="dashboard-card customer-application-entry"><div><span className="eyebrow">My financial application</span><h2>{draft.data?.draft ? 'Continue your saved application' : 'Start a new application'}</h2><p>{draft.data?.draft ? 'Your saved application is ready to continue.' : 'Choose a service, submit your details, and track the result here.'}</p></div><Link className="button button-gold" to="/apply">{draft.data?.draft ? 'Continue application' : 'Start application'}</Link></section>
    <section className="dashboard-section customer-application-tracking"><div className="card-heading"><div><span className="eyebrow">Application tracking</span><h2>My applications</h2><p>Only updates published for your customer account are shown here.</p></div><FileText/></div>
      {applications.isLoading ? <div className="dashboard-card empty-state">Loading application status…</div> : applications.isError ? <p className="form-error">{apiMessage(applications.error)}</p> : items.length ? <div className="customer-tracking-list">{items.map((application) => <CustomerApplication key={application._id} application={application}/>)}</div> : <div className="dashboard-card empty-state"><FileText/><h2>No submitted applications</h2><p>Start an application and its progress will appear here after submission.</p></div>}
    </section>
  </DashboardShell>;
}

function CustomerApplication({ application }) {
  const current = friendlyStatus(application.status);
  const latestUpdate = application.history.at(-1);
  return <article className="dashboard-card customer-tracking-card">
    <div className="tracking-summary"><div><span className="eyebrow">{application.applicationId}</span><h2>{application.service?.name || 'Service application'}</h2><p>Submitted {formatDate(application.submittedAt)}{Number(application.requestedAmount) > 0 ? ` · Amount ${formatCurrency(application.requestedAmount)}` : ''}</p></div><span className="status-pill">{current.title}</span></div>
    <div className="customer-current-status"><CheckCircle2/><div><span>Current status</span><h3>{current.title}</h3><p>{current.description}</p>{latestUpdate?.publicNote && <div className="customer-vfs-message"><strong>Latest message from VFS</strong><p>{latestUpdate.publicNote}</p></div>}</div></div>
    {application.nriDocumentUploadEnabled && <NriDocumentPanel application={application}/>} 
    {application.history.length > 1 && <details className="customer-status-history"><summary>View previous updates</summary><ol className="status-timeline">{application.history.map((item) => { const status = friendlyStatus(item.newStatus); return <li key={item._id}><CheckCircle2/><div><strong>{status.title}</strong><p>{status.description}</p><small>{formatDate(item.createdAt)}</small></div></li>; })}</ol></details>}
  </article>;
}

function NriDocumentPanel({ application }) {
  return <section className="nri-document-panel"><div className="nri-document-heading"><div><span className="eyebrow">NRI document upload</span><h3>Documents for this application</h3><p>Upload only the requested document. PDF, JPG, or PNG files up to 10 MB are accepted and stored privately.</p></div><Upload/></div><div className="nri-document-list">{application.documents.map((requirement) => <NriDocumentItem key={requirement.key} applicationId={application._id} requirement={requirement}/>)}</div></section>;
}

function NriDocumentItem({ applicationId, requirement }) {
  const queryClient = useQueryClient(); const [file, setFile] = useState(null); const document = requirement.document;
  const upload = useMutation({ mutationFn: async () => { const body = new FormData(); body.append('documentKey', requirement.key); body.append('document', file); return api.post(`/applications/customer/applications/${applicationId}/documents`, body); }, onSuccess: () => { setFile(null); return queryClient.invalidateQueries({ queryKey: ['customer-application-tracking'] }); } });
  const status = !document ? 'Not uploaded' : document.status === 'verified' ? 'Approved' : document.status === 'rejected' ? 'Upload again' : 'Uploaded — checking';
  return <article className={`nri-document-item ${document?.status || 'missing'}`}><div className="nri-document-copy"><strong>{requirement.label}</strong><span className="nri-document-status">{status}</span>{document?.originalName && <small>{document.originalName} · {formatFileSize(document.size)}</small>}{document?.rejectionReason && <p>{document.rejectionReason}</p>}</div><div className="nri-document-actions">{document?.viewUrl && <a className="button button-outline" href={document.viewUrl} target="_blank" rel="noreferrer"><Eye size={15}/> View</a>}{(!document || document.status === 'rejected') && <label className="nri-file-picker"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)}/><span>{file ? file.name : 'Choose file'}</span></label>}{file && <button type="button" className="button button-gold" disabled={upload.isPending || file.size > 10 * 1024 * 1024} onClick={() => upload.mutate()}><Upload size={15}/>{upload.isPending ? 'Uploading…' : 'Upload securely'}</button>}</div>{file?.size > 10 * 1024 * 1024 && <p className="form-error">This file is larger than 10 MB.</p>}{upload.isError && <p className="form-error">{apiMessage(upload.error)}</p>}</article>;
}

function friendlyStatus(status) { return customerStatusGuide[status] || { title: humanize(status), description: 'Our team will update you with the next step.' }; }
function formatFileSize(value) { return `${Math.max(1, Math.round(Number(value || 0) / 1024))} KB`; }
function formatCurrency(value) { return Number(value) > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value) : '—'; }
function PaginatedPanel({ title, eyebrow, query, page, onPage, label, columns, row, empty }) { return <section className="dashboard-card dashboard-section tab-panel"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{query.isLoading ? <div className="empty-state">Loading {label}…</div> : query.isError ? <p className="form-error">{apiMessage(query.error)}</p> : <><ResponsiveTable columns={columns} rows={(query.data?.data || []).map(row)} empty={empty}/><Pagination page={page} pages={query.data?.meta?.pages} total={query.data?.meta?.total} onChange={onPage} label={label}/></>}</section>; }
export const CustomerDashboardPage = () => <MemberDashboardPage portal="customer"/>;
export const ContractorDashboardPage = () => <MemberDashboardPage portal="contractor"/>;
function Field({ label, type = 'text', register, error }) { return <label>{label}<input type={type} aria-invalid={Boolean(error)} {...register}/>{error && <small className="field-error" role="alert">{error.message}</small>}</label>; }
function Metric({ label, value = 0 }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }

export function ResponsiveTable({ columns, rows, empty, selection }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  const ids = selection?.ids || [];
  const allSelected = Boolean(selection && ids.length && ids.every((id) => selection.selected.includes(id)));
  return <div className="table-wrap"><table><thead><tr>{selection && <th className="table-select"><input type="checkbox" checked={allSelected} onChange={() => selection.toggleAll(ids)} aria-label={`Select all ${selection.label || 'records'} on this page`}/></th>}{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={ids[index] || index}>{selection && <td className="table-select" data-label="Select"><input type="checkbox" checked={selection.selected.includes(ids[index])} onChange={() => selection.toggle(ids[index])} aria-label={`Select ${selection.label || 'record'} ${index + 1}`}/></td>}{row.map((cell, cellIndex) => <td data-label={columns[cellIndex]} key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
