import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, GitCompareArrows, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api } from '../services/api.js';

export function ServicesPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'All');
  const [compare, setCompare] = useState([]);
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.data });
  const categories = useMemo(() => ['All', ...new Set((services.data || []).map((item) => item.category))], [services.data]);
  const filtered = useMemo(() => (services.data || []).filter((item) => (category === 'All' || item.category === category) && `${item.name} ${item.shortDescription} ${item.useCases?.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [services.data, query, category]);
  const compared = (services.data || []).filter((item) => compare.includes(item._id));

  function toggle(item) {
    setCompare((current) => current.includes(item._id) ? current.filter((id) => id !== item._id) : current.length < 3 ? [...current, item._id] : current);
  }

  return <>
    <Seo title="Financial Services | VFS Groups" description="Compare and explore loan assistance, insurance guidance, and investment services for salaried and self-employed customers." path="/services"/>
    <section className="page-hero services-page-hero">
      <div className="shell">
        <Breadcrumbs items={[{ label: 'Services' }]}/>
        <span className="eyebrow">Loans · Insurance · Investments</span>
        <h1>Find the right place to start.</h1>
        <p>Choose a service area or describe what you need. We keep the options clear and explain the next step.</p>
        <div className="services-hero-filter filter-bar">
          <label><Search size={18}/><span className="sr-only">Search services</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?"/></label>
          <div role="group" aria-label="Service category">{categories.map((item) => <button className={item === category ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        </div>
      </div>
    </section>
    <section className="section services-results-section">
      <div className="shell">
        <div className="inclusive-note"><strong>We welcome enquiries across financial profiles.</strong><span>Loan assistance is available with or without ITRs, including for customers with a low or limited CIBIL score. Final approval and terms remain with the relevant provider.</span></div>
        {compare.length > 0 && <div className="compare-dock"><span><GitCompareArrows/> {compare.length} of 3 selected</span><button className="inline-link" onClick={() => setCompare([])}>Clear <X size={15}/></button><a className="button button-dark" href="#comparison">Compare now</a></div>}
        {services.isLoading && <div className="services-list" aria-label="Loading services">{Array.from({ length: 6 }, (_, index) => <div className="service-result-skeleton skeleton" key={index}/>)}</div>}
        {services.isError && <div className="notice error">Services are temporarily unavailable. Please try again or contact our team.</div>}
        {!services.isLoading && !services.isError && <div className="services-list">{filtered.map((service) => {
          const selected = compare.includes(service._id);
          return <article className={selected ? 'selected' : ''} key={service._id}>
            <div className="service-card-top"><span>{service.category}</span><button type="button" className="compare-toggle" aria-pressed={selected} disabled={!selected && compare.length >= 3} onClick={() => toggle(service)}>{selected ? <Check size={15}/> : <GitCompareArrows size={15}/>} {selected ? 'Selected' : 'Compare'}</button></div>
            <h2>{service.name}</h2><p>{service.shortDescription}</p><Link to={`/services/${service.slug}`}>Explore service <ArrowRight size={17}/></Link>
          </article>;
        })}{filtered.length === 0 && <div className="empty-state">No service matches this search. Try another word or category.</div>}</div>}
        {compared.length > 0 && <section id="comparison" className="comparison-section"><div className="section-heading compact"><div><span className="eyebrow">Side-by-side view</span><h2>Compare service journeys.</h2></div></div><div className="comparison-grid">{compared.map((item) => <article key={item._id}><span>{item.category}</span><h3>{item.name}</h3><p>{item.shortDescription}</p><h4>Common uses</h4><ul>{item.useCases?.slice(0, 3).map((value) => <li key={value}>{value}</li>)}</ul><h4>What VFS may ask you to bring in person</h4><ul>{item.documents?.slice(0, 3).map((value) => <li key={value}>{value}</li>)}</ul><Link className="button button-gold" to={`/apply?service=${item.slug}`}>Apply for assistance</Link></article>)}</div><p className="disclaimer">This comparison summarizes assistance journeys, not provider offers. Eligibility, pricing, cover, risk, returns, and final terms depend on the relevant provider.</p></section>}
      </div>
    </section>
  </>;
}
