import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, FilePenLine, FileText, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';
import { api, apiMessage } from '../services/api.js';
import { trackEvent } from '../services/analytics.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile } from '../utils/validation.js';
import { LegalServiceRequestForm } from './LegalServicesPage.jsx';

const categoryImages = {
  Loans: '/services/loans.webp',
  Insurance: '/services/insurance.webp',
  'Wealth & Investments': '/services/investments.webp',
};
const suppliedServiceImages = {
  'personal-loans': { src: '/services/personal-loans.webp', ratio: 'tall' },
  'business-loans': { src: '/services/business-loans.webp', ratio: 'tall' },
  'home-loans': { src: '/services/home-loans.webp', ratio: 'wide' },
  'loan-against-property': { src: '/services/loan-against-property.webp', ratio: 'wide' },
  'legal-services': { src: '/services/legal-services.png', ratio: 'wide' },
};

export function ServiceDetailPage() {
  const { slug } = useParams();
  const service = useQuery({ queryKey: ['service', slug], queryFn: async () => (await api.get(`/services/${slug}`)).data.data });
  if (service.isLoading) return <div className="shell route-loading">Loading service information…</div>;
  if (service.isError) return <div className="shell route-loading"><h1>Service unavailable</h1><Link to="/services">Return to services</Link></div>;
  const item = service.data;
  const suppliedImage = suppliedServiceImages[item.slug];
  const backgroundImage = suppliedImage?.src || categoryImages[item.category] || categoryImages.Loans;
  return <>
    <Seo title={item.seo?.title || `${item.name} | VFS Groups`} description={item.seo?.description || item.shortDescription} path={`/services/${item.slug}`} structuredData={{ '@context': 'https://schema.org', '@type': 'Service', name: item.name, description: item.overview, provider: { '@type': 'Organization', name: 'VFS Groups' }, areaServed: 'Karnataka, India', serviceType: item.category }}/>
    <section className="service-hero service-detail-hero">
      <div className="shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/services">Services</Link><span>/</span><b>{item.name}</b></nav>
        <div className={`service-background ${suppliedImage ? `service-background-supplied ${suppliedImage.ratio}` : 'service-background-fallback'}`} style={{ backgroundImage: `url(${backgroundImage})` }} role="img" aria-label={`${item.name}. ${item.shortDescription}`}>{suppliedImage ? <h1 className="sr-only">{item.name}</h1> : <div className="service-background-copy"><span className="eyebrow">{item.category}</span><h1>{item.name}</h1><p>{item.shortDescription}</p></div>}</div>
      </div>
    </section>
    {item.slug === 'legal-services' ? <section className="service-actions-section"><div className="shell narrow"><LegalServiceRequestForm/></div></section> : <section className="service-actions-section"><div className="shell service-action-grid"><DirectApplicationOption service={item}/><QuickServiceEnquiry service={item}/></div></section>}
    <section className="section service-simple-section">
      <div className="shell">
        <div className="service-facts">
          <SimpleList title="What this service can help with" items={item.useCases}/>
          <SimpleList title="What to bring if VFS asks" items={item.documents} icon={FileText}/>
          <section><span className="eyebrow">Simple process</span><h2>What happens next</h2><ol>{item.process.slice(0, 4).map((value, index) => <li key={value}><b>{index + 1}</b><span>{value}</span></li>)}</ol></section>
        </div>
        <p className="disclaimer service-disclaimer">VFS Groups provides assistance and guidance. Eligibility, approval, interest rates, premiums, returns and final terms are decided by the relevant bank, NBFC, insurer or product provider.</p>
        <Link className="inline-link" to="/services">Explore another service <ArrowRight/></Link>
      </div>
    </section>
    {item.faqs?.length > 0 && <section className="section service-faq-section">
      <div className="shell service-faq-shell">
        <div className="service-faq-heading">
          <span className="eyebrow">About {item.name}</span>
          <h2>Common Questions</h2>
          <p>Simple answers to questions customers often ask before taking the next step.</p>
        </div>
        <div className="service-faq-list">
          {item.faqs.map((faq) => <details key={faq.question}>
            <summary><span>{faq.question}</span><b className="service-faq-toggle" aria-hidden="true">+</b></summary>
            <p>{faq.answer}</p>
          </details>)}
        </div>
      </div>
    </section>}
  </>;
}

