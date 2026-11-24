// screens/vault.jsx — unified Vault (all uploaded files) + member-safe AI PMC answers
import React from 'react';
import { Btn, Ico, Kpi, PageHead, Seg } from '../components/ui';
import { calcSociety, fmtDate, pct } from '../lib/data';
import { FILE_ACCEPT_ANY, fileKind, fmtSize, openStoredFile, pickUpload } from '../lib/files';
import { Documents, answerQuestion, findMemberInText } from './journey-assistant';

function collectFiles(s, forMember) {
  const out = [];
  (s.documents || []).forEach(d => d.fileId && !(forMember && d.hideFromMembers) && out.push({ key: 'd' + d.id, src: 'Documents', title: d.name, cat: d.category, date: d.date, status: d.status, hidden: !!d.hideFromMembers, meta: d }));
  (s.notices || []).forEach(n => n.fileId && out.push({ key: 'n' + n.id, src: 'Notices', title: n.title, cat: n.category, date: n.date, meta: n }));
  (s.plans || []).forEach(p => p.fileId && out.push({ key: 'p' + p.id, src: 'Building plans', title: p.title, cat: p.type, date: p.date, status: p.status, meta: p }));
  return out.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
}

function VaultView({ s, a, member, go }) {
  const [q, setQ] = React.useState('');
  const [src, setSrc] = React.useState('All');
  const [busy, setBusy] = React.useState(false);
  const all = collectFiles(s, !!member);
  const list = all.filter(f => (src === 'All' || f.src === src) && (!q || `${f.title} ${f.cat} ${f.meta.fileName}`.toLowerCase().includes(q.toLowerCase())));
  const size = all.reduce((t, f) => t + (f.meta.fileSize || 0), 0);
  const cnt = k => all.filter(f => fileKind(f.meta.fileName) === k).length;
  const quickUpload = async () => {
    setBusy(true);
    const meta = await pickUpload(FILE_ACCEPT_ANY);
    if (meta) a.saveDoc({ name: meta.fileName.replace(/\.[^.]+$/, ''), category: 'General', status: 'verified', date: new Date().toISOString().slice(0, 10), note: '', ...meta });
    setBusy(false);
  };
  const statusBadge = f => f.status ? <span className={`badge ${f.src === 'Documents' ? 'ds-' + f.status : f.status === 'Approved' ? 'b-yes' : 'b-pending'}`}>{f.status}</span> : null;
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Files" value={all.length} />
        <Kpi label="PDF" value={cnt('PDF')} />
        <Kpi label="Word" value={cnt('Word')} />
        <Kpi label="Total size" value={fmtSize(size)} />
      </div>
      <div className="toolbar">
        <div className="search"><Ico n="search" s={18} /><input placeholder="Search file name or title…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Seg value={src} onChange={setSrc} options={[['All', 'All'], ['Documents', 'Documents'], ['Notices', 'Notices'], ['Building plans', 'Plans']]} />
      </div>
      {all.length === 0 ? (
        <div className="empty">
          <Ico n="folder" s={40} c="var(--primary)" />
          <h3>No files uploaded yet</h3>
          <p>{member ? 'Files shared by the committee will appear here.' : 'Upload reports, agreements, circulars and building plans. Every file appears here in one place.'}</p>
          {!member && <div className="row-gap"><Btn kind="primary" icon="upload" disabled={busy} onClick={quickUpload}>Upload a file</Btn><Btn icon="bell" onClick={() => go('notices')}>Post a notice</Btn><Btn icon="building" onClick={() => go('plans')}>Upload a plan</Btn></div>}
        </div>
      ) : list.length === 0 ? <p className="muted">No files match.</p> : (
        <div className="doc-list">{list.map(f => {
          const k = fileKind(f.meta.fileName);
          return (
            <div key={f.key} className="panel doc-row vault-row">
              <span className={`fk fk-${k.toLowerCase()} vault-fk`}>{k}</span>
              <div className="doc-main">
                <div className="doc-title"><b>{f.title}</b><span className="muted">{[f.src, f.cat, f.date ? fmtDate(f.date) : '', fmtSize(f.meta.fileSize || 0)].filter(Boolean).join(' · ')}</span></div>
                <div className="notice-tags">{statusBadge(f)}{f.hidden && <span className="badge b-pending">Hidden from members</span>}<span className="muted vault-fn">{f.meta.fileName}</span></div>
              </div>
              <div className="doc-side">
                <Btn small kind="primary" onClick={() => openStoredFile(f.meta)}>{k === 'PDF' || k === 'Image' ? 'Open' : 'Download'}</Btn>
                {(k === 'PDF' || k === 'Image') && <Btn small onClick={() => openStoredFile(f.meta, true)}>Save</Btn>}
              </div>
            </div>
          );
        })}</div>
      )}
      {!member && all.length > 0 && <div className="row-gap" style={{ justifyContent: 'flex-start', margin: 0 }}><Btn icon="upload" disabled={busy} onClick={quickUpload}>Upload another file</Btn></div>}
      <p className="footnote">{member ? 'Shared by the committee. Files open in your phone’s PDF or Word app.' : 'Files are stored on this device. Use “Download backup (with files)” in Society & terms to move them.'}</p>
    </div>
  );
}

