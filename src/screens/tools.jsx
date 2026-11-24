// screens/tools.jsx — Payments, Compare offers, Meetings, Activity, Member lookup, Print all, More
import React from 'react';
import { Btn, Field, Ico, Kpi, PageHead, Seg } from '../components/ui';
import { calcMember, calcSociety, inr, inrShort, num, paymentStatus, pct, sqft, statementText, waLink } from '../lib/data';
import { Statement } from './members';

function Payments({ s, a }) {
  const [q, setQ] = React.useState('');
  const t = s.terms;
  const rows = calcSociety(s).rows.map(({ m, c }) => ({ m, c, p: paymentStatus(m, c, s) }));
  const tot = rows.reduce((acc, r) => ({ due: acc.due + r.c.totalPayout, paid: acc.paid + r.p.paid, rent: acc.rent + r.p.paidRent }), { due: 0, paid: 0, rent: 0 });
  const list = rows.filter(({ m }) => !q || (m.name + ' ' + m.flat).toLowerCase().includes(q.toLowerCase()));
  const allMonths = n => { if (confirm(`Set rent paid to ${n} month(s) for all ${rows.length} members?`)) rows.forEach(({ m }) => a.setPayment(m.id, { rentMonths: n })); };
  return (
    <div className="page">
      <PageHead title="Payment tracker" sub="Track rent, shifting, brokerage and corpus paid to each member by the developer.">
        <Btn icon="plus" onClick={() => { const n = prompt('Rent paid for how many months (all members)?', '1'); if (n !== null && n !== '') allMonths(Math.max(0, Math.min(num(t.rentMonths), Math.round(num(n))))); }}>Set months for all</Btn>
      </PageHead>
      <div className="kpis">
        <Kpi label="Total committed" value={inrShort(tot.due)} />
        <Kpi label="Paid so far" value={inrShort(tot.paid)} sub={tot.due ? `${pct((tot.paid / tot.due) * 100)} of commitment` : ''} tone="up" />
        <Kpi label="Rent paid" value={inrShort(tot.rent)} />
        <Kpi label="Outstanding" value={inrShort(tot.due - tot.paid)} />
      </div>
      <div className="toolbar"><div className="search"><Ico n="search" s={18} /><input placeholder="Search name or flat…" value={q} onChange={e => setQ(e.target.value)} /></div></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Flat</th><th>Member</th><th>Rent months paid</th><th className="r">Rent paid</th><th>Shifting</th><th>Brokerage</th><th>Corpus</th><th className="r">Paid</th><th className="r">Outstanding</th></tr></thead>
          <tbody>
            {list.map(({ m, c, p }) => (
              <tr key={m.id} className="norow">
                <td><b>{m.flat}</b></td><td>{m.name}</td>
                <td><div className="stepper"><button onClick={() => a.setPayment(m.id, { rentMonths: Math.max(0, p.months - 1) })}>−</button><span>{p.months} / {t.rentMonths}</span><button onClick={() => a.setPayment(m.id, { rentMonths: Math.min(num(t.rentMonths), p.months + 1) })}>+</button></div></td>
                <td className="r">{inr(p.paidRent)}</td>
                <td><div className="ticks">{Array.from({ length: Math.max(1, num(t.shiftingTimes)) }, (_, i) => <button key={i} className={`tick ${p.shiftCount > i ? 'on' : ''}`} title={`Shifting ${i + 1}`} onClick={() => a.setPayment(m.id, { shifting: p.shiftCount > i ? i : i + 1 })}>{i + 1}</button>)}</div></td>
                <td><button className={`tick wide ${p.brokerage ? 'on' : ''}`} onClick={() => a.setPayment(m.id, { brokerage: !p.brokerage })}>{p.brokerage ? 'Paid' : 'Due'}</button></td>
                <td><button className={`tick wide ${p.corpus ? 'on' : ''}`} onClick={() => a.setPayment(m.id, { corpus: !p.corpus })}>{p.corpus ? 'Paid' : 'Due'}</button></td>
                <td className="r"><b>{inrShort(p.paid)}</b></td>
                <td className="r">{inrShort(p.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">Rent paid follows the yearly increase automatically. Shifting is paid {t.shiftingTimes} time(s) of {inr(t.shiftingAmount)}.</p>
    </div>
  );
}

const OFFER_FIELDS = [['areaGainPct', 'Area increase', '%'], ['rentRate', 'Rent rate', '₹/sq.ft'], ['escalationPct', 'Rent increase', '%/yr'], ['rentMonths', 'Rent period', 'months'], ['corpusRate', 'Corpus rate', '₹/sq.ft'], ['shiftingAmount', 'Shifting', '₹'], ['shiftingTimes', 'Shifting times', '×'], ['brokerageMonths', 'Brokerage', 'months']];

function Offers({ s, a }) {
  const [edit, setEdit] = React.useState(null);
  const cur = { id: 'current', name: s.society.developer || 'Current terms', ...s.terms, current: true };
  const offers = [cur, ...(s.offers || [])];
  const calc = o => calcSociety({ ...s, terms: { ...s.terms, ...o } });
  const results = offers.map(o => ({ o, k: calc(o) }));
  const metrics = [['Area increase', r => `+${pct(r.k.gainPct)}`, r => r.k.proposed], ['Total new area', r => sqft(r.k.proposed), r => r.k.proposed], ['Monthly rent · Yr 1', r => inrShort(r.k.rent), r => r.k.rent], ['Rent period', r => `${r.o.rentMonths} months`, null], ['Total rent', r => inrShort(r.k.totalRent), r => r.k.totalRent], ['Total corpus', r => inrShort(r.k.corpus), r => r.k.corpus], ['Shifting + brokerage', r => inrShort(r.k.shifting + r.k.brokerage), r => r.k.shifting + r.k.brokerage], ['Total payout', r => inrShort(r.k.totalPayout), r => r.k.totalPayout], ['Average per member', r => inrShort(r.k.total ? r.k.totalPayout / r.k.total : 0), r => r.k.totalPayout]];
  const best = fn => fn ? Math.max(...results.map(fn)) : null;
  return (
    <div className="page">
      <PageHead title="Compare developer offers" sub="Enter each developer's terms to see the difference for the society and for every flat.">
        <Btn kind="primary" icon="plus" onClick={() => setEdit({ name: '', ...s.terms })}>Add offer</Btn>
      </PageHead>
      {edit && (
        <div className="panel">
          <div className="panel-head"><h2>{edit.id ? 'Edit offer' : 'New offer'}</h2><Btn small icon="x" onClick={() => setEdit(null)}>Close</Btn></div>
          <div className="form-grid">
            <Field label="Developer name" value={edit.name} onChange={v => setEdit({ ...edit, name: v })} placeholder="Developer" />
            {OFFER_FIELDS.map(([k2, l, suf]) => <Field key={k2} label={l} type="number" suffix={suf} value={edit[k2]} onChange={v => setEdit({ ...edit, [k2]: v })} />)}
          </div>
          <div className="row-gap" style={{ justifyContent: 'flex-start' }}><Btn kind="primary" icon="check" disabled={!edit.name} onClick={() => { a.saveOffer({ ...edit, rentMode: 'sqft', corpusMode: 'sqft' }); setEdit(null); }}>Save offer</Btn></div>
        </div>
      )}
      <div className="table-wrap">
        <table className="tbl cmp">
          <thead><tr><th>Compare</th>{results.map(({ o }) => <th key={o.id} className="r">{o.name}{o.current && <span className="badge b-yes" style={{ marginLeft: 6 }}>Selected</span>}</th>)}</tr></thead>
          <tbody>
            {metrics.map(([l, fmt, val]) => { const b = best(val); return <tr key={l} className="norow"><td>{l}</td>{results.map(r => <td key={r.o.id} className={`r ${val && val(r) === b && results.length > 1 ? 'best' : ''}`}>{fmt(r)}</td>)}</tr>; })}
            <tr className="norow"><td></td>{results.map(({ o }) => <td key={o.id} className="r">{o.current ? <span className="footnote">Current</span> : <div className="row-gap" style={{ justifyContent: 'flex-end', margin: 0 }}><Btn small onClick={() => setEdit(o)}>Edit</Btn><Btn small onClick={() => confirm(`Remove ${o.name}?`) && a.deleteOffer(o.id)} icon="trash"></Btn><Btn small kind="primary" onClick={() => confirm(`Make ${o.name} the selected offer? All member entitlements will use these terms.`) && a.adoptOffer(o)}>Adopt</Btn></div>}</td>)}</tr>
          </tbody>
        </table>
      </div>
      {s.members.length > 0 && <>
        <h2 className="sec-h">Per-flat comparison · total payout</h2>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Flat</th><th>Member</th>{results.map(({ o }) => <th key={o.id} className="r">{o.name}</th>)}</tr></thead>
            <tbody>{s.members.map((m, i) => { const vals = results.map(r => r.k.rows[i].c); const b = Math.max(...vals.map(v => v.totalPayout)); return <tr key={m.id} className="norow"><td><b>{m.flat}</b></td><td>{m.name}</td>{vals.map((v, j) => <td key={j} className={`r ${v.totalPayout === b && vals.length > 1 ? 'best' : ''}`}>{inrShort(v.totalPayout)}<small className="sub-area">{Math.round(v.proposed)} sq.ft</small></td>)}</tr>; })}</tbody>
          </table>
        </div>
      </>}
      <p className="footnote">Highlighted cells show the best value in each row. Offers use per-sq.ft rent and corpus.</p>
    </div>
  );
}

function Meetings({ s, a }) {
  const [edit, setEdit] = React.useState(null);
  const total = s.members.length;
  const blank = () => ({ date: new Date().toISOString().slice(0, 10), type: 'SGBM', title: '', attendees: [], minutes: '', resolutions: '' });
  if (edit) {
    const att = new Set(edit.attendees);
    const toggle = id => { const n = new Set(att); n.has(id) ? n.delete(id) : n.add(id); setEdit({ ...edit, attendees: [...n] }); };
    return (
      <div className="page">
        <div className="back-row"><button className="linkbtn" onClick={() => setEdit(null)}><Ico n="chevL" s={18} /> All meetings</button></div>
        <PageHead title={edit.id ? 'Edit meeting' : 'Record a meeting'}>
          {edit.id && <Btn icon="trash" onClick={() => { if (confirm('Delete this meeting?')) { a.deleteMeeting(edit.id); setEdit(null); } }}>Delete</Btn>}
          <Btn icon="print" onClick={() => window.print()}>Print minutes</Btn>
          <Btn kind="primary" icon="check" onClick={() => { a.saveMeeting(edit); setEdit(null); }}>Save meeting</Btn>
        </PageHead>
        <div className="editor">
          <div className="panel">
            <div className="form-grid">
              <Field label="Date" type="date" value={edit.date} onChange={v => setEdit({ ...edit, date: v })} />
              <Field label="Type"><Seg value={edit.type} onChange={v => setEdit({ ...edit, type: v })} options={[['SGBM', 'SGBM'], ['Committee', 'Committee'], ['Members', 'Members']]} /></Field>
            </div>
            <Field label="Title / agenda" value={edit.title} onChange={v => setEdit({ ...edit, title: v })} placeholder="e.g. Developer selection" />
            <label className="field"><span className="field-label">Discussion / minutes</span><textarea className="ta" rows="6" value={edit.minutes} onChange={e => setEdit({ ...edit, minutes: e.target.value })}></textarea></label>
            <label className="field"><span className="field-label">Resolutions passed</span><textarea className="ta" rows="4" value={edit.resolutions} onChange={e => setEdit({ ...edit, resolutions: e.target.value })}></textarea></label>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Attendance · {att.size} of {total}</h2><div className="row-gap" style={{ margin: 0 }}><Btn small onClick={() => setEdit({ ...edit, attendees: s.members.map(m => m.id) })}>All</Btn><Btn small onClick={() => setEdit({ ...edit, attendees: [] })}>None</Btn></div></div>
            <div className={`quorum ${total && att.size / total >= 1 / 3 ? 'ok' : ''}`}>{total ? `${pct((att.size / total) * 100, 0)} present — ${att.size / total >= 1 / 3 ? 'quorum met (⅓ of members)' : `quorum needs ${Math.ceil(total / 3)} members`}` : 'Add members first'}</div>
            <div className="att-grid">{s.members.map(m => <button key={m.id} className={`att ${att.has(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}><b>{m.flat}</b><span>{m.name}</span></button>)}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <PageHead title="Meetings & attendance" sub="Record general body and committee meetings, attendance, minutes and resolutions.">
        <Btn kind="primary" icon="plus" onClick={() => setEdit(blank())}>Record meeting</Btn>
      </PageHead>
      {(s.meetings || []).length === 0 ? <div className="empty"><Ico n="users" s={40} c="var(--primary)" /><h3>No meetings yet</h3><p>Record the first general body meeting to track attendance and decisions.</p></div> : (
        <div className="stack">{s.meetings.map(mt => (
          <button key={mt.id} className="panel meet" onClick={() => setEdit({ ...mt })}>
            <div className="meet-date"><b>{new Date(mt.date).getDate() || '—'}</b><span>{new Date(mt.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></div>
            <div className="meet-body"><span className="badge b-pending">{mt.type}</span><h2>{mt.title || 'Untitled meeting'}</h2><p>{mt.resolutions || mt.minutes || 'No notes yet'}</p></div>
            <div className="meet-att"><b>{(mt.attendees || []).length}/{total}</b><span>present</span></div>
          </button>
        ))}</div>
      )}
    </div>
  );
}

function Activity({ s, a, undoLabel }) {
  const log = s.log || [];
  return (
    <div className="page">
      <PageHead title="Activity log" sub="Every change recorded with date and time, for full transparency.">
        <Btn icon="undo" disabled={!undoLabel} onClick={a.undo}>{undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}</Btn>
      </PageHead>
      {log.length === 0 ? <div className="empty"><h3>No activity yet</h3><p>Changes you make will appear here.</p></div> : (
        <div className="panel"><ul className="log">{log.map((l, i) => <li key={i}><span>{new Date(l.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><b>{l.msg}</b></li>)}</ul></div>
      )}
    </div>
  );
}

function Lookup({ s }) {
  const [q, setQ] = React.useState('');
  const m = q.trim() ? s.members.find(x => (x.flat || '').toLowerCase().replace(/\s/g, '') === q.toLowerCase().replace(/\s/g, '')) : null;
  const sugg = q.trim() && !m ? s.members.filter(x => (x.flat + ' ' + x.name).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  return (
    <div className="page lookup">
      <div className="lk-hero">
        <span className="eyebrow">Member self-service</span>
        <h1>Check your entitlement</h1>
        <p>Enter your flat number to see your new area, rent, corpus and total payout.</p>
        <div className="lk-input"><Ico n="search" s={22} /><input autoFocus placeholder="Flat number, e.g. A-101" value={q} onChange={e => setQ(e.target.value)} /></div>
        {sugg.length > 0 && <div className="pills">{sugg.map(x => <button key={x.id} className="pill pill-btn" onClick={() => setQ(x.flat)}>{x.flat} · {x.name}</button>)}</div>}
      </div>
      {m && <>
        <Statement s={s} m={m} c={calcMember(m, s.terms)} />
        <div className="row-gap" style={{ justifyContent: 'flex-start' }}>
          <Btn icon="print" onClick={() => window.print()}>Print</Btn>
          <a className="btn btn-wa" href={waLink(m.phone, statementText(s, m))} target="_blank" rel="noopener"><Ico n="share" s={18} /><span>Share on WhatsApp</span></a>
        </div>
      </>}
      {q.trim() && !m && sugg.length === 0 && <p className="footnote">No flat found. Check the number or ask the committee.</p>}
    </div>
  );
}

function PrintAll({ s, back }) {
  React.useEffect(() => { const t = setTimeout(() => window.print(), 600); return () => clearTimeout(t); }, []);
  return (
    <div className="page">
      <div className="no-print back-row"><button className="linkbtn" onClick={back}><Ico n="chevL" s={18} /> Back</button></div>
      <PageHead title="All member statements" sub={`${s.members.length} statements · use your browser's Print → Save as PDF`}><Btn kind="primary" icon="print" onClick={() => window.print()}>Print / Save PDF</Btn></PageHead>
      {s.members.map(m => <div key={m.id} className="print-page"><Statement s={s} m={m} c={calcMember(m, s.terms)} /></div>)}
    </div>
  );
}

function More({ go, onPPT, setPrintAll }) {
  const items = [['notices', 'Notices & circulars', 'Post circulars with PDF / Word', 'bell'], ['plans', 'Building plans', 'Proposed drawings, PDF / Word', 'building'], ['documents', 'Vault', 'All uploaded files & checklist', 'folder'], ['assistant', 'AI PMC assistant', 'Ask anything about the project', 'sparkle'], ['payments', 'Payment tracker', 'Rent, corpus, allowances paid', 'wallet'], ['offers', 'Compare offers', 'Side-by-side developer offers', 'scale'], ['meetings', 'Meetings', 'Attendance, minutes, resolutions', 'calendar'], ['lookup', 'Member lookup', 'Members check their own statement', 'search'], ['activity', 'Activity & undo', 'Every change, with time', 'clock'], ['access', 'Member logins', 'Passwords and online votes', 'lock'], ['settings', 'Society & terms', 'Society name, new society, rates, backup', 'sliders']];
  return (
    <div className="page">
      <PageHead title="More" />
      <div className="more-grid">
        {items.map(([r, l, d, i]) => <button key={r} className="panel more-tile" onClick={() => go(r)}><Ico n={i} s={26} c="var(--primary)" /><b>{l}</b><span>{d}</span></button>)}
        <button className="panel more-tile" onClick={setPrintAll}><Ico n="print" s={26} c="var(--primary)" /><b>Print all statements</b><span>One page per member, save as PDF</span></button>
        <button className="panel more-tile" onClick={onPPT}><Ico n="ppt" s={26} c="var(--primary)" /><b>Download PPT</b><span>30+ slide member pack</span></button>
      </div>
    </div>
  );
}

export { Payments, OFFER_FIELDS, Offers, Meetings, Activity, Lookup, PrintAll, More };