function DirectApplicationOption({ service }) {
  const serviceKind = service.category === 'Loans' ? 'loan' : 'service';
  return <section className="service-action-card direct-application-option">
    <div><FilePenLine/><span><strong>Apply directly</strong><small>Complete the secure application online.</small></span></div>
    <h2>Send a complete {serviceKind} application</h2>
    <p>Choose this if you are ready to share your personal, financial and requirement details now.</p>
    <Link className="button button-dark" to={`/apply?service=${service.slug}`}>Apply for this {serviceKind} <ArrowRight/></Link>
  </section>;
}

function QuickServiceEnquiry({ service }) {
  const [values, setValues] = useState({ name: '', mobile: '', website: '' });
  const [errors, setErrors] = useState({});
  const [waiting, setWaiting] = useState(false);
  const serviceKind = service.category === 'Loans' ? 'loan' : 'service';
  const enquiry = useMutation({
    mutationFn: async (input) => (await api.post('/contact/callbacks', input)).data.data,
    onSuccess: () => { setValues({ name: '', mobile: '', website: '' }); setErrors({}); setWaiting(false); trackEvent('service_callback_requested', { service: service.slug }); },
  });
  function update(event) {
    const value = event.target.name === 'mobile' ? sanitizeMobile(event.target.value) : event.target.value;
    setValues((current) => ({ ...current, [event.target.name]: value }));
    setErrors((current) => ({ ...current, [event.target.name]: '' }));
    enquiry.reset();
  }
  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Enter your name';
    if (!mobilePattern.test(values.mobile)) nextErrors.mobile = mobileErrorMessage;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    enquiry.mutate({ name: values.name.trim(), mobile: values.mobile, service: service._id, consent: true, website: values.website });
  }
  if (enquiry.isSuccess) return <section className="quick-service-form service-action-card callback-success-panel" aria-live="polite">
    <div><CheckCircle2/><span><strong>Callback request received</strong><small>Our team has your number and selected service.</small></span></div>
    <p className="form-success">Choose what you would like to do next.</p>
    <Link className="button button-gold" to={`/apply?service=${service.slug}`}><FilePenLine/> Complete application now</Link>
    <button className="button button-outline" type="button" onClick={() => setWaiting(true)}><PhoneCall/> Wait for our call</button>
    {waiting && <p className="callback-waiting-note">You are all set. No more action is needed—VFS Groups will call the mobile number you provided.</p>}
  </section>;
  return <form className="quick-service-form service-action-card" onSubmit={submit} noValidate>
    <div><PhoneCall/><span><strong>Interested in {service.name}?</strong><small>Share two details. Our team will call you.</small></span></div>
    <label>Full name<input name="name" value={values.name} onChange={update} autoComplete="name" aria-invalid={Boolean(errors.name)}/>{errors.name && <small className="field-error">{errors.name}</small>}</label>
    <label>Mobile number<input name="mobile" type="tel" inputMode="tel" value={values.mobile} onChange={update} autoComplete="tel" aria-invalid={Boolean(errors.mobile)}/>{errors.mobile && <small className="field-error">{errors.mobile}</small>}</label>
    <input className="honeypot" name="website" value={values.website} onChange={update} tabIndex="-1" autoComplete="off"/>
    <button className="button button-gold" disabled={enquiry.isPending}>{enquiry.isPending ? 'Sending…' : `Request a call about this ${serviceKind}`} <ArrowRight/></button>
    <p>By requesting a call, you consent to VFS Groups using these details to respond about this service.</p>
    {enquiry.isError && <p className="form-error" role="alert">{apiMessage(enquiry.error)}</p>}
  </form>;
}

function SimpleList({ title, items = [], icon: Icon = CheckCircle2 }) {
  return <section><span className="eyebrow">Service guide</span><h2>{title}</h2><ul>{items.slice(0, 5).map((value) => <li key={value}><Icon/><span>{value}</span></li>)}</ul></section>;
}
