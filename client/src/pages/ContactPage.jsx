import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { createWhatsAppUrl, formatIndianPhone, officialPhoneNumbers, officialWhatsApp } from '../config/contact.js';
import { api, apiMessage } from '../services/api.js';
import { trackEvent } from '../services/analytics.js';
import { useSiteSettings } from '../services/content.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobileEvent } from '../utils/validation.js';

const schema = z.object({ name: z.string().min(2, 'Enter your name'), mobile: z.string().regex(mobilePattern, mobileErrorMessage), email: z.string().email('Enter a valid email').or(z.literal('')), subject: z.string().min(3, 'Enter a subject'), service: z.string().optional(), message: z.string().min(10, 'Add a little more detail').max(2000), preferredContactMethod: z.enum(['phone', 'email', 'whatsapp']), consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }), website: z.string().max(0).optional() });

export function ContactPage() {
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.data });
  const settings = useSiteSettings(); const contact = settings.data?.contact; const hasPublishedPhones = Boolean(contact?.phones?.length); const phones = hasPublishedPhones ? contact.phones : officialPhoneNumbers; const whatsapp = hasPublishedPhones && contact?.whatsapp ? contact.whatsapp : officialWhatsApp.number; const emailReady = Boolean(contact?.email);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', mobile: '', email: '', subject: '', service: '', message: '', preferredContactMethod: 'phone', consent: false, website: '' } });
  const submit = useMutation({ mutationFn: async (values) => (await api.post('/contact/enquiries', values)).data.data, onSuccess: () => { form.reset(); trackEvent('enquiry_submitted'); } });
  const address = contact?.addressLines?.length ? [contact.locationNote || 'VFS GROUP, 3rd Floor', ...contact.addressLines, contact.city, contact.state, contact.pinCode].filter(Boolean).join(', ') : 'VFS GROUP, 3rd Floor, No. 881/A, Yashodhara Complex, Basaveshwara Nagar, Bengaluru, Karnataka 560079';

  return <>
    <Seo title="Contact VFS Groups" description="Contact VFS Groups by phone, WhatsApp, or a secure enquiry for loans, insurance, and investment assistance." path="/contact"/>
    <section className="page-hero contact-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Contact' }]}/><span className="eyebrow">Contact VFS Groups</span><h1>Start with a clear conversation.</h1><p>Tell us what you are exploring. Our team will review your enquiry and respond through your preferred contact method.</p></div></section>
    <section className="section"><div className="shell contact-grid">
      <aside className="contact-details"><span className="eyebrow">Verified support channels</span><h2>Choose what works for you.</h2><p>Use the official contact options below or submit the secure enquiry form.</p><div><Phone/><span><b>Phone numbers</b>{phones.map((number) => <a href={`tel:+${number.replace(/\D/g, '')}`} key={number}>{formatIndianPhone(number)}</a>)}</span></div>{emailReady ? <div><Mail/><span><b>Email</b><a href={`mailto:${contact.email}`}>{contact.email}</a></span></div> : <div><Mail/><span><b>Email</b>Not published yet</span></div>}<div><MessageCircle/><span><b>WhatsApp</b><a href={createWhatsAppUrl('Hello VFS Groups, I would like to make an enquiry.', whatsapp)} target="_blank" rel="noreferrer">{formatIndianPhone(whatsapp)}</a></span></div><div><Clock3/><span><b>Office hours</b>{contact?.officeHours || 'Not published yet'}</span></div><div><MapPin/><span><b>Office address</b>{address}</span></div></aside>
      <form className="form-card" onSubmit={form.handleSubmit((values) => submit.mutate(values))} noValidate><h2>Send an enquiry</h2><div className="form-grid"><Field label="Full name" name="name" form={form}/><Field label="Mobile number" name="mobile" form={form} inputMode="tel"/><Field label="Email (optional)" name="email" type="email" form={form}/><Field label="Subject" name="subject" form={form}/><label>Service (optional)<select {...form.register('service')}><option value="">Choose a service</option>{services.data?.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label>Preferred contact<select {...form.register('preferredContactMethod')}><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option>{emailReady && <option value="email">Email</option>}</select></label></div><label>How can we help?<textarea rows="5" {...form.register('message')}/>{form.formState.errors.message && <small className="field-error">{form.formState.errors.message.message}</small>}</label><input className="honeypot" tabIndex="-1" autoComplete="off" {...form.register('website')}/><label className="checkbox"><input type="checkbox" {...form.register('consent')}/><span>I consent to VFS Groups using these details to respond to this enquiry.</span></label>{form.formState.errors.consent && <small className="field-error" role="alert">{form.formState.errors.consent.message}</small>}<button className="button button-gold" disabled={submit.isPending}>{submit.isPending ? 'Submitting…' : 'Send enquiry'}</button>{submit.isError && <p className="form-error" role="alert">{apiMessage(submit.error)}</p>}{submit.isSuccess && <div className="form-success" role="status"><CheckCircle2/>{submit.data.message}</div>}</form>
    </div></section>
  </>;
}

function Field({ label, name, type = 'text', form, inputMode }) {
  const error = form.formState.errors[name];
  return <label>{label}<input type={type} inputMode={inputMode} aria-invalid={Boolean(error)} onInput={type === 'tel' || inputMode === 'tel' ? sanitizeMobileEvent : undefined} {...form.register(name)}/>{error && <small className="field-error" role="alert">{error.message}</small>}</label>;
}
