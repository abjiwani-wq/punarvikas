// lib/license.jsx — PMC activation codes. A new society can only be started with a code issued by the PMC.
import React from 'react';
import { Ico } from '../components/ui';

// Code format: PV-SSSS-XXXX-XXXX  (SSSS = PMC serial, XXXX-XXXX = signature bound to the society name)
const PV_ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PV_SECRET = 'PNV·AJA·7f3c91e2·REDEV·2026·k9Qm';
const normSoc = n => String(n || '').toUpperCase().replace(/\b(CO-?OP(ERATIVE)?|CHS|LTD|LIMITED|HOUSING|SOCIETY|THE)\b/g, '').replace(/[^A-Z0-9]/g, '');
function pvHash(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}
function pvSig(serial, name) {
  const [a, b] = pvHash(`${PV_SECRET}|${serial}|${normSoc(name)}`, 7919);
  let out = '', x = a, y = b;
  for (let i = 0; i < 8; i++) { const v = (i < 5 ? x : y) & 31; out += PV_ALPHA[v]; if (i < 5) x >>>= 5; else y >>>= 5; }
  return out;
}
const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^PV/, '');
function parseCode(c) { const k = cleanCode(c); return k.length === 12 ? { serial: k.slice(0, 4), sig: k.slice(4) } : null; }
function fmtCode(serial, sig) { return `PV-${serial}-${sig.slice(0, 4)}-${sig.slice(4)}`; }
function verifyCode(code, name) {
  const p = parseCode(code);
  if (!p || !normSoc(name)) return false;
  return pvSig(p.serial, name) === p.sig;
}
function checkCode(code, name) {
  if (!String(code || '').trim()) return 'Enter the activation code given by the PMC.';
  if (!parseCode(code)) return 'That does not look like a PMC activation code. It should look like PV-0001-ABCD-EFGH.';
  if (!String(name || '').trim()) return 'Enter the society name exactly as given to the PMC.';
  if (!verifyCode(code, name)) return 'This code does not match this society name. Check the spelling of the society name, or ask the PMC for the correct code.';
  return null;
}
const isLicensed = s => !!(s && s.license && (s.license.code === 'LEGACY' || (verifyCode(s.license.code, s.license.society) && normSoc(s.license.society) === normSoc(s.society && s.society.name))));
const makeLicense = (code, name) => { const p = parseCode(code); return { code: fmtCode(p.serial, p.sig), serial: p.serial, society: name.trim(), activatedAt: Date.now() }; };

function CodeField({ value, onChange, name, hint }) {
  const ok = value && name && verifyCode(value, name);
  return (
    <label className="field">
      <span className="field-label"><span>PMC activation code</span>{ok && <span className="code-ok">✓ Code accepted</span>}</span>
      <div className={`field-box code-box ${ok ? 'ok' : ''}`}><Ico n="lock" s={18} c={ok ? 'var(--mint)' : 'var(--ink-faint)'} /><input value={value} onChange={e => onChange(e.target.value.toUpperCase())} placeholder="PV-0000-XXXX-XXXX" autoComplete="off" spellCheck="false" /></div>
      <span className="field-hint">{hint || 'Issued by the PMC for this society name only. Ask the PMC if you do not have one.'}</span>
    </label>
  );
}

function DemoBanner({ go }) {
  return (
    <div className="demo-banner no-print">
      <Ico n="lock" s={18} c="#7A4D00" />
      <span><b>Demo mode</b> — you are viewing sample data. Members can't be added or edited until the society is activated with a PMC code.</span>
      <button className="btn btn-sm" onClick={() => { go('settings'); setTimeout(() => window.__openActivate && window.__openActivate(), 50); }}>Activate society</button>
    </div>
  );
}

export { PV_ALPHA, PV_SECRET, normSoc, pvHash, pvSig, cleanCode, parseCode, fmtCode, verifyCode, checkCode, isLicensed, makeLicense, CodeField, DemoBanner };
