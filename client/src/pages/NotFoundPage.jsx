import { Link } from 'react-router-dom';
export function NotFoundPage() { return <section className="page-hero not-found-page-hero"><div className="shell narrow"><span className="eyebrow">404</span><h1>That page has moved or does not exist.</h1><p>Return home or explore our published financial service guides.</p><Link className="button button-gold" to="/">Return home</Link></div></section>; }
