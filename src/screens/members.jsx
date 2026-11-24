// screens/members.jsx — Dashboard, Members, MemberEditor
import React from 'react';
import { Btn, ConsentBadge, ConsentBar, Field, Ico, Kpi, LiveDot, PageHead, Ring, Seg } from '../components/ui';
import { CSV_TEMPLATE, calcMember, calcSociety, cleanMobile, dataChecks, downloadBlob, exportCSV, fmtDate, has, inr, inrShort, membersFromCSV, num, pct, pickFile, sqft, stageProgress, statementText, validMobile, waLink } from '../lib/data';
import { fileKind } from '../lib/files';

function Dashboard({ s, a, go, onPPT, openMember, openStage, onPrintAll }) {
  const k = calcSociety(s);
  const t = s.terms;
  const pend = s.members.filter(m => m.consent === 'pending');
  const pg = stageProgress(s);
  const issues = dataChecks(s);
  const latest = [...(s.notices || [])].sort((x, y) => (y.pinned - x.pinned) || String(y.date).localeCompare(String(x.date))).slice(0, 2);
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-txt">
          <span className="eyebrow light">Redevelopment · {s.society.developer || 'Developer TBD'}</span>
          <h1>{s.society.name || 'Untitled society'}</h1>
          <p>{[s.society.location, s.society.regNo && `Reg. ${s.society.regNo}`].filter(Boolean).join(' · ') || 'Add location in Society & Terms'}</p>
          <div className="hero-actions">
            <Btn kind="light" icon="vote" onClick={() => go('voting')}>Open consent voting</Btn>
            <Btn kind="glass" icon="ppt" onClick={onPPT}>Download PPT</Btn>
          </div>
        </div>
        <div className="hero-ring">
          <Ring value={k.pct} threshold={num(t.consentThreshold)} light size={168} />
          <div className="hero-ring-cap">
            <b>{`${k.yes} of ${k.total}`}</b><em>members consented</em>
            <span>{k.reached ? `${t.consentThreshold}% majority reached` : `${k.needed} more needed for ${t.consentThreshold}%`}</span>
          </div>
        </div>
      </section>

      <div className="kpis">
        <Kpi label="Members" value={k.total} sub={`${k.pending} votes pending`} />
        <Kpi label="Existing carpet" value={sqft(k.existing)} />
        <Kpi label="Proposed carpet" value={sqft(k.proposed)} sub={`+${pct(k.gainPct)} overall`} tone="up" />
        <Kpi label="Monthly rent · Yr 1" value={inrShort(k.rent)} sub={`+${t.escalationPct}% every year`} />
        <Kpi label="Total corpus" value={inrShort(k.corpus)} />
        <Kpi label={`Total commitment · ${t.rentMonths} mo`} value={inrShort(k.totalPayout)} sub="Rent + corpus + shifting + brokerage" />
      </div>

      <div className="cols">
        <button className="panel jr-mini" onClick={() => pg.active && openStage(pg.active.key)}>
          <div className="panel-head"><h2>Redevelopment journey</h2><span className="linkbtn">Open</span></div>
          <div className="jr-steps">{s.stages.map(st => <span key={st.key} className={`jr-step jr-${st.status}`} title={st.title}></span>)}</div>
          <div><span className="eyebrow">{pg.active ? `Stage ${pg.active.n} of ${s.stages.length}` : 'Complete'}</span><h3 className="jr-mini-t">{pg.active ? pg.active.title : 'All stages complete'}</h3><p className="muted">{`${pct(pg.pct, 0)} of all steps done · ${pg.doneStages} stages complete`}</p></div>
        </button>
        <div className="panel">
          <div className="panel-head"><h2>Latest notices</h2><Btn small onClick={() => go('notices')}>All notices</Btn></div>
          {latest.length === 0 ? <p className="muted">No notices posted yet.</p> : latest.map(n => <div key={n.id} className="dn"><span className="muted">{`${fmtDate(n.date)} · ${n.category}`}</span><b>{n.title}</b>{n.fileName && <span className="fk-inline">{fileKind(n.fileName)} attached</span>}</div>)}
          <div className="row-gap" style={{ justifyContent: 'flex-start', margin: 0 }}><Btn small icon="building" onClick={() => go('plans')}>{`Building plans (${(s.plans || []).length})`}</Btn><Btn small icon="folder" onClick={() => go('documents')}>Documents</Btn></div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <div className="panel-head"><h2>Offer terms</h2><Btn small onClick={() => go('settings')}>Edit</Btn></div>
          <dl className="terms">
            <dt>Area increase</dt><dd>+{t.areaGainPct}% on existing carpet</dd>
            <dt>Transit rent</dt><dd>{t.rentMode === 'flat' ? `${inr(t.rentFixed)} / month per flat` : `${inr(t.rentRate)} / sq.ft / month`}</dd>
            <dt>Rent escalation</dt><dd>{t.escalationPct}% every year · {t.rentMonths} months</dd>
            <dt>Corpus fund</dt><dd>{t.corpusMode === 'flat' ? `${inr(t.corpusFixed)} per flat` : `${inr(t.corpusRate)} / sq.ft`}</dd>
            <dt>Shifting allowance</dt><dd>{inr(t.shiftingAmount)} × {t.shiftingTimes}</dd>
            <dt>Brokerage</dt><dd>{t.brokerageMonths} month{num(t.brokerageMonths) === 1 ? '' : 's'} rent</dd>
            <dt>Consent required</dt><dd>{t.consentThreshold}% by {fmtDate(t.deadline)}</dd>
          </dl>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Consent status</h2><LiveDot /></div>
          <ConsentBar yes={k.yes} no={k.no} total={k.total} threshold={num(t.consentThreshold)} />
          <div className="ctally">
            <div><b className="t-yes">{k.yes}</b><span>Consented</span></div>
            <div><b className="t-no">{k.no}</b><span>Objected</span></div>
            <div><b>{k.pending}</b><span>Pending</span></div>
          </div>
          {pend.length > 0 && <>
            <div className="mini-label">Awaiting vote</div>
            <div className="pills">{pend.slice(0, 14).map(m => <span key={m.id} className="pill">{m.flat}</span>)}{pend.length > 14 && <span className="pill">+{pend.length - 14}</span>}</div>
          </>}
          <Btn kind="primary" icon="vote" onClick={() => go('voting')}>View votes</Btn>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <div className="panel-head"><h2>Data checks</h2>{issues.length === 0 && <span className="badge b-yes">All good</span>}</div>
          {issues.length === 0 ? <p className="muted">No problems found in member data.</p> : <ul className="issues">{issues.slice(0, 6).map((x, i) => <li key={i}><Ico n="alert" s={17} c="var(--accent)" /><span>{x[1]}</span>{x[2] && <button className="linkbtn" onClick={() => openMember(x[2])}>Fix</button>}</li>)}</ul>}
        </div>
        <div className="panel">
          <h2>Quick actions</h2>
          <div className="qa-grid">
            <Btn icon="plus" onClick={() => openMember('new')}>Add member</Btn>
            <Btn icon="print" onClick={onPrintAll}>Print all statements</Btn>
            <Btn icon="bell" onClick={() => go('notices')}>Post a notice</Btn>
            <Btn icon="upload" onClick={() => go('plans')}>Upload plans</Btn>
            <Btn icon="sparkle" onClick={() => go('assistant')}>Ask the AI PMC</Btn>
            <Btn icon="search" onClick={() => go('lookup')}>Member lookup</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileCell({ m, a }) {
  const [v, setV] = React.useState(m.phone || '');
  const cancel = React.useRef(false);
  React.useEffect(() => setV(m.phone || ''), [m.phone]);
  const bad = !!String(v).trim() && !validMobile(cleanMobile(v));
  const save = e => {
    if (cancel.current) { cancel.current = false; setV(m.phone || ''); return; }
    const raw = e.currentTarget.value, c = cleanMobile(raw);
    if (raw.trim() && !validMobile(c)) return;
    if (c !== cleanMobile(m.phone || '')) a.saveMember({ ...m, phone: c });
  };
  return (
    <td className="mob-cell" onClick={e => e.stopPropagation()}>
      <input className={`mob-in ${bad ? 'bad' : ''}`} type="tel" inputMode="numeric" placeholder="Add mobile" value={v} maxLength={14}
        onChange={e => setV(e.target.value.replace(/[^\d+ ]/g, ''))} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { cancel.current = true; e.currentTarget.blur(); } }}
        title={bad ? 'Not saved — enter a 10-digit Indian mobile number' : m.kyc ? 'Mobile confirmed by member at registration' : 'Mobile number'} />
      {m.kyc && m.kyc.mobile && cleanMobile(v) === m.kyc.mobile && <span className="mob-ok" title="Confirmed by member">✓</span>}
      {bad && <span className="mob-err">Not saved · 10 digits</span>}
    </td>
  );
}

