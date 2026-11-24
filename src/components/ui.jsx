// components/ui.jsx — icons + atoms (CSS classes live in src/styles.css)
import React from 'react';
import { pct } from '../lib/data';

const SRM_ICONS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9a6 6 0 0 1 12 0M16 3.5a4 4 0 0 1 0 7.5M21 20a6 6 0 0 0-4-5.6',
  vote: 'M9 12.5l2 2 4-4.5M5 7l7-3 7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7Z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  ppt: 'M4 5h16v11H4zM12 16v4M8 20h8M8 12V9M12 12V8M16 12v-2',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  check: 'M5 12.5l4.5 4.5L19 6.5',
  x: 'M6 6l12 12M18 6 6 18',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  chevR: 'M9 5l7 7-7 7', chevL: 'M15 5l-7 7 7 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  screen: 'M3 4h18v12H3zM8 20h8M12 16v4',
  building: 'M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18',
  file: 'M7 3h7l4 4v14H6V3h1Zm6 0v5h5',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2.4 2.4 0 0 0 4 0',
  share: 'M8.5 13.5l7-4M8.5 10.5l7 4M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  scale: 'M12 4v16M7 20h10M12 6 5 9m7-3 7 3M5 9l-2.5 4a3 3 0 0 0 5 0L5 9Zm14 0-2.5 4a3 3 0 0 0 5 0L19 9Z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  route: 'M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 4v6a3 3 0 0 0 3 3h6m0 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
  folder: 'M4 6a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6Z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm0 0V6a1 1 0 0 1 1-1h11M16 13h2',
  alert: 'M12 4 2.5 20h19L12 4ZM12 10v4M12 17h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  send: 'M4 12l16-7-7 16-2.5-6.5L4 12Z',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z',
  live: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8',
};

function Ico({ n, s = 20, c = 'currentColor', w = 1.9 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}><path d={SRM_ICONS[n] || ''} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Btn({ children, icon, kind = 'ghost', onClick, small, title, disabled, type }) {
  return <button type={type || 'button'} title={title} disabled={disabled} onClick={onClick} className={`btn btn-${kind}${small ? ' btn-sm' : ''}`}>{icon && <Ico n={icon} s={small ? 16 : 18} />}{children && <span>{children}</span>}</button>;
}

function Field({ label, hint, suffix, prefix, children, value, onChange, type = 'text', placeholder, step, min, auto, onReset, readOnly }) {
  return (
    <label className="field">
      <span className="field-label"><span>{label}</span>{auto !== undefined && (auto ? <span className="chip chip-auto">Auto</span> : <button type="button" className="chip chip-override" onClick={e => { e.preventDefault(); onReset && onReset(); }}>Custom · reset</button>)}</span>
      {children || (
        <span className={`field-box ${readOnly ? 'ro' : ''}`}>
          {prefix && <span className="affix">{prefix}</span>}
          <input type={type} value={value ?? ''} placeholder={placeholder} step={step} min={min} readOnly={readOnly} onChange={e => onChange(e.target.value)} />
          {suffix && <span className="affix">{suffix}</span>}
        </span>
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function Seg({ value, options, onChange }) {
  return <div className="seg">{options.map(([v, l]) => <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

function Kpi({ label, value, sub, tone }) {
  return <div className="kpi"><span className="kpi-label">{label}</span><span className="kpi-value">{value}</span>{sub && <span className={`kpi-sub ${tone || ''}`}>{sub}</span>}</div>;
}

function ConsentBadge({ v }) {
  const map = { yes: ['Consented', 'b-yes'], no: ['Objected', 'b-no'], pending: ['Pending', 'b-pending'] };
  const [l, c] = map[v] || map.pending;
  return <span className={`badge ${c}`}>{l}</span>;
}

function Ring({ value, size = 150, stroke = 14, threshold, light, label = 'consented' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const t = threshold != null ? threshold / 100 : null;
  const tx = t != null ? size / 2 + r * Math.cos(2 * Math.PI * t - Math.PI / 2) : 0;
  const ty = t != null ? size / 2 + r * Math.sin(2 * Math.PI * t - Math.PI / 2) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? 'rgba(255,255,255,.22)' : 'var(--line)'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? '#FFD58A' : 'var(--primary)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />
        {t != null && <circle cx={tx} cy={ty} r={stroke / 2 + 2} fill={light ? '#fff' : 'var(--ink)'} />}
      </svg>
      <div className="ring-center"><span className="ring-val">{pct(value, 0)}</span><span className="ring-sub">{label}</span></div>
    </div>
  );
}

function ConsentBar({ yes, no, total, threshold }) {
  const w = v => total ? (v / total) * 100 + '%' : '0%';
  return (
    <div className="cbar">
      <div className="cbar-track"><div className="cbar-yes" style={{ width: w(yes) }}></div><div className="cbar-no" style={{ width: w(no) }}></div><div className="cbar-mark" style={{ left: threshold + '%' }}><span>{`${threshold}% needed`}</span></div></div>
    </div>
  );
}

function PageHead({ title, sub, children }) {
  return <div className="page-head"><div className="page-head-txt"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="page-actions">{children}</div>}</div>;
}

function LiveDot({ label = 'Live' }) { return <span className="live"><span className="live-dot"></span>{label}</span>; }

export { SRM_ICONS, Ico, Btn, Field, Seg, Kpi, ConsentBadge, Ring, ConsentBar, PageHead, LiveDot };
