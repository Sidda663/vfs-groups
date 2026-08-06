import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';

export function SimpleContentPage({ eyebrow, title, copy, path = '/eligibility' }) {
  return <section className="page-hero eligibility-page-hero"><Seo title={`${title} | VFS Groups`} description={copy} path={path}/><div className="shell narrow"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><div className="button-row"><Link className="button button-gold" to="/contact">Talk to our team</Link><Link className="button button-outline" to="/services">Explore services</Link></div></div></section>;
}
