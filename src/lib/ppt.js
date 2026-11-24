// lib/ppt.js — detailed, navigable PowerPoint built from current data (PptxGenJS)
import { calcMember, calcSociety, downloadBlob, fmtDate, inr, inrShort, num, paymentStatus, pct, slug, sqft } from './data';
import { fileKind, fmtSize } from './files';

async function buildSocietyPPT(s, opts = {}) {
  const { default: PptxGenJS } = await import('pptxgenjs'); // loaded on demand to keep the app bundle small
  const k = calcSociety(s), t = s.terms, so = s.society;
  const C = { primary: '5A3FC0', deep: '3A2585', ink: '1E1730', soft: '615B76', faint: 'A8A3B8', bg: 'F6F3FB', line: 'E4DFF0', accent: 'F5A524', mint: '16A98C', red: 'D9534F', white: 'FFFFFF', panel: 'EDE7FB', amberSoft: 'FDEFD3', mintSoft: 'D6F2EB' };
  const F = 'Calibri';
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const safeMeta = v => String(v || '').replace(/&/g, 'and').replace(/[<>"]/g, '');
  pptx.title = safeMeta(`${so.name} - Redevelopment`);
  pptx.company = safeMeta(so.pmc);
  pptx.author = safeMeta(so.pmc);
  pptx.subject = 'Redevelopment member information pack';
  const SH = pptx.ShapeType || {}, CH = pptx.ChartType || {};
  const RECT = SH.rect || 'rect', RR = SH.roundRect || 'roundRect', OVAL = SH.ellipse || 'ellipse';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const rowsByFlat = [...k.rows].sort((a, b) => String(a.m.flat).localeCompare(String(b.m.flat), undefined, { numeric: true }));

  // ── button images (images carry reliable internal hyperlinks) ──
  const canvasImg = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); return c.toDataURL('image/png'); };
  const pill = (x, w, h, fill) => { const r = h / 2; x.fillStyle = fill; x.beginPath(); x.moveTo(r, 0); x.lineTo(w - r, 0); x.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); x.lineTo(r, h); x.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); x.fill(); };
  const IMG_HOME = canvasImg(300, 100, (x, w, h) => {
    pill(x, w, h, '#5A3FC0');
    x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineJoin = 'round'; x.lineCap = 'round';
    x.beginPath(); x.moveTo(40, 52); x.lineTo(68, 28); x.lineTo(96, 52); x.moveTo(48, 46); x.lineTo(48, 74); x.lineTo(88, 74); x.lineTo(88, 46); x.stroke();
    x.fillStyle = '#fff'; x.font = 'bold 42px Calibri, Arial, sans-serif'; x.textBaseline = 'middle'; x.fillText('Home', 118, 53);
  });
  const arrowImg = dir => canvasImg(100, 100, (x, w, h) => {
    x.fillStyle = '#EDE7FB'; x.beginPath(); x.arc(50, 50, 50, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#5A3FC0'; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
    if (dir < 0) { x.moveTo(58, 30); x.lineTo(38, 50); x.lineTo(58, 70); } else { x.moveTo(42, 30); x.lineTo(62, 50); x.lineTo(42, 70); }
    x.stroke();
  });
  const IMG_PREV = arrowImg(-1), IMG_NEXT = arrowImg(1);
  const IMG_CLEAR = canvasImg(8, 8, () => {});

  // ── slide plan ──
  const PER_MEMBERS = 12, PER_REGISTER = 14;
  const memberPages = Math.max(1, Math.ceil(rowsByFlat.length / PER_MEMBERS));
  const registerPages = Math.max(1, Math.ceil(rowsByFlat.length / PER_REGISTER));
  const SECTIONS = [
    ['Introduction', [['how', 'How to use this presentation'], ['profile', 'Society profile'], ['glance', 'Redevelopment at a glance']]],
    ['Process & roles', [['process', 'The redevelopment process'], ['roles', 'Who does what']]],
    ['Offer terms explained', [['terms', 'Offer terms summary'], ['area', 'Area entitlement'], ['rent', 'Transit rent'], ['rentTable', 'Rent schedule — year by year'], ['rentChart', 'Rent growth chart'], ['corpus', 'Corpus fund'], ['shifting', 'Shifting & brokerage'], ['samples', 'Sample member statements']]],
    ['Members & entitlements', [['areaChart', 'Existing vs proposed area'], ['payoutChart', 'Payout per flat'], ['breakdown', 'Total commitment breakdown'], ['members', 'Member entitlement register'], ['payments', 'Payments made so far']]],
    ['Consent', [['consent', 'Consent status'], ['register', 'Consent register'], ['followup', 'Follow-up actions'], ['meetings', 'Meetings & attendance']]],
    ['Notices, plans & documents', [['notices', 'Notices & circulars'], ['plans', 'Proposed building plans'], ['docStatus', 'Document status']]],
    ['Compliance & next steps', [['compliance', 'Compliance checklist'], ['safeguards', 'Member safeguards'], ['docs', 'Documents checklist'], ['next', 'Next steps']]],
    ['Help', [['faq1', 'Frequently asked questions'], ['faq2', 'More questions'], ['glossary', 'Glossary of terms'], ['contacts', 'Contacts']]],
  ];
  const order = ['cover', 'toc'];
  const sectionOf = {}, titleOf = {};
  SECTIONS.forEach(([sec, items]) => items.forEach(([key, title]) => {
    const n = key === 'members' ? memberPages : key === 'register' ? registerPages : 1;
    for (let i = 0; i < n; i++) { const id = i ? `${key}#${i}` : key; order.push(id); sectionOf[id] = sec; titleOf[id] = title; }
  }));
  const num_ = id => order.indexOf(id) + 1;
  const TOTAL = order.length, TOC = 2;

  // ── chrome ──
  const frame = (id, title, sub) => {
    const sl = pptx.addSlide();
    const n = num_(id);
    sl.background = { color: C.bg };
    sl.addShape(RECT, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: C.primary }, line: { color: C.primary } });
    sl.addText((sectionOf[id] || '').toUpperCase(), { x: 0.6, y: 0.35, w: 9, h: 0.32, fontFace: F, fontSize: 12, bold: true, color: C.primary, charSpacing: 2 });
    sl.addText(title, { x: 0.6, y: 0.65, w: 12.1, h: 0.7, fontFace: F, fontSize: 30, bold: true, color: C.ink });
    if (sub) sl.addText(sub, { x: 0.6, y: 1.3, w: 12.1, h: 0.4, fontFace: F, fontSize: 15, color: C.soft });
    sl.addShape(RECT, { x: 0.6, y: 6.88, w: 12.13, h: 0.01, fill: { color: C.line }, line: { color: C.line } });
    sl.addText(`${so.name}  ·  ${today}`, { x: 0.6, y: 6.95, w: 7.5, h: 0.4, fontFace: F, fontSize: 10, color: C.faint, valign: 'middle' });
    sl.addText(`${n} / ${TOTAL}`, { x: 8.6, y: 6.95, w: 1.4, h: 0.4, fontFace: F, fontSize: 10, color: C.faint, align: 'right', valign: 'middle' });
    if (n > 1) sl.addImage({ data: IMG_PREV, x: 10.2, y: 6.96, w: 0.38, h: 0.38, hyperlink: { slide: n - 1, tooltip: 'Previous slide' } });
    if (n < TOTAL) sl.addImage({ data: IMG_NEXT, x: 10.65, y: 6.96, w: 0.38, h: 0.38, hyperlink: { slide: n + 1, tooltip: 'Next slide' } });
    sl.addImage({ data: IMG_HOME, x: 11.5, y: 6.94, w: 1.26, h: 0.42, hyperlink: { slide: TOC, tooltip: 'Go to table of contents' } });
    return sl;
  };
  const txt = (sl, text, o) => sl.addText(text, { fontFace: F, color: C.ink, fontSize: 14, valign: 'top', ...o });
  const card = (sl, x, y, w, h, fill) => sl.addShape(RR, { x, y, w, h, fill: { color: fill || C.white }, line: { color: fill || C.line, width: 1 }, rectRadius: 0.1 });
  const H = (text, align) => ({ text, options: { bold: true, color: C.white, fill: { color: C.primary }, align: align || 'left' } });
  const TBL = { fontFace: F, color: C.ink, fill: { color: C.white }, border: { type: 'solid', pt: 0.75, color: C.line }, valign: 'middle', margin: 0.07 };
  const bullets = (sl, items, o) => sl.addText(items.map(b => ({ text: b, options: { bullet: { indent: 18 }, paraSpaceAfter: 8 } })), { fontFace: F, fontSize: 15, color: C.ink, valign: 'top', ...o });
  const kpi = (sl, x, y, w, label, value, sub, tone) => {
    card(sl, x, y, w, 1.55);
    txt(sl, label, { x: x + 0.22, y: y + 0.15, w: w - 0.4, h: 0.35, fontSize: 12.5, color: C.soft });
    txt(sl, value, { x: x + 0.22, y: y + 0.48, w: w - 0.4, h: 0.6, fontSize: 24, bold: true, color: tone || C.ink });
    if (sub) txt(sl, sub, { x: x + 0.22, y: y + 1.07, w: w - 0.4, h: 0.35, fontSize: 11.5, color: C.soft });
  };
  const ex = calcMember({ existing: 500 }, t);
  const consentLabel = v => ({ yes: 'Consented', no: 'Objected', pending: 'Pending' }[v] || 'Pending');
  const consentColor = v => ({ yes: C.mint, no: C.red, pending: C.faint }[v] || C.faint);

  const B = {};

  B.cover = () => {
    const sl = pptx.addSlide();
    sl.background = { color: C.primary };
    sl.addShape(RECT, { x: 0, y: 6.2, w: 13.333, h: 1.3, fill: { color: C.deep }, line: { color: C.deep } });
    txt(sl, 'REDEVELOPMENT · MEMBER INFORMATION PACK', { x: 0.8, y: 1.3, w: 11.5, h: 0.4, fontSize: 14, bold: true, color: 'FFD58A', charSpacing: 2 });
    txt(sl, so.name || 'Housing Society', { x: 0.8, y: 1.8, w: 11.7, h: 1.7, fontSize: 48, bold: true, color: C.white });
    txt(sl, [so.location, so.regNo && `Reg. ${so.regNo}`].filter(Boolean).join('   ·   ') || ' ', { x: 0.8, y: 3.55, w: 11.5, h: 0.5, fontSize: 20, color: 'E9E2FF' });
    txt(sl, `${k.total} members  ·  ${pct(k.pct, 0)} consent  ·  +${pct(k.gainPct)} carpet area`, { x: 0.8, y: 4.2, w: 11.5, h: 0.5, fontSize: 18, bold: true, color: C.white });
    sl.addText([{ text: 'Developer  ', options: { color: 'CFC4F5' } }, { text: so.developer || '—', options: { bold: true } }, { text: '      PMC  ', options: { color: 'CFC4F5' } }, { text: so.pmc || '—', options: { bold: true } }], { x: 0.8, y: 6.35, w: 8.6, h: 0.9, fontFace: F, fontSize: 16, color: C.white, valign: 'middle' });
    sl.addImage({ data: canvasImg(420, 100, (x, w, h) => { pill(x, w, h, '#FFFFFF'); x.fillStyle = '#5A3FC0'; x.font = 'bold 40px Calibri, Arial, sans-serif'; x.textBaseline = 'middle'; x.fillText('Open contents  ›', 46, 53); }), x: 9.9, y: 6.5, w: 2.75, h: 0.65, hyperlink: { slide: TOC, tooltip: 'Table of contents' } });
  };

  B.toc = () => {
    const sl = pptx.addSlide();
    sl.background = { color: C.bg };
    sl.addShape(RECT, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: C.primary }, line: { color: C.primary } });
    txt(sl, 'CONTENTS', { x: 0.6, y: 0.35, w: 6, h: 0.32, fontSize: 12, bold: true, color: C.primary, charSpacing: 2 });
    txt(sl, 'Table of contents', { x: 0.6, y: 0.65, w: 8, h: 0.7, fontSize: 30, bold: true });
    txt(sl, 'Click any line to jump to it. The Home button on every slide brings you back here.', { x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 14, color: C.soft });
    const cols = [[0, 1], [2, 5], [3, 4], [6, 7]];
    cols.forEach((secIdx, ci) => {
      const x = 0.6 + ci * 3.07, w = 2.9;
      let y = 1.9;
      secIdx.forEach(si => {
        const [sec, items] = SECTIONS[si];
        const first = num_(items[0][0]);
        sl.addShape(OVAL, { x, y: y + 0.02, w: 0.34, h: 0.34, fill: { color: C.primary }, line: { color: C.primary } });
        txt(sl, String(si + 1), { x, y: y + 0.02, w: 0.34, h: 0.34, fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle' });
        txt(sl, sec, { x: x + 0.45, y, w: w - 0.45, h: 0.38, fontSize: 14, bold: true, color: C.primary, valign: 'middle' });
        sl.addImage({ data: IMG_CLEAR, x, y, w, h: 0.38, hyperlink: { slide: first, tooltip: sec } });
        y += 0.42;
        items.forEach(([key, title]) => {
          const n = num_(key);
          txt(sl, title, { x: x + 0.45, y, w: w - 0.9, h: 0.3, fontSize: 12, color: C.ink, valign: 'middle' });
          txt(sl, String(n), { x: x + w - 0.45, y, w: 0.45, h: 0.3, fontSize: 12, bold: true, color: C.primary, align: 'right', valign: 'middle' });
          sl.addShape(RECT, { x: x + 0.45, y: y + 0.31, w: w - 0.45, h: 0.005, fill: { color: C.line }, line: { color: C.line } });
          sl.addImage({ data: IMG_CLEAR, x: x + 0.4, y, w: w - 0.4, h: 0.32, hyperlink: { slide: n, tooltip: title } });
          y += 0.335;
        });
        y += 0.22;
      });
    });
    txt(sl, `${so.name}  ·  ${today}`, { x: 0.6, y: 6.95, w: 8, h: 0.4, fontSize: 10, color: C.faint, valign: 'middle' });
  };

  B.how = () => {
    const sl = frame('how', 'How to use this presentation', 'Built from the Redevelopment Manager — every figure reflects the data on the date shown.');
    const tips = [['Contents', 'Slide 2 lists every topic. Click a line to jump straight to it.'], ['Home button', 'Bottom-right on every slide. Click it to return to the contents.'], ['◀  ▶ arrows', 'Step to the previous or next slide without leaving slideshow.'], ['Keep it current', 'Update members, terms or votes in the app, then download a fresh copy.']];
    tips.forEach(([h, d], i) => {
      const x = 0.6 + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.25;
      card(sl, x, y, 5.95, 2.0);
      txt(sl, h, { x: x + 0.3, y: y + 0.25, w: 5.3, h: 0.45, fontSize: 19, bold: true, color: C.primary });
      txt(sl, d, { x: x + 0.3, y: y + 0.8, w: 5.3, h: 1.0, fontSize: 15, color: C.soft });
    });
    txt(sl, 'Amounts in Indian Rupees (₹). Areas are RERA carpet area in sq.ft. Hyperlinks work in Slide Show mode and in Normal view with Ctrl + Click.', { x: 0.6, y: 6.45, w: 12, h: 0.35, fontSize: 11.5, color: C.faint });
  };

  B.profile = () => {
    const sl = frame('profile', 'Society profile');
    const rows = [[H('Particular'), H('Details')], ['Society name', so.name || '—'], ['Location', so.location || '—'], ['Registration no.', so.regNo || '—'], ['Number of members', String(k.total)], ['Total existing carpet area', sqft(k.existing)], ['Average flat size', k.total ? sqft(k.existing / k.total) : '—'], ['Selected developer', so.developer || '—'], ['Project Management Consultant', so.pmc || '—'], ['Consent deadline', fmtDate(t.deadline)]];
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.7, w: 7.8, colW: [3.0, 4.8], fontSize: 14, rowH: 0.46 });
    card(sl, 8.8, 1.7, 3.93, 4.6, C.panel);
    txt(sl, 'In one line', { x: 9.1, y: 1.95, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.primary });
    txt(sl, `${k.total} families moving from ${sqft(k.existing)} to ${sqft(k.proposed)} of new homes — a ${pct(k.gainPct)} increase — with ${inrShort(k.totalPayout)} committed in rent, corpus and allowances.`, { x: 9.1, y: 2.45, w: 3.4, h: 3.6, fontSize: 16, color: C.ink });
  };

  B.glance = () => {
    const sl = frame('glance', 'Redevelopment at a glance');
    const tiles = [['Members', String(k.total), `${k.yes} consented · ${k.pending} pending`], ['Existing carpet area', sqft(k.existing), 'All flats combined'], ['Proposed carpet area', sqft(k.proposed), `+${pct(k.gainPct)} overall`, C.primary], ['Monthly rent · Year 1', inrShort(k.rent), `+${t.escalationPct}% every year`], ['Total corpus fund', inrShort(k.corpus), 'Paid to members'], [`Total commitment · ${t.rentMonths} mo`, inrShort(k.totalPayout), 'Rent + corpus + shifting + brokerage', C.primary]];
    tiles.forEach(([l, v, sub, tone], i) => kpi(sl, 0.6 + (i % 3) * 4.1, 1.8 + Math.floor(i / 3) * 1.85, 3.9, l, v, sub, tone));
    card(sl, 0.6, 5.6, 12.13, 1.05, k.reached ? C.mintSoft : C.amberSoft);
    txt(sl, k.reached ? `Consent: ${k.yes} of ${k.total} members (${pct(k.pct, 0)}) — the ${t.consentThreshold}% majority has been reached.` : `Consent: ${k.yes} of ${k.total} members (${pct(k.pct, 0)}) — ${k.needed} more needed to reach ${t.consentThreshold}% by ${fmtDate(t.deadline)}.`, { x: 0.9, y: 5.6, w: 11.6, h: 1.05, fontSize: 17, bold: true, valign: 'middle' });
  };

  B.process = () => {
    const sl = frame('process', 'The redevelopment process', 'Nine regulated stages from committee formation to possession.');
    const st = [['Committee & SGBM', 'Committee elected; general body resolves to redevelop'], ['PMC appointment', 'Independent consultant appointed to run the process'], ['Survey & feasibility', 'Structural audit, flat measurement, FSI study'], ['Tender & selection', 'Bids invited, compared and shortlisted'], ['Member consent', `${t.consentThreshold}% of members approve developer and terms`], ['Agreements', 'Registered Development Agreement and individual PAAA'], ['Vacating', 'Rent, shifting and brokerage paid; flats handed over'], ['Construction', 'Approvals, RERA registration, building works'], ['Possession', 'Occupation Certificate, new homes, corpus paid']];
    const live = s.stages || [];
    st.forEach(([h, d], i) => {
      const L = live[i] || {}, status = L.status || 'upcoming';
      const col = status === 'done' ? C.mint : status === 'active' ? C.accent : C.faint;
      const x = 0.6 + (i % 3) * 4.1, y = 1.9 + Math.floor(i / 3) * 1.6;
      card(sl, x, y, 3.9, 1.42, status === 'active' ? C.amberSoft : status === 'done' ? 'F2FBF8' : C.white);
      sl.addShape(OVAL, { x: x + 0.2, y: y + 0.22, w: 0.5, h: 0.5, fill: { color: col }, line: { color: col } });
      txt(sl, status === 'done' ? '✓' : String(i + 1), { x: x + 0.2, y: y + 0.22, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle' });
      txt(sl, L.title || h, { x: x + 0.85, y: y + 0.12, w: 2.9, h: 0.4, fontSize: 15, bold: true });
      txt(sl, (L.blurb || d), { x: x + 0.85, y: y + 0.5, w: 2.9, h: 0.55, fontSize: 11.5, color: C.soft });
      const dn = (L.items || []).filter(z => z.done).length, tot = (L.items || []).length;
      txt(sl, `${{ done: 'Completed', active: 'In progress', upcoming: 'Upcoming' }[status]}${tot ? ` · ${dn}/${tot} steps` : ''}${L.date ? ' · ' + L.date : ''}`, { x: x + 0.85, y: y + 1.02, w: 2.9, h: 0.3, fontSize: 10.5, bold: true, color: status === 'upcoming' ? C.faint : col });
    });
  };

  B.roles = () => {
    const sl = frame('roles', 'Who does what');
    const R = [['Managing Committee', ['Represents all members', 'Calls general body meetings', 'Signs agreements on approval']], ['Members', ['Review offer and statements', 'Give or withhold consent', 'Sign individual PAAA']], [`PMC · ${so.pmc || 'Consultant'}`, ['Feasibility and tender', 'Compares offers objectively', 'Monitors quality and timelines']], [`Developer · ${so.developer || 'TBD'}`, ['Funds and builds the project', 'Pays rent, corpus, allowances', 'Obtains approvals and OC']]];
    R.forEach(([h, items], i) => {
      const x = 0.6 + i * 3.06;
      card(sl, x, 1.8, 2.9, 4.8);
      sl.addShape(RECT, { x, y: 1.8, w: 2.9, h: 0.12, fill: { color: [C.primary, C.mint, C.accent, C.deep][i] }, line: { color: [C.primary, C.mint, C.accent, C.deep][i] } });
      txt(sl, h, { x: x + 0.25, y: 2.1, w: 2.45, h: 0.9, fontSize: 17, bold: true });
      bullets(sl, items, { x: x + 0.2, y: 3.05, w: 2.55, h: 3.3, fontSize: 14 });
    });
  };

  B.terms = () => {
    const sl = frame('terms', 'Offer terms summary', 'These standard terms apply to every member unless a custom value is recorded.');
    const rows = [[H('Term'), H('Value')], ['Area increase', `+${t.areaGainPct}% on existing carpet area`], ['Transit rent', t.rentMode === 'flat' ? `${inr(t.rentFixed)} per month per flat` : `${inr(t.rentRate)} per sq.ft per month`], ['Yearly rent increase', `${t.escalationPct}% every year`], ['Rent period', `${t.rentMonths} months`], ['Corpus fund', t.corpusMode === 'flat' ? `${inr(t.corpusFixed)} per flat` : `${inr(t.corpusRate)} per sq.ft`], ['Shifting allowance', `${inr(t.shiftingAmount)} × ${t.shiftingTimes}`], ['Brokerage', `${t.brokerageMonths} month(s) rent`], ['Consent required', `${t.consentThreshold}% of members by ${fmtDate(t.deadline)}`]];
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.85, w: 7.6, colW: [2.6, 5.0], fontSize: 14, rowH: 0.5 });
    card(sl, 8.6, 1.85, 4.13, 4.5, C.panel);
    txt(sl, 'Example · 500 sq.ft flat', { x: 8.9, y: 2.05, w: 3.6, h: 0.45, fontSize: 16, bold: true, color: C.primary });
    [['New carpet area', sqft(ex.proposed)], ['Rent · Year 1', inr(ex.rent)], ['Total rent', inr(ex.totalRent)], ['Corpus', inr(ex.corpus)], ['Shifting + brokerage', inr(ex.shifting + ex.brokerage)], ['Total payout', inr(ex.totalPayout)]].forEach(([l, v], i, a) => {
      const y = 2.6 + i * 0.58, last = i === a.length - 1;
      txt(sl, l, { x: 8.9, y, w: 2.0, h: 0.45, fontSize: 13, color: C.soft, bold: last, valign: 'middle' });
      txt(sl, v, { x: 10.7, y, w: 1.8, h: 0.45, fontSize: last ? 16 : 14, bold: true, color: last ? C.primary : C.ink, align: 'right', valign: 'middle' });
    });
  };

  const explain = (id, title, formula, points, side) => {
    const sl = frame(id, title);
    card(sl, 0.6, 1.75, 7.4, 1.25, C.panel);
    txt(sl, 'HOW IT IS CALCULATED', { x: 0.9, y: 1.88, w: 6.8, h: 0.3, fontSize: 11, bold: true, color: C.primary, charSpacing: 1 });
    txt(sl, formula, { x: 0.9, y: 2.2, w: 6.8, h: 0.65, fontSize: 20, bold: true, valign: 'middle' });
    bullets(sl, points, { x: 0.6, y: 3.3, w: 7.4, h: 3.3, fontSize: 15 });
    card(sl, 8.4, 1.75, 4.33, 4.85);
    side.forEach(([l, v, tone], i) => {
      txt(sl, l, { x: 8.7, y: 1.95 + i * 0.92, w: 3.8, h: 0.32, fontSize: 12.5, color: C.soft });
      txt(sl, v, { x: 8.7, y: 2.25 + i * 0.92, w: 3.8, h: 0.5, fontSize: 21, bold: true, color: tone || C.ink });
    });
    return sl;
  };
  const stat = key => { const v = k.rows.map(r => r.c[key]); return v.length ? { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length } : { min: 0, max: 0, avg: 0 }; };

  B.area = () => explain('area', 'Area entitlement', `New area = Existing area × (1 + ${t.areaGainPct}%)`, [`Every member receives ${t.areaGainPct}% more carpet area than today.`, 'Carpet area is the usable floor area inside the flat, as defined under RERA.', 'Where a member has a different agreed area, the custom figure is used.', 'Final area is fixed in each member\u2019s registered PAAA.'], [['Total existing', sqft(k.existing)], ['Total proposed', sqft(k.proposed), C.primary], ['Extra area for members', sqft(k.proposed - k.existing), C.mint], ['Average new flat', k.total ? sqft(k.proposed / k.total) : '—'], ['500 sq.ft becomes', sqft(ex.proposed)]]);

  B.rent = () => explain('rent', 'Transit rent', t.rentMode === 'flat' ? `Rent = ${inr(t.rentFixed)} per flat per month` : `Rent = Existing area × ${inr(t.rentRate)} per sq.ft`, [`Paid from the month the flat is vacated, for ${t.rentMonths} months.`, `Rent increases by ${t.escalationPct}% at the start of every new year.`, 'Covers temporary accommodation during construction.', 'If construction is delayed, rent continues as per the PAAA.'], [['Lowest monthly rent', inr(stat('rent').min)], ['Highest monthly rent', inr(stat('rent').max)], ['Society total · Year 1', inrShort(k.rent) + ' / mo', C.primary], [`Total over ${t.rentMonths} months`, inrShort(k.totalRent)], ['500 sq.ft flat · Year 1', inr(ex.rent)]]);

  const societySched = () => calcMember({ existing: 1 }, { ...t, rentMode: 'flat', rentFixed: k.rent }).schedule;

  B.rentTable = () => {
    const sl = frame('rentTable', `Rent schedule with ${t.escalationPct}% yearly increase`, 'Society-wide monthly rent and yearly totals.');
    const sched = societySched();
    const rows = [[H('Year'), H('Months', 'right'), H('Increase over Year 1', 'right'), H('Monthly rent · all members', 'right'), H('Total for the year', 'right')]];
    sched.forEach(r => rows.push([{ text: `Year ${r.year}`, options: { bold: true } }, { text: String(r.months), options: { align: 'right' } }, { text: r.year === 1 ? 'Base' : `+${pct((Math.pow(1 + num(t.escalationPct) / 100, r.year - 1) - 1) * 100)}`, options: { align: 'right', color: C.soft } }, { text: inr(r.monthly), options: { align: 'right' } }, { text: inr(r.total), options: { align: 'right', bold: true } }]));
    const P = { fill: { color: C.panel }, bold: true };
    rows.push([{ text: 'Total', options: P }, { text: String(t.rentMonths), options: { ...P, align: 'right' } }, { text: '', options: P }, { text: '', options: P }, { text: inr(k.totalRent), options: { ...P, align: 'right', color: C.primary } }]);
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.9, w: 12.13, colW: [2.0, 1.6, 2.6, 3.0, 2.93], fontSize: 15, rowH: 0.55 });
  };

  B.rentChart = () => {
    const sl = frame('rentChart', 'Rent growth chart', 'Society monthly rent in each year of construction.');
    const sched = societySched();
    if (sched.length && CH.bar) sl.addChart(CH.bar, [{ name: 'Monthly rent (₹)', labels: sched.map(r => `Year ${r.year}`), values: sched.map(r => r.monthly) }], { x: 0.6, y: 1.8, w: 8.2, h: 4.9, barDir: 'col', chartColors: [C.primary], showValue: true, dataLabelFontSize: 11, dataLabelFormatCode: '#,##0', valAxisLabelFormatCode: '#,##0', catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, showLegend: false, valGridLine: { color: C.line, size: 0.5 } });
    card(sl, 9.2, 1.8, 3.53, 4.9, C.panel);
    txt(sl, 'Why rent rises', { x: 9.5, y: 2.05, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: C.primary });
    txt(sl, `Rents in the area typically rise each year. A ${t.escalationPct}% yearly increase keeps members able to afford similar housing throughout construction.`, { x: 9.5, y: 2.55, w: 3.0, h: 2.6, fontSize: 14, color: C.ink });
    if (sched.length > 1) txt(sl, `Year 1 → Year ${sched.length}: ${inrShort(sched[0].monthly)} → ${inrShort(sched[sched.length - 1].monthly)} per month`, { x: 9.5, y: 5.3, w: 3.0, h: 1.1, fontSize: 14, bold: true });
  };

  B.corpus = () => explain('corpus', 'Corpus fund', t.corpusMode === 'flat' ? `Corpus = ${inr(t.corpusFixed)} per flat` : `Corpus = Existing area × ${inr(t.corpusRate)} per sq.ft`, ['A one-time amount paid to each member by the developer.', 'Helps meet higher maintenance costs of the new building.', 'Usually paid at possession or as agreed in the PAAA.', 'Custom corpus figures recorded for a member override the standard.'], [['Total corpus', inrShort(k.corpus), C.primary], ['Average per member', inrShort(stat('corpus').avg)], ['Lowest', inrShort(stat('corpus').min)], ['Highest', inrShort(stat('corpus').max)], ['500 sq.ft flat', inr(ex.corpus)]]);

  B.shifting = () => explain('shifting', 'Shifting & brokerage', `Shifting ${inr(t.shiftingAmount)} × ${t.shiftingTimes}   ·   Brokerage ${t.brokerageMonths} month rent`, ['Shifting allowance covers packing and moving costs.', `Paid ${t.shiftingTimes} time(s) — usually moving out, and moving into the new home.`, 'Brokerage covers the agent fee for finding temporary accommodation.', 'Both are paid before members vacate their flats.'], [['Shifting per member', inr(num(t.shiftingAmount) * num(t.shiftingTimes))], ['Shifting · all members', inrShort(k.shifting)], ['Brokerage · all members', inrShort(k.brokerage)], ['Brokerage · 500 sq.ft flat', inr(ex.brokerage)], ['Combined total', inrShort(k.shifting + k.brokerage), C.primary]]);

  B.samples = () => {
    const sl = frame('samples', 'Sample member statements', 'Smallest, typical and largest flats in the society.');
    const sorted = [...k.rows].sort((a, b) => a.c.existing - b.c.existing);
    const picks = sorted.length ? [['Smallest flat', sorted[0]], ['Typical flat', sorted[Math.floor(sorted.length / 2)]], ['Largest flat', sorted[sorted.length - 1]]] : [];
    if (!picks.length) txt(sl, 'Add members in the app to see sample statements.', { x: 0.6, y: 2, w: 12, h: 0.5, fontSize: 16, color: C.soft });
    picks.forEach(([lab, { m, c }], i) => {
      const x = 0.6 + i * 4.1;
      card(sl, x, 1.85, 3.9, 4.8, i === 1 ? C.panel : C.white);
      txt(sl, lab.toUpperCase(), { x: x + 0.25, y: 2.0, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: C.primary, charSpacing: 1 });
      txt(sl, `${m.flat} · ${m.name || ''}`, { x: x + 0.25, y: 2.3, w: 3.4, h: 0.45, fontSize: 17, bold: true });
      [['Existing → proposed', `${Math.round(c.existing)} → ${Math.round(c.proposed)} sq.ft`], ['Rent · Year 1', inr(c.rent)], [`Total rent · ${t.rentMonths} mo`, inr(c.totalRent)], ['Corpus', inr(c.corpus)], ['Shifting + brokerage', inr(c.shifting + c.brokerage)]].forEach(([l, v], j) => {
        txt(sl, l, { x: x + 0.25, y: 2.95 + j * 0.56, w: 1.9, h: 0.45, fontSize: 12, color: C.soft, valign: 'middle' });
        txt(sl, v, { x: x + 1.9, y: 2.95 + j * 0.56, w: 1.8, h: 0.45, fontSize: 13, bold: true, align: 'right', valign: 'middle' });
      });
      sl.addShape(RECT, { x: x + 0.25, y: 5.8, w: 3.4, h: 0.015, fill: { color: C.ink }, line: { color: C.ink } });
      txt(sl, 'Total payout', { x: x + 0.25, y: 5.9, w: 1.8, h: 0.5, fontSize: 14, bold: true, valign: 'middle' });
      txt(sl, inr(c.totalPayout), { x: x + 1.7, y: 5.9, w: 2.0, h: 0.5, fontSize: 17, bold: true, color: C.primary, align: 'right', valign: 'middle' });
    });
  };

  const noData = sl => txt(sl, 'Add members in the app to see this chart.', { x: 0.6, y: 2.5, w: 12, h: 0.5, fontSize: 16, color: C.soft });
  const lbls = rowsByFlat.map(r => r.m.flat || '?');
  const chartBase = { x: 0.6, y: 1.75, w: 12.13, h: 4.95, barDir: 'col', catAxisLabelFontSize: rowsByFlat.length > 24 ? 8 : 11, valAxisLabelFontSize: 10, showLegend: true, legendPos: 't', legendFontSize: 12, valGridLine: { color: C.line, size: 0.5 }, valAxisLabelFormatCode: '#,##0', catAxisLabelRotate: rowsByFlat.length > 16 ? -45 : 0 };

  B.areaChart = () => {
    const sl = frame('areaChart', 'Existing vs proposed area', `Every flat gains carpet area — ${pct(k.gainPct)} overall.`);
    if (!rowsByFlat.length || !CH.bar) return noData(sl);
    sl.addChart(CH.bar, [{ name: 'Existing (sq.ft)', labels: lbls, values: rowsByFlat.map(r => Math.round(r.c.existing)) }, { name: 'Proposed (sq.ft)', labels: lbls, values: rowsByFlat.map(r => Math.round(r.c.proposed)) }], { ...chartBase, barGrouping: 'clustered', chartColors: [C.faint, C.primary] });
  };

  B.payoutChart = () => {
    const sl = frame('payoutChart', 'Payout per flat', 'What each member receives, split by component.');
    if (!rowsByFlat.length || !CH.bar) return noData(sl);
    sl.addChart(CH.bar, [{ name: 'Total rent', labels: lbls, values: rowsByFlat.map(r => r.c.totalRent) }, { name: 'Corpus', labels: lbls, values: rowsByFlat.map(r => r.c.corpus) }, { name: 'Shifting + brokerage', labels: lbls, values: rowsByFlat.map(r => r.c.shifting + r.c.brokerage) }], { ...chartBase, barGrouping: 'stacked', chartColors: [C.primary, C.accent, C.mint] });
  };

  B.breakdown = () => {
    const sl = frame('breakdown', 'Total commitment breakdown', `${inrShort(k.totalPayout)} committed to members over ${t.rentMonths} months.`);
    const parts = [['Transit rent', k.totalRent, C.primary], ['Corpus fund', k.corpus, C.accent], ['Shifting', k.shifting, C.mint], ['Brokerage', k.brokerage, C.deep]];
    if (k.totalPayout > 0 && CH.doughnut) sl.addChart(CH.doughnut, [{ name: 'Commitment', labels: parts.map(p => p[0]), values: parts.map(p => Math.round(p[1])) }], { x: 0.6, y: 1.8, w: 6.0, h: 4.9, holeSize: 55, chartColors: parts.map(p => p[2]), showPercent: true, showLegend: false, dataLabelColor: C.white, dataLabelFontSize: 12 });
    const rows = [[H('Component'), H('Amount', 'right'), H('Share', 'right')]];
    parts.forEach(([l, v, col]) => rows.push([{ text: l, options: { bold: true, color: col } }, { text: inr(v), options: { align: 'right' } }, { text: k.totalPayout ? pct((v / k.totalPayout) * 100) : '—', options: { align: 'right' } }]));
    rows.push([{ text: 'Total', options: { bold: true, fill: { color: C.panel } } }, { text: inr(k.totalPayout), options: { align: 'right', bold: true, color: C.primary, fill: { color: C.panel } } }, { text: '100%', options: { align: 'right', bold: true, fill: { color: C.panel } } }]);
    sl.addTable(rows, { ...TBL, x: 7.0, y: 2.2, w: 5.73, colW: [2.2, 2.33, 1.2], fontSize: 15, rowH: 0.6 });
  };

  B.members = page => {
    const id = page ? `members#${page}` : 'members';
    const sl = frame(id, memberPages > 1 ? `Member entitlement register (${page + 1} of ${memberPages})` : 'Member entitlement register');
    const R = (text, o) => ({ text, options: { align: 'right', ...o } });
    const rows = [[H('Bldg'), H('Flat'), H('Member'), H('Existing', 'right'), H('Proposed', 'right'), H('Gain', 'right'), H('Rent / mo', 'right'), H('Corpus', 'right'), H('Shifting', 'right'), H('Brokerage', 'right'), H('Total payout', 'right'), H('Consent', 'center')]];
    rowsByFlat.slice(page * PER_MEMBERS, page * PER_MEMBERS + PER_MEMBERS).forEach(({ m, c }) => rows.push([[m.bldg, m.bname].filter(Boolean).join(' · ') || '—', { text: m.flat, options: { bold: true } }, m.name || '', R(String(Math.round(c.existing))), R(String(Math.round(c.proposed)), { bold: true, color: C.primary }), R('+' + pct(c.gainPct), { color: C.mint }), R(inr(c.rent)), R(inrShort(c.corpus)), R(inr(c.shifting)), R(inr(c.brokerage)), R(inrShort(c.totalPayout), { bold: true }), { text: consentLabel(m.consent), options: { align: 'center', bold: true, color: consentColor(m.consent) } }]));
    if (!rowsByFlat.length) rows.push([{ text: 'No members added yet', options: { colspan: 12, color: C.soft } }]);
    if (page === memberPages - 1 && rowsByFlat.length) {
      const T = (v, a) => ({ text: v, options: { bold: true, fill: { color: C.panel }, align: a || 'right' } });
      rows.push([T('Total', 'left'), T('', 'left'), T(`${k.total} members`, 'left'), T(Math.round(k.existing).toLocaleString('en-IN')), T(Math.round(k.proposed).toLocaleString('en-IN')), T('+' + pct(k.gainPct)), T(inrShort(k.rent)), T(inrShort(k.corpus)), T(inrShort(k.shifting)), T(inrShort(k.brokerage)), T(inrShort(k.totalPayout)), T(`${k.yes}/${k.total}`, 'center')]);
    }
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.6, w: 12.13, colW: [1.2, 0.7, 1.35, 0.9, 0.95, 0.8, 1.05, 1.0, 1.0, 1.05, 1.1, 1.03], fontSize: 10.5, rowH: 0.36, margin: 0.05 });
  };

  B.consent = () => {
    const sl = frame('consent', 'Consent status', `${t.consentThreshold}% of members must consent by ${fmtDate(t.deadline)}.`);
    txt(sl, pct(k.pct, 0), { x: 0.6, y: 1.8, w: 4, h: 1.3, fontSize: 80, bold: true, color: k.reached ? C.mint : C.primary });
    txt(sl, `${k.yes} of ${k.total} members consented`, { x: 0.6, y: 3.15, w: 6.5, h: 0.5, fontSize: 20, bold: true });
    txt(sl, k.reached ? `${t.consentThreshold}% majority reached` : `${k.needed} more needed to reach ${t.consentThreshold}% (${k.required} members)`, { x: 0.6, y: 3.65, w: 6.5, h: 0.45, fontSize: 16, color: C.soft });
    const bx = 0.6, by = 4.45, bw = 6.6, bh = 0.4;
    sl.addShape(RR, { x: bx, y: by, w: bw, h: bh, fill: { color: C.line }, line: { color: C.line }, rectRadius: 0.2 });
    if (k.yes) sl.addShape(RR, { x: bx, y: by, w: Math.max(0.2, bw * k.yes / Math.max(1, k.total)), h: bh, fill: { color: C.mint }, line: { color: C.mint }, rectRadius: 0.2 });
    const tx = bx + bw * num(t.consentThreshold) / 100;
    sl.addShape(RECT, { x: tx - 0.025, y: by - 0.15, w: 0.05, h: bh + 0.3, fill: { color: C.ink }, line: { color: C.ink } });
    txt(sl, `${t.consentThreshold}% required`, { x: tx - 1, y: by + bh + 0.15, w: 2, h: 0.3, fontSize: 11, align: 'center' });
    [['Consented', k.yes, C.mint], ['Objected', k.no, C.red], ['Pending', k.pending, C.faint]].forEach(([l, v, col], i) => {
      txt(sl, String(v), { x: 0.6 + i * 2.2, y: 5.4, w: 2, h: 0.65, fontSize: 30, bold: true, color: col });
      txt(sl, l, { x: 0.6 + i * 2.2, y: 6.02, w: 2, h: 0.35, fontSize: 13, color: C.soft });
    });
    if (k.total && CH.doughnut) sl.addChart(CH.doughnut, [{ name: 'Consent', labels: ['Consented', 'Objected', 'Pending'], values: [k.yes, k.no, k.pending] }], { x: 7.7, y: 1.8, w: 5.0, h: 4.8, holeSize: 58, chartColors: [C.mint, C.red, 'C9C4D6'], showPercent: true, showLegend: true, legendPos: 'b', legendFontSize: 12, dataLabelColor: C.white, dataLabelFontSize: 12 });
  };

  B.register = page => {
    const id = page ? `register#${page}` : 'register';
    const sl = frame(id, registerPages > 1 ? `Consent register (${page + 1} of ${registerPages})` : 'Consent register', 'Record of each member\u2019s vote with date and time.');
    const rows = [[H('#', 'center'), H('Flat'), H('Member'), H('Phone'), H('Status', 'center'), H('Recorded on')]];
    rowsByFlat.slice(page * PER_REGISTER, page * PER_REGISTER + PER_REGISTER).forEach(({ m }, i) => rows.push([{ text: String(page * PER_REGISTER + i + 1), options: { align: 'center', color: C.soft } }, { text: m.flat, options: { bold: true } }, m.name || '', m.phone || '—', { text: consentLabel(m.consent), options: { align: 'center', bold: true, color: consentColor(m.consent) } }, m.votedAt ? new Date(m.votedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—']));
    if (!rowsByFlat.length) rows.push([{ text: 'No members added yet', options: { colspan: 6, color: C.soft } }]);
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.85, w: 12.13, colW: [0.7, 1.3, 3.6, 2.2, 1.7, 2.63], fontSize: 12, rowH: 0.33 });
  };

  B.followup = () => {
    const sl = frame('followup', 'Follow-up actions', 'Who still needs attention before the deadline.');
    const pend = rowsByFlat.filter(r => r.m.consent === 'pending').map(r => r.m);
    const obj = rowsByFlat.filter(r => r.m.consent === 'no').map(r => r.m);
    const list = arr => arr.length ? arr.map(m => `${m.flat}${m.name ? ' — ' + m.name : ''}`).join('\n') : 'None';
    [[`Awaiting vote · ${pend.length}`, list(pend), C.primary, 'Share personal statement · arrange one-to-one call · remind before deadline'], [`Objected · ${obj.length}`, list(obj), C.red, 'Record concerns in writing · PMC to respond · invite to clarification meeting']].forEach(([h, body, col, act], i) => {
      const x = 0.6 + i * 6.15;
      card(sl, x, 1.85, 5.95, 4.8);
      txt(sl, h, { x: x + 0.3, y: 2.05, w: 5.3, h: 0.45, fontSize: 18, bold: true, color: col });
      txt(sl, body, { x: x + 0.3, y: 2.6, w: 5.3, h: 2.9, fontSize: pend.length + obj.length > 24 ? 10 : 13, color: C.ink });
      card(sl, x + 0.3, 5.6, 5.35, 0.85, C.panel);
      txt(sl, act, { x: x + 0.5, y: 5.6, w: 5.0, h: 0.85, fontSize: 12.5, color: C.ink, valign: 'middle' });
    });
  };

  const checklist = (id, title, sub, items) => {
    const sl = frame(id, title, sub);
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 6.15, y = 1.9 + row * 0.95;
      card(sl, x, y, 5.95, 0.8);
      sl.addShape(RR, { x: x + 0.22, y: y + 0.22, w: 0.36, h: 0.36, fill: { color: C.white }, line: { color: C.primary, width: 1.5 }, rectRadius: 0.06 });
      txt(sl, it, { x: x + 0.75, y, w: 5.05, h: 0.8, fontSize: 14, valign: 'middle' });
    });
  };
  B.compliance = () => checklist('compliance', 'Compliance checklist', 'Key steps commonly required for co-operative housing redevelopment in Maharashtra.', ['Redevelopment resolution passed in a Special General Body Meeting', `Written consent of at least ${t.consentThreshold}% of members`, 'Structural audit and feasibility report placed before members', 'Transparent tender with comparative statement of offers', 'Registered Development Agreement with the society', 'Individual PAAA registered for every member', 'Bank guarantee or security from the developer', 'Project registered under MahaRERA before sale of flats', 'Approvals obtained: IOD, Commencement Certificate', 'Occupation Certificate before possession']);
  B.safeguards = () => checklist('safeguards', 'Member safeguards', 'What every member should check before signing.', ['Carpet area stated clearly in the PAAA', 'Rent amount, start date and yearly increase in writing', 'Corpus amount and when it will be paid', 'Construction timeline and penalty for delay', 'Same floor or agreed floor-preference rule', 'Parking allotment method', 'Amenities and specifications annexed to the agreement', 'Bank guarantee covers members\u2019 rent and completion', 'No hidden charges for members on possession', 'Copy of every signed document kept by the member']);
  B.docs = () => checklist('docs', 'Documents checklist', 'Keep these ready for the agreements and for your own records.', ['Share certificate of the society', 'Flat purchase agreement / ownership papers', 'Latest maintenance bill and no-dues letter', 'PAN and Aadhaar of all flat owners', 'Nomination details registered with the society', 'Recent passport-size photographs', 'Bank details for rent and corpus payments', 'Power of attorney, if signing for another owner', 'Loan details and NOC from bank, if flat is mortgaged', 'Copy of your entitlement statement']);

  B.next = () => {
    const sl = frame('next', 'Next steps', `Target: ${t.consentThreshold}% consent by ${fmtDate(t.deadline)}.`);
    const steps = [['Review', 'Members read their personal entitlement statement'], ['Clarify', 'Questions answered by the committee and PMC'], ['Consent', `Reach ${t.consentThreshold}% written consent`], ['Agreements', 'Register Development Agreement and PAAAs'], ['Vacate', 'Allowances paid, flats handed over']];
    steps.forEach(([h, d], i) => {
      const x = 0.6 + i * 2.45;
      sl.addShape(OVAL, { x: x + 0.75, y: 2.1, w: 0.8, h: 0.8, fill: { color: i === 2 ? C.accent : C.primary }, line: { color: i === 2 ? C.accent : C.primary } });
      txt(sl, String(i + 1), { x: x + 0.75, y: 2.1, w: 0.8, h: 0.8, fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle' });
      if (i < steps.length - 1) sl.addShape(RECT, { x: x + 1.6, y: 2.48, w: 1.6, h: 0.04, fill: { color: C.line }, line: { color: C.line } });
      txt(sl, h, { x, y: 3.1, w: 2.3, h: 0.45, fontSize: 18, bold: true, align: 'center' });
      txt(sl, d, { x: x + 0.05, y: 3.6, w: 2.2, h: 1.2, fontSize: 13.5, color: C.soft, align: 'center' });
    });
    card(sl, 0.6, 5.2, 12.13, 1.4, k.reached ? C.mintSoft : C.amberSoft);
    txt(sl, k.reached ? 'Consent majority reached. The committee can move to the Development Agreement.' : `${k.needed} more consent${k.needed === 1 ? '' : 's'} needed. Focus on the ${k.pending} pending members listed in Follow-up actions.`, { x: 0.9, y: 5.2, w: 11.6, h: 1.4, fontSize: 18, bold: true, valign: 'middle' });
  };

  const faq = (id, title, qa) => {
    const sl = frame(id, title);
    qa.forEach(([q, a], i) => {
      const x = 0.6 + (i % 2) * 6.15, y = 1.75 + Math.floor(i / 2) * 2.5;
      card(sl, x, y, 5.95, 2.3);
      txt(sl, q, { x: x + 0.3, y: y + 0.2, w: 5.35, h: 0.7, fontSize: 16, bold: true, color: C.primary });
      txt(sl, a, { x: x + 0.3, y: y + 0.9, w: 5.35, h: 1.3, fontSize: 13.5, color: C.ink });
    });
  };
  B.faq1 = () => faq('faq1', 'Frequently asked questions', [['How much bigger will my new flat be?', `Your carpet area increases by ${t.areaGainPct}%. A 500 sq.ft flat becomes ${sqft(ex.proposed)}. Your exact figure is in the member register.`], ['When does rent start?', `From the month you hand over your flat, for ${t.rentMonths} months, increasing ${t.escalationPct}% each year.`], ['What if construction is delayed?', 'Rent normally continues until possession, as written in your PAAA. Check the delay clause before signing.'], ['Is my consent binding?', 'Consent records your vote for the redevelopment resolution. Your rights are protected by your individual registered PAAA.']]);
  B.faq2 = () => faq('faq2', 'More questions', [['When is the corpus paid?', 'Usually at possession or as agreed in the PAAA. The amount for your flat is shown in the member register.'], ['Do I pay anything for the new flat?', 'Members normally pay nothing for their entitled area. Extra area, if bought, is charged at an agreed rate.'], ['Who checks construction quality?', `${so.pmc || 'The PMC'} monitors quality and progress on behalf of the society.`], ['Where can I see my own statement?', 'Ask the committee for your personal entitlement statement — it is printed from the same app.']]);

  B.glossary = () => {
    const sl = frame('glossary', 'Glossary of terms');
    const g = [['Carpet area', 'Usable floor area inside the flat walls (RERA definition)'], ['PAAA', 'Permanent Alternate Accommodation Agreement — your individual contract'], ['DA', 'Development Agreement between the society and the developer'], ['Corpus', 'One-time amount paid to members, often for future maintenance'], ['Transit rent', 'Monthly rent paid for temporary housing during construction'], ['FSI', 'Floor Space Index — how much can be built on the plot'], ['TDR', 'Transferable Development Rights — extra buildable area purchased'], ['IOD / CC', 'Intimation of Disapproval / Commencement Certificate — building approvals'], ['OC', 'Occupation Certificate — permission to occupy the new building'], ['SGBM', 'Special General Body Meeting of society members'], ['PMC', 'Project Management Consultant appointed by the society'], ['RERA', 'Real Estate Regulatory Authority — MahaRERA in Maharashtra']];
    const rows = [[H('Term'), H('Meaning'), H('Term'), H('Meaning')]];
    for (let i = 0; i < 6; i++) rows.push([{ text: g[i][0], options: { bold: true, color: C.primary } }, g[i][1], { text: g[i + 6][0], options: { bold: true, color: C.primary } }, g[i + 6][1]]);
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.75, w: 12.13, colW: [1.5, 4.56, 1.5, 4.57], fontSize: 13, rowH: 0.72 });
  };

  B.contacts = () => {
    const sl = frame('contacts', 'Contacts');
    [['Managing Committee', so.name || 'Society office', 'Secretary / Chairman · society office'], ['Project Management Consultant', so.pmc || '—', 'Technical, financial and process queries'], ['Developer', so.developer || '—', 'Through the committee and PMC only']].forEach(([h, n, d], i) => {
      const x = 0.6 + i * 4.1;
      card(sl, x, 1.85, 3.9, 2.7);
      txt(sl, h.toUpperCase(), { x: x + 0.3, y: 2.05, w: 3.3, h: 0.3, fontSize: 11, bold: true, color: C.primary, charSpacing: 1 });
      txt(sl, n, { x: x + 0.3, y: 2.45, w: 3.3, h: 0.9, fontSize: 18, bold: true });
      txt(sl, d, { x: x + 0.3, y: 3.4, w: 3.3, h: 0.9, fontSize: 13.5, color: C.soft });
    });
    card(sl, 0.6, 4.9, 12.13, 1.7, C.primary);
    txt(sl, 'Thank you', { x: 0.95, y: 5.05, w: 6, h: 0.6, fontSize: 26, bold: true, color: C.white });
    txt(sl, 'Questions are welcome at every stage. Please contact the committee or the PMC before signing any document.', { x: 0.95, y: 5.65, w: 11.3, h: 0.8, fontSize: 15, color: 'E9E2FF' });
  };

  B.payments = () => {
    const sl = frame('payments', 'Payments made so far', 'Rent, shifting, brokerage and corpus paid by the developer.');
    const rows0 = rowsByFlat.map(({ m, c }) => ({ m, c, p: paymentStatus(m, c, s) }));
    const paid = rows0.reduce((a2, r) => a2 + r.p.paid, 0);
    kpi(sl, 0.6, 1.8, 3.9, 'Total committed', inrShort(k.totalPayout));
    kpi(sl, 4.7, 1.8, 3.9, 'Paid so far', inrShort(paid), k.totalPayout ? pct(paid / k.totalPayout * 100) + ' of commitment' : '', C.mint);
    kpi(sl, 8.8, 1.8, 3.93, 'Outstanding', inrShort(k.totalPayout - paid));
    const rows = [[H('Flat'), H('Member'), H('Rent months', 'center'), H('Rent paid', 'right'), H('Shifting', 'center'), H('Brokerage', 'center'), H('Corpus', 'center'), H('Outstanding', 'right')]];
    const yn = v => ({ text: v ? 'Paid' : 'Due', options: { align: 'center', bold: true, color: v ? C.mint : C.faint } });
    rows0.slice(0, 9).forEach(({ m, p: q }) => rows.push([{ text: m.flat, options: { bold: true } }, m.name || '', { text: `${q.months}/${t.rentMonths}`, options: { align: 'center' } }, { text: inr(q.paidRent), options: { align: 'right' } }, { text: `${q.shiftCount}/${t.shiftingTimes}`, options: { align: 'center' } }, yn(q.brokerage), yn(q.corpus), { text: inrShort(q.outstanding), options: { align: 'right', bold: true } }]));
    sl.addTable(rows, { ...TBL, x: 0.6, y: 3.55, w: 12.13, colW: [0.9, 2.8, 1.3, 1.6, 1.2, 1.3, 1.2, 1.83], fontSize: 11, rowH: 0.31 });
    if (rows0.length > 9) txt(sl, `Showing 9 of ${rows0.length} members — full tracker in the app.`, { x: 0.6, y: 6.6, w: 8, h: 0.28, fontSize: 10, color: C.faint });
  };

  B.meetings = () => {
    const sl = frame('meetings', 'Meetings & attendance', 'Decisions taken by the general body and committee.');
    const ms = (s.meetings || []).slice(0, 4);
    if (!ms.length) return txt(sl, 'No meetings recorded yet.', { x: 0.6, y: 2, w: 12, h: 0.5, fontSize: 16, color: C.soft });
    ms.forEach((mt, i) => {
      const y = 1.8 + i * 1.22;
      card(sl, 0.6, y, 12.13, 1.08);
      txt(sl, fmtDate(mt.date), { x: 0.85, y: y + 0.12, w: 1.9, h: 0.4, fontSize: 13, bold: true, color: C.primary });
      txt(sl, mt.type, { x: 0.85, y: y + 0.52, w: 1.9, h: 0.35, fontSize: 11.5, color: C.soft });
      txt(sl, mt.title || 'Meeting', { x: 2.8, y: y + 0.1, w: 7.6, h: 0.4, fontSize: 15, bold: true });
      txt(sl, mt.resolutions || mt.minutes || '', { x: 2.8, y: y + 0.5, w: 7.6, h: 0.5, fontSize: 11.5, color: C.soft });
      txt(sl, `${(mt.attendees || []).length}/${k.total}`, { x: 10.6, y: y + 0.1, w: 1.9, h: 0.5, fontSize: 22, bold: true, align: 'right' });
      txt(sl, 'present', { x: 10.6, y: y + 0.58, w: 1.9, h: 0.3, fontSize: 11, color: C.soft, align: 'right' });
    });
  };

  B.notices = () => {
    const sl = frame('notices', 'Notices & circulars', 'Latest communication to members. Original files are in the app.');
    const ns = [...(s.notices || [])].sort((x, y) => (y.pinned - x.pinned) || String(y.date).localeCompare(String(x.date))).slice(0, 4);
    if (!ns.length) return txt(sl, 'No notices posted yet.', { x: 0.6, y: 2, w: 12, h: 0.5, fontSize: 16, color: C.soft });
    ns.forEach((n, i) => {
      const x = 0.6 + (i % 2) * 6.15, y = 1.8 + Math.floor(i / 2) * 2.5;
      card(sl, x, y, 5.95, 2.3, n.pinned ? C.amberSoft : C.white);
      txt(sl, `${n.category.toUpperCase()}  ·  ${fmtDate(n.date)}${n.pinned ? '  ·  PINNED' : ''}`, { x: x + 0.3, y: y + 0.18, w: 5.35, h: 0.3, fontSize: 10.5, bold: true, color: n.category === 'Urgent' ? C.red : C.primary });
      txt(sl, n.title, { x: x + 0.3, y: y + 0.5, w: 5.35, h: 0.5, fontSize: 16, bold: true });
      txt(sl, (n.body || '').slice(0, 220), { x: x + 0.3, y: y + 1.0, w: 5.35, h: 0.9, fontSize: 12, color: C.soft });
      if (n.fileName) txt(sl, `Attachment: ${n.fileName}`, { x: x + 0.3, y: y + 1.88, w: 5.35, h: 0.3, fontSize: 10.5, color: C.primary, bold: true });
    });
  };

  B.plans = () => {
    const sl = frame('plans', 'Proposed building plans', 'Drawings uploaded for members. Open the app to view the PDF or Word files.');
    const ps = [...(s.plans || [])].sort((x, y) => String(y.date).localeCompare(String(x.date)));
    if (!ps.length) { card(sl, 0.6, 1.9, 12.13, 2.2, C.panel); return txt(sl, 'No plans uploaded yet. Upload the architect’s layout, floor and flat plans in the Building Plans section of the app, then download this presentation again.', { x: 0.95, y: 1.9, w: 11.4, h: 2.2, fontSize: 16, valign: 'middle' }); }
    const rows = [[H('Plan'), H('Type'), H('Revision', 'center'), H('Date'), H('Architect'), H('Status', 'center'), H('File')]];
    ps.slice(0, 12).forEach(pl => rows.push([{ text: pl.title, options: { bold: true } }, pl.type || '', { text: pl.version || '', options: { align: 'center' } }, fmtDate(pl.date), pl.architect || '—', { text: pl.status || 'Proposed', options: { align: 'center', bold: true, color: pl.status === 'Approved' ? C.mint : pl.status === 'Under review' ? C.accent : C.soft } }, pl.fileName ? `${fileKind(pl.fileName)} · ${fmtSize(pl.fileSize || 0)}` : '—']));
    sl.addTable(rows, { ...TBL, x: 0.6, y: 1.85, w: 12.13, colW: [3.0, 2.1, 1.0, 1.4, 1.9, 1.3, 1.43], fontSize: 12, rowH: 0.38 });
  };

  B.docStatus = () => {
    const sl = frame('docStatus', 'Document status', 'Reports and agreements held in the document vault.');
    const ds = s.documents || [];
    const cnt = v => ds.filter(x => x.status === v).length;
    [['Verified', cnt('verified'), C.mint], ['Draft', cnt('draft'), C.accent], ['Pending', cnt('pending'), C.faint]].forEach(([l, v, col], i) => { txt(sl, String(v), { x: 0.6, y: 1.9 + i * 1.3, w: 1.6, h: 0.75, fontSize: 40, bold: true, color: col }); txt(sl, l, { x: 0.6, y: 2.62 + i * 1.3, w: 2.4, h: 0.35, fontSize: 14, color: C.soft }); });
    const rows = [[H('Document'), H('Category'), H('Status', 'center'), H('File', 'center')]];
    ds.slice(0, 13).forEach(x => rows.push([{ text: x.name, options: { bold: true } }, x.category || '', { text: x.status, options: { align: 'center', bold: true, color: x.status === 'verified' ? C.mint : x.status === 'draft' ? C.accent : C.faint } }, { text: x.fileName ? fileKind(x.fileName) : '—', options: { align: 'center' } }]));
    sl.addTable(rows, { ...TBL, x: 3.4, y: 1.8, w: 9.33, colW: [4.4, 2.1, 1.5, 1.33], fontSize: 11.5, rowH: 0.34 });
  };

  order.forEach(id => { const [key, p] = id.split('#'); B[key](p ? +p : 0); });

  if (opts.blob) return pptx.write({ outputType: 'blob' });
  const pptName = `${slug(so.name)}-redevelopment-pack.pptx`;
  if (window.AndroidBridge) { const b = await pptx.write({ outputType: 'blob' }); return downloadBlob(b, pptName, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', true); }
  await pptx.writeFile({ fileName: pptName });
}

export { buildSocietyPPT };
