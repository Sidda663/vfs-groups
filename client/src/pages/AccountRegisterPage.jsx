import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Eye, EyeOff, QrCode, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { LocationFields } from '../components/LocationFields.jsx';
import { INDIA_COUNTRY } from '../data/indiaLocations.js';
import { api, apiMessage } from '../services/api.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobileEvent } from '../utils/validation.js';

const password = z.string().min(10, 'Use at least 10 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number');
const optionalEmail = z.string().trim().refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email address');
const schema = z.object({ fullName: z.string().min(2), mobile: z.string().regex(mobilePattern, mobileErrorMessage), email: optionalEmail, password, country: z.literal(INDIA_COUNTRY), city: z.string().min(2), state: z.string().min(2), businessName: z.string().optional(), referralCode: z.string().max(40).optional(), customerType: z.enum(['indian', 'nri']), consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }) });

export function AccountRegisterPage({ accountType }) {
  const [params] = useSearchParams();
  const accountLabel = accountType === 'contractor' ? 'connector' : accountType;
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { fullName: '', mobile: '', email: '', password: '', country: INDIA_COUNTRY, city: '', state: '', businessName: '', referralCode: params.get('ref') || '', customerType: 'indian', consent: false } });
  const register = useMutation({ mutationFn: async (values) => { const payload = { ...values }; if (accountType === 'contractor') { delete payload.referralCode; delete payload.customerType; return (await api.post('/payments/connector-registration/start', payload)).data.data; } return (await api.post('/auth/customer/register', payload)).data.data; }, onSuccess: () => form.reset() });
  const paymentStatus = useQuery({
    queryKey: ['connector-registration-payment', register.data?.registrationId],
    enabled: accountType === 'contractor' && Boolean(register.data?.registrationId),
    queryFn: async () => (await api.get(`/payments/connector-registration/${register.data.registrationId}/status`)).data.data,
    initialData: register.data?.registrationId ? register.data : undefined,
    refetchInterval: (query) => ['account_created', 'failed', 'expired'].includes(query.state.data?.status) ? false : 2500,
  });
  const mockSuccess = useMutation({ mutationFn: async () => (await api.post(`/payments/connector-registration/${register.data.registrationId}/mock-success`)).data.data, onSuccess: () => paymentStatus.refetch() });

  if (accountType === 'contractor' && register.isSuccess) {
    const payment = paymentStatus.data || register.data;
    if (payment.status === 'account_created') return <section className="page-hero"><div className="shell narrow success-panel"><CheckCircle2/><span className="eyebrow">Payment verified · Account created</span><h1>Welcome, {payment.fullName}.</h1><p>Your connector account was created only after the ₹{payment.amountPaise / 100} payment was verified. Sign in to generate your permanent referral code.</p><Link className="button button-gold" to="/contractor/sign-in">Sign in</Link></div></section>;
    return <ConnectorPayment payment={payment} statusError={paymentStatus.isError ? apiMessage(paymentStatus.error) : ''} mockSuccess={mockSuccess}/>;
  }

  if (register.isSuccess) return <section className="page-hero"><div className="shell narrow success-panel"><CheckCircle2/><span className="eyebrow">Account created</span><h1>Welcome, {register.data.user.fullName}.</h1><p>{accountType === 'contractor' ? 'Sign in to generate your permanent connector referral code.' : 'Your customer account is ready. Any connector referral you entered is waiting for admin review.'}</p><Link className="button button-gold" to={`/${accountType}/sign-in`}>Sign in</Link></div></section>;

  return <section className="auth-section"><div className="auth-aside"><UserPlus/><span className="eyebrow">{accountLabel} registration</span><h1>Create your secure {accountLabel} account.</h1><p>{accountType === 'contractor' ? 'Enter your details, pay the ₹1 registration fee, and your account will be created after secure payment verification.' : 'A connector referral code is optional and always requires admin approval.'}</p></div><form className="form-card auth-form" onSubmit={form.handleSubmit((values) => register.mutate(values))} noValidate><h2>Create {accountLabel} account</h2><div className="form-grid"><Field label="Full name" name="fullName" form={form}/><Field label="Mobile number" name="mobile" type="tel" form={form}/><Field label="Email (optional)" name="email" type="email" form={form}/>{accountType === 'contractor' && <Field label="Business / agency (optional)" name="businessName" form={form}/>} {accountType === 'customer' && <label>Customer type<select {...form.register('customerType')}><option value="indian">Indian Customer</option><option value="nri">NRI Customer</option></select></label>}<LocationFields form={form}/></div><PasswordField form={form}/>{accountType === 'customer' && <Field label="Connector referral code (optional)" name="referralCode" form={form} readOnly={Boolean(params.get('ref'))}/>}<label className="checkbox"><input type="checkbox" {...form.register('consent')}/><span>I accept the privacy notice and consent to creation of this account.</span></label>{form.formState.errors.consent && <small className="field-error" role="alert">{form.formState.errors.consent.message}</small>}<button className="button button-gold" disabled={register.isPending}>{register.isPending ? (accountType === 'contractor' ? 'Preparing secure payment…' : 'Creating account…') : (accountType === 'contractor' ? 'Continue to ₹1 payment' : 'Create secure account')}</button>{register.isError && <p className="form-error" role="alert">{apiMessage(register.error)}</p>}<p>Already registered? <Link to={`/${accountType}/sign-in`}>Sign in</Link></p></form></section>;
}

