// screens/auth.jsx — committee & member login, member portal, member access management
import React from 'react';
import ubWordmark from '../assets/ub-wordmark.png';
import { Btn, Field, Ico, Kpi, PageHead, Seg } from '../components/ui';
import { OFFICE_ROLES, ROLES, ROLE_LABEL, calcMember, calcSociety, cleanMobile, exportCSV, fmtDate, inr, inrShort, maskAadhaar, maskPan, pct, sqft, stageProgress, validAadhaar, validMobile, validPAN, waLink } from '../lib/data';
import { FileChip, PdfPreview, fileKind, openStoredFile } from '../lib/files';
import { OtpSettings, OtpStep, maskMobile, otpCfg } from '../lib/otp';
import { Assistant, STATUS_LABEL } from './journey-assistant';
import { Statement } from './members';
import { VaultView, memberAnswer } from './vault';

const normFlat = f => String(f || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const randHex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
async function hashPw(pw, salt) {
  const str = salt + ':' + pw;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return 'S' + Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let r = 0; r < 2000; r++) for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i) + r; h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'F' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}
async function makeCred(pw) { const salt = randHex(12); return { salt, hash: await hashPw(pw, salt), setAt: Date.now() }; }
async function checkCred(cred, pw) { return !!cred && (await hashPw(pw, cred.salt)) === cred.hash; }

const SESSION_KEY = 'srm_session';
const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } };
const saveSession = v => { try { v ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)) : sessionStorage.removeItem(SESSION_KEY); } catch (e) {} };
const phoneLast4 = p => String(p || '').replace(/\D/g, '').slice(-4);
const votingOpen = s => !s.terms.deadline || new Date(s.terms.deadline + 'T23:59:59') >= new Date();

const fails = { n: 0, until: 0 };
function useLockout() {
  const [, force] = React.useState(0);
  React.useEffect(() => { if (fails.until > Date.now()) { const t = setTimeout(() => force(x => x + 1), fails.until - Date.now() + 50); return () => clearTimeout(t); } });
  return {
    locked: fails.until > Date.now(),
    secs: Math.ceil((fails.until - Date.now()) / 1000),
    fail: () => { fails.n++; if (fails.n >= 5) { fails.until = Date.now() + 30000; fails.n = 0; } force(x => x + 1); },
    ok: () => { fails.n = 0; },
  };
}

