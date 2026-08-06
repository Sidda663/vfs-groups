import { useQuery } from '@tanstack/react-query';
import { HelpCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api } from '../services/api.js';

export function FaqPage() {
  const faqs = useQuery({ queryKey: ['content', 'faqs'], queryFn: async () => (await api.get('/content/faqs')).data.data });
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...new Set((faqs.data || []).map((item) => item.category))], [faqs.data]);
  const filtered = (faqs.data || []).filter((item) => (category === 'All' || item.category === category) && `${item.question} ${item.answer}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <Seo title="Frequently Asked Questions | VFS Groups" description="Answers about VFS Groups loans, applications, document security, tracking, services, and cashback eligibility." path="/faqs"/>
    <section className="page-hero faq-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'FAQs' }]}/><span className="eyebrow"><HelpCircle size={16}/> Frequently asked questions</span><h1>Straight answers about the process.</h1><p>Find clear answers about services, applications, documents, tracking, and support.</p></div></section>
    <section className="section"><div className="shell narrow-wide"><div className="filter-bar faq-filters"><label><Search/><span className="sr-only">Search FAQs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a question"/></label><div role="group" aria-label="FAQ category">{categories.map((item) => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>{faqs.isLoading && <p>Loading published answers…</p>}{faqs.isError && <div className="notice error">FAQs could not be loaded.</div>}<div className="faq-list">{filtered.map((item) => <details key={item._id}><summary><span>{item.category}</span>{item.question}</summary><p>{item.answer}</p></details>)}</div>{!faqs.isLoading && !filtered.length && <div className="empty-state">No published FAQ matches your search.</div>}</div></section>
  </>;
}
