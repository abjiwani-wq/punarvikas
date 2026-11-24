// screens/journey-assistant.jsx — Journey, Stage detail, Document vault, AI PMC assistant
import React from 'react';
import { Btn, Field, Ico, Kpi, PageHead, Ring, Seg } from '../components/ui';
import { calcMember, calcSociety, fmtDate, inr, inrShort, paymentStatus, pct, sqft, stageProgress } from '../lib/data';
import { FILE_ACCEPT_ANY, FileChip, delFile, pickUpload } from '../lib/files';

const STATUS_LABEL = { done: 'Completed', active: 'In progress', upcoming: 'Upcoming' };

function Journey({ s, a }) {
  const [open, setOpen] = React.useState(null);
  const pg = stageProgress(s);
  if (open) return <StageDetail s={s} a={a} k={open} close={() => setOpen(null)} />;
  return (
    <div className="page">
      <PageHead title="Redevelopment journey" sub="The complete regulated process. Open a stage to see its procedure, tick off steps and add notes." />
      <div className="jr-top panel">
        <Ring value={pg.pct} size={120} stroke={12} label="complete" />
        <div className="jr-top-txt">
          <span className="eyebrow">Stage {pg.active ? pg.active.n : '—'} of {s.stages.length}</span>
          <h2>{pg.active ? pg.active.title : 'All stages complete'}</h2>
          <p className="muted">{pg.doneStages} stages complete · {pg.done} of {pg.all} steps done</p>
        </div>
        {pg.active && <Btn kind="primary" icon="chevR" onClick={() => setOpen(pg.active.key)}>Open current stage</Btn>}
      </div>
      <ol className="jr">
        {s.stages.map((st, i) => {
          const d = st.items.filter(x => x.done).length;
          return (
            <li key={st.key} className={`jr-item jr-${st.status}`}>
              <div className="jr-rail"><span className="jr-dot">{st.status === 'done' ? <Ico n="check" s={16} c="#fff" w={2.6} /> : st.n}</span>{i < s.stages.length - 1 && <span className="jr-line"></span>}</div>
              <button className="jr-card" onClick={() => setOpen(st.key)}>
                <div className="jr-head"><h3>{st.title}</h3><Ico n="chevR" s={18} c="var(--ink-faint)" /></div>
                <p>{st.blurb}</p>
                <div className="jr-meta"><span className={`badge st-${st.status}`}>{STATUS_LABEL[st.status]}</span><span>{d}/{st.items.length} steps</span>{st.date && <span>· {st.date}</span>}</div>
                <div className="jr-bar"><span style={{ width: (st.items.length ? (d / st.items.length) * 100 : 0) + '%' }}></span></div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageDetail({ s, a, k, close }) {
  const st = s.stages.find(x => x.key === k);
  const [newItem, setNewItem] = React.useState('');
  const [notes, setNotes] = React.useState(st ? st.notes : '');
  if (!st) return null;
  const idx = s.stages.findIndex(x => x.key === k);
  const docs = (s.documents || []).filter(d => ({ survey: 'Survey', tender: 'Tender', consent: 'Consent', agreement: 'Agreements', construct: 'Approvals', possession: 'Approvals' })[k] === d.category);
  return (
    <div className="page">
      <div className="back-row"><button className="linkbtn" onClick={close}><Ico n="chevL" s={18} /> Full journey</button></div>
      <div className="stage-hero">
        <span className="eyebrow light">Stage {st.n} of {s.stages.length} · {STATUS_LABEL[st.status]}</span>
        <h1>{st.title}</h1>
        <p>{st.detail}</p>
        <div className="hero-actions">
          <Seg value={st.status} onChange={v => a.setStage(k, { status: v })} options={[['upcoming', 'Upcoming'], ['active', 'In progress'], ['done', 'Completed']]} />
        </div>
      </div>
      <div className="editor">
        <div className="panel">
          <h2>Procedure checklist</h2>
          <ul className="chk">
            {st.items.map((it, i) => <li key={i}><button className={`chk-box ${it.done ? 'on' : ''}`} onClick={() => a.toggleStageItem(k, i)}>{it.done && <Ico n="check" s={15} c="#fff" w={2.6} />}</button><span className={it.done ? 'done' : ''}>{it.text}</span></li>)}
          </ul>
          <div className="add-row"><div className="field-box" style={{ flex: 1 }}><input placeholder="Add a step…" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { a.addStageItem(k, newItem.trim()); setNewItem(''); } }} /></div><Btn icon="plus" disabled={!newItem.trim()} onClick={() => { a.addStageItem(k, newItem.trim()); setNewItem(''); }}>Add</Btn></div>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Timing & notes</h2>
            <Field label="Date / target" value={st.date} onChange={v => a.setStage(k, { date: v })} placeholder="e.g. Aug 2026" />
            <label className="field"><span className="field-label">Notes for members</span><textarea className="ta" rows="5" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== st.notes && a.setStage(k, { notes })} placeholder="Decisions, dates, who to contact…"></textarea></label>
          </div>
          {docs.length > 0 && <div className="panel"><h2>Related documents</h2>{docs.map(d => <div key={d.id} className="doc-mini"><span>{d.name}</span><span className={`badge ds-${d.status}`}>{d.status}</span></div>)}</div>}
          <div className="row-gap" style={{ justifyContent: 'space-between', margin: 0 }}>
            {idx > 0 ? <Btn icon="chevL" onClick={() => { close(); setTimeout(() => window.__srm.openStage(s.stages[idx - 1].key), 0); }}>Previous stage</Btn> : <span></span>}
            {idx < s.stages.length - 1 && <Btn onClick={() => { close(); setTimeout(() => window.__srm.openStage(s.stages[idx + 1].key), 0); }}>Next stage <Ico n="chevR" s={18} /></Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

const DOC_STATUS = [['pending', 'Pending'], ['draft', 'Draft'], ['verified', 'Verified']];
function Documents({ s, a }) {
  const [cat, setCat] = React.useState('All');
  const [edit, setEdit] = React.useState(null);
  const docs = s.documents || [];
  const cats = ['All', ...Array.from(new Set(docs.map(d => d.category)))];
  const list = docs.filter(d => cat === 'All' || d.category === cat);
  const cnt = st => docs.filter(d => d.status === st).length;
  const attach = async doc => { const meta = await pickUpload(FILE_ACCEPT_ANY); if (meta) a.saveDoc({ ...doc, ...meta, date: doc.date || new Date().toISOString().slice(0, 10) }); };
  return (
    <div className="page">
      <PageHead title="Document checklist" sub="Required reports and agreements. Attach the PDF or Word file and mark each one verified.">
        <Btn kind="primary" icon="plus" onClick={() => setEdit({ name: '', category: cats[1] || 'General', status: 'pending', date: '', note: '' })}>Add document</Btn>
      </PageHead>
      <div className="kpis">
        <Kpi label="Documents" value={docs.length} />
        <Kpi label="Verified" value={cnt('verified')} tone="up" sub={docs.length ? pct((cnt('verified') / docs.length) * 100, 0) + ' complete' : ''} />
        <Kpi label="Draft" value={cnt('draft')} />
        <Kpi label="Pending" value={cnt('pending')} />
      </div>
      {edit && (
        <div className="panel">
          <div className="panel-head"><h2>{edit.id ? 'Edit document' : 'New document'}</h2><Btn small icon="x" onClick={() => setEdit(null)}>Close</Btn></div>
          <div className="form-grid">
            <Field label="Document name" value={edit.name} onChange={v => setEdit({ ...edit, name: v })} />
            <Field label="Category" value={edit.category} onChange={v => setEdit({ ...edit, category: v })} />
            <Field label="Date" type="date" value={edit.date} onChange={v => setEdit({ ...edit, date: v })} />
            <Field label="Status"><Seg value={edit.status} onChange={v => setEdit({ ...edit, status: v })} options={DOC_STATUS} /></Field>
          </div>
          <Field label="Note" value={edit.note} onChange={v => setEdit({ ...edit, note: v })} placeholder="Optional" />
          <label className="check-row"><input type="checkbox" checked={!!edit.hideFromMembers} onChange={e => setEdit({ ...edit, hideFromMembers: e.target.checked })} /> Hide this file from members (committee only)</label>
          <div className="row-gap" style={{ justifyContent: 'flex-start' }}><Btn kind="primary" icon="check" disabled={!edit.name} onClick={() => { a.saveDoc(edit); setEdit(null); }}>Save</Btn>{edit.id && <Btn icon="trash" onClick={() => { if (confirm('Remove this document?')) { a.deleteDoc(edit.id); setEdit(null); } }}>Remove</Btn>}</div>
        </div>
      )}
      <div className="toolbar"><Seg value={cat} onChange={setCat} options={cats.map(c => [c, c])} /></div>
      <div className="doc-list">
        {list.map(d => (
          <div key={d.id} className="panel doc-row">
            <div className="doc-ic"><Ico n="file" s={22} c="var(--primary)" /></div>
            <div className="doc-main">
              <div className="doc-title"><b>{d.name}</b><span className="muted">{d.category}{d.date ? ' · ' + fmtDate(d.date) : ''}{d.note ? ' · ' + d.note : ''}</span></div>
              {d.fileId ? <FileChip meta={d} onRemove={() => { delFile(d.fileId).catch(() => {}); a.saveDoc({ ...d, fileId: null, fileName: null, fileSize: null }); }} /> : <button className="linkbtn" onClick={() => attach(d)}><Ico n="upload" s={16} /> Attach PDF / Word</button>}
            </div>
            <div className="doc-side">
              <select className={`ds-sel ds-${d.status}`} value={d.status} onChange={e => a.saveDoc({ ...d, status: e.target.value })}>{DOC_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <Btn small onClick={() => setEdit({ ...d })}>Edit</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── offline AI PMC assistant: answers from the society's own data ──
function findMemberInText(s, q) {
  const n = q.toLowerCase().replace(/\s/g, '');
  const byFlat = s.members.filter(m => m.flat && n.includes(m.flat.toLowerCase().replace(/\s/g, ''))).sort((x, y) => y.flat.length - x.flat.length)[0];
  if (byFlat) return byFlat;
  return s.members.find(m => m.name && m.name.split(' ').some(w => w.length > 3 && q.toLowerCase().includes(w.toLowerCase())));
}
const GLOSSARY = { paaa: 'PAAA (Permanent Alternate Accommodation Agreement) is your individual registered agreement with the developer. It fixes your new carpet area, rent, corpus and timelines.', 'development agreement': 'The Development Agreement (DA) is the registered contract between the society and the developer for the whole project.', fsi: 'FSI (Floor Space Index) is the ratio of total built-up area allowed to the plot area. It decides how much can be built.', tdr: 'TDR (Transferable Development Rights) is additional buildable area the developer can purchase and use on the plot.', ' oc': 'OC (Occupation Certificate) is issued by the municipal authority once the building is complete and safe to occupy. Possession should be given only after OC.', iod: 'IOD (Intimation of Disapproval) is the initial approval of building plans with conditions to be met before construction.', rera: 'MahaRERA registration is mandatory for the project before any sale flats are marketed. It brings timelines and disclosures under regulation.', sgbm: 'SGBM is a Special General Body Meeting of all society members, called for major decisions like redevelopment.', 'carpet area': 'Carpet area is the usable floor area inside the walls of your flat, as defined under RERA.' };

function answerQuestion(s, q) {
  const t = s.terms, lq = q.toLowerCase(), k = calcSociety(s), pg = stageProgress(s);
  const m = findMemberInText(s, q);
  const has_ = (...w) => w.some(x => lq.includes(x));
  for (const [key, ans] of Object.entries(GLOSSARY)) if (lq.includes(key.trim()) && has_('what', 'mean', 'explain', 'is ')) return ans;
  if (m) {
    const c = calcMember(m, t);
    if (has_('area', 'carpet', 'size', 'sq')) return `Flat ${m.flat} (${m.name}) has ${sqft(c.existing)} today and will get ${sqft(c.proposed)} — an increase of ${Math.round(c.gain)} sq.ft (+${pct(c.gainPct)}).`;
    if (has_('rent')) return `Flat ${m.flat} receives ${inr(c.rent)} per month in Year 1, increasing ${t.escalationPct}% every year for ${t.rentMonths} months. Total rent: ${inr(c.totalRent)}.\n` + c.schedule.map(r => `Year ${r.year}: ${inr(r.monthly)}/month × ${r.months}`).join('\n');
    if (has_('corpus')) return `Corpus for Flat ${m.flat}: ${inr(c.corpus)}.`;
    if (has_('consent', 'vote', 'voted')) return `Flat ${m.flat} (${m.name}): ${{ yes: 'has consented', no: 'has objected', pending: 'has not voted yet' }[m.consent]}${m.votedAt ? ' on ' + new Date(m.votedAt).toLocaleDateString('en-IN') : ''}.`;
    if (has_('paid', 'payment')) { const p = paymentStatus(m, c, s); return `Paid to Flat ${m.flat} so far: ${inr(p.paid)} (rent for ${p.months} months, shifting ${p.shiftCount}×, brokerage ${p.brokerage ? 'paid' : 'due'}, corpus ${p.corpus ? 'paid' : 'due'}). Outstanding: ${inr(p.outstanding)}.`; }
    return `Flat ${m.flat} · ${m.name}\n• Area: ${sqft(c.existing)} → ${sqft(c.proposed)} (+${pct(c.gainPct)})\n• Rent: ${inr(c.rent)}/month, +${t.escalationPct}% yearly, ${t.rentMonths} months = ${inr(c.totalRent)}\n• Corpus: ${inr(c.corpus)}\n• Shifting: ${inr(c.shifting)} · Brokerage: ${inr(c.brokerage)}\n• Total payout: ${inr(c.totalPayout)}\n• Consent: ${{ yes: 'Consented', no: 'Objected', pending: 'Pending' }[m.consent]}`;
  }
  if (has_('pending', 'not voted', "haven't", 'who has not')) { const p = s.members.filter(x => x.consent === 'pending'); return p.length ? `${p.length} members have not voted: ${p.map(x => x.flat).join(', ')}.` : 'Every member has voted.'; }
  if (has_('object')) { const o = s.members.filter(x => x.consent === 'no'); return o.length ? `${o.length} objected: ${o.map(x => `${x.flat} (${x.name})`).join(', ')}.` : 'No member has objected.'; }
  if (has_('consent', 'vote', 'majority')) return `${k.yes} of ${k.total} members (${pct(k.pct, 0)}) have consented. ${k.reached ? `The ${t.consentThreshold}% majority is reached.` : `${k.needed} more needed to reach ${t.consentThreshold}% (${k.required} members) by ${fmtDate(t.deadline)}.`}`;
  if (has_('stage', 'status', 'progress', 'where are we', 'timeline', 'when', 'next')) { const nx = s.stages[s.stages.indexOf(pg.active) + 1]; return `We are at Stage ${pg.active.n} of ${s.stages.length}: ${pg.active.title}. ${pg.active.items.filter(i => i.done).length} of ${pg.active.items.length} steps done.${nx ? ` Next: ${nx.title}${nx.date ? ' (' + nx.date + ')' : ''}.` : ''} Overall progress ${pct(pg.pct, 0)}.`; }
  if (has_('area', 'carpet')) return `Every member gets ${t.areaGainPct}% more carpet area. Society total: ${sqft(k.existing)} → ${sqft(k.proposed)}. Ask with your flat number for your exact figure, e.g. "area for ${s.members[0] ? s.members[0].flat : 'A-101'}".`;
  if (has_('rent')) return `Rent is ${t.rentMode === 'flat' ? inr(t.rentFixed) + ' per flat' : inr(t.rentRate) + ' per sq.ft of existing area'} per month, increasing ${t.escalationPct}% every year for ${t.rentMonths} months. Society total in Year 1: ${inr(k.rent)} per month.`;
  if (has_('corpus')) return `Corpus is ${t.corpusMode === 'flat' ? inr(t.corpusFixed) + ' per flat' : inr(t.corpusRate) + ' per sq.ft of existing area'}. Total for the society: ${inr(k.corpus)}.`;
  if (has_('shifting', 'brokerage')) return `Shifting allowance: ${inr(t.shiftingAmount)} × ${t.shiftingTimes}. Brokerage: ${t.brokerageMonths} month(s) rent. Both are paid before vacating.`;
  if (has_('document', 'papers', 'report')) { const d = s.documents || []; return `Document vault: ${d.filter(x => x.status === 'verified').length} verified, ${d.filter(x => x.status === 'draft').length} draft, ${d.filter(x => x.status === 'pending').length} pending.\nPending: ${d.filter(x => x.status === 'pending').map(x => x.name).join(', ') || 'none'}.`; }
  if (has_('notice', 'circular')) { const n = [...(s.notices || [])].sort((x, y) => String(y.date).localeCompare(String(x.date)))[0]; return n ? `Latest notice (${fmtDate(n.date)}): ${n.title}. ${n.body || ''}` : 'No notices have been posted yet.'; }
  if (has_('plan', 'drawing', 'layout')) { const p = s.plans || []; return p.length ? `${p.length} building plan file(s) uploaded. Latest: ${p[0].title}${p[0].version ? ' (' + p[0].version + ')' : ''}. Open the Building Plans section to view.` : 'No building plans uploaded yet.'; }
  if (has_('meeting', 'sgbm', 'agm')) { const mt = (s.meetings || [])[0]; return mt ? `Last meeting: ${mt.type} on ${fmtDate(mt.date)} — ${mt.title}. Attendance ${mt.attendees.length}/${k.total}. ${mt.resolutions || ''}` : 'No meetings recorded yet.'; }
  if (has_('developer', 'builder', 'offer')) return `Selected developer: ${s.society.developer || 'not set'}.${(s.offers || []).length ? ` ${s.offers.length} other offer(s) are on record — see Compare offers.` : ''}`;
  if (has_('total', 'commitment', 'how much')) return `Total commitment to members: ${inr(k.totalPayout)} (rent ${inrShort(k.totalRent)}, corpus ${inrShort(k.corpus)}, shifting ${inrShort(k.shifting)}, brokerage ${inrShort(k.brokerage)}).`;
  return 'I can answer from your society\u2019s data. Try a flat number (e.g. "What does ' + (s.members[0] ? s.members[0].flat : 'A-101') + ' get?"), or ask about rent, corpus, consent, the current stage, documents, notices, plans or terms like PAAA and FSI.';
}

function Assistant({ s, answer, suggestions, intro, sub }) {
  const first = s.members[0] ? s.members[0].flat : 'A-101';
  const [msgs, setMsgs] = React.useState([{ from: 'ai', text: intro || `Namaste! I\u2019m the PMC assistant for ${s.society.name}. I answer from this society\u2019s data — entitlements, rent, consent, stages, documents and notices.` }]);
  const [q, setQ] = React.useState('');
  const box = React.useRef(null);
  React.useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  const ask = text => { if (!text.trim()) return; setMsgs(m => [...m, { from: 'me', text }, { from: 'ai', text: answer ? answer(text) : answerQuestion(s, text) }]); setQ(''); };
  const sugg = suggestions || [`What does ${first} get?`, `Rent schedule for ${first}`, 'How many have consented?', 'Who has not voted?', 'Which stage are we at?', 'What is PAAA?', 'Latest notice', 'Pending documents'];
  return (
    <div className="page">
      <PageHead title="AI PMC assistant" sub={sub || 'Instant answers from your own society data. Works offline.'} />
      <div className="panel chat">
        <div className="chat-msgs" ref={box}>{msgs.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}</div>
        <div className="pills">{sugg.map(x => <button key={x} className="pill pill-btn" onClick={() => ask(x)}>{x}</button>)}</div>
        <form className="chat-in" onSubmit={e => { e.preventDefault(); ask(q); }}><input placeholder="Ask about a flat, rent, consent, stage…" value={q} onChange={e => setQ(e.target.value)} /><button type="submit" className="btn btn-primary"><Ico n="send" s={18} /></button></form>
      </div>
    </div>
  );
}

export { STATUS_LABEL, Journey, StageDetail, DOC_STATUS, Documents, findMemberInText, GLOSSARY, answerQuestion, Assistant };
