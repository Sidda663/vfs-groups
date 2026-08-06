import { Building2, CheckCircle2, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';

const missionPoints = [
  'Provide fast, reliable, and hassle-free financial solutions',
  'Deliver loan, insurance, investment, and wealth-management services',
  'Build long-term relationships through trust and transparency',
  'Empower customers through expert guidance and digital services',
  'Build a strong service network across Karnataka',
];

const values = ['Integrity', 'Customer First', 'Transparency', 'Innovation', 'Speed', 'Professionalism', 'Trust', 'Compliance', 'Excellence'];

export function AboutPage() {
  return <>
    <Seo title="About VFS Groups" description="VFS Groups vision, mission, values, and commitment to transparent financial-service assistance." path="/about"/>
    <section className="page-hero about-hero"><div className="shell about-hero-grid"><div><span className="eyebrow"><ShieldCheck size={16}/> About VFS Group</span><h1>Your trusted partner for financial growth.</h1><p>VFS Group brings loans, insurance, investments, and wealth guidance together in one customer-focused financial service experience.</p><div className="button-row"><Link className="button button-gold" to="/services">Explore our services</Link><Link className="button button-outline" to="/contact">Talk to our team</Link></div></div><aside className="about-brand-panel"><span>One group for</span><strong>Loans</strong><strong>Insurance</strong><strong>Investments</strong><p>Clear guidance. Responsible support. Practical next steps.</p></aside></div></section>

    <section className="section"><div className="shell purpose-grid">
      <article className="purpose-card vision-card"><div className="purpose-icon"><TrendingUp/></div><span className="eyebrow">Our vision</span><h2>Financial progress built on trust.</h2><p>To become one of India&apos;s most trusted and customer-focused financial service organizations by providing innovative, transparent, and technology-driven financial solutions that help individuals, families, entrepreneurs, and businesses achieve their financial goals.</p></article>
      <article className="purpose-card"><div className="purpose-icon"><Users/></div><span className="eyebrow">Our mission</span><h2>Make financial services easier to access.</h2><ul>{missionPoints.map((point)=><li key={point}><CheckCircle2/>{point}</li>)}</ul></article>
    </div></section>

    <section className="section values-section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Our core values</span><h2>The principles behind every customer relationship.</h2></div><ShieldCheck className="section-mark"/></div><div className="value-grid">{values.map((value,index)=><article key={value}><span>{String(index+1).padStart(2,'0')}</span><strong>{value}</strong></article>)}</div></div></section>

    <section className="section registered-business-section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Registered business</span><h2>Established experience with a Karnataka service network.</h2></div><Building2 className="section-mark"/></div><div className="registered-business-grid"><article><ShieldCheck/><span>Registration</span><h3>VFS GROUP</h3><dl><div><dt>GSTIN</dt><dd>29ABBFV2204K1Z5</dd></div><div><dt>Constitution</dt><dd>Partnership</dd></div><div><dt>Registration type</dt><dd>Regular</dd></div><div><dt>Valid from</dt><dd>23 December 2025</dd></div></dl></article><article><TrendingUp/><span>Experience &amp; reach</span><h3>23+ years in banking and financial products</h3><ul><li><CheckCircle2/>More than 2,000 customer relationships</li><li><CheckCircle2/>Service reach across Karnataka cities</li><li><CheckCircle2/>Financial products across banks and NBFCs</li></ul><p><strong>Managing partners</strong><br/>Naidu Raghapathi Manjunath<br/>Sindhigatta Janardhan Nirmala</p></article><article><MapPin/><span>Registered office</span><h3>VFS GROUP, 3rd Floor</h3><address>No. 881/A, Yashodhara Complex<br/>Dr. M. C. Modi Road, Shankarmutt Main Road<br/>Basaveshwara Nagar, Bengaluru Urban<br/>Karnataka 560079</address><a className="inline-link" href="https://www.google.com/maps?q=12.998319625854492,77.54251098632812&z=17&hl=en" target="_blank" rel="noreferrer">Open exact location in Google Maps</a></article></div><p className="disclaimer">GST registration certificate issued on 6 April 2026 under the Karnataka Goods and Services Tax Act, 2017.</p></div></section>

    <section className="final-cta"><div className="shell"><div><span className="eyebrow">Your financial growth, our commitment</span><h2>One stop for loans, insurance, and investments.</h2></div><div className="button-row"><Link className="button button-gold" to="/services">View services</Link><Link className="button button-light" to="/contact">Request a callback</Link></div></div></section>
  </>;
}
