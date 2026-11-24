// lib/data.js — store, calculations, import/export
import React from 'react';
import { delFile } from './files';
import { isLicensed, makeLicense, verifyCode } from './license';

const SRM_KEY = window.SRM_KEY_OVERRIDE || 'srm_society_v1';

const DEFAULT_TERMS = {
  areaGainPct: 30,
  rentMode: 'sqft', rentRate: 70, rentFixed: 40000,
  escalationPct: 5, rentMonths: 36,
  corpusMode: 'sqft', corpusRate: 2000, corpusFixed: 1000000,
  shiftingAmount: 25000, shiftingTimes: 2,
  brokerageMonths: 1,
  consentThreshold: 51, deadline: '2026-12-15',
};

const STAGE_DEFS = [
  ['committee', 'Committee & General Body', 'Committee formed; general body resolves to redevelop.', 'Members elect a Redevelopment Committee and hold a Special General Body Meeting (SGBM) to pass the resolution to pursue redevelopment under co-operative housing rules.', ['Redevelopment committee elected', 'Special General Body Meeting (SGBM) held', 'Resolution to redevelop passed', 'Scope and ground rules ratified']],
  ['pmc', 'PMC appointment', 'Independent consultant appointed to run the process.', 'The society invites quotations from Project Management Consultants and appoints one in the general body to manage feasibility, tendering, agreements and construction monitoring.', ['Quotations from consultants invited', 'PMC selected in general body', 'PMC agreement signed', 'Member helpdesk set up']],
  ['survey', 'Survey & feasibility', 'Structural audit, measurement and FSI study.', 'A registered structural engineer audits the building, every flat is measured, land records are checked and the FSI / TDR potential is modelled to size member entitlements.', ['Structural audit by registered engineer', 'All flats measured and verified', 'Title and land records checked', 'FSI / TDR feasibility report prepared', 'Report presented to members']],
  ['tender', 'Tender & developer selection', 'Bids invited, compared and shortlisted.', 'A tender based on the feasibility report is advertised. Bids are opened before members, compared side by side, and the best offers are shortlisted for presentation.', ['Tender document approved by members', 'Tender advertised', 'Bids opened before members', 'Comparative statement prepared', 'Developers shortlisted and presented']],
  ['consent', 'Member consent', 'Members approve the developer and terms.', 'Each member receives their entitlement statement and records written consent. The required majority of members must consent before the developer is confirmed in the general body.', ['Offer and draft terms shared with members', 'Individual entitlement statements issued', 'Written consent collected', 'Majority consent reached', 'Developer confirmed in SGBM']],
  ['agreement', 'Development Agreement & PAAA', 'Registered DA and individual PAAA for each member.', 'The society signs a registered Development Agreement with the developer. Each member signs a Permanent Alternate Accommodation Agreement fixing area, rent, corpus and timelines.', ['Draft DA reviewed by society advocate', 'Development Agreement registered', 'Individual PAAA signed and registered', 'Bank guarantee received', 'Project registered on MahaRERA']],
  ['vacate', 'Vacating & transit rent', 'Allowances paid; flats handed over; demolition.', 'Rent, shifting allowance and brokerage are paid in advance. Members move to temporary homes and hand over their flats; demolition follows.', ['Rent and shifting allowance paid in advance', 'Brokerage paid', 'Members vacate flats', 'Possession handed to developer', 'Demolition begins']],
  ['construct', 'Approvals & construction', 'Approvals, RERA and tracked construction.', 'The developer obtains IOD and Commencement Certificate, then builds. The PMC monitors quality and progress at each milestone.', ['IOD / plans approved', 'Commencement Certificate received', 'Plinth completed', 'Superstructure and slabs completed', 'Finishing and amenities', 'Quality audits by PMC']],
  ['possession', 'Possession & OC', 'OC received; new homes handed over; corpus paid.', 'After the Occupation Certificate, flats are allotted as agreed, members receive possession of their new homes and the corpus fund is paid.', ['Occupation Certificate received', 'Floor allotment as agreed', 'Possession letters issued', 'Corpus paid to members', 'Society records updated']],
];
const makeStages = doneUpTo => STAGE_DEFS.map(([key, title, blurb, detail, items], i) => ({ key, n: i + 1, title, blurb, detail, status: i < doneUpTo ? 'done' : i === doneUpTo ? 'active' : 'upcoming', date: '', notes: '', items: items.map((text, j) => ({ text, done: i < doneUpTo || (i === doneUpTo && j < 2) })) }));
const DOC_DEFS = [['Structural audit report', 'Survey'], ['Feasibility & FSI report', 'Survey'], ['Member survey & flat measurements', 'Survey'], ['Tender document', 'Tender'], ['Comparative statement of offers', 'Tender'], ['Consent forms', 'Consent'], ['Draft Development Agreement', 'Agreements'], ['PAAA template', 'Agreements'], ['Bank guarantee', 'Agreements'], ['MahaRERA registration', 'Approvals'], ['IOD / Commencement Certificate', 'Approvals'], ['Occupation Certificate', 'Approvals']];
const makeDocs = nVerified => DOC_DEFS.map(([name, category], i) => ({ id: 300 + i, name, category, status: i < nVerified ? 'verified' : i < nVerified + 2 ? 'draft' : 'pending', date: '', link: '', note: '' }));

