import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { geminiProvider } from './gemini.js';
import { storageProvider } from './storage.js';

const mockEmail = {
  async send(payload) {
    console.info(JSON.stringify({ level: 'info', provider: 'mock-email', event: 'delivery_accepted', template: payload.template, recipient: payload.recipient ? 'redacted' : undefined }));
    return { provider: 'mock-email', externalId: `mock_${randomUUID()}`, accepted: true, delivered: false };
  },
};

const mockAi = {
  async respond({ message, knowledge = '' }) {
    return { provider: 'mock-ai', message: buildFallbackResponse({ message, knowledge }) };
  },
};

export function buildFallbackResponse({ message, knowledge = '' }) {
  const input = normalize(message); const services = parseKnowledge(knowledge);
  if (/^(hi+|hello+|hey+|namaste|good\s+(morning|afternoon|evening))(\s+(bro|sir|madam))?[!.\s]*$/.test(input)) return 'Hello! I can help you explore VFS Groups loans, insurance, investments, application steps, in-person document guidance, and tracking. What would you like help with?';
  if (hasAny(input, ['cibil', 'credit score', 'itr', 'income tax return'])) return 'VFS Groups accepts assistance requests from salaried and self-employed customers with or without ITRs, including customers with a low or limited CIBIL score. The team reviews the information available, while final eligibility and terms are decided by the relevant lender.';
  if (hasAny(input, ['track', 'tracking', 'application status', 'my status'])) return 'Open “Track application,” enter your VFS application ID and registered mobile, then complete the verification step. After verification you can see the live status timeline.';
  if (hasAny(input, ['document', 'documents', 'upload', 'paperwork'])) return 'Indian Customers receive document guidance from the VFS team. NRI Customers can securely upload requested PDF, JPG, or PNG documents inside their signed-in Customer dashboard after submitting an application.';
  if (hasAny(input, ['apply', 'application form', 'start application', 'submit application'])) return 'Choose a published service and open the application form. You can save a secure draft, finish the five steps, submit it, and use the issued application ID for tracking.';
  if (hasAny(input, ['contact', 'call', 'phone', 'whatsapp', 'talk to', 'speak to'])) return 'Use the Contact page for the currently published VFS Groups phone and WhatsApp options, or submit the secure enquiry form. For application progress, use Track application instead.';
  if (hasAny(input, ['emi', 'monthly payment', 'monthly instalment', 'monthly installment'])) return 'Use the EMI Calculator to estimate a monthly instalment from the amount, indicative annual rate, and tenure. It is an estimate only; the relevant lender decides final pricing, fees, tenure, and approval.';
  if (hasAny(input, ['cashback', 'reward'])) return 'Cashback applies only when an eligible offer and its terms are officially published by VFS Groups. It is not automatic for every service; check the current website disclosure or contact the team for the applicable terms.';

  const ranked = rankServices(input, services);
  const comparisonMatches = ranked.filter((item) => item.score >= 8);
  if (hasAny(input, ['compare', 'comparison', 'difference', 'different', ' versus ', ' vs ', ' or ']) && comparisonMatches.length >= 2) return comparisonAnswer(comparisonMatches.slice(0, 3));
  if (ranked[0]?.score > 0) return serviceAnswer(ranked[0].service);
  if (hasAny(input, ['insurance', 'policy', 'cover'])) return categoryAnswer('insurance', services);
  if (hasAny(input, ['investment', 'invest', 'sip', 'fixed deposit', 'wealth', 'lump sum'])) return categoryAnswer('investment', services);
  if (hasAny(input, ['loan', 'finance', 'funding', 'money'])) return categoryAnswer('loan', services);
  return 'I can answer questions using VFS Groups’ published service information, including loans, insurance, investments, applications, in-person document guidance, tracking, and referrals. Please mention the service or goal—for example, “compare home loan and loan against property” or “what should I bring for a business loan meeting?”';
}

function parseKnowledge(knowledge) {
  return knowledge.split(/\n\s*\n/).map((block) => {
    const [headline = '', ...lines] = block.split('\n'); const separator = headline.indexOf(':');
    const name = separator >= 0 ? headline.slice(0, separator).trim() : headline.trim(); const description = separator >= 0 ? headline.slice(separator + 1).trim() : '';
    const fields = Object.fromEntries(lines.map((line) => { const index = line.indexOf(':'); return index < 0 ? null : [normalize(line.slice(0, index)), line.slice(index + 1).trim()]; }).filter(Boolean));
    return { name, description, eligibility: fields.eligibility || '', documents: fields.documents || '', process: fields.process || '', search: normalize(`${name} ${description} ${fields.eligibility || ''} ${fields.documents || ''}`) };
  }).filter((service) => service.name);
}

