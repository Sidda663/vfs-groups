import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link, useRouteError } from 'react-router-dom';

export function RouteErrorPage() {
  useRouteError();
  return <main className="route-error" role="alert">
    <img src="/brand/vfs-groups-logo.png" alt="VFS Groups"/>
    <AlertTriangle/>
    <h1>This page could not open.</h1>
    <p>Please refresh the page. If the issue continues, return home and try again.</p>
    <div className="button-row"><button className="button button-gold" type="button" onClick={() => window.location.reload()}><RefreshCw size={17}/> Refresh page</button><Link className="button button-outline" to="/">Return home</Link></div>
  </main>;
}
