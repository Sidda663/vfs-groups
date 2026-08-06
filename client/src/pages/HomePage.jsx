import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Headphones,
  Landmark,
  PhoneCall,
  Quote,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';
import { organizationSchema } from '../config/seo.js';
import { api, apiMessage } from '../services/api.js';
import { useSiteSettings } from '../services/content.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile } from '../utils/validation.js';

const categoryDetails = {
  Loans: {
    icon: Landmark,
    className: 'loans',
    copy: 'Personal, business, home, vehicle and other funding assistance.',
  },
  Insurance: {
    icon: ShieldCheck,
    className: 'insurance',
    copy: 'Protection guidance for individuals, families, vehicles and businesses.',
  },
  'Wealth & Investments': {
    icon: TrendingUp,
    className: 'investments',
    copy: 'Guidance for deposits, systematic investing and one-time investments.',
  },
};

const benefits = [
  [Landmark, 'One team for key financial needs', 'Explore loans, insurance and investments through one clear service journey.'],
  [Users, 'Support across customer profiles', 'Salaried and self-employed customers can speak with us using the information currently available.'],
  [FileCheck2, 'Clear document guidance', 'Understand what may be required and bring requested documents during in-person coordination.'],
  [Headphones, 'Human support when you need it', 'Ask questions, request a callback and understand the next step before proceeding.'],
];

const steps = [
  'Choose a financial service',
  'Share your requirement',
  'Receive clear guidance',
  'Track the next steps',
];

const callbackDefaults = { name: '', mobile: '', service: '', preferredTime: '', consent: false, website: '' };
const promotionImages = {
  Loans: '/services/loans.webp',
  Insurance: '/services/insurance.webp',
  'Wealth & Investments': '/services/investments.webp',
};
const promotionDismissedKey = 'vfs-home-service-promotion-dismissed';