function PwField({ label, value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = React.useState(false);
  return (
    <label className="field">
      <span className="field-label"><span>{label}</span></span>
      <span className="field-box">
        <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={e => onChange(e.target.value)} autoComplete="off" />
        <button type="button" className="affix pw-eye" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
      </span>
    </label>
  );
}

// ───────── Login ─────────
function LoginSide({ s }) {
  return (
    <div className="login-side">
      <div className="brand"><div className="brand-mark"><Ico n="building" s={22} c="#fff" /></div><div><b>Punarvikas</b><span>Redevelopment Manager for Housing Societies</span></div></div>
      <div>
        <span className="eyebrow light">Secure member portal</span>
        <h1>{s.society.name || 'Housing Society'}</h1>
        <p>{s.society.address || ''}</p>
        <ul className="login-points">
          <li><Ico n="check" s={18} c="#fff" w={2.4} /> Sign in with Bldg No. and flat number, or mobile</li>
          <li><Ico n="check" s={18} c="#fff" w={2.4} /> Mobile verified by a one-time code (OTP)</li>
          <li><Ico n="check" s={18} c="#fff" w={2.4} /> See your own entitlement and rent schedule</li>
          <li><Ico n="check" s={18} c="#fff" w={2.4} /> Vote for your own flat only</li>
        </ul>
      </div>
      <div className="login-credit"><img src={ubWordmark} alt="Universal Builtech Development — PMC Akbar Jiwani" /></div>
    </div>
  );
}

function LoginScreen({ s, a, onLogin }) {
  const [mode, setMode] = React.useState('member');
  // Stay on the setup form until it has shown the recovery code; saving the password sets auth.admin first.
  const [settingUp] = React.useState(() => !(s.auth && s.auth.admin));
  const auth = s.auth || {};
  return (
    <div className="login-wrap">
      <LoginSide s={s} />
      <div className="login-main">
        <div className="login-card">
          <Seg value={mode} onChange={setMode} options={[['member', 'Member login'], ['admin', 'Committee / PMC']]} />
          {mode === 'member' ? <MemberLogin s={s} a={a} onLogin={onLogin} /> : auth.admin && !settingUp ? <AdminLogin s={s} a={a} onLogin={onLogin} /> : <AdminSetup a={a} onLogin={onLogin} />}
        </div>
      </div>
    </div>
  );
}

// ── registration details (mandatory) ──
const blankKyc = role => ({ role: role || 'member', mobile: '', pan: '', aadhaar: '' });
const normKyc = v => ({ role: v.role, mobile: cleanMobile(v.mobile), pan: String(v.pan || '').trim().toUpperCase(), aadhaar: String(v.aadhaar || '').replace(/\D/g, '') });
function checkKyc(v, s, m) {
  const k = normKyc(v);
  if (!ROLE_LABEL[k.role]) return { err: 'Select whether you are a member, committee member or office bearer.' };
  if (!validMobile(k.mobile)) return { err: 'Enter a valid 10-digit Indian mobile number.' };
  if (!validPAN(k.pan)) return { err: 'PAN must be 10 characters in the format ABCDE1234F.' };
  if (!validAadhaar(k.aadhaar)) return { err: 'This Aadhaar number is not valid. Please check all 12 digits.' };
  if (m.kyc && m.kyc.pan) {
    if (m.kyc.pan !== k.pan || m.kyc.aadhaar !== k.aadhaar) return { err: 'PAN or Aadhaar does not match the details registered earlier for this flat. Please contact the committee.', identity: true };
  } else {
    const reg = cleanMobile(m.phone);
    if (reg.length === 10 && reg !== k.mobile) return { err: 'This mobile number does not match the number registered with the committee for this flat.', identity: true };
  }
  return {};
}
const fmtAadhaarInput = d => String(d || '').replace(/(\d{4})(?=\d)/g, '$1 ');
function KycFields({ s, m, v, set }) {
  const taken = OFFICE_ROLES.includes(v.role) && s.members.find(x => x.id !== m.id && x.kyc && x.kyc.role === v.role);
  return (
    <>
      <div className="field">
        <span className="field-label"><span>I am registering as</span></span>
        <div className="role-grid">{ROLES.map(([k, l]) => <button type="button" key={k} className={`role-opt ${v.role === k ? 'on' : ''}`} onClick={() => set({ ...v, role: k })}>{l}</button>)}</div>
        {taken && <span className="field-hint warn">{`${ROLE_LABEL[v.role]} is already registered by Flat ${taken.flat}. The committee will confirm the correct office bearer.`}</span>}
      </div>
      <Field label="Mobile number (WhatsApp & SMS)" prefix="+91" type="tel" value={v.mobile} onChange={x => set({ ...v, mobile: x.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" />
      <Field label="PAN" value={v.pan} onChange={x => set({ ...v, pan: x.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })} placeholder="ABCDE1234F" />
      <Field label="Aadhaar number" type="tel" value={fmtAadhaarInput(v.aadhaar)} onChange={x => set({ ...v, aadhaar: x.replace(/\D/g, '').slice(0, 12) })} placeholder="1234 5678 9012" />
      <p className="footnote kyc-note">Mobile, PAN and Aadhaar are mandatory for the redevelopment agreement and verification. They stay on this device and are shown to the committee only in masked form.</p>
    </>
  );
}

const regMobileOf = m => m ? ((m.kyc && m.kyc.mobile) || (validMobile(cleanMobile(m.phone)) ? cleanMobile(m.phone) : '')) : '';
const findMembers = (s, q, bldg) => {
  const f = normFlat(q);
  const byFlat = s.members.filter(x => f && normFlat(x.flat) === f && (!bldg || !x.bldg || normFlat(x.bldg) === normFlat(bldg)));
  if (byFlat.length) return { list: byFlat, viaMobile: false };
  const mob = cleanMobile(q);
  if (validMobile(mob)) return { list: s.members.filter(x => regMobileOf(x) === mob), viaMobile: true };
  return { list: [], viaMobile: false };
};

function KycGate({ s, a, m, logout, verifyOnly }) {
  const [v, setV] = React.useState(m.kyc ? { role: m.kyc.role, mobile: m.kyc.mobile, pan: m.kyc.pan, aadhaar: m.kyc.aadhaar } : blankKyc());
  const [err, setErr] = React.useState('');
  const [otp, setOtp] = React.useState(!!verifyOnly);
  const lock = useLockout();
  const save = e => {
    e.preventDefault(); if (lock.locked) return; setErr('');
    const r = checkKyc(v, s, m);
    if (r.err) { if (r.identity) lock.fail(); return setErr(r.err); }
    setOtp(true);
  };
  const finish = () => { const k = normKyc(v); a.saveKyc(m.id, { ...k, mobileVerifiedAt: Date.now() }, `Flat ${m.flat} verified mobile by OTP${m.kyc && m.kyc.completedAt ? '' : ' and completed registration as ' + ROLE_LABEL[k.role]}`); };
  return (
    <div className="login-wrap">
      <LoginSide s={s} />
      <div className="login-main">
        <div className="login-card">
          {otp ? <div className="login-form">
            <div className="login-flat"><b>{m.flat}</b><span>{[m.bldg, m.bname, m.name].filter(Boolean).join(' · ')}</span></div>
            <OtpStep s={s} otpKey={`${m.id}:kyc:${normKyc(v).mobile}`} mobile={normKyc(v).mobile} title={verifyOnly ? 'Verify your mobile number to continue' : 'Verify your mobile number'} onVerified={finish} onBack={() => setOtp(false)} />
            <button type="button" className="linkbtn" onClick={logout}>Sign out</button>
          </div> : <form className="login-form" onSubmit={save}>
            <div className="login-flat"><b>{m.flat}</b><span>{[m.bldg, m.bname, m.name].filter(Boolean).join(' · ')}</span></div>
            <h2>{verifyOnly ? 'Check your details' : 'Complete your registration'}</h2>
            <p className="muted">These details are mandatory before you can use the member portal. Your mobile number will be verified with a one-time code.</p>
            <KycFields s={s} m={m} v={v} set={x => { setV(x); setErr(''); }} />
            {err && <div className="login-err">{err}</div>}
            {lock.locked && <div className="login-err">{`Too many attempts. Try again in ${lock.secs}s.`}</div>}
            <Btn kind="primary" type="submit" disabled={lock.locked}>Continue to OTP</Btn>
            <button type="button" className="linkbtn" onClick={logout}>Sign out</button>
          </form>}
        </div>
      </div>
    </div>
  );
}

const bldgList = s => { const mp = {}; s.members.forEach(x => { const b = (x.bldg || '').trim(); if (b && !mp[b]) mp[b] = (x.bname || '').trim(); }); return Object.keys(mp).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).map(b => [b, mp[b]]); };

function MemberLogin({ s, a, onLogin }) {
  const bldgs = bldgList(s);
  const [bl, setBl] = React.useState(() => bldgs.length === 1 ? bldgs[0][0] : '');
  const [q, setQ] = React.useState('');
  const [mid, setMid] = React.useState(null);
  const [choices, setChoices] = React.useState([]);
  const [step, setStep] = React.useState('flat');
  const [pw, setPw] = React.useState(''); const [pw2, setPw2] = React.useState('');
  const [kyc, setKyc] = React.useState(blankKyc());
  const [err, setErr] = React.useState(''); const [busy, setBusy] = React.useState(false);
  const lock = useLockout();
  const m = s.members.find(x => x.id === mid);
  const cred = m && ((s.auth || {}).members || {})[m.id];
  const regMobile = regMobileOf(m);
  const cfg = otpCfg(s);
  const go = st => { setErr(''); setStep(st); };
  const pick = (x, viaMobile) => {
    setMid(x.id); setKyc(blankKyc(x.kyc && x.kyc.role)); setPw(''); setPw2(''); setErr('');
    const c = ((s.auth || {}).members || {})[x.id];
    setStep(c ? (viaMobile && regMobileOf(x) ? 'otp-login' : 'login') : 'create');
  };
  const next = e => {
    e.preventDefault(); setErr('');
    const isMob = validMobile(cleanMobile(q)) && !s.members.some(x => normFlat(x.flat) === normFlat(q));
    if (!isMob && bldgs.length > 1 && !bl) return setErr('Select your Bldg No.');
    const { list, viaMobile } = findMembers(s, q, isMob ? '' : bl);
    if (!list.length) return setErr(isMob ? 'No flat is registered with this mobile number. Sign in with your Bldg No. and flat number instead.' : `Flat ${q.trim()} was not found${bl ? ' in ' + bl : ''}. Check the Bldg No. and flat number, or contact the committee.`);
    if (list.length > 1) { setChoices(list); setStep('pick'); return; }
    pick(list[0], viaMobile);
  };
  const enter = (c, msg) => { a.setMemberCred(m.id, { ...c, lastLogin: Date.now() }, msg || `${m.flat} signed in`); onLogin({ role: 'member', id: m.id }); };
  const login = async e => {
    e.preventDefault(); if (lock.locked) return; setBusy(true); setErr('');
    if (await checkCred(cred, pw)) { lock.ok(); if (cfg.requireOnLogin && regMobile) go('otp-2fa'); else enter(cred); }
    else { lock.fail(); setErr('Incorrect password.'); }
    setBusy(false);
  };
  const create = e => {
    e.preventDefault(); if (lock.locked) return; setErr('');
    const r = checkKyc(kyc, s, m);
    if (r.err) { if (r.identity) lock.fail(); return setErr(r.err); }
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    go('otp-create');
  };
  const finishCreate = async () => {
    const k = normKyc(kyc), c = await makeCred(pw);
    a.registerMember(m.id, { ...k, mobileVerifiedAt: Date.now() }, { ...c, lastLogin: Date.now() }, `Flat ${m.flat} registered as ${ROLE_LABEL[k.role]} (mobile verified by OTP)`);
    onLogin({ role: 'member', id: m.id });
  };
  const resetPw = async e => {
    e.preventDefault(); setErr('');
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    enter(await makeCred(pw), `${m.flat} reset password with OTP`);
  };

  if (step === 'flat') return (
    <form className="login-form" onSubmit={next}>
      <h2>Member sign in</h2>
      <p className="muted">Select your Bldg No. and enter your flat number — or just enter the mobile number you registered with. First time? You will register in the next step.</p>
      {bldgs.length > 0 && <Field label="Bldg No."><select className="sel" value={bl} onChange={e => { setBl(e.target.value); setErr(''); }}>
        <option value="">Select building…</option>
        {bldgs.map(([b, n]) => <option key={b} value={b}>{n ? `${b} · ${n}` : b}</option>)}
      </select></Field>}
      <Field label="Flat number or mobile number" value={q} onChange={v => { setQ(v); setErr(''); }} placeholder="e.g. A-101 or 98XXXXXXXX" hint={bldgs.length > 1 ? 'Bldg No. is not needed when you sign in with your mobile number.' : undefined} />
      {err && <div className="login-err">{err}</div>}
      <Btn kind="primary" type="submit" disabled={!q.trim()}>Continue</Btn>
    </form>
  );
  if (step === 'pick') return (
    <div className="login-form">
      <button type="button" className="linkbtn" onClick={() => go('flat')}><Ico n="chevL" s={16} /> Back</button>
      <h2>Choose your flat</h2>
      <p className="muted">This mobile number is registered for more than one flat.</p>
      <div className="pick-list">{choices.map(x => <button key={x.id} type="button" className="pick-opt" onClick={() => pick(x, true)}><b>{x.flat}</b><span>{[x.bldg, x.bname, x.name].filter(Boolean).join(' · ')}</span><Ico n="chevR" s={18} c="var(--ink-faint)" /></button>)}</div>
    </div>
  );
  const head = <>
    <button type="button" className="linkbtn" onClick={() => { go('flat'); setPw(''); setPw2(''); }}><Ico n="chevL" s={16} /> Change flat</button>
    <div className="login-flat"><b>{m.flat}</b><span>{[m.bldg, m.bname, m.name].filter(Boolean).join(' · ')}</span></div>
  </>;
  if (step === 'otp-login' || step === 'otp-2fa' || step === 'otp-reset' || step === 'otp-create') {
    const mob = step === 'otp-create' ? normKyc(kyc).mobile : regMobile;
    const title = { 'otp-login': 'Sign in with OTP', 'otp-2fa': 'Confirm it’s you', 'otp-reset': 'Reset your password', 'otp-create': 'Verify your mobile number' }[step];
    const done = { 'otp-login': () => enter(cred, `${m.flat} signed in with OTP`), 'otp-2fa': () => enter(cred), 'otp-reset': () => { setPw(''); setPw2(''); go('reset-pw'); }, 'otp-create': finishCreate }[step];
    const back = step === 'otp-create' ? () => go('create') : () => go('login');
    return <div className="login-form">{head}<OtpStep key={step + mob} s={s} otpKey={`${m.id}:${step}:${mob}`} mobile={mob} title={title} onVerified={done} onBack={back} /></div>;
  }
  if (step === 'reset-pw') return (
    <form className="login-form" onSubmit={resetPw}>
      {head}
      <h2>Choose a new password</h2>
      <PwField label="New password (min 6 characters)" value={pw} onChange={v => { setPw(v); setErr(''); }} autoFocus />
      <PwField label="Confirm password" value={pw2} onChange={v => { setPw2(v); setErr(''); }} />
      {err && <div className="login-err">{err}</div>}
      <Btn kind="primary" type="submit" disabled={!pw || !pw2}>Save & sign in</Btn>
    </form>
  );
  return (
    <form className="login-form" onSubmit={step === 'login' ? login : create}>
      {head}
      {step === 'login' ? <>
        <h2>Enter your password</h2>
        <PwField label="Password" value={pw} onChange={v => { setPw(v); setErr(''); }} autoFocus />
        {err && <div className="login-err">{err}</div>}
        {lock.locked && <div className="login-err">{`Too many attempts. Try again in ${lock.secs}s.`}</div>}
        <Btn kind="primary" type="submit" disabled={!pw || busy || lock.locked}>{busy ? 'Checking…' : 'Sign in'}</Btn>
        {regMobile ? <div className="otp-alt">
          <button type="button" className="btn btn-ghost" onClick={() => go('otp-login')}><Ico n="lock" s={17} /><span>{`Sign in with OTP to ${maskMobile(regMobile)}`}</span></button>
          <button type="button" className="linkbtn" onClick={() => go('otp-reset')}>Forgot password? Reset with OTP</button>
        </div> : <p className="footnote">Forgot your password? Ask the committee to reset it, then register again with the same PAN and Aadhaar.</p>}
      </> : <>
        <h2>Register for the first time</h2>
        <p className="muted">All fields are mandatory. A one-time code will be sent to your mobile to verify it.</p>
        <KycFields s={s} m={m} v={kyc} set={x => { setKyc(x); setErr(''); }} />
        <PwField label="Choose a password (min 6 characters)" value={pw} onChange={v => { setPw(v); setErr(''); }} />
        <PwField label="Confirm password" value={pw2} onChange={v => { setPw2(v); setErr(''); }} />
        {err && <div className="login-err">{err}</div>}
        {lock.locked && <div className="login-err">{`Too many attempts. Try again in ${lock.secs}s.`}</div>}
        <Btn kind="primary" type="submit" disabled={!pw || !pw2 || busy || lock.locked}>Continue to OTP</Btn>
      </>}
    </form>
  );
}

function AdminLogin({ s, a, onLogin }) {
  const [pw, setPw] = React.useState(''); const [err, setErr] = React.useState(''); const [rec, setRec] = React.useState(false);
  const [code, setCode] = React.useState(''); const [n1, setN1] = React.useState(''); const [n2, setN2] = React.useState('');
  const lock = useLockout();
  const auth = s.auth;
  const go = async e => { e.preventDefault(); if (lock.locked) return; if (await checkCred(auth.admin, pw)) { lock.ok(); a.setAuth({}, 'Committee signed in'); onLogin({ role: 'admin' }); } else { lock.fail(); setErr('Incorrect committee password.'); } };
  const recover = async e => {
    e.preventDefault(); setErr('');
    if (!(await checkCred(auth.recovery, code.trim().toUpperCase()))) { lock.fail(); return setErr('Recovery code is not correct.'); }
    if (n1.length < 8) return setErr('Committee password must be at least 8 characters.');
    if (n1 !== n2) return setErr('Passwords do not match.');
    a.setAuth({ admin: await makeCred(n1) }, 'Committee password reset with recovery code'); onLogin({ role: 'admin' });
  };
  if (rec) return (
    <form className="login-form" onSubmit={recover}>
      <button type="button" className="linkbtn" onClick={() => { setRec(false); setErr(''); }}><Ico n="chevL" s={16} /> Back</button>
      <h2>Reset committee password</h2>
      <Field label="Recovery code" value={code} onChange={setCode} placeholder="XXXX-XXXX-XXXX" />
      <PwField label="New committee password" value={n1} onChange={setN1} />
      <PwField label="Confirm" value={n2} onChange={setN2} />
      {err && <div className="login-err">{err}</div>}
      <Btn kind="primary" type="submit" disabled={lock.locked}>Reset & sign in</Btn>
    </form>
  );
  return (
    <form className="login-form" onSubmit={go}>
      <h2>Committee / PMC sign in</h2>
      <p className="muted">Full access to manage members, terms, votes, notices and plans.</p>
      <PwField label="Committee password" value={pw} onChange={v => { setPw(v); setErr(''); }} autoFocus />
      {err && <div className="login-err">{err}</div>}
      {lock.locked && <div className="login-err">Too many attempts. Try again in {lock.secs}s.</div>}
      <Btn kind="primary" type="submit" disabled={!pw || lock.locked}>Sign in</Btn>
      {auth.recovery && <button type="button" className="linkbtn" onClick={() => setRec(true)}>Forgot password? Use recovery code</button>}
    </form>
  );
}

function AdminSetup({ a, onLogin }) {
  const [pw, setPw] = React.useState(''); const [pw2, setPw2] = React.useState(''); const [err, setErr] = React.useState('');
  const [code, setCode] = React.useState(null); const [saved, setSaved] = React.useState(false);
  const create = async e => {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    const rc = randHex(6).toUpperCase().match(/.{4}/g).join('-');
    a.setAuth({ admin: await makeCred(pw), recovery: await makeCred(rc), members: {} }, 'Committee password created');
    setCode(rc);
  };
  if (code) return (
    <div className="login-form">
      <h2>Save your recovery code</h2>
      <p className="muted">If the committee password is forgotten, this code is the only way to reset it. Write it down and keep it safe.</p>
      <div className="rec-code">{code}</div>
      <label className="check-row"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have written down the recovery code</label>
      <Btn kind="primary" disabled={!saved} onClick={() => onLogin({ role: 'admin' })}>Continue to the app</Btn>
    </div>
  );
  return (
    <form className="login-form" onSubmit={create}>
      <h2>Set up committee access</h2>
      <p className="muted">First-time setup. This password protects member data, offer terms and vote records.</p>
      <PwField label="Committee password (min 8 characters)" value={pw} onChange={v => { setPw(v); setErr(''); }} autoFocus />
      <PwField label="Confirm password" value={pw2} onChange={v => { setPw2(v); setErr(''); }} />
      {err && <div className="login-err">{err}</div>}
      <Btn kind="primary" type="submit" disabled={!pw || !pw2}>Create & continue</Btn>
    </form>
  );
}

// ───────── Member portal ─────────
const MP_TABS = [['home', 'My flat', 'grid'], ['vote', 'My vote', 'vote'], ['ai', 'AI PMC', 'sparkle'], ['vault', 'Vault', 'folder'], ['notices', 'Notices', 'bell'], ['plans', 'Plans', 'building'], ['progress', 'Progress', 'route'], ['account', 'Account', 'lock']];

function MemberPortal({ s, a, session, logout }) {
  const [tab, setTab] = React.useState('home');
  const m = s.members.find(x => x.id === session.id);
  if (!m) return <div className="login-wrap"><div className="login-main"><div className="login-card"><h2>Account not found</h2><p className="muted">This flat is no longer on the member list.</p><Btn kind="primary" onClick={logout}>Back to sign in</Btn></div></div></div>;
  if (!m.kyc || !m.kyc.completedAt) return <KycGate s={s} a={a} m={m} logout={logout} />;
  if (!m.kyc.mobileVerifiedAt) return <KycGate s={s} a={a} m={m} logout={logout} verifyOnly />;
  const c = calcMember(m, s.terms);
  const P = { s, a, m, c, go: setTab };
  const aiSugg = ['What do I get?', 'My rent schedule', 'My corpus', 'Have I voted?', 'How many have consented?', 'Which stage are we at?', 'What is PAAA?', 'Latest notice', 'Building plans'];
  const screen = { home: <MPHome {...P} />, vote: <MPVote {...P} />,
    ai: <Assistant key={m.id} s={s} answer={q => memberAnswer(s, m, q)} suggestions={aiSugg} sub={`Answers about Flat ${m.flat} and the overall project. Other members’ details stay private.`} intro={`Namaste ${(m.name || '').split(' ')[0] || ''}! I’m the AI PMC assistant for ${s.society.name}. Ask me about your new area, rent, corpus, your vote, the project stage, notices or building plans.`} />,
    vault: <div className="page"><PageHead title="Vault" sub="All documents, circulars and building plans shared by the committee." /><VaultView s={s} member={m} /></div>, notices: <MPNotices s={s} />, plans: <MPPlans s={s} />, progress: <MPProgress s={s} />, account: <MPAccount {...P} logout={logout} /> }[tab];
  return (
    <div className="mp">
      <header className="mp-top no-print">
        <div className="brand"><div className="brand-mark"><Ico n="building" s={20} c="#fff" /></div><div><b>{s.society.name}</b><span>Member portal</span></div></div>
        <div className="mp-user"><div className="mp-av">{(m.name || m.flat).split(' ').map(w => w[0]).slice(0, 2).join('')}</div><div><b>{(m.bldg ? m.bldg + ' · ' : '') + m.flat}</b><span>{m.name}</span></div><Btn small onClick={logout}>Sign out</Btn></div>
      </header>
      <nav className="mp-tabs no-print">{MP_TABS.map(([k, l, i]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); window.scrollTo(0, 0); }}><Ico n={i} s={20} /><span>{l}</span>{k === 'vote' && m.consent === 'pending' && votingOpen(s) && <em></em>}</button>)}</nav>
      <main className="mp-main">{screen}</main>
    </div>
  );
}

function MPHome({ s, m, c, go }) {
  const k = calcSociety(s), pg = stageProgress(s);
  const latest = [...(s.notices || [])].sort((x, y) => (y.pinned - x.pinned) || String(y.date).localeCompare(String(x.date)))[0];
  return (
    <div className="page">
      <div className="mp-hero">
        <div><span className="eyebrow light">Welcome</span><h1>{m.name || `Flat ${m.flat}`}</h1><p>{`Flat ${m.flat} · ${s.society.name}`}</p>{m.kyc.role !== 'member' && <span className="badge b-pin role-badge">{ROLE_LABEL[m.kyc.role] + (m.kyc.roleConfirmed ? '' : ' · awaiting confirmation')}</span>}</div>
        {m.consent === 'pending' && votingOpen(s) ? <Btn kind="primary" icon="vote" onClick={() => go('vote')}>Record your consent</Btn> : <span className={`badge b-${m.consent}`}>{{ yes: 'You consented', no: 'You objected', pending: 'Voting closed' }[m.consent]}</span>}
      </div>
      <div className="kpis">
        <Kpi label="Your new area" value={sqft(c.proposed)} sub={`+${pct(c.gainPct)} from ${Math.round(c.existing)} sq.ft`} tone="up" />
        <Kpi label="Rent · Year 1" value={inr(c.rent)} sub={`+${s.terms.escalationPct}% every year`} />
        <Kpi label="Corpus" value={inrShort(c.corpus)} />
        <Kpi label="Total payout" value={inrShort(c.totalPayout)} />
      </div>
      <div className="cols">
        <div className="panel"><div className="panel-head"><h2>Project progress</h2><Btn small onClick={() => go('progress')}>Details</Btn></div><div className="jr-steps">{s.stages.map(st => <span key={st.key} className={`jr-step jr-${st.status}`}></span>)}</div><p className="muted" style={{ margin: 0 }}>{pg.active ? `Stage ${pg.active.n} of ${s.stages.length}: ${pg.active.title}` : 'All stages complete'}</p></div>
        <div className="panel"><div className="panel-head"><h2>Society consent</h2><Btn small onClick={() => go('vote')}>My vote</Btn></div><div className="bar-big"><span style={{ width: Math.min(100, k.pct) + '%' }}></span><i style={{ left: s.terms.consentThreshold + '%' }}></i></div><p className="muted" style={{ margin: 0 }}>{`${pct(k.pct, 0)} consented · ${s.terms.consentThreshold}% needed`}</p></div>
      </div>
      {latest && <div className="panel"><div className="panel-head"><h2>Latest notice</h2><Btn small onClick={() => go('notices')}>All notices</Btn></div><span className="muted">{`${fmtDate(latest.date)} · ${latest.category}`}</span><b style={{ fontSize: 16 }}>{latest.title}</b>{latest.body && <p className="notice-body">{latest.body}</p>}<FileChip meta={latest} /></div>}
      <h2 className="sec-h">Your entitlement statement</h2>
      <Statement s={s} m={m} c={c} />
      <div className="row-gap no-print" style={{ justifyContent: 'flex-start' }}><Btn icon="print" onClick={() => window.print()}>Print / save PDF</Btn></div>
    </div>
  );
}

function MPVote({ s, a, m }) {
  const [choice, setChoice] = React.useState(null);
  const [agree, setAgree] = React.useState(false);
  const [pw, setPw] = React.useState(''); const [err, setErr] = React.useState('');
  const open = votingOpen(s), k = calcSociety(s);
  const cred = ((s.auth || {}).members || {})[m.id];
  const submit = async () => {
    setErr('');
    if (!(await checkCred(cred, pw))) return setErr('Password is not correct.');
    a.selfVote(m.id, choice); setChoice(null); setAgree(false); setPw('');
  };
  const ref = m.votedAt ? `${normFlat(m.flat)}-${String(m.votedAt).slice(-6)}` : '';
  return (
    <div className="page">
      <PageHead title="My consent" sub={`You can vote for Flat ${m.flat} only. ${open ? `Voting closes ${fmtDate(s.terms.deadline)}.` : 'Voting is closed.'}`} />
      <div className="panel vote-card">
        <span className="eyebrow">Proposal</span>
        <h2>{`Redevelopment of ${s.society.name}${s.society.developer ? ` by ${s.society.developer}` : ''}`}</h2>
        <p className="muted">{`On the terms in your entitlement statement: ${s.terms.areaGainPct}% more carpet area, rent increasing ${s.terms.escalationPct}% every year for ${s.terms.rentMonths} months, plus corpus, shifting and brokerage.`}</p>
        <div className={`vote-status vs-${m.consent}`}>
          <Ico n={m.consent === 'yes' ? 'check' : m.consent === 'no' ? 'x' : 'clock'} s={26} c="currentColor" w={2.4} />
          <div><b>{{ yes: 'You have given consent', no: 'You have objected', pending: 'You have not voted yet' }[m.consent]}</b>{m.votedAt && <span>{`${new Date(m.votedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${m.votedBy === 'member' ? 'by you online' : 'recorded by committee'} · Ref ${ref}`}</span>}</div>
        </div>
        {open && !choice && <div className="vote-btns">
          <button className="vbig vbig-yes" onClick={() => setChoice('yes')}><Ico n="check" s={26} c="#fff" w={2.6} /><b>I give consent</b><span>{m.consent === 'yes' ? 'Already selected' : 'Agree to the proposal'}</span></button>
          <button className="vbig vbig-no" onClick={() => setChoice('no')}><Ico n="x" s={26} c="#fff" w={2.6} /><b>I object</b><span>{m.consent === 'no' ? 'Already selected' : 'Do not agree'}</span></button>
        </div>}
        {open && choice && <div className="vote-confirm">
          <h3>{choice === 'yes' ? 'Confirm your consent' : 'Confirm your objection'}</h3>
          <label className="check-row"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> {`I am the member of Flat ${m.flat} and I am recording this ${choice === 'yes' ? 'consent' : 'objection'} myself.`}</label>
          <PwField label="Re-enter your password to confirm" value={pw} onChange={v => { setPw(v); setErr(''); }} />
          {err && <div className="login-err">{err}</div>}
          <div className="row-gap" style={{ justifyContent: 'flex-start', margin: 0 }}><Btn onClick={() => { setChoice(null); setPw(''); setAgree(false); }}>Cancel</Btn><Btn kind="primary" icon="check" disabled={!agree || !pw} onClick={submit}>Submit vote</Btn></div>
        </div>}
        {open && m.consent !== 'pending' && !choice && <p className="footnote">You can change your vote until voting closes. The committee can see the time of every change.</p>}
      </div>
      <div className="kpis">
        <Kpi label="Members consented" value={`${k.yes} of ${k.total}`} sub={`${pct(k.pct, 0)}`} tone="up" />
        <Kpi label="Required" value={`${s.terms.consentThreshold}%`} sub={`${k.required} members`} />
        <Kpi label="Status" value={k.reached ? 'Majority reached' : `${k.needed} more needed`} />
      </div>
      <p className="footnote">Other members’ individual votes are visible only to the committee.</p>
    </div>
  );
}

function MPNotices({ s }) {
  const list = [...(s.notices || [])].sort((x, y) => (y.pinned - x.pinned) || String(y.date).localeCompare(String(x.date)));
  return (
    <div className="page">
      <PageHead title="Notices & circulars" sub="Issued by the committee." />
      {list.length === 0 ? <div className="empty"><h3>No notices yet</h3></div> : <div className="stack">{list.map(n => (
        <article key={n.id} className={`panel notice ${n.pinned ? 'pinned' : ''}`}>
          <div className="notice-tags"><span className="badge b-pending">{n.category}</span>{n.pinned && <span className="badge b-pin">Pinned</span>}<span className="muted">{fmtDate(n.date)}</span></div>
          <h2>{n.title}</h2>{n.body && <p className="notice-body">{n.body}</p>}<FileChip meta={n} />
        </article>))}</div>}
    </div>
  );
}

function MPPlans({ s }) {
  const [view, setView] = React.useState(null);
  const plans = [...(s.plans || [])].sort((x, y) => String(y.date).localeCompare(String(x.date)));
  return (
    <div className="page">
      <PageHead title="Proposed building plans" sub="Drawings shared by the committee and architect." />
      {view && <div className="panel"><div className="panel-head"><div><span className="eyebrow">{`${view.type} · ${view.version || ''}`}</span><h2>{view.title}</h2></div><Btn small icon="x" onClick={() => setView(null)}>Close</Btn></div><PdfPreview meta={view} height={600} /><FileChip meta={view} /></div>}
      {plans.length === 0 ? <div className="empty"><h3>No plans shared yet</h3><p>Plans will appear here once the committee uploads them.</p></div> : <div className="plan-grid">{plans.map(p => (
        <div key={p.id} className="panel plan-card">
          <button className="plan-thumb" onClick={() => p.fileId && (fileKind(p.fileName) === 'PDF' ? setView(p) : openStoredFile(p, true))}><span className={`fk fk-${fileKind(p.fileName).toLowerCase()}`}>{p.fileId ? fileKind(p.fileName) : 'No file'}</span><Ico n="building" s={36} c="var(--ink-faint)" />{p.fileId && <span className="plan-open">{fileKind(p.fileName) === 'PDF' ? 'View' : 'Download'}</span>}</button>
          <div className="plan-meta"><div className="notice-tags"><span className={`badge ${p.status === 'Approved' ? 'b-yes' : 'b-pending'}`}>{p.status}</span><span className="muted">{`${p.version || ''} · ${fmtDate(p.date)}`}</span></div><b>{p.title}</b><span className="muted">{p.type}</span>{p.note && <span className="plan-note">{p.note}</span>}</div>
        </div>))}</div>}
    </div>
  );
}

function MPProgress({ s }) {
  const pg = stageProgress(s);
  return (
    <div className="page">
      <PageHead title="Redevelopment progress" sub={`${pct(pg.pct, 0)} of all steps complete.`} />
      <ol className="jr">{s.stages.map((st, i) => (
        <li key={st.key} className={`jr-item jr-${st.status}`}>
          <div className="jr-rail"><span className="jr-dot">{st.status === 'done' ? <Ico n="check" s={16} c="#fff" w={2.6} /> : st.n}</span>{i < s.stages.length - 1 && <span className="jr-line"></span>}</div>
          <div className="jr-card" style={{ cursor: 'default' }}>
            <div className="jr-head"><h3>{st.title}</h3><span className={`badge st-${st.status}`}>{STATUS_LABEL[st.status]}</span></div>
            <p>{st.blurb}</p>
            {st.status !== 'upcoming' && <ul className="mp-steps">{st.items.map((it, j) => <li key={j} className={it.done ? 'done' : ''}><Ico n={it.done ? 'check' : 'clock'} s={14} c={it.done ? 'var(--mint)' : 'var(--ink-faint)'} w={2.4} />{it.text}</li>)}</ul>}
            {st.notes && <p className="mp-note">{st.notes}</p>}
            {st.date && <div className="jr-meta"><span>{st.date}</span></div>}
          </div>
        </li>))}</ol>
    </div>
  );
}

function MPAccount({ s, a, m, logout }) {
  const [o, setO] = React.useState(''); const [n1, setN1] = React.useState(''); const [n2, setN2] = React.useState('');
  const [msg, setMsg] = React.useState(''); const [err, setErr] = React.useState('');
  const cred = ((s.auth || {}).members || {})[m.id];
  const change = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!(await checkCred(cred, o))) return setErr('Current password is not correct.');
    if (n1.length < 6) return setErr('New password must be at least 6 characters.');
    if (n1 !== n2) return setErr('Passwords do not match.');
    a.setMemberCred(m.id, { ...(await makeCred(n1)), lastLogin: cred.lastLogin }, `${m.flat} changed password`);
    setO(''); setN1(''); setN2(''); setMsg('Password changed.');
  };
  return (
    <div className="page">
      <PageHead title="My account" />
      <div className="cols">
        <div className="panel">
          <h2>Account details</h2>
          <div className="acct-row"><span>Bldg No.</span><b>{[m.bldg, m.bname].filter(Boolean).join(' · ') || '—'}</b></div>
          <div className="acct-row"><span>User ID (flat)</span><b>{m.flat}</b></div>
          <div className="acct-row"><span>Name</span><b>{m.name || '—'}</b></div>
          <div className="acct-row"><span>Registered as</span><b>{ROLE_LABEL[m.kyc.role]}{m.kyc.role !== 'member' && !m.kyc.roleConfirmed ? ' (awaiting confirmation)' : ''}</b></div>
          <div className="acct-row"><span>Mobile</span><b>{'+91 ' + m.kyc.mobile + (m.kyc.mobileVerifiedAt ? ' · verified by OTP' : '')}</b></div>
          <div className="acct-row"><span>PAN</span><b>{maskPan(m.kyc.pan)}</b></div>
          <div className="acct-row"><span>Aadhaar</span><b>{maskAadhaar(m.kyc.aadhaar)}</b></div>
          <div className="acct-row"><span>Verification</span><b>{m.kyc.verified ? 'Verified by committee' : 'Pending committee check'}</b></div>
          <div className="acct-row"><span>Password set</span><b>{cred ? fmtDate(new Date(cred.setAt).toISOString().slice(0, 10)) : '—'}</b></div>
          <p className="footnote">To correct your name, phone or area, contact the committee.</p>
          <Btn onClick={logout}>Sign out</Btn>
        </div>
        <form className="panel" onSubmit={change}>
          <h2>Change password</h2>
          <PwField label="Current password" value={o} onChange={setO} />
          <PwField label="New password" value={n1} onChange={setN1} />
          <PwField label="Confirm new password" value={n2} onChange={setN2} />
          {err && <div className="login-err">{err}</div>}
          {msg && <div className="login-ok">{msg}</div>}
          <Btn kind="primary" type="submit" disabled={!o || !n1 || !n2}>Change password</Btn>
        </form>
      </div>
    </div>
  );
}

