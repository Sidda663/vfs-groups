import { useMutation } from '@tanstack/react-query';
import { Calculator, Download } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api, apiMessage } from '../services/api.js';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export function EmiCalculatorPage() {
  const [values, setValues] = useState({ amount: 2500000, annualRate: 8.5, tenureMonths: 240, loanType: 'home' });
  const calculation = useMutation({ mutationFn: async (input) => (await api.post('/tools/emi', input)).data.data });
  function change(event) { setValues((current) => ({ ...current, [event.target.name]: event.target.type === 'number' ? Number(event.target.value) : event.target.value })); }
  function submit(event) { event.preventDefault(); calculation.mutate(values); }
  function download() {
    if (!calculation.data) return;
    const rows = ['Month,Principal,Interest,Balance', ...calculation.data.schedule.map((row) => `${row.month},${row.principal},${row.interest},${row.balance}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = 'vfs-groups-illustrative-emi.csv'; link.click(); URL.revokeObjectURL(url);
  }
  return <>
    <Seo title="EMI Calculator | VFS Groups" description="Calculate an illustrative loan EMI and download a repayment schedule." path="/emi-calculator"/>
    <section className="page-hero calculator-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'EMI calculator' }]}/><span className="eyebrow">Planning tool</span><h1>Estimate your illustrative monthly EMI.</h1><p>Adjust the amount, annual interest rate and tenure to prepare an estimated repayment schedule. This is not an offer or approval.</p></div></section>
    <section className="section"><div className="shell calculator-grid">
      <form className="form-card" onSubmit={submit}><div className="form-title"><Calculator/><div><h2>Loan assumptions</h2><p>Use numbers you would like to explore.</p></div></div><label>Loan type<select name="loanType" value={values.loanType} onChange={change}><option value="home">Home / property</option><option value="personal">Personal</option><option value="business">Business</option><option value="property">Mortgage</option></select></label><label>Loan amount (₹)<input name="amount" type="number" min="1000" max="1000000000" inputMode="numeric" value={values.amount} onChange={change}/><small>{currency.format(values.amount || 0)}</small><input name="amount" aria-label="Loan amount slider" type="range" min="100000" max="10000000" step="50000" value={Math.min(values.amount, 10000000)} onChange={change}/></label><label>Illustrative annual rate (%)<input name="annualRate" type="number" min="0.1" max="50" step="0.1" value={values.annualRate} onChange={change}/></label><label>Tenure (months)<input name="tenureMonths" type="number" min="1" max="480" value={values.tenureMonths} onChange={change}/></label><button className="button button-gold" disabled={calculation.isPending}>{calculation.isPending ? 'Calculating…' : 'Calculate estimate'}</button>{calculation.isError && <p className="form-error" role="alert">{apiMessage(calculation.error)}</p>}</form>
      <div className="result-card">{!calculation.data ? <div className="empty-result"><Calculator/><h2>Your estimate will appear here</h2><p>Enter your assumptions and select calculate estimate.</p></div> : <><span>Estimated monthly EMI</span><strong>{currency.format(calculation.data.monthlyEmi)}</strong><div className="result-metrics"><div><span>Total interest</span><b>{currency.format(calculation.data.totalInterest)}</b></div><div><span>Total repayment</span><b>{currency.format(calculation.data.totalRepayment)}</b></div></div><button className="button button-outline" onClick={download}><Download size={17}/> Download schedule</button><p className="disclaimer">{calculation.data.disclaimer}</p></>}</div>
    </div></section>
  </>;
}
