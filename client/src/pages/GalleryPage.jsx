import { useQuery } from '@tanstack/react-query';
import { Camera, Film, Image as ImageIcon } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api } from '../services/api.js';

export function GalleryPage() {
  const gallery = useQuery({ queryKey: ['content', 'gallery'], queryFn: async () => (await api.get('/content/gallery')).data.data });
  const items = gallery.data || [];
  return <><Seo title="Gallery | VFS Groups" description="Pictures and videos from VFS Groups." path="/gallery"/><section className="page-hero gallery-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Gallery' }]}/><span className="eyebrow"><Camera size={16}/> Company gallery</span><h1>People, progress and moments from VFS Groups.</h1><p>Verified pictures and videos shared by our team.</p></div></section><section className="section"><div className="shell">{gallery.isLoading && <div className="gallery-grid">{Array.from({ length: 6 }, (_, index) => <div className="gallery-card gallery-media-card skeleton" key={index}/>)}</div>}{gallery.isError && <div className="notice error">The gallery is temporarily unavailable. Please try again later.</div>}{!gallery.isLoading && !items.length && <div className="empty-feature"><ImageIcon/><h2>Company gallery coming soon</h2><p>Verified VFS Groups pictures and videos will appear here as they are published.</p></div>}<div className="gallery-grid">{items.map((item) => <figure className="gallery-card gallery-media-card" key={item._id}><PublicGalleryMedia item={item}/></figure>)}</div></div></section></>;
}

function PublicGalleryMedia({ item }) {
  if (!item.media?.url) return <div className="media-unavailable">{item.media?.resourceType === 'video' ? <Film/> : <ImageIcon/>}<span>Preview unavailable</span></div>;
  if (item.media.resourceType === 'video') return <video src={item.media.url} controls playsInline preload="metadata" aria-label={item.altText || item.title}/>;
  return <img src={item.media.url} alt={item.altText} loading="lazy"/>;
}