function ConnectorPayment({ payment, statusError, mockSuccess }) {
  const inactive = ['failed', 'expired'].includes(payment.status);
  return <section className="payment-section"><div className="payment-card"><div className="payment-heading"><QrCode/><div><span className="eyebrow">Connector registration payment</span><h1>Pay ₹{payment.amountPaise / 100} to create your account</h1></div></div>{inactive ? <><p className="form-error">{payment.status === 'expired' ? 'This QR has expired. Please restart connector registration.' : 'The payment could not be prepared. Please restart registration.'}</p><Link className="button button-gold" to="/contractor/sign-up" onClick={() => window.location.reload()}>Start again</Link></> : <><div className="payment-qr"><img src={payment.qrImageUrl} alt="Razorpay UPI QR code for connector registration"/></div><p className="payment-notice"><Clock3/> Your account has not been created yet. Scan with any supported UPI app and pay exactly ₹{payment.amountPaise / 100}. This page checks payment automatically.</p><div className="payment-state"><span className="status-badge">Waiting for verified payment</span><small>QR expires {new Date(payment.expiresAt).toLocaleString('en-IN')}</small></div>{payment.mock && <button type="button" className="button button-gold" disabled={mockSuccess.isPending} onClick={() => mockSuccess.mutate()}>{mockSuccess.isPending ? 'Verifying test payment…' : 'Simulate successful ₹1 test payment'}</button>}{mockSuccess.isError && <p className="form-error">{apiMessage(mockSuccess.error)}</p>}{statusError && <p className="form-error">{statusError}</p>}</>}</div></section>;
}

function Field({ label, name, type = 'text', form, readOnly = false }) { const error = form.formState.errors[name]; return <label>{label}<input type={type} inputMode={type === 'tel' ? 'tel' : undefined} readOnly={readOnly} aria-invalid={Boolean(error)} onInput={type === 'tel' ? sanitizeMobileEvent : undefined} {...form.register(name)}/>{error && <small className="field-error" role="alert">{error.message}</small>}</label>; }
function PasswordField({ form }) { const [visible, setVisible] = useState(false); const error = form.formState.errors.password; return <label>Password<div className="password-input"><input type={visible ? 'text' : 'password'} autoComplete="new-password" aria-invalid={Boolean(error)} {...form.register('password')}/><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff/> : <Eye/>}</button></div>{error && <small className="field-error" role="alert">{error.message}</small>}</label>; }