function VaultScreen({ s, a, go }) {
  const [tab, setTab] = React.useState('files');
  return (
    <>
      <div className="page vault-top">
        <PageHead title="Vault" sub="Every uploaded file in one place, plus the checklist of required documents." />
        <Seg value={tab} onChange={setTab} options={[['files', `All uploaded files (${collectFiles(s).length})`], ['checklist', 'Document checklist']]} />
        {tab === 'files' && <VaultView s={s} a={a} go={go} />}
      </div>
      {tab === 'checklist' && <Documents s={s} a={a} />}
    </>
  );
}

// Member-safe answers: own flat + society totals only, never other members' details
function memberAnswer(s, m, q) {
  const lq = q.toLowerCase(), has_ = (...w) => w.some(x => lq.includes(x)), k = calcSociety(s);
  const other = findMemberInText(s, q);
  if (other && other.id !== m.id) return `For privacy, I can only share details of your own flat (${m.flat}). Please contact the committee about other flats.`;
  if (has_('who ', 'which member', 'which flat', 'list of', 'not voted', 'objected', 'pending vote', 'names')) return `Individual votes are visible only to the committee. Overall, ${k.yes} of ${k.total} members have consented (${pct(k.pct, 0)}); ${s.terms.consentThreshold}% is required.`;
  if (has_('consent', 'vote', 'voted', 'majority')) return `Your vote (Flat ${m.flat}): ${{ yes: 'Consent given', no: 'Objection recorded', pending: 'Not voted yet — open the My vote tab' }[m.consent]}${m.votedAt ? ' on ' + new Date(m.votedAt).toLocaleDateString('en-IN') : ''}.\nSociety: ${k.yes} of ${k.total} consented (${pct(k.pct, 0)}). ${k.reached ? 'The required majority is reached.' : `${k.needed} more needed by ${fmtDate(s.terms.deadline)}.`}`;
  const others = [m, ...s.members.filter(x => x.id !== m.id)];
  const general = has_('when', 'stage', 'progress', 'timeline', 'possession', 'notice', 'circular', 'plan', 'drawing', 'document', 'meeting', 'developer', 'builder', 'what is', 'meaning', 'explain');
  const own = /\b(my|me|mine|i|we|our)\b/.test(lq) || has_('area', 'carpet', 'rent', 'corpus', 'payout', 'entitle', 'paid', 'payment', 'shifting', 'brokerage', 'statement');
  if (own && !general) return answerQuestion({ ...s, members: [m] }, `${q} ${m.flat}`);
  return answerQuestion({ ...s, members: others }, q);
}

export { collectFiles, VaultView, VaultScreen, memberAnswer };
