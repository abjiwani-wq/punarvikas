// App.jsx — shell, routing, grouped navigation, undo
import React from 'react';
import { Btn, Ico } from './components/ui';
import { calcSociety, pct, useSociety } from './lib/data';
import { DemoBanner, isLicensed } from './lib/license';
import { buildSocietyPPT } from './lib/ppt';
import { LoginScreen, MemberAccess, MemberPortal, loadSession, saveSession } from './screens/auth';
import { Assistant, Journey, StageDetail } from './screens/journey-assistant';
import { Dashboard, MemberEditor, Members } from './screens/members';
import { Notices, Plans } from './screens/notices-plans';
import { Activity, Lookup, Meetings, More, Offers, Payments, PrintAll } from './screens/tools';
import { VaultScreen } from './screens/vault';
import { PresentMode, Settings, Voting } from './screens/voting-settings';

const SRM_NAV = [
  ['Overview', [['dashboard', 'Dashboard', 'grid'], ['journey', 'Redevelopment journey', 'route']]],
  ['Members', [['members', 'Members & entitlements', 'users'], ['voting', 'Consent voting', 'vote'], ['payments', 'Payment tracker', 'wallet'], ['meetings', 'Meetings', 'calendar']]],
  ['Information', [['notices', 'Notices & circulars', 'bell'], ['plans', 'Building plans', 'building'], ['documents', 'Vault · all files', 'folder']]],
  ['Tools', [['assistant', 'AI PMC assistant', 'sparkle'], ['offers', 'Compare offers', 'scale'], ['lookup', 'Member lookup', 'search'], ['activity', 'Activity & undo', 'clock'], ['access', 'Member logins', 'lock'], ['settings', 'Society & terms', 'sliders']]],
];
const SRM_TABS = [['dashboard', 'Home', 'grid'], ['journey', 'Journey', 'route'], ['members', 'Members', 'users'], ['voting', 'Voting', 'vote'], ['more', 'More', 'more']];

