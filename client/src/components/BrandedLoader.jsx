export function BrandedLoader({ label = 'Preparing your page' }) {
  return <div className="branded-loader" role="status" aria-live="polite">
    <img src="/brand/vfs-groups-logo.png" alt=""/>
    <span className="branded-loader-line" aria-hidden="true"><i/></span>
    <strong>{label}</strong>
  </div>;
}
