// lib/otp.jsx — mobile OTP: generation, delivery (test mode / SMS gateway), entry screen, committee settings
import React from 'react';
import { Btn, Field, Ico, Seg } from '../components/ui';
import { cleanMobile, validMobile } from './data';
import { hashPw, randHex } from '../screens/auth';

const OTP_TTL = 5 * 60 * 1000, OTP_RESEND = 30 * 1000, OTP_TRIES = 5;
const otpStore = {};
const maskMobile = m => m ? '+91 XXXXXX' + String(m).slice(-4) : '';
const otpCfg = s => ({ mode: 'test', method: 'GET', url: '', body: '', headers: '', requireOnLogin: false, template: '{otp} is your OTP for {society}. Valid for 5 minutes. Do not share it with anyone.', ...(s.otp || {}) });
const OTP_PRESETS = {
  twofactor: { label: '2Factor.in (example)', method: 'GET', url: 'https://2factor.in/API/V1/YOUR_API_KEY/SMS/{mobile}/{otp}', body: '', headers: '' },
  fast2sms: { label: 'Fast2SMS OTP route (example)', method: 'GET', url: 'https://www.fast2sms.com/dev/bulkV2?authorization=YOUR_API_KEY&route=otp&variables_values={otp}&flash=0&numbers={mobile}', body: '', headers: '' },
  custom: { label: 'My own server (POST JSON)', method: 'POST', url: 'https://your-server.example/send-otp', body: '{"mobile":"{mobile91}","otp":"{otp}","message":"{message}"}', headers: '{"Authorization":"Bearer YOUR_TOKEN"}' },
};

async function deliverOtp(s, mobile, code) {
  const c = otpCfg(s);
  if (c.mode !== 'gateway' || !c.url.trim()) return { test: true };
  const msg = c.template.replace(/\{otp\}/g, code).replace(/\{society\}/g, s.society.name || 'your society');
  const fill = (str, enc) => String(str || '').replace(/\{mobile91\}/g, '91' + mobile).replace(/\{mobile\}/g, mobile).replace(/\{otp\}/g, code).replace(/\{message\}/g, enc ? encodeURIComponent(msg) : msg.replace(/"/g, "'"));
  const url = fill(c.url.trim(), true);
  if (!/^https:\/\//i.test(url)) return { err: 'The SMS service address must start with https://' };
  try {
    if (c.method === 'POST') {
      let headers = {};
      try { headers = c.headers.trim() ? JSON.parse(c.headers) : {}; } catch (e) { return { err: 'Headers are not valid JSON. Fix them in OTP settings.' }; }
      const body = fill(c.body, false);
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
        if (!r.ok) return { err: `The SMS service replied with error ${r.status}.` };
      } catch (e) {
        // blocked before sending (no CORS on the server) — resend as a simple request
        await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body });
      }
    } else {
      await fetch(url, { mode: 'no-cors' }); // simple GET: always delivered; the reply cannot be read
    }
    return { sent: true };
  } catch (e) { return { err: 'Could not reach the SMS service. Check the internet connection and try again.' }; }
}

async function sendOtp(s, key, mobile) {
  const now = Date.now(), prev = otpStore[key];
  if (prev && now - prev.sentAt < OTP_RESEND) return { err: `Please wait ${Math.ceil((OTP_RESEND - (now - prev.sentAt)) / 1000)}s before asking for a new code.` };
  if (!validMobile(mobile)) return { err: 'No valid mobile number on record for this flat.' };
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const r = await deliverOtp(s, mobile, code);
  if (r.err) return r;
  const salt = randHex(8);
  otpStore[key] = { mobile, salt, hash: await hashPw(code, salt), exp: now + OTP_TTL, sentAt: now, tries: 0 };
  return { ok: true, testCode: r.test ? code : null };
}