function SRMApp() {
  const [s, a, undoLabel] = useSociety();
  const [session, setSession] = React.useState(loadSession);
  const login = v => { saveSession(v); setSession(v); };
  const logout = () => { saveSession(null); setSession(null); };
  const [route, setRoute] = React.useState(() => { try { return localStorage.getItem('srm_route') || 'dashboard'; } catch (e) { return 'dashboard'; } });
  const [member, setMember] = React.useState(null);
  const [stageKey, setStageKey] = React.useState(null);
  const [presenting, setPresenting] = React.useState(false);
  const [printAll, setPrintAll] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const mainRef = React.useRef(null);
  const top = () => { if (mainRef.current) mainRef.current.scrollTop = 0; };
  const go = r => { setMember(null); setStageKey(null); setPrintAll(false); setRoute(r); try { localStorage.setItem('srm_route', r); } catch (e) {} top(); };
  const openMember = id => { setRoute('members'); setMember(id); top(); };
  const openStage = k => { setRoute('journey'); setStageKey(k); top(); };
  const onPPT = async () => { setBusy(true); try { await buildSocietyPPT(s); } catch (e) { console.error(e); alert('Could not create the PowerPoint: ' + e.message); } setBusy(false); };
  const doUndo = () => { if (!undoLabel) return; a.undo(); setToast(`Undone: ${undoLabel}`); };
  React.useEffect(() => { document.title = `${s.society.name || 'Society'} · Redevelopment Manager`; }, [s.society.name]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  React.useEffect(() => { const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); doUndo(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  window.__srm = { s, a, go, openMember, openStage, setPresenting, login, logout };
  const hasAdmin = !!(s.auth && s.auth.admin);
  if (!session || (session.role === 'admin' && !hasAdmin)) return <LoginScreen s={s} a={a} onLogin={login} />;
  if (session.role === 'member') return <MemberPortal s={s} a={a} session={session} logout={logout} />;

  const k = calcSociety(s);
  const badge = { voting: k.pending, notices: (s.notices || []).filter(n => n.pinned).length || null };
  const P = { s, a, go };
  let screen;
  if (printAll) screen = <PrintAll s={s} back={() => setPrintAll(false)} />;
  else switch (route) {
    case 'journey': screen = stageKey ? <StageDetail key={stageKey} s={s} a={a} k={stageKey} close={() => setStageKey(null)} /> : <Journey {...P} />; break;
    case 'members': screen = member != null ? <MemberEditor key={member} s={s} a={a} id={member} close={() => setMember(null)} /> : <Members s={s} a={a} openMember={openMember} onPrintAll={() => setPrintAll(true)} />; break;
    case 'voting': screen = <Voting s={s} a={a} present={() => setPresenting(true)} />; break;
    case 'payments': screen = <Payments {...P} />; break;
    case 'meetings': screen = <Meetings {...P} />; break;
    case 'notices': screen = <Notices {...P} />; break;
    case 'plans': screen = <Plans {...P} />; break;
    case 'documents': screen = <VaultScreen {...P} />; break;
    case 'assistant': screen = <Assistant s={s} />; break;
    case 'offers': screen = <Offers {...P} />; break;
    case 'lookup': screen = <Lookup s={s} />; break;
    case 'access': screen = <MemberAccess s={s} a={a} logout={logout} />; break;
    case 'activity': screen = <Activity s={s} a={a} undoLabel={undoLabel} />; break;
    case 'settings': screen = <Settings s={s} a={a} />; break;
    case 'more': screen = <More go={go} onPPT={onPPT} setPrintAll={() => setPrintAll(true)} />; break;
    default: screen = <Dashboard s={s} a={a} go={go} onPPT={onPPT} openMember={openMember} openStage={openStage} onPrintAll={() => setPrintAll(true)} />;
  }

  return (
    <div className="app">
      <aside className="side no-print">
        <div className="brand"><div className="brand-mark"><Ico n="building" s={22} c="#fff" /></div><div><b>Punarvikas</b><span>Redevelopment Manager for Housing Societies</span></div></div>
        <div className="soc-card"><span>Society</span><b>{s.society.name || 'Untitled'}</b><small>{`${k.total} members · ${pct(k.pct, 0)} consent`}</small></div>
        <nav>{SRM_NAV.map(([grp, items]) => <div key={grp} className="nav-grp"><span className="nav-lbl">{grp}</span>{items.map(([r, l, i]) => <button key={r} className={route === r ? 'on' : ''} onClick={() => go(r)}><Ico n={i} s={19} />{l}{badge[r] ? <em>{badge[r]}</em> : null}</button>)}</div>)}</nav>
        <div className="side-foot">
          <Btn icon="undo" disabled={!undoLabel} onClick={doUndo} title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}>Undo</Btn>
          <Btn kind="primary" icon="ppt" onClick={onPPT} disabled={busy}>{busy ? 'Building…' : 'Download PPT'}</Btn>
          <Btn icon="lock" onClick={logout}>Sign out</Btn>
          <small>{`by ${s.society.pmc || 'Akbar Jiwani & Associates'}`}</small>
        </div>
      </aside>
      <header className="topbar no-print">
        <div className="brand"><div className="brand-mark"><Ico n="building" s={20} c="#fff" /></div><div><b>{s.society.name || 'Punarvikas'}</b><span>Redevelopment Manager</span></div></div>
        <div className="row-gap" style={{ margin: 0, flexWrap: 'nowrap' }}>{undoLabel && <Btn small icon="undo" onClick={doUndo} title="Undo"></Btn>}<Btn small kind="primary" icon="ppt" onClick={onPPT} disabled={busy}>PPT</Btn><Btn small icon="lock" onClick={logout} title="Sign out"></Btn></div>
      </header>
      <main ref={mainRef} className="main">{!isLicensed(s) && <DemoBanner go={go} />}{screen}</main>
      <nav className="tabs no-print">{SRM_TABS.map(([r, l, i]) => { const on = route === r || (r === 'more' && !SRM_TABS.some(t => t[0] === route)); return <button key={r} className={on ? 'on' : ''} onClick={() => go(r)}><Ico n={i} s={22} /><span>{l}</span></button>; })}</nav>
      {presenting && <PresentMode s={s} close={() => setPresenting(false)} />}
      {toast && <div className="toast no-print">{toast}</div>}
    </div>
  );
}

export default SRMApp;
