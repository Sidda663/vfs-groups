import { useEffect } from 'react';

const siteUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const defaultImage = `${siteUrl}/brand/vfs-groups-logo.png`;

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attribute).forEach(([key, entry]) => element.setAttribute(key, entry));
  element.setAttribute('content', value);
}

export function Seo({ title, description, path = '/', image = defaultImage, structuredData }) {
  useEffect(() => {
    const canonicalUrl = `${siteUrl}${path}`;
    document.title = title;
    setMeta('meta[name="description"]', { name: 'description' }, description);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    setMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    setMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    const oldScript = document.getElementById('vfs-structured-data'); oldScript?.remove();
    if (structuredData) { const script = document.createElement('script'); script.id = 'vfs-structured-data'; script.type = 'application/ld+json'; script.text = JSON.stringify(structuredData); document.head.appendChild(script); }
    return () => document.getElementById('vfs-structured-data')?.remove();
  }, [description, image, path, structuredData, title]);
  return null;
}
