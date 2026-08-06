import { useMutation, useQuery } from '@tanstack/react-query';
import { Scale, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api, apiMessage } from '../services/api.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile, sanitizeMobileEvent } from '../utils/validation.js';

export function LegalServicesPage() {
  return <><Seo title="Legal Services | VFS Groups" description="Request an available legal service from VFS Groups." path="/services/legal-services"/><section className="page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Services', to: '/services' }, { label: 'Legal Services' }]}/><span className="eyebrow">Legal Services</span><h1>Request legal assistance.</h1><p>Choose an available service and share your contact details.</p></div></section><section className="section"><div className="shell narrow"><LegalServiceRequestForm/></div></section></>;
}

export function LegalServiceRequestForm() {
  const services = useQuery({ queryKey: ['legal-services'], queryFn: async () => (await api.get('/legal-services')).data.data });
  const form = useForm({ defaultValues: { name: '', phone: '', email: '', service: '' } });
  const submit = useMutation({ mutationFn: async (values) => (await api.post('/legal-services/requests', values)).data.data, onSuccess: () => form.reset() });
  return <form className="form-card dashboard-form legal-service-request-form" onSubmit={form.handleSubmit((values) => submit.mutate(values))} noValidate><div className="card-heading"><div><span className="eyebrow">Legal service request</span><h2>How can we help?</h2><p>Choose a current service from the list managed by the VFS Groups team.</p></div><Scale/></div><div className="form-grid"><Field label="Name" name="name" form={form} rules={{ required: 'Enter your name', minLength: { value: 2, message: 'Enter at least 2 characters' } }}/><Field label="Phone number" name="phone" type="tel" form={form} rules={{ required: 'Enter your phone number', pattern: { value: mobilePattern, message: mobileErrorMessage }, setValueAs: sanitizeMobile }}/><Field label="Email (optional)" name="email" type="email" form={form}/><label>Service type<select {...form.register('service', { required: 'Choose a service' })} aria-invalid={Boolean(form.formState.errors.service)}><option value="">Choose service</option>{services.data?.map((service) => <option value={service._id} key={service._id}>{service.name}</option>)}</select>{form.formState.errors.service && <small className="field-error">{form.formState.errors.service.message}</small>}</label></div>{services.isError && <p className="form-error">{apiMessage(services.error)}</p>}{submit.isError && <p className="form-error">{apiMessage(submit.error)}</p>}{submit.isSuccess && <p className="form-success">Your legal service request was submitted successfully.</p>}<button className="button button-gold" disabled={submit.isPending || services.isLoading}><Send size={17}/>{submit.isPending ? 'Submitting…' : 'Submit request'}</button></form>;
}

function Field({ label, name, type = 'text', form, rules }) { const error = form.formState.errors[name]; return <label>{label}<input type={type} inputMode={type === 'tel' ? 'tel' : undefined} onInput={type === 'tel' ? sanitizeMobileEvent : undefined} aria-invalid={Boolean(error)} {...form.register(name, rules)}/>{error && <small className="field-error">{error.message}</small>}</label>; }