const mk = (id, name, flat, existing, consent = 'pending') => ({ id, name, flat, bldg: flat.startsWith('B') ? 'Bldg 2' : 'Bldg 1', bname: flat.startsWith('B') ? 'Sunrise Tower' : 'Sunshine Tower', existing, proposed: null, rent: null, corpus: null, phone: '', consent, votedAt: consent === 'pending' ? null : Date.now() - id * 3600e3 });

const SAMPLE_STATE = {
  society: { name: 'Sunshine Co-op Housing Society', location: 'Andheri West, Mumbai', pmc: 'Akbar Jiwani & Associates', developer: 'Meridian Realty', regNo: 'BOM/HSG/1986/1234' },
  terms: { ...DEFAULT_TERMS },
  members: [
    mk(1, 'Rajesh Mehta', 'A-101', 480, 'yes'), mk(2, 'Farida Shaikh', 'A-102', 480, 'yes'),
    mk(3, 'Suresh Iyer', 'A-201', 520), mk(4, 'Anjali Desai', 'A-202', 520, 'yes'),
    mk(5, 'Mohammed Ansari', 'A-301', 610, 'yes'), mk(6, 'Kavita Joshi', 'A-302', 610),
    mk(7, 'Prakash Patil', 'B-101', 450, 'no'), mk(8, 'Nirmala Rao', 'B-102', 450, 'yes'),
    mk(9, 'Vikram Shah', 'B-201', 560), mk(10, 'Sunita Kulkarni', 'B-202', 560, 'yes'),
    mk(11, 'Imran Khan', 'B-301', 640), mk(12, 'Deepa Nair', 'B-302', 640, 'yes'),
  ],
  offers: [
    { id: 101, name: 'Skyline Habitat', ...DEFAULT_TERMS, areaGainPct: 25, rentRate: 65, corpusRate: 1800, rentMonths: 33 },
    { id: 102, name: 'Anchor Developers', ...DEFAULT_TERMS, areaGainPct: 22, rentRate: 60, corpusRate: 1500, rentMonths: 30, shiftingAmount: 20000 },
  ],
  payments: { 1: { rentMonths: 3, shifting: 1, brokerage: true, corpus: false }, 2: { rentMonths: 3, shifting: 1, brokerage: true, corpus: false } },
  meetings: [{ id: 201, date: '2026-09-20', type: 'SGBM', title: 'Special General Body Meeting — developer selection', attendees: [1, 2, 4, 5, 7, 8, 10, 12], minutes: 'PMC presented comparison of three shortlisted offers. Members raised questions on rent escalation and corpus timing.', resolutions: 'Resolved to seek written consent of members for Meridian Realty offer.' }],
  log: [],
  stages: makeStages(4),
  documents: makeDocs(5),
  notices: [
    { id: 401, title: 'Notice of Special General Body Meeting', category: 'Meeting notice', date: '2026-09-10', body: 'All members are requested to attend the SGBM on 20 September 2026 at 6:30 pm in the society compound to discuss developer selection.', pinned: false },
    { id: 402, title: 'Consent forms now open', category: 'Circular', date: '2026-10-01', body: 'Members may record their written consent with the committee. Personal entitlement statements are available on request.', pinned: true },
  ],
  plans: [],
};