export function HomePage() {
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.data });
  const testimonials = useQuery({ queryKey: ['content', 'testimonials'], queryFn: async () => (await api.get('/content/testimonials')).data.data });
  const settings = useSiteSettings();
  const [processRef, processVisible] = useRevealOnce();
  const [trustRef, trustVisible] = useRevealOnce();
  const years = useCountUp(23, trustVisible);
  const relationships = useCountUp(2000, trustVisible, 1500);
  const grouped = useMemo(() => groupServices(services.data || []), [services.data]);
  const marqueeServices = useMemo(() => interleaveServices(grouped), [grouped]);
  const [promotionDismissed, setPromotionDismissed] = useState(() => {
    try { return window.localStorage.getItem(promotionDismissedKey) === 'true'; }
    catch { return false; }
  });
  const promotedService = services.data?.[0] || null;
  const dismissPromotion = () => {
    setPromotionDismissed(true);
    try { window.localStorage.setItem(promotionDismissedKey, 'true'); }
    catch { /* The in-memory dismissal still works when storage is unavailable. */ }
  };

  return <>
    <Seo
      title="VFS Groups | Loans, Insurance and Investment Assistance"
      description="VFS Groups helps salaried and self-employed customers explore loans, insurance and investments with clear guidance."
      path="/"
      structuredData={organizationSchema(settings.data)}
    />

    <section className="hero">
      <div className="hero-media" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="none">
          <source media="(min-width: 801px)" src="https://videos.pexels.com/video-files/7688134/7688134-uhd_2160_3840_30fps.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><BadgeCheck size={16}/> Your trusted financial partner</span>
          <h1>Loans, insurance and investments—<em>made easier.</em></h1>
          <p>Tell us what you want to achieve. We help you understand available services, prepare for the process and move forward with clear guidance.</p>
          <div className="button-row">
            <Link className="button button-gold" to="/services">Explore services <ArrowRight size={18}/></Link>
            <a className="button button-outline" href="#request-callback">Request a callback</a>
          </div>
          <ul className="hero-points">
            <li><BadgeCheck/> Clear next steps</li>
            <li><FileCheck2/> Document guidance</li>
            <li><ShieldCheck/> Secure tracking</li>
          </ul>
        </div>
        <aside className="hero-service-summary" aria-label="VFS Groups service categories">
          <span>One team. Three key needs.</span>
          {grouped.map((group) => <Link to={`/services?category=${encodeURIComponent(group.name)}`} key={group.name}>
            <strong>{group.name}</strong>
            <small>{group.services.length || '—'} services</small>
            <ArrowRight/>
          </Link>)}
        </aside>
      </div>
    </section>

    <HomeServiceMarquee services={marqueeServices}/>

    <section ref={trustRef} className="trust-strip" aria-label="VFS Groups service proof">
      <div className="shell trust-grid">
        <div><strong aria-label="23 plus years">{years}+ years</strong><span>Experience in banking and financial products</span></div>
        <div><strong aria-label="2,000 plus customer relationships">{new Intl.NumberFormat('en-IN').format(relationships)}+</strong><span>Customer relationships</span></div>
        <div><strong>Karnataka</strong><span>Service reach across cities</span></div>
        <div><strong>Banks &amp; NBFCs</strong><span>Financial-product network</span></div>
      </div>
    </section>

    <section className="section category-section">
      <div className="shell">
        <div className="section-heading home-services-heading">
          <div><span className="eyebrow">Choose a service area</span><h2>Start with what matters to you.</h2></div>
          <Link className="inline-link" to="/services">View every service <ArrowRight size={16}/></Link>
        </div>
        {services.isLoading && <div className="category-grid" aria-label="Loading services">{Array.from({ length: 3 }, (_, index) => <div className="category-card skeleton" key={index}/>)}</div>}
        {services.isError && <div className="notice error">Services are temporarily unavailable. Please try again or contact our team.</div>}
        {services.data && <div className="category-grid">{grouped.map((group) => <CategoryCard group={group} key={group.name}/>)}</div>}
        <div className="inclusive-note home-inclusive-note">
          <strong>We welcome enquiries across financial profiles.</strong>
          <span>Loan assistance is available to salaried and self-employed customers, with or without ITRs, including customers with a low or limited CIBIL score. Final approval and terms remain with the relevant provider.</span>
        </div>
      </div>
    </section>

    <section className="section callback-section" id="request-callback">
      <div className="shell callback-layout">
        <div className="callback-copy">
          <span className="eyebrow">Speak with our team</span>
          <h2>Not sure where to begin?</h2>
          <p>Share your contact details and the service you are exploring. Our team will call you back and explain the next step in simple language.</p>
          <ul>
            <li><CheckCircle2/> No obligation to proceed</li>
            <li><CheckCircle2/> Choose a convenient time</li>
            <li><CheckCircle2/> Your request is recorded securely</li>
          </ul>
        </div>
        <CallbackForm services={services.data || []}/>
      </div>
    </section>

    <section className="section home-benefits-section">
      <div className="shell">
        <div className="section-heading compact"><div><span className="eyebrow">Why VFS Groups</span><h2>Professional support, kept simple.</h2></div></div>
        <div className="benefit-grid home-benefit-grid">{benefits.map(([Icon,title,copy]) => <article key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </div>
    </section>

    <section ref={processRef} className={`section process-section ${processVisible ? 'is-visible' : ''}`}>
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">How it works</span><h2>Four clear steps from enquiry to progress.</h2></div></div>
        <ol className="steps home-steps">{steps.map((step,index) => <li key={step}><span>{String(index + 1).padStart(2,'0')}</span><strong>{step}</strong></li>)}</ol>
        <p className="disclaimer">VFS Groups provides financial-service assistance and guidance. Eligibility, approval, pricing, cover, returns and final terms are decided by the relevant provider.</p>
      </div>
    </section>

    {testimonials.data?.length > 0 && <section className="section testimonial-section">
      <div className="shell">
        <div className="section-heading compact"><div><span className="eyebrow">Customer experiences</span><h2>Shared only with confirmed permission.</h2></div></div>
        <div className="testimonial-grid">{testimonials.data.map((item) => <blockquote key={item._id}><Quote/><p>“{item.quote}”</p><footer><strong>{item.customerName}</strong><span>{item.customerLabel || item.serviceName}</span></footer></blockquote>)}</div>
      </div>
    </section>}

    <section className="section tools-section">
      <div className="shell tools-grid">
        <Link to="/emi-calculator" className="tool-card"><Calculator/><span>Planning tool</span><h2>Estimate an illustrative EMI</h2><p>Explore monthly repayment, total interest and total estimated repayment.</p><b>Open calculator <ArrowRight size={17}/></b></Link>
        <Link to="/customer/dashboard" className="tool-card dark"><TrendingUp/><span>Customer workspace</span><h2>Applications and progress</h2><p>Sign in to submit an application and follow every status update securely.</p><b>Open customer dashboard <ArrowRight size={17}/></b></Link>
      </div>
    </section>

    <section className="final-cta">
      <div className="shell"><div><span className="eyebrow">Your financial growth, our commitment</span><h2>Ready to discuss your financial goal?</h2></div><div className="button-row"><a className="button button-gold" href="#request-callback">Request a callback</a><Link className="button button-light" to="/services">View all services</Link></div></div>
    </section>

    {!promotionDismissed && promotedService && <HomeServicePromotion service={promotedService} onClose={dismissPromotion}/>} 
  </>;
}

function CategoryCard({ group }) {
  const details = categoryDetails[group.name];
  const Icon = details.icon;
  return <article className={`category-card ${details.className}`}>
    <div className="category-card-heading"><div className="category-icon"><Icon/></div><span>{group.services.length} services</span></div>
    <h3>{group.name}</h3>
    <p>{details.copy}</p>
    <div className="category-service-links">{group.services.slice(0, 3).map((service) => <Link to={`/services/${service.slug}`} key={service._id}>{service.name}<ArrowRight/></Link>)}</div>
    <Link className="category-view-all" to={`/services?category=${encodeURIComponent(group.name)}`}>View {group.name.toLowerCase()} <ArrowRight/></Link>
  </article>;
}

function CallbackForm({ services }) {
  const [values, setValues] = useState(callbackDefaults);
  const [errors, setErrors] = useState({});
  const callback = useMutation({
    mutationFn: async (input) => (await api.post('/contact/callbacks', input)).data.data,
    onSuccess: () => { setValues(callbackDefaults); setErrors({}); },
  });
  function update(event) {
    const { name, type, checked, value } = event.target;
    const nextValue = type === 'checkbox' ? checked : name === 'mobile' ? sanitizeMobile(value) : value;
    setValues((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
    callback.reset();
  }
  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Enter your name';
    if (!mobilePattern.test(values.mobile)) nextErrors.mobile = mobileErrorMessage;
    if (!values.consent) nextErrors.consent = 'Consent is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    callback.mutate({ ...values, name: values.name.trim() });
  }
  return <form className="callback-form" onSubmit={submit} noValidate>
    <div><span className="eyebrow"><PhoneCall/> Callback request</span><h3>Ask us to call you</h3></div>
    <div className="form-grid">
      <label>Full name<input name="name" value={values.name} onChange={update} aria-invalid={Boolean(errors.name)}/>{errors.name && <small className="field-error">{errors.name}</small>}</label>
      <label>Mobile number<input name="mobile" type="tel" inputMode="tel" value={values.mobile} onChange={update} aria-invalid={Boolean(errors.mobile)}/>{errors.mobile && <small className="field-error">{errors.mobile}</small>}</label>
      <label>Service<select name="service" value={values.service} onChange={update}><option value="">Not sure yet</option>{services.map((service) => <option value={service._id} key={service._id}>{service.name}</option>)}</select></label>
      <label>Preferred time<select name="preferredTime" value={values.preferredTime} onChange={update}><option value="">Any suitable time</option><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Evening">Evening</option></select></label>
    </div>
    <input className="honeypot" name="website" value={values.website} onChange={update} tabIndex="-1" autoComplete="off"/>
    <label className="checkbox"><input name="consent" type="checkbox" checked={values.consent} onChange={update}/><span>I consent to VFS Groups using these details to respond to my request.</span></label>
    {errors.consent && <small className="field-error">{errors.consent}</small>}
    <button className="button button-gold" disabled={callback.isPending}>{callback.isPending ? 'Sending request…' : 'Request callback'}</button>
    {callback.isError && <p className="form-error" role="alert">{apiMessage(callback.error)}</p>}
    {callback.isSuccess && <p className="form-success" role="status">{callback.data.message} Our team will contact you using the mobile number provided.</p>}
  </form>;
}

function HomeServiceMarquee({ services }) {
  if (!services.length) return null;
  return <section className="home-marquee" aria-label="Explore VFS Groups services"><div className="home-marquee-label"><Landmark/><span>Explore</span></div><div className="home-marquee-viewport"><div className="home-marquee-track"><MarqueeGroup services={services}/><MarqueeGroup services={services} duplicate/></div></div></section>;
}

function MarqueeGroup({ services, duplicate = false }) {
  return <div className={`home-marquee-group ${duplicate ? 'duplicate' : ''}`} aria-hidden={duplicate || undefined}>{services.map((service) => {
    const Icon = categoryDetails[service.category]?.icon || BadgeCheck;
    const content = <><Icon/><span><strong>{service.name}</strong><small>{service.category}</small></span><i>•</i></>;
    return duplicate ? <span className="home-marquee-item" key={service._id}>{content}</span> : <Link className="home-marquee-item" to={`/services/${service.slug}`} key={service._id}>{content}</Link>;
  })}</div>;
}

function HomeServicePromotion({ service, onClose }) {
  const image = promotionImages[service.category] || promotionImages.Loans;
  return <aside className="home-service-promotion" role="dialog" aria-live="polite" aria-label={`${service.name} from VFS Groups`}>
    <button className="home-service-promotion-close" type="button" onClick={onClose} aria-label="Close service update"><X/></button>
    <div className="home-service-promotion-image" style={{ backgroundImage: `url(${image})` }} aria-hidden="true">
      <span>{service.category}</span>
    </div>
    <div className="home-service-promotion-copy">
      <span className="eyebrow">Explore a VFS service</span>
      <h2>{service.name}</h2>
      <p>{service.shortDescription}</p>
      <div>
        <Link className="button button-gold" to={`/services/${service.slug}`}>View service <ArrowRight/></Link>
        <Link className="home-service-promotion-apply" to={`/apply?service=${service.slug}`}>Apply now</Link>
      </div>
    </div>
  </aside>;
}

function groupServices(services) {
  return Object.keys(categoryDetails).map((name) => ({ name, services: services.filter((service) => service.category === name) }));
}

function interleaveServices(groups) {
  const result = [];
  const max = Math.max(0, ...groups.map((group) => group.services.length));
  for (let index = 0; index < max; index += 1) {
    groups.forEach((group) => { if (group.services[index]) result.push(group.services[index]); });
  }
  return result;
}

function useRevealOnce() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window.IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const observer = new window.IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.18 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

function useCountUp(target, active, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValue(target); return undefined; }
    let frame; let startedAt;
    const tick = (time) => {
      startedAt ??= time;
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, duration, target]);
  return value;
}
