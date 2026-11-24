// lib/files.jsx — IndexedDB file store + upload/view helpers
import React from 'react';
import ReactDOM from 'react-dom/client';
import { nativeSave } from './data';

const SRM_FILES_DB = 'srm_files_v1';
function filesDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(SRM_FILES_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function fileTx(mode, fn) {
  const db = await filesDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('files', mode);
    const out = fn(tx.objectStore('files'));
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
const putFile = (id, blob) => fileTx('readwrite', st => st.put(blob, id));
const getFile = id => fileTx('readonly', st => st.get(id));
const delFile = id => fileTx('readwrite', st => st.delete(id));
async function allFiles() {
  const db = await filesDB();
  return new Promise((res, rej) => {
    const out = {}; const tx = db.transaction('files', 'readonly'); const req = tx.objectStore('files').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } };
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error);
  });
}

const FILE_ACCEPT_DOCS = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const FILE_ACCEPT_ANY = FILE_ACCEPT_DOCS + ',.xls,.xlsx,.jpg,.jpeg,.png';
const fmtSize = b => !b ? '0 KB' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const fileKind = name => { const e = (name || '').split('.').pop().toLowerCase(); return e === 'pdf' ? 'PDF' : ['doc', 'docx'].includes(e) ? 'Word' : ['xls', 'xlsx'].includes(e) ? 'Excel' : ['jpg', 'jpeg', 'png'].includes(e) ? 'Image' : e.toUpperCase(); };

function pickUpload(accept, maxMB = 40) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept;
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return resolve(null);
      if (f.size > maxMB * 1048576) { alert(`File is larger than ${maxMB} MB. Please compress it first.`); return resolve(null); }
      const id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      try { await putFile(id, f); resolve({ fileId: id, fileName: f.name, fileType: f.type, fileSize: f.size }); }
      catch (e) { alert('Could not store the file: ' + e.message); resolve(null); }
    };
    inp.click();
  });
}

async function openStoredFile(meta, download) {
  const blob = await getFile(meta.fileId);
  if (!blob) { alert('This file is not stored on this device. Restore a backup that includes files, or upload it again.'); return; }
  if (window.AndroidBridge) return nativeSave(blob, meta.fileName, true);
  const k = fileKind(meta.fileName);
  if (download || (k !== 'PDF' && k !== 'Image')) return saveBlobFile(blob, meta.fileName);
  showFileViewer(meta, blob);
}

function saveBlobFile(blob, name) {
  if (navigator.msSaveOrOpenBlob) return navigator.msSaveOrOpenBlob(blob, name);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name || 'file'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// In-app viewer — no pop-ups, so the browser never blocks it
let __fvRoot = null;
function showFileViewer(meta, blob) {
  let host = document.getElementById('__fileviewer');
  if (!host) { host = document.createElement('div'); host.id = '__fileviewer'; document.body.appendChild(host); __fvRoot = ReactDOM.createRoot(host); }
  __fvRoot.render(<FileViewer key={meta.fileId + Date.now()} meta={meta} blob={blob} onClose={() => __fvRoot.render(null)} />);
}

function FileViewer({ meta, blob, onClose }) {
  const k = fileKind(meta.fileName);
  const [url] = React.useState(() => URL.createObjectURL(blob));
  const [zoom, setZoom] = React.useState(1);
  React.useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; URL.revokeObjectURL(url); };
  }, []);
  const openTab = () => {
    const w = window.open('', '_blank');
    if (!w) return alert('Your browser blocked the new tab. The file is shown here — use Download to save it.');
    w.document.title = meta.fileName;
    w.document.body.style.margin = '0';
    w.document.body.innerHTML = k === 'PDF' ? `<embed src="${url}" type="application/pdf" style="width:100vw;height:100vh;border:0">` : `<img src="${url}" style="max-width:100%;display:block;margin:auto">`;
  };
  return (
    <div className="fv" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fv-bar">
        <span className={`fk fk-${k.toLowerCase()}`}>{k}</span>
        <div className="fv-name"><b>{meta.fileName}</b><span>{fmtSize(meta.fileSize || blob.size || 0)}</span></div>
        {k === 'Image' && <><button className="fv-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button><span className="fv-z">{Math.round(zoom * 100)}%</span><button className="fv-btn" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>+</button></>}
        <button className="fv-btn" onClick={() => window.print && (k === 'PDF' ? document.querySelector('.fv-frame')?.contentWindow?.print() : window.print())}>Print</button>
        <button className="fv-btn" onClick={openTab}>New tab ↗</button>
        <button className="fv-btn fv-pri" onClick={() => saveBlobFile(blob, meta.fileName)}>Download</button>
        <button className="fv-btn fv-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="fv-body">
        {k === 'PDF'
          ? <object className="fv-frame" data={url} type="application/pdf"><iframe className="fv-frame" src={url} title={meta.fileName}></iframe><div className="fv-fallback"><b>This browser can't show PDFs inside the page.</b><span>Tap Download to open it in your PDF reader.</span><button className="fv-btn fv-pri" onClick={() => saveBlobFile(blob, meta.fileName)}>Download PDF</button></div></object>
          : <div className="fv-img"><img src={url} alt={meta.fileName} style={{ transform: `scale(${zoom})` }} /></div>}
      </div>
    </div>
  );
}

function FileChip({ meta, onRemove }) {
  if (!meta || !meta.fileId) return null;
  const k = fileKind(meta.fileName);
  return (
    <div className="filechip">
      <span className={`fk fk-${k.toLowerCase()}`}>{k}</span>
      <div className="fc-txt"><b>{meta.fileName}</b><span>{fmtSize(meta.fileSize || 0)}</span></div>
      <button className="linkbtn" onClick={e => { e.stopPropagation(); openStoredFile(meta); }}>{k === 'PDF' || k === 'Image' ? 'Open' : 'Download'}</button>
      {k === 'PDF' && <button className="linkbtn" onClick={e => { e.stopPropagation(); openStoredFile(meta, true); }}>Save</button>}
      {onRemove && <button className="linkbtn danger" onClick={e => { e.stopPropagation(); onRemove(); }}>Remove</button>}
    </div>
  );
}

function PdfPreview({ meta, height = 520 }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    let u = null, live = true;
    if (meta && meta.fileId && fileKind(meta.fileName) === 'PDF') getFile(meta.fileId).then(b => { if (b && live) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [meta && meta.fileId]);
  if (!url || window.AndroidBridge) return null;
  return <iframe className="pdf-frame" src={url} style={{ height }} title={meta.fileName}></iframe>;
}

// backup helpers: embed files as data URLs
const blobToDataURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function exportFilesMap(s) {
  const ids = new Set();
  ['notices', 'plans', 'documents'].forEach(k => (s[k] || []).forEach(x => x.fileId && ids.add(x.fileId)));
  const out = {};
  for (const id of ids) { const b = await getFile(id); if (b) out[id] = { type: b.type, data: await blobToDataURL(b) }; }
  return out;
}
async function importFilesMap(map) {
  for (const [id, f] of Object.entries(map || {})) { const blob = await (await fetch(f.data)).blob(); await putFile(id, blob); }
}

export { SRM_FILES_DB, filesDB, fileTx, putFile, getFile, delFile, allFiles, FILE_ACCEPT_DOCS, FILE_ACCEPT_ANY, fmtSize, fileKind, pickUpload, openStoredFile, saveBlobFile, __fvRoot, showFileViewer, FileViewer, FileChip, PdfPreview, blobToDataURL, exportFilesMap, importFilesMap };