const BLANK_STATE = {
  society: { name: 'New Housing Society', location: '', pmc: 'Akbar Jiwani & Associates', developer: '', regNo: '' },
  terms: { ...DEFAULT_TERMS }, members: [], offers: [], payments: {}, meetings: [], log: [], stages: makeStages(0), documents: makeDocs(0), notices: [], plans: [],
};
const EXTRA_DEFAULTS = { offers: [], payments: {}, meetings: [], log: [], stages: makeStages(0), documents: makeDocs(0), notices: [], plans: [], auth: { admin: null, recovery: null, members: {} } };
const stageProgress = s => { const st = s.stages || []; const all = st.reduce((a, x) => a + x.items.length, 0); const done = st.reduce((a, x) => a + x.items.filter(i => i.done).length, 0); const active = st.find(x => x.status === 'active') || st.find(x => x.status === 'upcoming') || st[st.length - 1]; return { pct: all ? (done / all) * 100 : 0, done, all, active, doneStages: st.filter(x => x.status === 'done').length }; };

function rentPaid(c, months) {
  let left = Math.max(0, Math.round(num(months))), sum = 0;
  for (const r of c.schedule) { const m = Math.min(left, r.months); sum += m * r.monthly; left -= m; if (!left) break; }
  return sum;
}
function paymentStatus(m, c, s) {
  const p = (s.payments || {})[m.id] || {};
  const months = Math.min(num(p.rentMonths), num(s.terms.rentMonths));
  const paidRent = rentPaid(c, months);
  const shiftPaid = Math.min(num(p.shifting), num(s.terms.shiftingTimes)) * num(s.terms.shiftingAmount);
  const paid = paidRent + shiftPaid + (p.brokerage ? c.brokerage : 0) + (p.corpus ? c.corpus : 0);
  return { months, paidRent, shiftPaid, brokerage: !!p.brokerage, corpus: !!p.corpus, shiftCount: num(p.shifting), paid, outstanding: c.totalPayout - paid };
}

function statementText(s, m) {
  const c = calcMember(m, s.terms), t = s.terms;
  return [`*${s.society.name}* — Redevelopment entitlement`, `${m.bldg ? m.bldg + ' · ' : ''}${m.bname ? m.bname + ' · ' : ''}Flat ${m.flat}${m.name ? ' · ' + m.name : ''}`, '',
    `Existing area: ${sqft(c.existing)}`, `New area: ${sqft(c.proposed)} (+${pct(c.gainPct)})`, '',
    `Transit rent: ${inr(c.rent)}/month, +${t.escalationPct}% yearly, ${t.rentMonths} months`, `Total rent: ${inr(c.totalRent)}`,
    `Corpus: ${inr(c.corpus)}`, `Shifting: ${inr(c.shifting)}`, `Brokerage: ${inr(c.brokerage)}`, `*Total payout: ${inr(c.totalPayout)}*`, '',
    `Developer: ${s.society.developer || '—'} · PMC: ${s.society.pmc || '—'}`].join('\n');
}
function reminderText(s, m) {
  return `Dear ${m.name || 'Member'} (Flat ${m.flat}), this is a reminder to record your consent for the redevelopment of ${s.society.name} before ${fmtDate(s.terms.deadline)}. Please contact the committee or PMC (${s.society.pmc || ''}) for any questions. Thank you.`;
}
function waLink(phone, text) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
function dataChecks(s) {
  const issues = [];
  const seen = {};
  s.members.forEach(m => { const f = (m.flat || '').trim().toUpperCase(); if (f) { if (seen[f]) issues.push(['dup', `Flat ${m.flat} appears more than once`, m.id]); seen[f] = 1; } });
  s.members.forEach(m => { if (!(num(m.existing) > 0)) issues.push(['area', `${m.flat || 'A member'} has no existing area`, m.id]); });
  s.members.forEach(m => { if (!m.name) issues.push(['name', `${m.flat || 'A member'} has no name`, m.id]); });
  const noPhone = s.members.filter(m => !String(m.phone || '').replace(/\D/g, '')).length;
  if (noPhone) issues.push(['phone', `${noPhone} member${noPhone === 1 ? '' : 's'} without a phone number — WhatsApp sharing unavailable`, null]);
  if (!s.society.developer) issues.push(['dev', 'Developer name is not set', null]);
  return issues;
}

// ── calculations ──
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
const has = v => v !== null && v !== undefined && v !== '';

