// screens/notices-plans.jsx — Notices & circulars, Proposed building plans
import React from 'react';
import { Btn, Field, Ico, PageHead, Seg } from '../components/ui';
import { fmtDate } from '../lib/data';
import { FILE_ACCEPT_DOCS, FileChip, PdfPreview, delFile, fileKind, openStoredFile, pickUpload } from '../lib/files';

const NOTICE_CATS = ['Circular', 'Meeting notice', 'Announcement', 'Urgent'];

function ItemEditor({ title, item, setItem, onSave, onDelete, fields, accept, uploadLabel }) {
  const upload = async () => { const meta = await pickUpload(accept); if (meta) { if (item.fileId) delFile(item.fileId).catch(() => {}); setItem({ ...item, ...meta }); } };
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2><Btn small icon="x" onClick={() => setItem(null)}>Close</Btn></div>
      {fields}
      <div className="upload-zone">
        {item.fileId ? <FileChip meta={item} onRemove={() => { delFile(item.fileId).catch(() => {}); setItem({ ...item, fileId: null, fileName: null, fileSize: null, fileType: null }); }} /> : <><Ico n="upload" s={26} c="var(--primary)" /><b>{uploadLabel}</b><span>PDF or Word (.doc, .docx) · up to 40 MB</span></>}
        <Btn icon="upload" onClick={upload}>{item.fileId ? 'Replace file' : 'Choose file'}</Btn>
      </div>
      <div className="row-gap" style={{ justifyContent: 'flex-start' }}>
        <Btn kind="primary" icon="check" disabled={!item.title} onClick={onSave}>Save</Btn>
        {item.id && <Btn icon="trash" onClick={onDelete}>Delete</Btn>}
      </div>
    </div>
  );
}

