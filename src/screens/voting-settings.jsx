// screens/voting-settings.jsx — Voting, PresentMode, Settings
import React from 'react';
import { Btn, ConsentBar, Field, Ico, LiveDot, PageHead, Ring, Seg } from '../components/ui';
import { ROLE_LABEL, calcMember, calcSociety, downloadBlob, fmtDate, inr, num, pct, pickFile, reminderText, slug, sqft, waLink } from '../lib/data';
import { exportFilesMap, importFilesMap } from '../lib/files';
import { CodeField, checkCode, isLicensed, makeLicense, verifyCode } from '../lib/license';

function Voting({ s, a, present }) {
  const [f, setF] = React.useState('all');
  const [q, setQ] = React.useState('');
  const k = calcSociety(s);
  const t = s.terms;
  const [remind, setRemind] = React.useState(false);
  const pendList = s.members.filter(m => m.consent === 'pending');
  const list = s.members.filter(m => (f === 'all' || m.consent === f) && (!q || (m.name + ' ' + m.flat).toLowerCase().includes(q.toLowerCase())));
  const [ns, setNs] = React.useState(null);
  const createSociety = () => {
    if (!ns.name.trim()) return;
    if (!confirm(`Create "${ns.name.trim()}" as a new society? The current society's members, votes, notices and plans will be cleared on this device. Download a backup first if you need them.`)) return;
    a.startBlank({ name: ns.name.trim(), location: ns.location.trim(), regNo: ns.regNo.trim(), developer: ns.developer.trim() });
    setNs(null);
  };
  return (
    <div className="page">
      <PageHead title="Consent voting" sub={`${t.consentThreshold}% of members must consent · closes ${fmtDate(t.deadline)} · view only`}>
        <LiveDot label="Live tally" />
        <Btn icon="share" onClick={() => setRemind(!remind)}>{`Send reminders (${pendList.length})`}</Btn>
        <Btn icon="screen" onClick={present}>Present on screen</Btn>
      </PageHead>
      <div className={`vote-hero ${k.reached ? 'ok' : ''}`}>
        <div className="vh-num"><b>{pct(k.pct, 0)}</b><span>{k.yes} of {k.total} consented</span></div>
        <div className="vh-bar">
          <ConsentBar yes={k.yes} no={k.no} total={k.total} threshold={num(t.consentThreshold)} />
          <div className="vh-status">{k.total === 0 ? 'Add members to start voting' : k.reached ? `Majority reached — ${k.yes} consents against ${k.required} required` : `${k.needed} more consent${k.needed === 1 ? '' : 's'} needed (${k.required} of ${k.total})`}</div>
        </div>
        <div className="vh-counts"><span className="t-yes">{k.yes} consent</span><span className="t-no">{k.no} object</span><span>{k.pending} pending</span></div>
      </div>
      <div className="lock-note"><Ico n="lock" s={18} c="currentColor" /><span>Votes can be cast only by each member from their own login. The committee and PMC cannot vote for any flat — committee members and office bearers vote from their own flat login.</span></div>
      {remind && (
        <div className="panel">
          <div className="panel-head"><h2>WhatsApp reminders · members yet to vote</h2><Btn small icon="x" onClick={() => setRemind(false)}>Close</Btn></div>
          {pendList.length === 0 ? <p className="muted">Everyone has voted.</p> : <div className="rem-grid">{pendList.map(m => { const ph = String(m.phone || '').replace(/\D/g, ''); return <div key={m.id} className="rem"><div><b>{m.flat}</b><span>{m.name}</span></div>{ph ? <a className="btn btn-wa btn-sm" href={waLink(m.phone, reminderText(s, m))} target="_blank" rel="noopener"><Ico n="share" s={15} /><span>Send</span></a> : <span className="muted">No phone</span>}</div>; })}</div>}
          <p className="footnote">Each button opens WhatsApp with a ready-written reminder. Add phone numbers in Members.</p>
        </div>
      )}
      <div className="toolbar">
        <Seg value={f} onChange={setF} options={[['all', `All ${k.total}`], ['pending', `Pending ${k.pending}`], ['yes', `Consented ${k.yes}`], ['no', `Objected ${k.no}`]]} />
        <div className="search"><Ico n="search" s={18} /><input placeholder="Find flat or name…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      <div className="vgrid">
        {list.map(m => (
          <div key={m.id} className={`vtile v-${m.consent}`}>
            <div className="vt-top"><b>{m.flat}</b>{m.votedAt && <small>{(m.votedBy === 'member' ? 'Online · ' : '') + new Date(m.votedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>}</div>
            <div className="vt-name">{m.name || '—'}</div>
            <div className={`vt-status vs-${m.consent}`}>{{ yes: 'Consented', no: 'Objected', pending: 'Not voted yet' }[m.consent]}{m.consent !== 'pending' && m.votedBy !== 'member' ? ' · earlier record' : ''}</div>
            {m.kyc && m.kyc.role !== 'member' && <span className="vt-role">{ROLE_LABEL[m.kyc.role]}</span>}
          </div>
        ))}
        {list.length === 0 && <p className="footnote">No members match.</p>}
      </div>
    </div>
  );
}

function PresentMode({ s, close }) {
  const k = calcSociety(s);
  const t = s.terms;
  React.useEffect(() => { const h = e => e.key === 'Escape' && close(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [close]);
  return (
    <div className="present">
      <button className="present-x" onClick={close}><Ico n="x" s={22} c="#fff" /></button>
      <div className="pr-head"><span className="eyebrow light">{s.society.name}</span><h1>Redevelopment consent</h1><LiveDot label="Live" /></div>
      <div className="pr-main">
        <Ring value={k.pct} threshold={num(t.consentThreshold)} light size={300} stroke={24} />
        <div className="pr-side">
          <div className="pr-big">{k.yes}<span> / {k.total}</span></div>
          <div className="pr-msg">{k.reached ? `${t.consentThreshold}% majority reached` : `${k.needed} more consent${k.needed === 1 ? '' : 's'} needed`}</div>
          <div className="pr-counts"><span><i className="d yes"></i>{k.yes} consented</span><span><i className="d no"></i>{k.no} objected</span><span><i className="d pe"></i>{k.pending} pending</span></div>
        </div>
      </div>
      <div className="pr-grid">{s.members.map(m => <span key={m.id} className={`pr-cell c-${m.consent}`}>{m.flat}</span>)}</div>
    </div>
  );
}

function Settings({ s, a }) {
  const so = s.society, t = s.terms;
  const S = (k) => v => a.setSociety({ [k]: v });
  const T = (k) => v => a.setTerms({ [k]: v });
  const ex = calcMember({ existing: 500 }, t);
  const backup = async withFiles => { const out = { ...s }; if (withFiles) out.__files = await exportFilesMap(s); downloadBlob(JSON.stringify(out), `${slug(so.name)}-backup${withFiles ? '-with-files' : ''}.json`, 'application/json'); };
  const restore = () => pickFile('.json,application/json', async text => {
    let d; try { d = JSON.parse(text); if (!d.members) throw 0; } catch (e) { return alert('That file is not a valid backup.'); }
    const nm = (d.society && d.society.name) || '';
    const okLic = d.license && d.license.code !== 'LEGACY' && verifyCode(d.license.code, d.license.society);
    if (!okLic) { const c = prompt(`This backup of "${nm}" has no PMC activation. Enter the PMC activation code for "${nm}" to restore it:`); if (c === null) return; const err = checkCode(c, nm); if (err) return alert(err); d.license = makeLicense(c, nm); }
    if (confirm(`Replace all data with "${nm || 'backup'}" (${d.members.length} members)?`)) { if (d.__files) await importFilesMap(d.__files); delete d.__files; a.replaceAll(d); }
  });
  const lic = isLicensed(s);
  const [ns, setNs] = React.useState(null);
  const blankNs = () => ({ name: '', location: '', regNo: '', developer: '', code: '' });
  React.useEffect(() => { window.__openActivate = () => setNs(blankNs()); return () => { window.__openActivate = null; }; }, []);
  const nsErr = ns ? checkCode(ns.code, ns.name) : null;
  const createSociety = () => {
    if (nsErr) return alert(nsErr);
    if (!confirm(`Create "${ns.name.trim()}" as a new society? The current society's members, votes, notices and plans will be cleared on this device. Download a backup first if you need them.`)) return;
    if (a.startBlank({ name: ns.name.trim(), location: ns.location.trim(), regNo: ns.regNo.trim(), developer: ns.developer.trim() }, ns.code) !== false) setNs(null);
  };
  return (
    <div className="page">
      <PageHead title="Society & offer terms" sub="Changes save automatically and update every member instantly." />
      <div className="cols cols-wide">
        <div className="stack">
          <div className="panel">
            <div className="panel-head"><h2>Society</h2>{!ns && <Btn small kind="primary" icon="plus" onClick={() => setNs(blankNs())}>{lic ? 'New society' : 'Activate society'}</Btn>}</div>
            {ns && <div className="ns-box">
              <h3>{lic ? 'Start a new society' : 'Activate your society'}</h3>
              <p className="muted">A society can only be started with an activation code issued by the PMC. Enter the society name exactly as given to the PMC — the code works for that name only.</p>
              <CodeField value={ns.code} onChange={v => setNs({ ...ns, code: v })} name={ns.name} />
              <div className="form-grid">
                <Field label="New society name" value={ns.name} onChange={v => setNs({ ...ns, name: v })} placeholder="e.g. Shanti Niketan CHS Ltd." />
                <Field label="Location" value={ns.location} onChange={v => setNs({ ...ns, location: v })} placeholder="Area, City" />
                <Field label="Registration no." value={ns.regNo} onChange={v => setNs({ ...ns, regNo: v })} placeholder="Optional" />
                <Field label="Developer" value={ns.developer} onChange={v => setNs({ ...ns, developer: v })} placeholder="Optional" />
              </div>
              <div className="row-gap" style={{ justifyContent: 'flex-start', margin: 0 }}><Btn kind="primary" icon="check" disabled={!!nsErr} onClick={createSociety}>{lic ? 'Create society' : 'Activate & create society'}</Btn><Btn onClick={() => setNs(null)}>Cancel</Btn></div>
            </div>}
            <div className={`lic-row ${lic ? 'ok' : ''}`}><Ico n="lock" s={17} c={lic ? 'var(--mint)' : '#A86A00'} /><span>{lic ? (s.license.code === 'LEGACY' ? 'Activated (set up before activation codes were introduced)' : `Activated with PMC code ${s.license.code} · ${new Date(s.license.activatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`) : 'Not activated — demo data only. Get an activation code from the PMC.'}</span></div>
            <div className="form-grid">
              <Field label="Society name" value={so.name} onChange={() => {}} readOnly hint="Fixed by the PMC activation code" />
              <Field label="Location" value={so.location} onChange={S('location')} placeholder="Area, City" />
              <Field label="Registration no." value={so.regNo} onChange={S('regNo')} placeholder="Optional" />
              <Field label="Developer" value={so.developer} onChange={S('developer')} placeholder="Selected developer" />
              <Field label="PMC" value={so.pmc} onChange={S('pmc')} />
            </div>
          </div>
          <div className="panel">
            <h2>Area & rent</h2>
            <div className="form-grid">
              <Field label="Area increase" type="number" suffix="%" value={t.areaGainPct} onChange={T('areaGainPct')} hint="Applied to existing carpet area" />
              <Field label="Rent calculated"><Seg value={t.rentMode} onChange={T('rentMode')} options={[['sqft', 'Per sq.ft'], ['flat', 'Fixed per flat']]} /></Field>
              {t.rentMode === 'sqft'
                ? <Field label="Rent rate" type="number" prefix="₹" suffix="/ sq.ft / mo" value={t.rentRate} onChange={T('rentRate')} />
                : <Field label="Rent per flat" type="number" prefix="₹" suffix="/ mo" value={t.rentFixed} onChange={T('rentFixed')} />}
              <Field label="Yearly rent increase" type="number" suffix="% / yr" value={t.escalationPct} onChange={T('escalationPct')} />
              <Field label="Rent period" type="number" suffix="months" value={t.rentMonths} onChange={T('rentMonths')} hint="Construction period" />
            </div>
          </div>
          <div className="panel">
            <h2>Corpus, shifting & brokerage</h2>
            <div className="form-grid">
              <Field label="Corpus calculated"><Seg value={t.corpusMode} onChange={T('corpusMode')} options={[['sqft', 'Per sq.ft'], ['flat', 'Fixed per flat']]} /></Field>
              {t.corpusMode === 'sqft'
                ? <Field label="Corpus rate" type="number" prefix="₹" suffix="/ sq.ft" value={t.corpusRate} onChange={T('corpusRate')} />
                : <Field label="Corpus per flat" type="number" prefix="₹" value={t.corpusFixed} onChange={T('corpusFixed')} />}
              <Field label="Shifting allowance" type="number" prefix="₹" value={t.shiftingAmount} onChange={T('shiftingAmount')} />
              <Field label="Times paid" type="number" suffix="×" value={t.shiftingTimes} onChange={T('shiftingTimes')} hint="Usually 2 — moving out and back" />
              <Field label="Brokerage" type="number" suffix="month(s) rent" value={t.brokerageMonths} onChange={T('brokerageMonths')} />
            </div>
          </div>
          <div className="panel">
            <h2>Consent</h2>
            <div className="form-grid">
              <Field label="Majority required" type="number" suffix="%" value={t.consentThreshold} onChange={T('consentThreshold')} hint="51% under Maharashtra co-op guidelines" />
              <Field label="Voting deadline" type="date" value={t.deadline} onChange={T('deadline')} />
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="panel sticky">
            <h2>Example · 500 sq.ft flat</h2>
            <dl className="terms">
              <dt>New carpet area</dt><dd>{sqft(ex.proposed)}</dd>
              <dt>Rent · Year 1</dt><dd>{inr(ex.rent)} / mo</dd>
              {ex.schedule.length > 1 && <><dt>Rent · Year {ex.schedule.length}</dt><dd>{inr(ex.schedule[ex.schedule.length - 1].monthly)} / mo</dd></>}
              <dt>Total rent</dt><dd>{inr(ex.totalRent)}</dd>
              <dt>Corpus</dt><dd>{inr(ex.corpus)}</dd>
              <dt>Shifting + brokerage</dt><dd>{inr(ex.shifting + ex.brokerage)}</dd>
              <dt className="tot">Total payout</dt><dd className="tot">{inr(ex.totalPayout)}</dd>
            </dl>
          </div>
          <div className="panel">
            <h2>Data</h2>
            <p className="muted">Data is saved in this browser. Download a backup to move it to another device or share it with the committee.</p>
            <div className="btn-col">
              <Btn icon="download" onClick={() => backup(true)}>Download backup (with files)</Btn>
              <Btn icon="download" onClick={() => backup(false)}>Download backup (data only)</Btn>
              <Btn icon="upload" onClick={restore}>Restore from backup</Btn>
              <Btn icon="file" onClick={() => confirm('Replace current data with the sample society?') && a.loadSample()}>Load sample society</Btn>
              <Btn icon="plus" onClick={() => { setNs({ name: '', location: '', regNo: '', developer: '' }); window.scrollTo(0, 0); const mn = document.querySelector('.main'); if (mn) mn.scrollTop = 0; }}>Start new society</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Voting, PresentMode, Settings };