function calcMember(m, t) {
  const existing = num(m.existing);
  const autoProposed = Math.round(existing * (1 + num(t.areaGainPct) / 100));
  const proposed = has(m.proposed) ? num(m.proposed) : autoProposed;
  const autoRent = t.rentMode === 'flat' ? num(t.rentFixed) : Math.round(existing * num(t.rentRate));
  const rent = has(m.rent) ? num(m.rent) : autoRent;
  const autoCorpus = t.corpusMode === 'flat' ? num(t.corpusFixed) : Math.round(existing * num(t.corpusRate));
  const corpus = has(m.corpus) ? num(m.corpus) : autoCorpus;
  const shifting = num(t.shiftingAmount) * num(t.shiftingTimes);
  const brokerage = Math.round(rent * num(t.brokerageMonths));
  const schedule = [];
  let left = Math.max(0, Math.round(num(t.rentMonths)));
  let y = 1;
  while (left > 0) {
    const months = Math.min(12, left);
    const monthly = Math.round(rent * Math.pow(1 + num(t.escalationPct) / 100, y - 1));
    schedule.push({ year: y, months, monthly, total: monthly * months });
    left -= months; y++;
  }
  const totalRent = schedule.reduce((a, r) => a + r.total, 0);
  return {
    existing, proposed, gain: proposed - existing, gainPct: existing ? ((proposed - existing) / existing) * 100 : 0,
    rent, corpus, shifting, brokerage, schedule, totalRent,
    totalPayout: totalRent + corpus + shifting + brokerage,
    auto: { proposed: !has(m.proposed), rent: !has(m.rent), corpus: !has(m.corpus) },
    autoValues: { proposed: autoProposed, rent: autoRent, corpus: autoCorpus },
  };
}

function calcSociety(s) {
  const rows = s.members.map(m => ({ m, c: calcMember(m, s.terms) }));
  const sum = k => rows.reduce((a, r) => a + r.c[k], 0);
  const total = s.members.length;
  const yes = s.members.filter(m => m.consent === 'yes').length;
  const no = s.members.filter(m => m.consent === 'no').length;
  const pending = total - yes - no;
  const required = Math.ceil((num(s.terms.consentThreshold) / 100) * total);
  const existing = sum('existing'), proposed = sum('proposed');
  return {
    rows, total, yes, no, pending, required,
    pct: total ? (yes / total) * 100 : 0,
    reached: total > 0 && yes >= required,
    needed: Math.max(0, required - yes),
    existing, proposed, gainPct: existing ? ((proposed - existing) / existing) * 100 : 0,
    rent: sum('rent'), corpus: sum('corpus'), shifting: sum('shifting'), brokerage: sum('brokerage'),
    totalRent: sum('totalRent'), totalPayout: sum('totalPayout'),
  };
}

// ── formatting ──
const inr = n => '₹' + Math.round(num(n)).toLocaleString('en-IN');
const inrShort = n => {
  n = num(n);
  if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
  return inr(n);
};
const sqft = n => Math.round(num(n)).toLocaleString('en-IN') + ' sq.ft';
const pct = (n, d = 1) => num(n).toFixed(d).replace(/\.0$/, '') + '%';
const fmtDate = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

// ── store with live cross-window sync ──
function mergeKyc(prev, k) {
  const sameRole = prev && prev.role === k.role;
  return { verified: false, ...(prev || {}), ...k, roleConfirmed: sameRole ? !!prev.roleConfirmed : k.role === 'member', completedAt: Date.now() };
}
function loadState() {
  try { const raw = localStorage.getItem(SRM_KEY); if (raw) { const s = JSON.parse(raw);
    if (!s.license && s.society && s.society.name && s.society.name !== SAMPLE_STATE.society.name) s.license = { code: 'LEGACY', society: s.society.name, activatedAt: Date.now() };
    return { ...SAMPLE_STATE, ...EXTRA_DEFAULTS, ...s, terms: { ...DEFAULT_TERMS, ...s.terms } }; } } catch (e) {}
  return JSON.parse(JSON.stringify(SAMPLE_STATE));
}