function rankServices(input, services) {
  const queryTokens = tokens(input); return services.map((service) => {
    const name = normalize(service.name); let score = input.includes(name) ? 20 : 0;
    for (const token of queryTokens) { if (name.includes(token)) score += 5; else if (service.search.includes(token)) score += 1; }
    if (input.includes('property') && name.includes('property')) score += 8;
    if (input.includes('home') && name.includes('home')) score += 8;
    return { service, score };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);
}

function comparisonAnswer(items) {
  const summaries = items.map(({ service }) => `• ${service.name}: ${service.description || service.eligibility || 'See the published service details.'}`);
  return `Here is a quick comparison based on VFS Groups’ published information:\n${summaries.join('\n')}\nThe suitable option depends on your purpose and available profile. Final eligibility, pricing, tenure, approval, and outcomes are decided by the relevant provider.`;
}

function serviceAnswer(service) {
  const details = [service.description, service.eligibility ? `General guidance: ${service.eligibility}.` : '', service.documents ? `Common documents: ${service.documents}.` : ''].filter(Boolean);
  return `${service.name}: ${details.join(' ')} Final eligibility, pricing, cover, risk, returns, and outcomes depend on the relevant provider.`;
}

function categoryAnswer(category, services) {
  const keywords = category === 'insurance' ? ['insurance'] : category === 'investment' ? ['investment', 'sip', 'deposit', 'wealth'] : ['loan', 'finance', 'capital'];
  const matches = services.filter((service) => keywords.some((keyword) => service.search.includes(keyword))).slice(0, 8).map((service) => service.name);
  const names = matches.length ? matches.join(', ') : category === 'insurance' ? 'health, life, motor, general, warehouse, and commercial insurance' : category === 'investment' ? 'corporate fixed deposits, SIP, and lump-sum investments' : 'personal, business, home, property, vehicle, education, share-backed, and working-capital loans';
  return `VFS Groups’ published ${category} services include ${names}. Tell me your purpose or name two options to compare. Product eligibility, pricing, cover, risk, returns, and outcomes depend on the relevant provider.`;
}

function tokens(value) { const ignored = new Set(['about', 'after', 'also', 'does', 'from', 'have', 'help', 'need', 'please', 'tell', 'that', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your']); return [...new Set(normalize(value).split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !ignored.has(word)))]; }
function normalize(value = '') {
  const corrections = [
    [/\b(lon|laon|loen)\b/g, 'loan'], [/\b(busines|bussiness)\b/g, 'business'], [/\b(persnal|personel|persnol)\b/g, 'personal'],
    [/\b(insurence|insurnce)\b/g, 'insurance'], [/\b(doc|docs|documnts)\b/g, 'documents'], [/\b(aply|appaly)\b/g, 'apply'],
    [/\b(staus|stauts)\b/g, 'status'], [/\b(trak|trck)\b/g, 'track'], [/\b(watsapp|whats\s+app)\b/g, 'whatsapp'],
    [/\b(abt)\b/g, 'about'], [/\b(hw)\b/g, 'how'], [/\b(wht)\b/g, 'what'], [/\b(pls|plz)\b/g, 'please'],
  ];
  return corrections.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s.!?]/g, ' ')).replace(/\s+/g, ' ').trim();
}
function hasAny(input, phrases) { return phrases.some((phrase) => input.includes(phrase)); }

const resilientGemini = {
  async respond(input) {
    try { return await geminiProvider.respond(input); }
    catch (error) {
      console.warn(JSON.stringify({ level: 'warn', provider: 'gemini', event: 'fallback_used', message: error.message }));
      const fallback = await mockAi.respond(input);
      return { ...fallback, provider: 'mock-ai-fallback' };
    }
  },
};

export const providers = {
  storage: storageProvider,
  email: mockEmail,
  ai: env.NODE_ENV !== 'test' && env.AI_PROVIDER === 'gemini' ? resilientGemini : mockAi,
};