function Notices({ s, a }) {
  const [edit, setEdit] = React.useState(null);
  const [f, setF] = React.useState('All');
  const list = [...(s.notices || [])].filter(n => f === 'All' || n.category === f).sort((x, y) => (y.pinned - x.pinned) || String(y.date).localeCompare(String(x.date)));
  const share = n => { const text = `*${s.society.name}*\n*${n.title}*\n${fmtDate(n.date)} · ${n.category}\n\n${n.body || ''}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); };
  return (
    <div className="page">
      <PageHead title="Notices & circulars" sub="Post circulars, meeting notices and announcements. Attach the signed PDF or Word copy.">
        <Btn kind="primary" icon="plus" onClick={() => setEdit({ title: '', category: 'Circular', date: new Date().toISOString().slice(0, 10), body: '', pinned: false })}>New notice</Btn>
      </PageHead>
      {edit && <ItemEditor title={edit.id ? 'Edit notice' : 'New notice'} item={edit} setItem={setEdit} accept={FILE_ACCEPT_DOCS} uploadLabel="Attach the circular or notice"
        onSave={() => { a.saveItem('notices', edit, 'Notice'); setEdit(null); }} onDelete={() => { if (confirm('Delete this notice?')) { a.deleteItem('notices', edit.id, 'Notice'); setEdit(null); } }}
        fields={<>
          <div className="form-grid">
            <Field label="Title" value={edit.title} onChange={v => setEdit({ ...edit, title: v })} placeholder="e.g. Notice of SGBM" />
            <Field label="Date" type="date" value={edit.date} onChange={v => setEdit({ ...edit, date: v })} />
          </div>
          <Field label="Type"><Seg value={edit.category} onChange={v => setEdit({ ...edit, category: v })} options={NOTICE_CATS.map(c => [c, c])} /></Field>
          <label className="field"><span className="field-label">Message</span><textarea className="ta" rows="5" value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} placeholder="Text members will see"></textarea></label>
          <label className="check-row"><input type="checkbox" checked={!!edit.pinned} onChange={e => setEdit({ ...edit, pinned: e.target.checked })} /> Pin to top of the board</label>
        </>} />}
      <div className="toolbar"><Seg value={f} onChange={setF} options={['All', ...NOTICE_CATS].map(c => [c, c])} /></div>
      {list.length === 0 ? <div className="empty"><Ico n="bell" s={40} c="var(--primary)" /><h3>No notices yet</h3><p>Post the first circular so members always have the latest information.</p></div> : (
        <div className="stack">{list.map(n => (
          <article key={n.id} className={`panel notice ${n.pinned ? 'pinned' : ''} nc-${n.category.split(' ')[0].toLowerCase()}`}>
            <div className="notice-head">
              <div><div className="notice-tags"><span className="badge b-pending">{n.category}</span>{n.pinned && <span className="badge b-pin">Pinned</span>}<span className="muted">{fmtDate(n.date)}</span></div><h2>{n.title}</h2></div>
              <div className="row-gap" style={{ margin: 0 }}><Btn small icon="share" onClick={() => share(n)}>WhatsApp</Btn><Btn small onClick={() => setEdit({ ...n })}>Edit</Btn></div>
            </div>
            {n.body && <p className="notice-body">{n.body}</p>}
            <FileChip meta={n} />
          </article>
        ))}</div>
      )}
    </div>
  );
}

const PLAN_TYPES = ['Site / layout plan', 'Floor plan', 'Typical flat plan', 'Elevation & section', 'Amenities plan', 'Parking plan', 'Approved plan (IOD/CC)', 'Other'];

function Plans({ s, a }) {
  const [edit, setEdit] = React.useState(null);
  const [view, setView] = React.useState(null);
  const plans = [...(s.plans || [])].sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const groups = PLAN_TYPES.map(t => [t, plans.filter(p => p.type === t)]).filter(([, l]) => l.length);
  return (
    <div className="page">
      <PageHead title="Proposed building plans" sub="Upload architect drawings and proposal documents in PDF or Word. PDFs can be viewed right here.">
        <Btn kind="primary" icon="upload" onClick={() => setEdit({ title: '', type: PLAN_TYPES[0], version: 'R0', date: new Date().toISOString().slice(0, 10), architect: '', note: '', status: 'Proposed' })}>Upload plan</Btn>
      </PageHead>
      {edit && <ItemEditor title={edit.id ? 'Edit plan' : 'Upload a plan'} item={edit} setItem={setEdit} accept={FILE_ACCEPT_DOCS} uploadLabel="Upload the drawing or proposal"
        onSave={() => { a.saveItem('plans', edit, 'Plan'); setEdit(null); }} onDelete={() => { if (confirm('Delete this plan and its file?')) { a.deleteItem('plans', edit.id, 'Plan'); setEdit(null); setView(null); } }}
        fields={<>
          <div className="form-grid">
            <Field label="Title" value={edit.title} onChange={v => setEdit({ ...edit, title: v })} placeholder="e.g. Wing A typical floor" />
            <Field label="Plan type"><select className="sel" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}>{PLAN_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Revision" value={edit.version} onChange={v => setEdit({ ...edit, version: v })} placeholder="R0, R1…" />
            <Field label="Date" type="date" value={edit.date} onChange={v => setEdit({ ...edit, date: v })} />
            <Field label="Architect / prepared by" value={edit.architect} onChange={v => setEdit({ ...edit, architect: v })} />
            <Field label="Status"><Seg value={edit.status} onChange={v => setEdit({ ...edit, status: v })} options={[['Proposed', 'Proposed'], ['Under review', 'Review'], ['Approved', 'Approved']]} /></Field>
          </div>
          <Field label="Notes for members" value={edit.note} onChange={v => setEdit({ ...edit, note: v })} placeholder="e.g. Shows 2 BHK of 650 sq.ft on floors 2–14" />
        </>} />}
      {view && (
        <div className="panel">
          <div className="panel-head"><div><span className="eyebrow">{view.type} · {view.version}</span><h2>{view.title}</h2></div><Btn small icon="x" onClick={() => setView(null)}>Close viewer</Btn></div>
          {fileKind(view.fileName) === 'PDF' ? <PdfPreview meta={view} height={620} /> : <p className="muted">Word files can't be previewed in the browser. Download to open in Microsoft Word.</p>}
          <FileChip meta={view} />
        </div>
      )}
      {plans.length === 0 ? <div className="empty"><Ico n="building" s={40} c="var(--primary)" /><h3>No plans uploaded yet</h3><p>Upload the architect's proposed layout, floor plans and flat plans so every member can see their future home.</p><div className="row-gap"><Btn kind="primary" icon="upload" onClick={() => setEdit({ title: '', type: PLAN_TYPES[0], version: 'R0', date: new Date().toISOString().slice(0, 10), architect: '', note: '', status: 'Proposed' })}>Upload first plan</Btn></div></div> : groups.map(([type, list]) => (
        <section key={type} className="stack">
          <h2 className="sec-h">{type} <span className="muted">· {list.length}</span></h2>
          <div className="plan-grid">{list.map(p => (
            <div key={p.id} className="panel plan-card">
              <button className="plan-thumb" onClick={() => p.fileId && setView(p)}>
                <span className={`fk fk-${fileKind(p.fileName).toLowerCase()}`}>{p.fileId ? fileKind(p.fileName) : 'No file'}</span>
                <Ico n="building" s={36} c="var(--ink-faint)" />
                {p.fileId && <span className="plan-open">{fileKind(p.fileName) === 'PDF' ? 'View' : 'Download'}</span>}
              </button>
              <div className="plan-meta">
                <div className="notice-tags"><span className={`badge ${p.status === 'Approved' ? 'b-yes' : p.status === 'Under review' ? 'b-amber' : 'b-pending'}`}>{p.status}</span><span className="muted">{p.version} · {fmtDate(p.date)}</span></div>
                <b>{p.title}</b>
                {p.architect && <span className="muted">by {p.architect}</span>}
                {p.note && <span className="plan-note">{p.note}</span>}
                <div className="row-gap" style={{ justifyContent: 'flex-start', margin: '4px 0 0' }}>
                  {p.fileId && <Btn small onClick={() => fileKind(p.fileName) === 'PDF' ? setView(p) : openStoredFile(p, true)}>{fileKind(p.fileName) === 'PDF' ? 'View' : 'Download'}</Btn>}
                  <Btn small onClick={() => setEdit({ ...p })}>Edit</Btn>
                </div>
              </div>
            </div>
          ))}</div>
        </section>
      ))}
      <p className="footnote">Files are stored on this device. Use “Download backup (with files)” in Society &amp; Terms to move them to another device.</p>
    </div>
  );
}

export { NOTICE_CATS, ItemEditor, Notices, PLAN_TYPES, Plans };