function useSociety() {
  const [state, setState] = React.useState(loadState);
  const ref = React.useRef(state); ref.current = state;
  const chan = React.useRef(null);
  React.useEffect(() => {
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('srm_live') : null;
    chan.current = bc;
    if (bc) bc.onmessage = e => setState(e.data);
    const onStorage = e => { if (e.key === SRM_KEY && e.newValue) { try { setState(JSON.parse(e.newValue)); } catch (x) {} } };
    window.addEventListener('storage', onStorage);
    return () => { bc && bc.close(); window.removeEventListener('storage', onStorage); };
  }, []);
  const history = React.useRef([]);
  const [undoLabel, setUndoLabel] = React.useState(null);
  const commit = React.useCallback((next, msg, isUndo) => {
    if (!isUndo) { history.current.push({ state: ref.current, msg }); if (history.current.length > 30) history.current.shift(); }
    const log = msg ? [{ ts: Date.now(), msg }, ...(next.log || [])].slice(0, 300) : (next.log || []);
    next = { ...next, log, updatedAt: Date.now() };
    const top = history.current[history.current.length - 1];
    setUndoLabel(top ? (top.msg || 'last change') : null);
    try { localStorage.setItem(SRM_KEY, JSON.stringify(next)); } catch (e) {}
    chan.current && chan.current.postMessage(next);
    setState(next);
  }, []);
  const actions = React.useMemo(() => ({
    setSociety: patch => commit({ ...ref.current, society: { ...ref.current.society, ...patch } }, `Society details updated (${Object.keys(patch).join(', ')})`),
    setTerms: patch => commit({ ...ref.current, terms: { ...ref.current.terms, ...patch } }, `Offer terms changed (${Object.keys(patch).join(', ')})`),
    saveMember: m => {
      const list = ref.current.members;
      if (m.id && list.some(x => x.id === m.id)) commit({ ...ref.current, members: list.map(x => x.id === m.id ? m : x) }, `Member ${m.flat} updated`);
      else commit({ ...ref.current, members: [...list, { ...m, id: Date.now() }] }, `Member ${m.flat} added`);
    },
    deleteMember: id => { const m = ref.current.members.find(x => x.id === id); commit({ ...ref.current, members: ref.current.members.filter(x => x.id !== id) }, `Member ${m ? m.flat : ''} removed`); },
    vote: (id, v) => { const m = ref.current.members.find(x => x.id === id); commit({ ...ref.current, members: ref.current.members.map(x => x.id === id ? { ...x, consent: v, votedAt: v === 'pending' ? null : Date.now(), votedBy: v === 'pending' ? null : 'committee' } : x) }, `Vote: ${m ? m.flat : ''} → ${{ yes: 'Consented', no: 'Objected', pending: 'Cleared' }[v]}`); },
    resetVotes: () => commit({ ...ref.current, members: ref.current.members.map(x => ({ ...x, consent: 'pending', votedAt: null, votedBy: null })) }, 'All votes reset'),
    addMembers: arr => commit({ ...ref.current, members: [...ref.current.members, ...arr.map((m, i) => ({ ...m, id: Date.now() + i }))] }, `${arr.length} members imported`),
    replaceAll: s => commit({ ...BLANK_STATE, ...EXTRA_DEFAULTS, ...s, license: s.license && s.license.code !== 'LEGACY' && verifyCode(s.license.code, s.license.society) ? s.license : null, terms: { ...DEFAULT_TERMS, ...(s.terms || {}) } }, 'Data restored from backup'),
    loadSample: () => commit({ ...JSON.parse(JSON.stringify(SAMPLE_STATE)), license: null, auth: { ...(ref.current.auth || {}), members: {} } }, 'Sample society loaded'),
    startBlank: (soc, code) => { if (!verifyCode(code, soc && soc.name)) { alert('A valid PMC activation code is required to start a new society.'); return false; } const b = JSON.parse(JSON.stringify(BLANK_STATE)); commit({ ...b, license: makeLicense(code, soc.name), society: { ...b.society, ...(soc || {}) }, auth: { ...(ref.current.auth || {}), members: {} } }, `New society started${soc && soc.name ? ': ' + soc.name : ''}`); },
    setOtp: patch => { const { label, ...rest } = patch; commit({ ...ref.current, otp: { ...(ref.current.otp || {}), ...rest } }, `OTP delivery set to ${rest.mode === 'gateway' ? 'SMS service' : 'test mode'}`); },
    setAuth: (patch, msg) => commit({ ...ref.current, auth: { admin: null, recovery: null, members: {}, ...(ref.current.auth || {}), ...patch } }, msg),
    setMemberCred: (id, cred, msg) => { const au = ref.current.auth || { members: {} }; const mem = { ...(au.members || {}) }; if (cred) mem[id] = cred; else delete mem[id]; commit({ ...ref.current, auth: { ...au, members: mem } }, msg); },
    registerMember: (id, kyc, cred, msg) => {
      const au = ref.current.auth || { members: {} };
      commit({ ...ref.current, auth: { ...au, members: { ...(au.members || {}), [id]: cred } }, members: ref.current.members.map(x => x.id === id ? { ...x, phone: kyc.mobile, kyc: mergeKyc(x.kyc, kyc) } : x) }, msg);
    },
    saveKyc: (id, kyc, msg) => commit({ ...ref.current, members: ref.current.members.map(x => x.id === id ? { ...x, phone: kyc.mobile, kyc: mergeKyc(x.kyc, kyc) } : x) }, msg),
    setKycFlags: (id, patch, msg) => commit({ ...ref.current, members: ref.current.members.map(x => x.id === id && x.kyc ? { ...x, kyc: { ...x.kyc, ...patch } } : x) }, msg),
    selfVote: (id, v) => { const m = ref.current.members.find(x => x.id === id); if (!m || !['yes', 'no'].includes(v)) return; commit({ ...ref.current, members: ref.current.members.map(x => x.id === id ? { ...x, consent: v, votedAt: Date.now(), votedBy: 'member' } : x) }, `Online vote by member ${m.flat} → ${v === 'yes' ? 'Consented' : 'Objected'}`); },
    setPayment: (id, patch) => { const m = ref.current.members.find(x => x.id === id); const p = ref.current.payments || {}; commit({ ...ref.current, payments: { ...p, [id]: { ...(p[id] || {}), ...patch } } }, `Payment updated for ${m ? m.flat : ''}`); },
    saveOffer: o => { const list = ref.current.offers || []; commit({ ...ref.current, offers: o.id && list.some(x => x.id === o.id) ? list.map(x => x.id === o.id ? o : x) : [...list, { ...o, id: Date.now() }] }, `Offer "${o.name}" saved`); },
    deleteOffer: id => { const o = (ref.current.offers || []).find(x => x.id === id); commit({ ...ref.current, offers: (ref.current.offers || []).filter(x => x.id !== id) }, `Offer "${o ? o.name : ''}" removed`); },
    adoptOffer: o => { const { id, name, ...terms } = o; const cur = { id: Date.now(), name: ref.current.society.developer || 'Previous terms', ...ref.current.terms }; commit({ ...ref.current, terms: { ...ref.current.terms, ...terms, consentThreshold: ref.current.terms.consentThreshold, deadline: ref.current.terms.deadline }, society: { ...ref.current.society, developer: name }, offers: [...(ref.current.offers || []).filter(x => x.id !== id), cur] }, `Adopted offer from ${name}`); },
    saveMeeting: mt => { const list = ref.current.meetings || []; commit({ ...ref.current, meetings: mt.id && list.some(x => x.id === mt.id) ? list.map(x => x.id === mt.id ? mt : x) : [{ ...mt, id: Date.now() }, ...list] }, `Meeting "${mt.title || mt.type}" saved`); },
    setStage: (key, patch) => { const st = ref.current.stages.find(x => x.key === key); commit({ ...ref.current, stages: ref.current.stages.map(x => x.key === key ? { ...x, ...patch } : x) }, patch.status ? `Stage "${st.title}" marked ${patch.status === 'done' ? 'complete' : patch.status === 'active' ? 'in progress' : 'upcoming'}` : `Stage "${st.title}" updated`); },
    toggleStageItem: (key, idx) => { const st = ref.current.stages.find(x => x.key === key); const it = st.items[idx]; commit({ ...ref.current, stages: ref.current.stages.map(x => x.key === key ? { ...x, items: x.items.map((i, j) => j === idx ? { ...i, done: !i.done } : i) } : x) }, `${it.done ? 'Unticked' : 'Completed'}: ${it.text}`); },
    addStageItem: (key, text) => commit({ ...ref.current, stages: ref.current.stages.map(x => x.key === key ? { ...x, items: [...x.items, { text, done: false }] } : x) }, `Step added: ${text}`),
    saveDoc: doc => { const list = ref.current.documents || []; commit({ ...ref.current, documents: doc.id && list.some(x => x.id === doc.id) ? list.map(x => x.id === doc.id ? doc : x) : [...list, { ...doc, id: Date.now() }] }, `Document "${doc.name}" ${doc.status || 'saved'}`); },
    deleteDoc: id => { const doc = ref.current.documents.find(x => x.id === id); commit({ ...ref.current, documents: ref.current.documents.filter(x => x.id !== id) }, `Document "${doc ? doc.name : ''}" removed`); },
    saveItem: (coll, item, label) => { const list = ref.current[coll] || []; const isNew = !(item.id && list.some(x => x.id === item.id)); commit({ ...ref.current, [coll]: isNew ? [{ ...item, id: Date.now() }, ...list] : list.map(x => x.id === item.id ? item : x) }, `${label} "${item.title || item.name}" ${isNew ? 'added' : 'updated'}`); },
    deleteItem: (coll, id, label) => { const it = (ref.current[coll] || []).find(x => x.id === id); if (it && it.fileId) delFile(it.fileId).catch(() => {}); commit({ ...ref.current, [coll]: (ref.current[coll] || []).filter(x => x.id !== id) }, `${label} "${it ? it.title || it.name : ''}" removed`); },
    deleteMeeting: id => commit({ ...ref.current, meetings: (ref.current.meetings || []).filter(x => x.id !== id) }, 'Meeting removed'),
    undo: () => { const h = history.current.pop(); if (!h) return; commit({ ...h.state, log: [{ ts: Date.now(), msg: `Undo: ${h.msg || 'last change'}` }, ...(ref.current.log || [])].slice(0, 300) }, null, true); },
  }), [commit]);
  const guarded = React.useMemo(() => {
    const block = () => { alert('Demo mode — activate the society with the PMC activation code (Society & terms → Activate) before adding or changing members.'); return false; };
    const g = { ...actions };
    ['saveMember', 'addMembers', 'deleteMember'].forEach(k => { g[k] = (...args) => isLicensed(ref.current) ? actions[k](...args) : block(); });
    g.setSociety = patch => { if ('name' in patch && patch.name !== ref.current.society.name) { alert('The society name is fixed by the PMC activation code. To start a different society, use “New society” with a new code from the PMC.'); const { name, ...rest } = patch; if (!Object.keys(rest).length) return; return actions.setSociety(rest); } return actions.setSociety(patch); };
    return g;
  }, [actions]);
  return [state, guarded, undoLabel];
}

