import { Link } from 'react-router-dom';

export function Breadcrumbs({ items }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link>{items.map((item) => <span key={item.label}><i>/</i>{item.to ? <Link to={item.to}>{item.label}</Link> : <b aria-current="page">{item.label}</b>}</span>)}</nav>;
}