async function verifyOtp(key, code) {
  const o = otpStore[key];
  if (!o) return { err: 'Ask for a code first.' };
  if (Date.now() > o.exp) { delete otpStore[key]; return { err: 'This code has expired. Ask for a new one.' }; }
  if (o.tries >= OTP_TRIES) return { err: 'Too many wrong attempts. Ask for a new code.' };
  if ((await hashPw(code, o.salt)) !== o.hash) { o.tries++; return { err: o.tries >= OTP_TRIES ? 'Too many wrong attempts. Ask for a new code.' : `Incorrect code. ${OTP_TRIES - o.tries} attempt${OTP_TRIES - o.tries === 1 ? '' : 's'} left.` }; }
  delete otpStore[key];
  return { ok: true };
}

function OtpStep({ s, otpKey, mobile, title, onVerified, onBack }) {
  const [digits, setDigits] = React.useState('');
  const [st, setSt] = React.useState({ sending: false, sentAt: 0, test: null, err: '' });
  const [now, setNow] = React.useState(Date.now());
  const [busy, setBusy] = React.useState(false);
  const started = React.useRef(false);
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const send = async () => {
    setSt(x => ({ ...x, sending: true, err: '' }));
    const r = await sendOtp(s, otpKey, mobile);
    setSt(x => ({ ...x, sending: false, err: r.err || '', sentAt: r.ok ? Date.now() : x.sentAt, test: r.ok ? r.testCode : x.test }));
    if (r.ok) setDigits('');
  };
  React.useEffect(() => { if (!started.current) { started.current = true; send(); } }, []);
  const verify = async e => {
    if (e) e.preventDefault();
    if (digits.length !== 6 || busy) return;
    setBusy(true);
    const r = await verifyOtp(otpKey, digits);
    setBusy(false);
    if (r.ok) onVerified(); else setSt(x => ({ ...x, err: r.err }));
  };
  React.useEffect(() => { if (digits.length === 6) verify(); }, [digits]);
  const wait = st.sentAt ? Math.max(0, Math.ceil((st.sentAt + OTP_RESEND - now) / 1000)) : 0;
  const left = st.sentAt ? Math.max(0, Math.ceil((st.sentAt + OTP_TTL - now) / 1000)) : 0;
  return (
    <form className="login-form" onSubmit={verify}>
      {onBack && <button type="button" className="linkbtn" onClick={onBack}><Ico n="chevL" s={16} /> Back</button>}
      <div className="otp-ic"><Ico n="lock" s={26} c="var(--primary)" /></div>
      <h2>{title || 'Verify your mobile number'}</h2>
      <p className="muted">{st.sentAt ? `Enter the 6-digit code sent to ${maskMobile(mobile)}.` : st.sending ? `Sending a code to ${maskMobile(mobile)}…` : `A code will be sent to ${maskMobile(mobile)}.`}</p>
      {st.test && <div className="otp-test"><b>Test mode</b><span>No SMS service is connected yet, so your code is shown here:</span><code>{st.test}</code></div>}
      <input className="otp-in" value={digits} onChange={e => { setDigits(e.target.value.replace(/\D/g, '').slice(0, 6)); setSt(x => ({ ...x, err: '' })); }} autoComplete="one-time-code" inputMode="numeric" placeholder="••••••" autoFocus aria-label="6-digit code" />
      {st.err && <div className="login-err">{st.err}</div>}
      <Btn kind="primary" type="submit" disabled={digits.length !== 6 || busy || !st.sentAt}>{busy ? 'Checking…' : 'Verify'}</Btn>
      <div className="otp-foot">
        <span>{st.sentAt ? (left > 0 ? `Code expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Code expired') : ''}</span>
        <button type="button" className="linkbtn" disabled={wait > 0 || st.sending} onClick={send}>{st.sending ? 'Sending…' : wait > 0 ? `Resend in ${wait}s` : st.sentAt ? 'Resend code' : 'Send code'}</button>
      </div>
    </form>
  );
}

function OtpSettings({ s, a }) {
  const c = otpCfg(s);
  const [d, setD] = React.useState(c);
  const [tn, setTn] = React.useState('');
  const [res, setRes] = React.useState(null);
  const dirty = JSON.stringify(d) !== JSON.stringify(c);
  const upd = p => setD(x => ({ ...x, ...p }));
  const live = c.mode === 'gateway' && c.url.trim();
  const test = async () => {
    setRes({ info: 'Sending…' });
    const r = await sendOtp({ ...s, otp: d }, 'test:' + Date.now(), cleanMobile(tn));
    setRes(r.ok ? { ok: r.testCode ? `Test mode — code ${r.testCode} (no SMS sent).` : 'Request sent to the SMS service. Check the phone for the message.' } : { err: r.err });
  };
  return (
    <div className="panel">
      <div className="panel-head"><h2>Mobile OTP verification</h2><span className={`badge ${live ? 'b-yes' : 'b-amber'}`}>{live ? 'SMS service connected' : 'Test mode'}</span></div>
      <p className="muted" style={{ margin: 0 }}>Members receive a 6-digit code when they register, sign in with their mobile number, or reset a forgotten password. Codes expire after 5 minutes and allow 5 attempts.</p>
      <Field label="How codes are delivered"><Seg value={d.mode} onChange={v => upd({ mode: v })} options={[['test', 'Test mode'], ['gateway', 'SMS service']]} /></Field>
      {d.mode === 'test' && <div className="otp-test"><span>In test mode the code is shown on screen. Use it to try the flow, but it does not prove the member owns the number. Connect an SMS service before members register.</span></div>}
      {d.mode === 'gateway' && <>
        <Field label="Start from an example"><select className="sel" value="" onChange={e => { const p = OTP_PRESETS[e.target.value]; if (p) { const { label, ...rest } = p; upd(rest); } }}><option value="">Choose a provider…</option>{Object.entries(OTP_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></Field>
        <Field label="Method"><Seg value={d.method} onChange={v => upd({ method: v })} options={[['GET', 'GET'], ['POST', 'POST']]} /></Field>
        <label className="field"><span className="field-label"><span>Request URL</span></span><textarea className="ta mono-ta" rows="3" value={d.url} onChange={e => upd({ url: e.target.value })} placeholder="https://…?mobile={mobile}&otp={otp}"></textarea></label>
        {d.method === 'POST' && <>
          <label className="field"><span className="field-label"><span>Body</span></span><textarea className="ta mono-ta" rows="3" value={d.body} onChange={e => upd({ body: e.target.value })}></textarea></label>
          <label className="field"><span className="field-label"><span>Headers (JSON)</span></span><textarea className="ta mono-ta" rows="2" value={d.headers} onChange={e => upd({ headers: e.target.value })}></textarea></label>
        </>}
        <Field label="Message text" value={d.template} onChange={v => upd({ template: v })} hint="Placeholders: {otp}, {society}" />
        <p className="footnote" style={{ margin: 0 }}>Placeholders for the URL and body: {'{mobile}'} (10 digits), {'{mobile91}'} (with 91), {'{otp}'}, {'{message}'}. Replace YOUR_API_KEY with the key from your SMS provider. Indian SMS providers usually need a DLT-registered OTP template.</p>
        <div className="lock-note warn-note"><Ico n="alert" s={18} c="currentColor" /><span>The API key is saved in this app’s data on this device and inside backup files. Use a key that can only send OTPs, or your own small server, before going live.</span></div>
      </>}
      <label className="check-row"><input type="checkbox" checked={!!d.requireOnLogin} onChange={e => upd({ requireOnLogin: e.target.checked })} /> Also ask for an OTP every time a member signs in with a password</label>
      <div className="otp-set-foot">
        <Btn kind="primary" icon="check" disabled={!dirty} onClick={() => { a.setOtp(d); setRes({ ok: 'OTP settings saved.' }); }}>Save OTP settings</Btn>
        <div className="otp-tester"><Field label="Send a test code to" prefix="+91" type="tel" value={tn} onChange={v => setTn(v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" /><Btn disabled={!validMobile(cleanMobile(tn))} onClick={test}>Send test code</Btn></div>
      </div>
      {res && (res.err ? <div className="login-err">{res.err}</div> : <div className="login-ok">{res.ok || res.info}</div>)}
    </div>
  );
}

export { OTP_TTL, OTP_RESEND, OTP_TRIES, otpStore, maskMobile, otpCfg, OTP_PRESETS, deliverOtp, sendOtp, verifyOtp, OtpStep, OtpSettings };
