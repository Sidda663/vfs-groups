import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, Eye, EyeOff, FileImage, FileVideo2, GripVertical, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { api, apiMessage } from '../../services/api.js';

export function AdminContentPage() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ['admin-content'], queryFn: async () => (await api.get('/content/admin/overview')).data.data });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-content'] }),
    queryClient.invalidateQueries({ queryKey: ['content', 'gallery'] }),
  ]);
  if (overview.isLoading) return <div className="shell route-loading">Loading gallery manager…</div>;
  if (overview.isError) return <div className="shell route-loading"><h1>Gallery manager unavailable</h1><p>{apiMessage(overview.error)}</p></div>;
  return <DashboardShell role="admin" title="Gallery manager">
    <section className="dashboard-welcome"><div><span className="eyebrow">Website gallery</span><h1>Upload and arrange pictures or videos.</h1><p>Choose media from your computer, control its visibility and arrange the public gallery order.</p></div><FileImage/></section>
    <GalleryEditor items={overview.data.gallery} onSaved={refresh}/>
  </DashboardShell>;
}

function GalleryEditor({ items, onSaved }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [ordered, setOrdered] = useState(items);
  const [dragging, setDragging] = useState('');
  const [selected, setSelected] = useState([]);
  const fileInput = useRef(null);
  useEffect(() => setOrdered(items), [items]);
  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const create = useMutation({ mutationFn: async () => { const body = new FormData(); body.append('media', file); return api.post('/content/admin/gallery', body); }, onSuccess: () => { setFile(null); if (fileInput.current) fileInput.current.value = ''; onSaved(); } });
  const remove = useMutation({ mutationFn: (id) => api.delete(`/content/admin/gallery/${id}`), onSuccess: onSaved });
  const removeSelected = useMutation({ mutationFn: (ids) => Promise.all(ids.map((id) => api.delete(`/content/admin/gallery/${id}`))), onSuccess: () => { setSelected([]); onSaved(); } });
  const visibility = useMutation({ mutationFn: ({ id, visible }) => api.patch(`/content/admin/gallery/${id}`, { websiteVisible: visible }), onSuccess: onSaved });
  const reorder = useMutation({ mutationFn: async (next) => (await api.patch('/content/admin/gallery/reorder', { ids: next.map((item) => item._id) })).data.data, onSuccess: (data) => { setOrdered(data); onSaved(); }, onError: () => setOrdered(items) });

  function selectFile(next) {
    create.reset(); setFileError('');
    if (!next) { setFile(null); return; }
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isImage = imageTypes.includes(next.type); const isVideo = videoTypes.includes(next.type);
    if (!isImage && !isVideo) { setFileError('Choose a JPG, PNG, WebP, MP4, WebM, or MOV file.'); setFile(null); return; }
    const max = isVideo ? 60 : 8;
    if (next.size > max * 1024 * 1024) { setFileError(`${isVideo ? 'Videos' : 'Images'} must be ${max} MB or smaller.`); setFile(null); return; }
    setFile(next);
  }
  function move(id, target) {
    if (reorder.isPending) return;
    const from = ordered.findIndex((item) => item._id === id); if (from < 0) return;
    const bounded = Math.max(0, Math.min(target, ordered.length - 1)); if (from === bounded) return;
    const next = [...ordered]; const [item] = next.splice(from, 1); next.splice(bounded, 0, item); setOrdered(next); reorder.mutate(next);
  }
  function confirmDelete(item) { if (window.confirm('Delete this media from the website gallery and storage? This cannot be undone.')) remove.mutate(item._id); }
  function toggleSelected(id) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function confirmDeleteSelected() { if (selected.length && window.confirm(`Delete ${selected.length} selected gallery items from the website and storage? This cannot be undone.`)) removeSelected.mutate(selected); }
  function clearFile() { setFile(null); setFileError(''); if (fileInput.current) fileInput.current.value = ''; }

  return <div className="gallery-admin-layout">
    <section className="dashboard-card dashboard-section">
      <div className="card-heading"><div><span className="eyebrow">Upload from your computer</span><h2>Select one picture or video</h2><p>JPG, PNG or WebP up to 8 MB. MP4, WebM or MOV up to 60 MB.</p></div><UploadCloud/></div>
      <form className="dashboard-form gallery-simple-upload" onSubmit={(event) => { event.preventDefault(); if (file && !fileError) create.mutate(); }}>
        <div className={`gallery-dropzone ${dropActive ? 'active' : ''}`} role="button" tabIndex="0" onClick={() => fileInput.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.current?.click(); } }} onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDropActive(false)} onDrop={(event) => { event.preventDefault(); setDropActive(false); selectFile(event.dataTransfer.files?.[0]); }}>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => selectFile(event.target.files?.[0])}/><UploadCloud/><strong>Drag media here or click to select from your PC</strong><span>No title or other details required</span>
        </div>
        {fileError && <p className="form-error">{fileError}</p>}
        {previewUrl && <div className="gallery-upload-preview">{file?.type.startsWith('video/') ? <video src={previewUrl} controls preload="metadata"/> : <img src={previewUrl} alt="Selected gallery preview"/>}<button type="button" onClick={clearFile} aria-label="Remove selected file"><X/></button></div>}
        {create.isError && <p className="form-error">{apiMessage(create.error)}</p>}
        {create.isSuccess && <p className="form-success">Uploaded successfully. The media is visible on the website Gallery page.</p>}
        <button className="button button-gold" disabled={!file || Boolean(fileError) || create.isPending}><UploadCloud size={17}/>{create.isPending ? 'Uploading…' : 'Upload to website gallery'}</button>
        <small className="gallery-upload-note">Uploading confirms that VFS Groups owns the media or has permission to publish it.</small>
      </form>
    </section>
    <section className="dashboard-card dashboard-section gallery-order-section">
      <div className="card-heading"><div><span className="eyebrow">Gallery order</span><h2>Arrange and control public media</h2><p>Drag items to change the order. Hide any media that should not appear publicly.</p></div><GripVertical/></div>
      {selected.length > 0 && <div className="selection-toolbar"><strong>{selected.length} gallery items selected</strong><button type="button" className="button danger-button" onClick={confirmDeleteSelected} disabled={removeSelected.isPending}><Trash2 size={16}/>{removeSelected.isPending ? 'Deleting…' : 'Delete selected'}</button></div>}{reorder.isError && <p className="form-error">{apiMessage(reorder.error)}</p>}{(remove.isError || removeSelected.isError) && <p className="form-error">{apiMessage(remove.error || removeSelected.error)}</p>}{visibility.isError && <p className="form-error">{apiMessage(visibility.error)}</p>}{reorder.isPending && <p className="form-success">Saving gallery order…</p>}
      <div className="gallery-order-list">{ordered.map((item, index) => {
        const visible = item.websiteVisible === true;
        return <article className={`gallery-order-item gallery-order-simple ${dragging === item._id ? 'dragging' : ''}`} draggable={!reorder.isPending} key={item._id} onDragStart={(event) => { setDragging(item._id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item._id); }} onDragEnd={() => setDragging('')} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || dragging; setDragging(''); move(id, index); }}>
          <label className="gallery-select"><input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggleSelected(item._id)} aria-label={`Select gallery item ${index + 1}`}/></label><div className="gallery-drag-handle" title="Drag to reorder"><GripVertical/><span>{index + 1}</span></div><GalleryMedia item={item}/>
          <div className="gallery-order-copy"><strong>{item.media?.resourceType === 'video' ? 'Video' : 'Picture'}</strong><span className={visible ? 'visibility-live' : 'visibility-hidden'}>{visible ? 'Visible on website' : 'Hidden from website'}</span></div>
          <div className="gallery-order-actions"><button type="button" onClick={() => move(item._id, 0)} disabled={index === 0 || reorder.isPending} aria-label="Move media first" title="Move first"><ArrowUpToLine/></button><button type="button" onClick={() => move(item._id, index - 1)} disabled={index === 0 || reorder.isPending} aria-label="Move media up" title="Move up"><ChevronUp/></button><button type="button" onClick={() => move(item._id, index + 1)} disabled={index === ordered.length - 1 || reorder.isPending} aria-label="Move media down" title="Move down"><ChevronDown/></button><button type="button" onClick={() => move(item._id, ordered.length - 1)} disabled={index === ordered.length - 1 || reorder.isPending} aria-label="Move media last" title="Move last"><ArrowDownToLine/></button><button type="button" onClick={() => visibility.mutate({ id: item._id, visible: !visible })} disabled={visibility.isPending} aria-label={visible ? 'Hide media from website' : 'Show media on website'} title={visible ? 'Hide from website' : 'Show on website'}>{visible ? <EyeOff/> : <Eye/>}</button><button className="danger" type="button" onClick={() => confirmDelete(item)} disabled={remove.isPending} aria-label="Delete media" title="Delete"><Trash2/></button></div>
        </article>;
      })}{!ordered.length && <div className="empty-state"><FileImage/><h3>No gallery media yet</h3><p>Select a picture or video above and upload it.</p></div>}</div>
    </section>
  </div>;
}

function GalleryMedia({ item }) {
  if (!item.media?.url) return <div className="gallery-admin-media unavailable">{item.media?.resourceType === 'video' ? <FileVideo2/> : <FileImage/>}</div>;
  return item.media.resourceType === 'video' ? <video className="gallery-admin-media" src={item.media.url} muted preload="metadata"/> : <img className="gallery-admin-media" src={item.media.url} alt="" loading="lazy"/>;
}
