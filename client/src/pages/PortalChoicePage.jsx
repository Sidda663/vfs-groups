import { BriefcaseBusiness, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { PortalLoginForm } from './PortalLoginPage.jsx';

const portals=[{id:'customer',label:'Customer',icon:UserRound},{id:'contractor',label:'Connector',icon:BriefcaseBusiness}];

export function PortalChoicePage(){const [portal,setPortal]=useState('customer');return <section className="auth-section unified-sign-in"><div className="auth-aside"><ShieldCheck/><span className="eyebrow">Secure portal access</span><h1>Sign in to your VFS workspace.</h1><p>Choose your customer or connector account, then enter your registered email or mobile and password.</p></div><div className="unified-sign-in-panel"><div className="portal-switcher" role="tablist" aria-label="Choose account type">{portals.map(({id,label,icon:Icon})=><button type="button" role="tab" aria-selected={portal===id} className={portal===id?'active':''} onClick={()=>setPortal(id)} key={id}><Icon/><span>{label}</span></button>)}</div><PortalLoginForm key={portal} portal={portal} showChooserLink={false}/></div></section>}