// ───────── Committee: member access & KYC register ─────────
function MemberAccess({ s, a, logout }) {
  const [q, setQ] = React.useState(''); const [f, setF] = React.useState('all');
  const [o, setO] = React.useState(''); const [n1, setN1] = React.useState(''); const [n2, setN2] = React.useState('');
  const [err, setErr] = React.useState(''); const [msg, setMsg] = React.useState('');
  const creds = (s.auth || {}).members || {};
  const reg = s.members.filter(m => m.kyc && m.kyc.completedAt);
  const group = key => { const g = {}; reg.forEach(m => { (g[m.kyc[key]] = g[m.kyc[key]] || []).push(m.flat); }); return g; };
  const byPan = group('pan'), byAad = group('aadhaar');
  const dupNote = m => { if (!m.kyc) return null; const p = byPan[m.kyc.pan].filter(x => x !== m.flat), d = byAad[m.kyc.aadhaar].filter(x => x !== m.flat); return (p.length || d.length) ? <span className="dup">{`Same ${p.length ? 'PAN' : 'Aadhaar'} as ${[...new Set([...p, ...d])].join(', ')}`}</span> : null; };
  const list = s.members.filter(m => (!q || (m.flat + ' ' + m.name).toLowerCase().includes(q.toLowerCase())) && (f === 'all' || (f === 'reg' && m.kyc) || (f === 'unreg' && !m.kyc) || (f === 'check' && m.kyc && (!m.kyc.verified || !m.kyc.roleConfirmed))));
  const changeAdmin = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!(await checkCred(s.auth.admin, o))) return setErr('Current password is not correct.');
    if (n1.length < 8) return setErr('Use at least 8 characters.');
    if (n1 !== n2) return setErr('Passwords do not match.');
    a.setAuth({ admin: await makeCred(n1) }, 'Committee password changed'); setO(''); setN1(''); setN2(''); setMsg('Committee password changed.');
  };
  const when = t2 => t2 ? new Date(t2).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const office = ['chairman', 'secretary', 'treasurer'].map(r => [r, reg.filter(m => m.kyc.role === r)]);
  const committee = reg.filter(m => m.kyc.role === 'committee');
  return (
    <div className="page">
      <PageHead title="Member logins & registration" sub="Members register once with mobile, PAN and Aadhaar, then vote for their own flat only.">
        <Btn icon="download" onClick={() => exportCSV(s)}>Export register (CSV)</Btn>
        <Btn icon="lock" onClick={logout}>Sign out</Btn>
      </PageHead>
      <div className="kpis">
        <Kpi label="Members" value={s.members.length} />
        <Kpi label="Registered" value={reg.length} sub={s.members.length ? pct((reg.length / s.members.length) * 100, 0) : ''} tone="up" />
        <Kpi label="KYC verified" value={reg.filter(m => m.kyc.verified).length} sub={`${reg.filter(m => !m.kyc.verified).length} to check`} />
        <Kpi label="Voted online" value={s.members.filter(m => m.votedBy === 'member').length} />
      </div>
      <div className="lock-note"><Ico n="lock" s={18} c="currentColor" /><span>The committee and PMC cannot vote for any member. Office bearers and committee members vote from their own flat login like every other member.</span></div>
      <div className="panel">
        <h2>Office bearers & committee</h2>
        <div className="ob-grid">
          {office.map(([r, ms]) => <div key={r} className="ob"><span>{ROLE_LABEL[r]}</span>{ms.length ? ms.map(m => <div key={m.id} className="ob-row"><b>{`${m.flat} · ${m.name}`}</b>{m.kyc.roleConfirmed ? <span className="badge b-yes">Confirmed</span> : <Btn small onClick={() => confirm(`Confirm ${m.name} (${m.flat}) as ${ROLE_LABEL[r]}?`) && a.setKycFlags(m.id, { roleConfirmed: true }, `${m.flat} confirmed as ${ROLE_LABEL[r]}`)}>Confirm</Btn>}</div>) : <i className="muted">Not registered yet</i>}{ms.length > 1 && <span className="dup">More than one member claims this role</span>}</div>)}
          <div className="ob"><span>Committee members</span>{committee.length ? committee.map(m => <div key={m.id} className="ob-row"><b>{`${m.flat} · ${m.name}`}</b>{m.kyc.roleConfirmed ? <span className="badge b-yes">Confirmed</span> : <Btn small onClick={() => a.setKycFlags(m.id, { roleConfirmed: true }, `${m.flat} confirmed as committee member`)}>Confirm</Btn>}</div>) : <i className="muted">None registered yet</i>}</div>
        </div>
      </div>
      <OtpSettings s={s} a={a} />
      <div className="panel">
        <h2>How members register</h2>
        <ol className="how">
          <li>Open the app, choose <b>Member login</b>, select the <b>Bldg No.</b> and enter the flat number, e.g. <b>{s.members[0] ? s.members[0].flat : 'A-101'}</b>.</li>
          <li>First time: choose <b>Member, Committee member, Chairman, Secretary or Treasurer</b>, then enter mobile number, PAN and Aadhaar (all mandatory) and a password. A 6-digit OTP sent to the mobile confirms the number.</li>
          <li>If the committee already has a mobile number for the flat, the member must enter the same number.</li>
          <li>Check each member’s original PAN and Aadhaar, then press <b>Verify</b>. Confirm office bearers under the panel above.</li>
        </ol>
      </div>
      <div className="toolbar">
        <Seg value={f} onChange={setF} options={[['all', `All ${s.members.length}`], ['reg', `Registered ${reg.length}`], ['unreg', `Not registered ${s.members.length - reg.length}`], ['check', 'Needs checking']]} />
        <div className="search"><Ico n="search" s={18} /><input placeholder="Search flat or name…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Flat</th><th>Member</th><th>Registered as</th><th>Mobile</th><th>PAN</th><th>Aadhaar</th><th>KYC</th><th>Last sign in</th><th>Vote</th><th></th></tr></thead>
          <tbody>{list.map(m => { const c = creds[m.id], k = m.kyc; return (
            <tr key={m.id} className="norow">
              <td><b>{m.flat}</b></td><td>{m.name}</td>
              <td>{k ? <>{ROLE_LABEL[k.role]}{k.role !== 'member' && !k.roleConfirmed && <span className="dup amber">Awaiting confirmation</span>}</> : <span className="badge b-pending">Not registered</span>}</td>
              <td>{k ? <a className="tbl-link" href={waLink(k.mobile, `Dear ${m.name || 'Member'} (Flat ${m.flat}), `)} target="_blank" rel="noopener">{'+91 ' + k.mobile}</a> : '—'}{k && (k.mobileVerifiedAt ? <span className="otp-ok">✓ OTP verified</span> : <span className="dup amber">Not OTP-verified</span>)}</td>
              <td className="mono">{k ? maskPan(k.pan) : '—'}{dupNote(m)}</td>
              <td className="mono">{k ? maskAadhaar(k.aadhaar) : '—'}</td>
              <td>{k ? (k.verified ? <span className="badge b-yes">Verified</span> : <Btn small onClick={() => confirm(`Have you checked the original PAN and Aadhaar of ${m.name} (${m.flat})?`) && a.setKycFlags(m.id, { verified: true, verifiedAt: Date.now() }, `KYC verified for ${m.flat}`)}>Verify</Btn>) : '—'}</td>
              <td>{c ? when(c.lastLogin) : '—'}</td>
              <td><span className={`badge b-${m.consent}`}>{{ yes: 'Consent', no: 'Objection', pending: 'Pending' }[m.consent]}</span></td>
              <td className="r">{c && <Btn small onClick={() => confirm(`Reset the password for ${m.flat}? The member must register again with the same PAN and Aadhaar.`) && a.setMemberCred(m.id, null, `Password reset for ${m.flat}`)}>Reset password</Btn>}</td>
            </tr>); })}</tbody>
        </table>
      </div>
      <p className="footnote">PAN and Aadhaar are shown masked. Under UIDAI rules, avoid storing or sharing full Aadhaar numbers beyond what the redevelopment agreement needs. Backup files contain full numbers — keep them secure.</p>
      <form className="panel" onSubmit={changeAdmin} style={{ maxWidth: 520 }}>
        <h2>Change committee password</h2>
        <PwField label="Current password" value={o} onChange={setO} />
        <PwField label="New password" value={n1} onChange={setN1} />
        <PwField label="Confirm new password" value={n2} onChange={setN2} />
        {err && <div className="login-err">{err}</div>}
        {msg && <div className="login-ok">{msg}</div>}
        <Btn kind="primary" type="submit" disabled={!o || !n1 || !n2}>Change password</Btn>
      </form>
    </div>
  );
}

export { normFlat, randHex, hashPw, makeCred, checkCred, SESSION_KEY, loadSession, saveSession, phoneLast4, votingOpen, fails, useLockout, PwField, LoginSide, LoginScreen, blankKyc, normKyc, checkKyc, fmtAadhaarInput, KycFields, regMobileOf, findMembers, KycGate, bldgList, MemberLogin, AdminLogin, AdminSetup, MP_TABS, MemberPortal, MPHome, MPVote, MPNotices, MPPlans, MPProgress, MPAccount, MemberAccess };