// ── files ──
// Android app: files are passed to the native side in chunks and saved to Downloads/Punarvikas
async function nativeSave(blob, filename, open) {
  const B = window.AndroidBridge, CH = 786432;
  const tok = B.begin(filename, blob.type || 'application/octet-stream');
  for (let i = 0; i < blob.size; i += CH) {
    const part = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(blob.slice(i, i + CH)); });
    B.append(tok, part);
  }
  B.finish(tok, !!open);
}
// ── member registration (KYC) ──
const ROLES = [['member', 'Member'], ['committee', 'Committee member'], ['chairman', 'Chairman'], ['secretary', 'Secretary'], ['treasurer', 'Treasurer']];
const ROLE_LABEL = Object.fromEntries(ROLES);
const OFFICE_ROLES = ['chairman', 'secretary', 'treasurer'];
const VH_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VH_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const verhoeffOk = n => { let c = 0; String(n).split('').reverse().forEach((d, i) => { c = VH_D[c][VH_P[i % 8][+d]]; }); return c === 0; };
const validPAN = p => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p);
const validAadhaar = a => /^[2-9][0-9]{11}$/.test(a) && verhoeffOk(a);
const validMobile = m => /^[6-9][0-9]{9}$/.test(m);
const cleanMobile = v => { let d = String(v || '').replace(/\D/g, ''); if (d.length === 12 && d.startsWith('91')) d = d.slice(2); if (d.length === 11 && d.startsWith('0')) d = d.slice(1); return d; };
const maskPan = p => p ? p.slice(0, 2) + 'XXXX' + p.slice(6) : '—';
const maskAadhaar = a => a ? 'XXXX XXXX ' + a.slice(-4) : '—';

