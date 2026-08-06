import { FilePenLine, Headphones, MessageCircle, Phone, Send, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createWhatsAppUrl } from '../config/contact.js';
import { api, apiMessage } from '../services/api.js';

const welcome = { role: 'assistant', content: 'Hello. What financial goal can we help with? Ask about services, applications, tracking, or what to bring for an in-person meeting.' };

export function ChatWidget({ phone = '919008503115', whatsapp = '919008156084' }) {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState([welcome]); const [input, setInput] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); const message = input.trim(); if (!message || sending) return;
    const next = [...messages, { role: 'user', content: message }]; setMessages(next); setInput(''); setSending(true); setError('');
    try { const result = await api.post('/chat/messages', { message, history: messages.slice(-10) }); setMessages((current) => [...current, { role: 'assistant', content: result.data.data.message }]); }
    catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSending(false); }
  }
  return <div className="chat-widget">
    {open && <section className="chat-panel" aria-label="VFS Groups help"><header><div><Headphones/><span><strong>VFS Help</strong><small>Service guidance</small></span></div><button type="button" onClick={() => setOpen(false)} aria-label="Close help"><X/></button></header><div className="chat-messages" aria-live="polite">{messages.map((message,index)=><div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}{sending&&<div className="chat-message assistant">Checking that for you…</div>}{error&&<p className="form-error" role="alert">{error}</p>}</div><form onSubmit={submit}><label className="sr-only" htmlFor="chat-input">Ask VFS Groups</label><input id="chat-input" value={input} onChange={(event)=>setInput(event.target.value)} maxLength="1000" placeholder="How can we help?"/><button type="submit" disabled={sending||!input.trim()} aria-label="Send message"><Send/></button></form><p>Eligibility and approval always depend on the relevant provider.</p></section>}
    <button className="chat-fab" type="button" onClick={() => setOpen((value)=>!value)} aria-expanded={open} aria-label="Open VFS Groups help"><Headphones/></button>
    <nav className="mobile-action-bar" aria-label="Quick contact actions"><button type="button" onClick={() => setOpen((value)=>!value)} aria-expanded={open}><Headphones/><span>Help</span></button><a href={`tel:+${phone.replace(/\D/g, '')}`}><Phone/><span>Call</span></a><a href={createWhatsAppUrl('Hello VFS Groups, I need financial service assistance.', whatsapp)} target="_blank" rel="noreferrer"><MessageCircle/><span>WhatsApp</span></a><Link to="/apply"><FilePenLine/><span>Apply</span></Link></nav>
  </div>;
}