function Members({ s, a, openMember, onPrintAll }) {
  const [q, setQ] = React.useState('');
  const k = calcSociety(s);
  const [bf, setBf] = React.useState('All');
  const bldgs = [...new Set(s.members.map(m => m.bldg).filter(Boolean))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  const rows = k.rows.filter(({ m }) => (bf === 'All' || (m.bldg || '') === bf) && (!q || `${m.name} ${m.flat} ${m.bldg || ''} ${m.bname || ''}`.toLowerCase().includes(q.toLowerCase())));
  const importCSV = () => pickFile('.csv,text/csv', text => {
    const list = membersFromCSV(text);
    if (!list.length) { alert('No members found. Use columns: Bldg No., Building name, Flat, Member name, Existing area, Proposed area (optional).'); return; }
    if (confirm(`Add ${list.length} members from this file?`)) a.addMembers(list);
  });
  return (
    <div className="page">
      <PageHead title="Members & entitlements" sub="Every value calculates from your offer terms. Click a member to edit or override.">
        <Btn icon="upload" onClick={importCSV}>Import CSV</Btn>
        <Btn icon="download" onClick={() => exportCSV(s)}>Export CSV</Btn>
        <Btn icon="print" onClick={onPrintAll}>Print all statements</Btn>
        <Btn kind="primary" icon="plus" onClick={() => openMember('new')}>Add member</Btn>
      </PageHead>
      <div className="toolbar">
        <div className="search"><Ico n="search" s={18} /><input placeholder="Search name, flat or building…" value={q} onChange={e => setQ(e.target.value)} /></div>
        {bldgs.length > 1 && <Seg value={bf} onChange={setBf} options={[['All', 'All buildings'], ...bldgs.map(b => [b, b])]} />}
        <button className="linkbtn" onClick={() => downloadBlob(CSV_TEMPLATE, 'members-template.csv', 'text/csv')}>Download CSV template</button>
      </div>
      {s.members.length === 0 ? (
        <div className="empty">
          <Ico n="users" s={40} c="var(--primary)" />
          <h3>No members yet</h3>
          <p>Add members one by one, or import your list from Excel saved as CSV.</p>
          <div className="row-gap"><Btn kind="primary" icon="plus" onClick={() => openMember('new')}>Add member</Btn><Btn icon="upload" onClick={importCSV}>Import CSV</Btn></div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Bldg No.</th><th>Building name</th><th>Flat</th><th>Member</th><th className="r">Existing</th><th className="r">Proposed</th><th className="r">Gain</th><th className="r">Rent / mo</th><th className="r">Corpus</th><th className="r">Shifting</th><th className="r">Brokerage</th><th className="r">Total payout</th><th>Consent</th><th>Mobile number</th></tr></thead>
            <tbody>
              {rows.map(({ m, c }) => (
                <tr key={m.id} onClick={() => openMember(m.id)}>
                  <td>{m.bldg || '—'}</td><td>{m.bname || '—'}</td><td><b>{m.flat}</b></td><td>{m.name}</td>
                  <td className="r">{Math.round(c.existing)}</td>
                  <td className="r"><b>{Math.round(c.proposed)}</b>{!c.auto.proposed && <i className="ovr" title="Custom value">•</i>}</td>
                  <td className="r up">+{pct(c.gainPct)}</td>
                  <td className="r">{inr(c.rent)}{!c.auto.rent && <i className="ovr">•</i>}</td>
                  <td className="r">{inrShort(c.corpus)}{!c.auto.corpus && <i className="ovr">•</i>}</td>
                  <td className="r">{inr(c.shifting)}</td>
                  <td className="r">{inr(c.brokerage)}</td>
                  <td className="r"><b>{inrShort(c.totalPayout)}</b></td>
                  <td><ConsentBadge v={m.consent} /></td>
                  <MobileCell m={m} a={a} />
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan="4">{bf === 'All' ? `Total · ${k.total} members` : `Society total · ${k.total} members`}</td><td className="r">{Math.round(k.existing).toLocaleString('en-IN')}</td><td className="r">{Math.round(k.proposed).toLocaleString('en-IN')}</td><td className="r up">+{pct(k.gainPct)}</td><td className="r">{inrShort(k.rent)}</td><td className="r">{inrShort(k.corpus)}</td><td className="r">{inrShort(k.shifting)}</td><td className="r">{inrShort(k.brokerage)}</td><td className="r">{inrShort(k.totalPayout)}</td><td>{k.yes}/{k.total}</td><td>{`${s.members.filter(x => cleanMobile(x.phone).length === 10).length}/${k.total} added`}</td></tr></tfoot>
          </table>
        </div>
      )}
      <p className="footnote">Areas in sq.ft (carpet). <i className="ovr">•</i> marks a custom value that overrides the standard terms.</p>
    </div>
  );
}

function MemberEditor({ s, a, id, close }) {
  const existing = s.members.find(m => m.id === id);
  const [d, setD] = React.useState(() => existing ? { ...existing } : { name: '', bldg: '', bname: '', flat: '', phone: '', existing: '', proposed: null, rent: null, corpus: null, consent: 'pending', votedAt: null });
  const set = (k, v) => setD(p => ({ ...p, [k]: v === '' && ['proposed', 'rent', 'corpus'].includes(k) ? null : v }));
  const c = calcMember(d, s.terms);
  const phoneOk = !String(d.phone || '').trim() || validMobile(cleanMobile(d.phone));
  const valid = d.flat.trim() && num(d.existing) > 0 && phoneOk;
  const save = () => { if (!valid) return; a.saveMember({ ...d, existing: num(d.existing), proposed: has(d.proposed) ? num(d.proposed) : null, rent: has(d.rent) ? num(d.rent) : null, corpus: has(d.corpus) ? num(d.corpus) : null }); close(); };
  const del = () => { if (confirm(`Remove ${d.name || d.flat}?`)) { a.deleteMember(id); close(); } };
  return (
    <div className="page">
      <div className="back-row"><button className="linkbtn" onClick={close}><Ico n="chevL" s={18} /> All members</button></div>
      <PageHead title={existing ? `${d.bldg ? d.bldg + ' · ' : ''}${d.flat || 'Flat'} · ${d.name || 'Member'}` : 'Add member'} sub="Leave a field blank to use the society's standard terms.">
        {existing && <Btn icon="trash" onClick={del}>Remove</Btn>}
        <Btn icon="print" onClick={() => window.print()}>Print statement</Btn>
        {existing && <a className="btn btn-wa" href={waLink(d.phone, statementText(s, d))} target="_blank" rel="noopener"><Ico n="share" s={18} /><span>WhatsApp statement</span></a>}
        <Btn kind="primary" icon="check" onClick={save} disabled={!valid}>{existing ? 'Save changes' : 'Add member'}</Btn>
      </PageHead>
      <div className="editor">
        <div className="panel no-print">
          <h2>Member details</h2>
          <div className="form-grid">
            <Field label="Bldg No." value={d.bldg || ''} onChange={v => set('bldg', v)} placeholder="e.g. Bldg 1 / Wing A" />
            <Field label="Building name" value={d.bname || ''} onChange={v => set('bname', v)} placeholder="e.g. Sunshine Tower" />
            <Field label="Flat number" value={d.flat} onChange={v => set('flat', v)} placeholder="A-101" />
            <Field label="Member name" value={d.name} onChange={v => set('name', v)} placeholder="Full name" />
            <Field label="Mobile number" prefix="+91" type="tel" value={d.phone} onChange={v => set('phone', v.replace(/[^\d]/g, '').slice(0, 10))} placeholder="10-digit mobile" hint={phoneOk ? 'Used for WhatsApp and to verify the member at first login' : 'Enter a full 10-digit mobile starting with 6–9, or leave blank'} />
            <Field label="Consent" hint="Only the member can vote, from their own login.">
              <span className={`badge b-${d.consent}`} style={{ alignSelf: 'flex-start', padding: '9px 12px' }}>{{ yes: 'Consented', no: 'Objected', pending: 'Not voted yet' }[d.consent]}</span>
            </Field>
          </div>
          <h2 className="mt">Area</h2>
          <div className="form-grid">
            <Field label="Existing carpet area" type="number" suffix="sq.ft" value={d.existing} onChange={v => set('existing', v)} placeholder="e.g. 480" />
            <Field label="Proposed carpet area" type="number" suffix="sq.ft" value={d.proposed} onChange={v => set('proposed', v)} placeholder={String(c.autoValues.proposed)} auto={!has(d.proposed)} onReset={() => set('proposed', '')} hint={`Standard: +${s.terms.areaGainPct}% = ${c.autoValues.proposed} sq.ft`} />
          </div>
          <h2 className="mt">Payments</h2>
          <div className="form-grid">
            <Field label="Monthly rent (Year 1)" type="number" prefix="₹" value={d.rent} onChange={v => set('rent', v)} placeholder={String(c.autoValues.rent)} auto={!has(d.rent)} onReset={() => set('rent', '')} hint={`Escalates ${s.terms.escalationPct}% every year`} />
            <Field label="Corpus fund" type="number" prefix="₹" value={d.corpus} onChange={v => set('corpus', v)} placeholder={String(c.autoValues.corpus)} auto={!has(d.corpus)} onReset={() => set('corpus', '')} />
          </div>
        </div>
        <Statement s={s} m={d} c={c} />
      </div>
    </div>
  );
}

function Statement({ s, m, c }) {
  const t = s.terms;
  return (
    <div className="panel statement">
      <div className="st-head">
        <div><span className="eyebrow">Entitlement statement</span><h2>{m.flat || '—'} · {m.name || '—'}</h2><p>{m.bldg ? `Bldg No. ${m.bldg} · ` : ''}{m.bname ? `${m.bname} · ` : ''}{s.society.name}</p></div>
        <ConsentBadge v={m.consent} />
      </div>
      <div className="st-area">
        <div><span>Existing</span><b>{sqft(c.existing)}</b></div>
        <Ico n="chevR" s={22} c="var(--ink-faint)" />
        <div><span>Proposed</span><b className="t-primary">{sqft(c.proposed)}</b></div>
        <div className="st-gain">+{Math.round(c.gain)} sq.ft<br /><small>+{pct(c.gainPct)}</small></div>
      </div>
      <table className="st-tbl">
        <thead><tr><th>Rent year</th><th className="r">Months</th><th className="r">Monthly</th><th className="r">Total</th></tr></thead>
        <tbody>{c.schedule.map(r => <tr key={r.year}><td>Year {r.year}{r.year > 1 && <small> · +{t.escalationPct}%</small>}</td><td className="r">{r.months}</td><td className="r">{inr(r.monthly)}</td><td className="r">{inr(r.total)}</td></tr>)}</tbody>
      </table>
      <dl className="st-sum">
        <dt>Total transit rent ({t.rentMonths} months)</dt><dd>{inr(c.totalRent)}</dd>
        <dt>Corpus fund</dt><dd>{inr(c.corpus)}</dd>
        <dt>Shifting ({inr(t.shiftingAmount)} × {t.shiftingTimes})</dt><dd>{inr(c.shifting)}</dd>
        <dt>Brokerage ({t.brokerageMonths} month rent)</dt><dd>{inr(c.brokerage)}</dd>
        <dt className="tot">Total payout</dt><dd className="tot">{inr(c.totalPayout)}</dd>
      </dl>
      <p className="footnote">Prepared by {s.society.pmc || 'PMC'} · Developer: {s.society.developer || '—'} · Subject to final PAAA.</p>
    </div>
  );
}

export { Dashboard, MobileCell, Members, MemberEditor, Statement };