function downloadBlob(content, filename, type, open) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  if (window.AndroidBridge) return nativeSave(blob, filename, open);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const slug = s => (s || 'society').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);

function csvEscape(v) { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function exportCSV(s) {
  const head = ['Bldg No.', 'Building name', 'Flat', 'Member name', 'Phone', 'Existing area (sq.ft)', 'Proposed area (sq.ft)', 'Gain %', 'Monthly rent (Yr 1)', `Total rent (${s.terms.rentMonths} mo)`, 'Corpus', 'Shifting', 'Brokerage', 'Total payout', 'Consent', 'Voted at'];
  head.push('Registered as', 'Mobile (self-registered)', 'PAN (masked)', 'Aadhaar (masked)', 'KYC verified', 'Mobile verified (OTP)', 'Vote recorded by');
  const lines = [head.join(',')];
  s.members.forEach(m => {
    const c = calcMember(m, s.terms);
    lines.push([m.bldg || '', m.bname || '', m.flat, m.name, m.phone, c.existing, c.proposed, c.gainPct.toFixed(1), c.rent, c.totalRent, c.corpus, c.shifting, c.brokerage, c.totalPayout,
      { yes: 'Consented', no: 'Objected', pending: 'Pending' }[m.consent], m.votedAt ? new Date(m.votedAt).toLocaleString('en-IN') : '',
      m.kyc ? ROLE_LABEL[m.kyc.role] : '', m.kyc ? m.kyc.mobile : '', m.kyc ? maskPan(m.kyc.pan) : '', m.kyc ? maskAadhaar(m.kyc.aadhaar) : '', m.kyc ? (m.kyc.verified ? 'Yes' : 'No') : '', m.kyc ? (m.kyc.mobileVerifiedAt ? 'Yes' : 'No') : '',
      m.consent === 'pending' ? '' : m.votedBy === 'member' ? 'Member (online)' : 'Committee (earlier record)'].map(csvEscape).join(','));
  });
  downloadBlob('\uFEFF' + lines.join('\n'), `${slug(s.society.name)}-members.csv`, 'text/csv');
}

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

function membersFromCSV(text) {
  const rows = parseCSV(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) return [];
  const h = rows[0].map(x => x.toLowerCase());
  const find = (...keys) => h.findIndex(c => keys.some(k => c.includes(k)));
  const iBname = h.findIndex(c => /(building|bldg|tower|wing)\s*name/.test(c));
  const iBldg = h.findIndex((c, i) => i !== iBname && ['bldg', 'building', 'wing', 'block', 'tower'].some(k => c.includes(k))), iFlat = find('flat', 'unit'), iName = (() => { const mi = h.findIndex((c, i) => i !== iBname && c.includes('member')); return mi >= 0 ? mi : h.findIndex((c, i) => i !== iBname && i !== iBldg && c.includes('name')); })(), iEx = find('existing', 'old', 'current'),
    iPr = find('proposed', 'new'), iPh = find('phone', 'mobile'), iRent = find('rent'), iCorp = find('corpus');
  return rows.slice(1).map(r => ({
    bldg: iBldg >= 0 ? (r[iBldg] || '').trim() : '', bname: iBname >= 0 ? (r[iBname] || '').trim() : '', flat: (r[iFlat] || '').trim(), name: (r[iName] || '').trim(), existing: num(r[iEx]),
    proposed: iPr >= 0 && r[iPr] ? num(r[iPr]) : null,
    rent: iRent >= 0 && r[iRent] && !h[iRent].includes('total') ? num(r[iRent]) : null,
    corpus: iCorp >= 0 && r[iCorp] ? num(r[iCorp]) : null,
    phone: iPh >= 0 ? (r[iPh] || '').trim() : '', consent: 'pending', votedAt: null,
  })).filter(m => m.flat || m.name);
}

const CSV_TEMPLATE = 'Bldg No.,Building name,Flat,Member name,Phone,Existing area (sq.ft),Proposed area (sq.ft)\nBldg 1,Sunshine Tower,A-101,Member Name,9800000000,480,\nBldg 1,Sunshine Tower,A-102,Member Name,,520,680\n';

function pickFile(accept, cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result, f); r.readAsText(f); };
  inp.click();
}

export { SRM_KEY, DEFAULT_TERMS, STAGE_DEFS, makeStages, DOC_DEFS, makeDocs, mk, SAMPLE_STATE, BLANK_STATE, EXTRA_DEFAULTS, stageProgress, rentPaid, paymentStatus, statementText, reminderText, waLink, dataChecks, num, has, calcMember, calcSociety, inr, inrShort, sqft, pct, fmtDate, mergeKyc, loadState, useSociety, nativeSave, ROLES, ROLE_LABEL, OFFICE_ROLES, VH_D, VH_P, verhoeffOk, validPAN, validAadhaar, validMobile, cleanMobile, maskPan, maskAadhaar, downloadBlob, slug, csvEscape, exportCSV, parseCSV, membersFromCSV, CSV_TEMPLATE, pickFile };
