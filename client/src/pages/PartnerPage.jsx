import { ArrowRight, BadgeCheck, BarChart3, ClipboardCheck, Link2, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';

const features = [
  [Link2, 'Permanent referral code', 'Every connector receives a unique code after the first successful sign-in.'],
  [Users, 'Approved customer visibility', 'See customers only after their referral request is approved by an administrator.'],
  [ClipboardCheck, 'Structured submissions', 'Submit customer service requirements through clear, validated forms.'],
  [BarChart3, 'Live performance view', 'See your approved referral count and authorized activity dynamically.'],
];

export function PartnerPage() {
  return <>
    <Seo title="Partner With VFS Groups" description="Join the VFS Groups connector network with reviewed referral attribution and live portal visibility." path="/partner"/>
    <section className="page-hero partner-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Partner with us' }]}/><span className="eyebrow">VFS connector network</span><h1>Build opportunities through a verified partner workflow.</h1><p>The connector portal brings together permanent referral attribution, approved customers, service requests, and operational visibility.</p><div className="button-row"><Link className="button button-gold" to="/contractor/sign-up">Create connector account <ArrowRight size={18}/></Link><Link className="button button-outline" to="/contractor/sign-in">Connector sign in</Link></div></div></section>
    <section className="section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Partner tools</span><h2>Built around traceable activity.</h2></div></div><div className="benefit-grid">{features.map(([Icon, title, copy]) => <article key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="section finder-section"><div className="shell finder-grid"><div><span className="eyebrow">Connector journey</span><h2>Start transparently and grow responsibly.</h2><p>Registration does not promise income, commissions, approvals, or customer outcomes. The connector account is created only after its registration payment is verified.</p></div><ol className="partner-steps"><li><BadgeCheck/><span><b>1. Register</b>Submit accurate personal and business details.</span></li><li><ShieldCheck/><span><b>2. Sign in</b>Your permanent unique connector code is generated.</span></li><li><Link2/><span><b>3. Share</b>A customer may optionally submit your code during registration.</span></li><li><BarChart3/><span><b>4. Track approvals</b>Only admin-approved customers increase your referral total.</span></li></ol></div></section>
    <section className="final-cta"><div className="shell"><div><span className="eyebrow">Partner with VFS Groups</span><h2>Ready to create a connector account?</h2></div><Link className="button button-gold" to="/contractor/sign-up">Start registration</Link></div></section>
  </>;
}
