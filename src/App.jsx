import { useState, useMemo, useEffect, useCallback } from 'react';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}
import { ALL_SESSIONS } from './sessions';
import { useAttendees } from './useAttendees';
import { isSupabaseReady } from './supabase';

const ACCESS_CODE = 'rbsnowflake26summit';
const DAYS = ['Mon, Jun 1', 'Tue, Jun 2', 'Wed, Jun 3', 'Thu, Jun 4'];
const TRACKS = [...new Set(ALL_SESSIONS.map(s => s.track))].sort();

const COLORS = {
  'AI & ML': '#7c3aed',
  'Data Engineering': '#0369a1',
  'Architecture': '#b45309',
  'BI & Analytics': '#065f46',
  'Governance': '#9d174d',
  'Platform & Ops': '#64748b',
  'Industry': '#7f1d1d',
  'Data Marketplace': '#4d7c0f',
  'Admin': '#64748b',
  'General': '#64748b',
  'Executive': '#92400e',
  'Security': '#64748b',
  'User Group': '#4a1d96',
};

function parseTime(t) {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}
function getStartMin(s) { return parseTime(s.time.split(' - ')[0]); }
function getEndMin(s) { return parseTime((s.time.split(' - ')[1] || '').replace(' PDT', '')); }
function overlaps(a, b) { return getStartMin(a) < getEndMin(b) && getEndMin(a) > getStartMin(b); }

// All styles use CSS custom properties — theme switch happens via .dark class on <html>
const S = {
  app: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  nav: { background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--nav-shadow)' },
  navBtn: (active) => ({ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? 'var(--accent)' : 'var(--navbtn-bg)', color: active ? '#fff' : 'var(--navbtn-text)', transition: 'all 0.15s' }),
  content: { padding: '20px 24px', maxWidth: 1400, margin: '0 auto' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 0, marginBottom: 10, boxShadow: 'var(--card-shadow)', overflow: 'hidden' },
  tag: (track) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: (COLORS[track] || '#374151') + '20', color: COLORS[track] || '#374151', border: `1px solid ${(COLORS[track] || '#374151')}40` }),
  btn: (v = 'primary') => ({
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: v === 'primary' ? 'var(--accent)' : v === 'danger' ? 'var(--busy-pill-bg)' : v === 'success' ? 'var(--attending-bg)' : 'var(--navbtn-bg)',
    color: v === 'primary' ? '#fff' : v === 'danger' ? 'var(--busy-pill-text)' : v === 'success' ? 'var(--attending-text)' : 'var(--navbtn-text)',
  }),
  input: { background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, background: 'var(--pill-bg)', border: '1px solid var(--pill-border)', color: 'var(--pill-text)' },
  h2: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 },
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 },
};

// ── Gate ──────────────────────────────────────────────────────────────────────
function GateScreen({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const check = () => {
    if (code.trim().toLowerCase() === ACCESS_CODE) onUnlock();
    else setError('Invalid access code. Try again.');
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>❄️</div>
        <h1 style={{ color: 'var(--gate-title)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Snowflake Summit 26</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 14 }}>Ritchie Bros Team Tracker · San Francisco, Jun 1–4</p>
        <input
          style={{ ...S.input, marginBottom: 12, textAlign: 'center', letterSpacing: 3, fontSize: 15 }}
          type="password" placeholder="Access code" value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && check()}
          autoFocus
        />
        {error && <p style={{ color: 'var(--error)', fontSize: 12, marginBottom: 8 }}>{error}</p>}
        <button style={{ ...S.btn('primary'), width: '100%', padding: '10px 0', fontSize: 14 }} onClick={check}>Enter →</button>
      </div>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, myName, attendees, onRegister, onUnregister }) {
  const isRegistered = myName && attendees.includes(myName);
  const trackColor = COLORS[session.track] || '#64748b';
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${trackColor}` }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{session.code}</span>
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>{session.track}</span>
              {attendees.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '1px 8px', borderRadius: 999 }}>
                  👥 {attendees.length} attending
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>{session.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span>⏰ {session.time}</span>
                {session.room_short && <span>📍 {session.room_short}</span>}
              </div>
              {attendees.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {attendees.map(n => (
                    <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: n === myName ? 'var(--accent)' : 'var(--attending-bg)', border: `1px solid ${n === myName ? 'var(--accent)' : 'var(--attending-border)'}`, color: n === myName ? '#fff' : 'var(--attending-text)' }}>
                      <span style={{ width: 15, height: 15, borderRadius: '50%', background: n === myName ? 'rgba(255,255,255,0.3)' : 'var(--attending-badge)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n.charAt(0).toUpperCase()}</span>
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {myName && (
            isRegistered
              ? <button style={S.btn('danger')} onClick={() => onUnregister(session.code)}>✓ Joined</button>
              : <button style={S.btn('success')} onClick={() => onRegister(session.code)}>+ Join</button>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────
function ScheduleView({ myName, onRegister, onUnregister, getAttendeesForSession, registrations, isMobile }) {
  const [filterDay, setFilterDay] = useState(DAYS[0]);
  const [filterTrack, setFilterTrack] = useState('');
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);
  const [showTeam, setShowTeam] = useState(false);

  const mySessionCodes = useMemo(() => {
    if (!myName || !registrations[myName]) return new Set();
    return registrations[myName];
  }, [myName, registrations]);

  const allRegisteredCodes = useMemo(() => {
    const codes = new Set();
    Object.values(registrations).forEach(set => set.forEach(c => codes.add(c)));
    return codes;
  }, [registrations]);

  const filtered = useMemo(() =>
    ALL_SESSIONS.filter(s => {
      if (filterDay && s.day !== filterDay) return false;
      if (filterTrack && s.track !== filterTrack) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q) && !s.room_short?.toLowerCase().includes(q)) return false;
      }
      if (showMine && !mySessionCodes.has(s.code)) return false;
      if (showTeam && !allRegisteredCodes.has(s.code)) return false;
      return true;
    }).sort((a, b) => {
      const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return di !== 0 ? di : getStartMin(a) - getStartMin(b);
    }),
  [filterDay, filterTrack, search, showMine, showTeam, mySessionCodes, allRegisteredCodes]);

  const grouped = useMemo(() => {
    const g = {};
    for (const s of filtered) {
      const key = `${s.day}||${s.time.split(' - ')[0]}`;
      if (!g[key]) g[key] = { label: s.time.split(' - ')[0], day: s.day, sessions: [] };
      g[key].sessions.push(s);
    }
    return Object.values(g);
  }, [filtered]);

  return (
    <div>
      <div style={{ background: 'var(--filter-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...S.input, width: 220 }} placeholder="Search sessions, rooms…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.input, width: 'auto' }} value={filterDay} onChange={e => setFilterDay(e.target.value)}>
          <option value="">All Days</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={{ ...S.input, width: 'auto' }} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
          <option value="">All Tracks</option>
          {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {myName && (
          <button style={S.btn(showMine ? 'primary' : 'default')} onClick={() => { setShowMine(!showMine); setShowTeam(false); }}>
            {showMine ? '★ My Sessions' : '☆ My Sessions'}
          </button>
        )}
        <button style={S.btn(showTeam ? 'success' : 'default')} onClick={() => { setShowTeam(!showTeam); setShowMine(false); }}>
          {showTeam ? '👥 Team Sessions' : '👥 Team Sessions'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 'auto' }}>{filtered.length} sessions</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', ...DAYS].map(d => (
          <button key={d || 'all'} style={S.navBtn(filterDay === d)} onClick={() => setFilterDay(d)}>
            {d || 'All Days'}
          </button>
        ))}
      </div>

      {grouped.map(({ label, day, sessions }) => (
        <div key={`${day}${label}`} style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {/* Timeline left column */}
          <div style={{ width: isMobile ? 62 : 90, flexShrink: 0, paddingTop: 2, textAlign: 'right', paddingRight: isMobile ? 10 : 16, position: 'relative' }}>
            <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: 'var(--time-text)', whiteSpace: 'nowrap' }}>{label}</span>
            {filterDay === '' && <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>{day}</div>}
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: -24, width: 2, background: 'var(--border)' }} />
            <div style={{ position: 'absolute', right: -5, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} />
          </div>
          {/* Cards column */}
          <div style={{ flex: 1, paddingLeft: isMobile ? 10 : 16, minWidth: 0 }}>
            {sessions.map(s => (
              <SessionCard key={s.code} session={s} myName={myName} attendees={getAttendeesForSession(s.code)}
                onRegister={(code) => onRegister(myName, code)} onUnregister={(code) => onUnregister(myName, code)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── My Plan ───────────────────────────────────────────────────────────────────
function MyPlanView({ name, getSessionsForPerson, getAttendeesForSession, onRegister, onUnregister, isMobile }) {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  const myCodes = useMemo(() => new Set(getSessionsForPerson(name)), [name, getSessionsForPerson]);

  const byDay = useMemo(() => {
    const g = {};
    for (const d of DAYS) {
      g[d] = ALL_SESSIONS.filter(s => myCodes.has(s.code) && s.day === d).sort((a, b) => getStartMin(a) - getStartMin(b));
    }
    return g;
  }, [myCodes]);

  const dayMine = byDay[selectedDay] || [];
  const dayAll = useMemo(() => ALL_SESSIONS.filter(s => s.day === selectedDay).sort((a, b) => getStartMin(a) - getStartMin(b)), [selectedDay]);

  const freeSlots = useMemo(() => {
    const slots = {};
    for (const s of dayAll) {
      if (myCodes.has(s.code) || dayMine.some(m => overlaps(s, m))) continue;
      const key = s.time.split(' - ')[0];
      slots[key] = (slots[key] || 0) + 1;
    }
    return slots;
  }, [dayAll, dayMine, myCodes]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const remaining = useMemo(() => dayAll.filter(s => !myCodes.has(s.code) && getStartMin(s) >= nowMin), [dayAll, myCodes, nowMin]);

  if (!name) return (
    <div style={{ color: 'var(--text2)', padding: 60, textAlign: 'center', fontSize: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
      Set your name in the top bar to see your personal plan.
    </div>
  );

  return (
    <div>
      <h2 style={S.h2}>📅 {name}'s Plan — {Object.values(byDay).flat().length} sessions total</h2>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {DAYS.map(d => <button key={d} style={S.navBtn(selectedDay === d)} onClick={() => setSelectedDay(d)}>{d} ({byDay[d]?.length || 0})</button>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: isMobile ? 12 : 20 }}>
        <div>
          <h3 style={S.h3}>✅ Registered ({dayMine.length})</h3>
          {dayMine.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Nothing registered yet — browse the schedule!</p>
            : dayMine.map(s => <SessionCard key={s.code} session={s} myName={name} attendees={getAttendeesForSession(s.code)} onRegister={() => {}} onUnregister={(code) => onUnregister(name, code)} />)
          }
        </div>
        <div>
          <h3 style={S.h3}>🕐 Your Free Time Slots</h3>
          {Object.keys(freeSlots).length === 0 && dayMine.length > 0
            ? <p style={{ color: 'var(--free-label)', fontSize: 12 }}>Fully booked!</p>
            : Object.entries(freeSlots).map(([time, count]) => (
              <div key={time} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--accent)' }}>⏰ {time}</span>
                <span style={{ color: 'var(--text2)' }}>{count} sessions available</span>
              </div>
            ))
          }

          <h3 style={{ ...S.h3, marginTop: 20 }}>🔜 Still Available Today ({remaining.length})</h3>
          {remaining.slice(0, 6).map(s => (
            <div key={s.code} style={{ ...S.card, fontSize: 12 }}>
              <div style={{ color: 'var(--text)', marginBottom: 2, fontWeight: 600 }}>{s.title}</div>
              <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{s.time} · {s.room_short}</div>
              <button style={{ ...S.btn('success'), fontSize: 11 }} onClick={() => onRegister(name, s.code)}>+ Add to plan</button>
            </div>
          ))}
          {remaining.length > 6 && <p style={{ color: 'var(--text3)', fontSize: 11 }}>+{remaining.length - 6} more…</p>}
        </div>
      </div>
    </div>
  );
}

// ── Team View ─────────────────────────────────────────────────────────────────
function TeamView({ knownNames, registrations, getSessionsForPerson, getAttendeesForSession, isMobile }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  const stats = useMemo(() =>
    knownNames.map(name => {
      const codes = getSessionsForPerson(name);
      const sessions = ALL_SESSIONS.filter(s => codes.includes(s.code));
      const byDay = {};
      for (const d of DAYS) byDay[d] = sessions.filter(s => s.day === d).length;
      return { name, total: sessions.length, byDay };
    }).sort((a, b) => b.total - a.total),
  [knownNames, getSessionsForPerson]);

  const teamFreeTime = useMemo(() => {
    if (knownNames.length === 0) return [];
    const dayAll = ALL_SESSIONS.filter(s => s.day === selectedDay).sort((a, b) => getStartMin(a) - getStartMin(b));
    const uniqueTimes = [...new Set(dayAll.map(s => s.time.split(' - ')[0]))];
    return uniqueTimes.map(t => {
      const atTime = dayAll.filter(s => s.time.split(' - ')[0] === t);
      const busy = knownNames.filter(name => {
        const codes = new Set(getSessionsForPerson(name));
        return atTime.some(s => codes.has(s.code));
      });
      return { time: t, busy, free: knownNames.filter(n => !busy.includes(n)) };
    });
  }, [knownNames, selectedDay, getSessionsForPerson]);

  const personSessions = useMemo(() => {
    if (!selectedPerson) return [];
    const codes = new Set(getSessionsForPerson(selectedPerson));
    return ALL_SESSIONS.filter(s => codes.has(s.code) && s.day === selectedDay).sort((a, b) => getStartMin(a) - getStartMin(b));
  }, [selectedPerson, selectedDay, getSessionsForPerson]);

  return (
    <div>
      <h2 style={S.h2}>👥 Team Overview</h2>
      {knownNames.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14, padding: 20 }}>No team members yet — set your name in the top bar and join some sessions!</p>}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 8, marginBottom: 24 }}>
        {stats.map(({ name, total, byDay }) => (
          <div key={name} style={{ ...S.card, cursor: 'pointer', border: selectedPerson === name ? '1px solid #3b82f6' : S.card.border }}
            onClick={() => setSelectedPerson(name === selectedPerson ? null : name)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{name}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{total}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{ flex: 1, textAlign: 'center', background: 'var(--stat-bg)', borderRadius: 4, padding: '4px 2px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: byDay[d] > 0 ? 'var(--stat-active)' : 'var(--stat-inactive)' }}>{byDay[d]}</div>
                  <div style={{ fontSize: 8, color: 'var(--stat-label)' }}>{d.split(',')[0]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedPerson && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <h3 style={{ ...S.h3, marginBottom: 0 }}>{selectedPerson}'s sessions:</h3>
            {DAYS.map(d => <button key={d} style={S.navBtn(selectedDay === d)} onClick={() => setSelectedDay(d)}>{d}</button>)}
          </div>
          {personSessions.length === 0
            ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>No sessions for this day.</p>
            : personSessions.map(s => (
              <div key={s.code} style={S.card}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={S.tag(s.track)}>{s.track}</span></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>⏰ {s.time} · 📍 {s.room_short}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {getAttendeesForSession(s.code).map(n => <span key={n} style={S.pill}>{n}</span>)}
                </div>
              </div>
            ))
          }
        </div>
      )}

      <h3 style={S.h3}>🆓 Everyone Free At — {selectedDay}</h3>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {DAYS.map(d => <button key={d} style={S.navBtn(selectedDay === d)} onClick={() => setSelectedDay(d)}>{d}</button>)}
      </div>
      {knownNames.length === 0
        ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Add team members first.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 6 }}>
            {teamFreeTime.map(({ time, busy, free }) => (
              <div key={time} style={{ ...S.card, background: free.length === knownNames.length ? 'var(--free-card)' : 'var(--surface)', borderColor: free.length === knownNames.length ? 'var(--free-card-border)' : 'var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>⏰ {time}</div>
                {free.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--free-label)' }}>Free: </span>
                    {free.map(n => <span key={n} style={{ ...S.pill, background: 'var(--free-pill-bg)', borderColor: 'var(--free-pill-border)', color: 'var(--free-pill-text)', marginRight: 3 }}>{n}</span>)}
                  </div>
                )}
                {busy.length > 0 && (
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--busy-label)' }}>Busy: </span>
                    {busy.map(n => <span key={n} style={{ ...S.pill, background: 'var(--busy-pill-bg)', borderColor: 'var(--busy-pill-border)', color: 'var(--busy-pill-text)', marginRight: 3 }}>{n}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── Room Map ──────────────────────────────────────────────────────────────────
function RoomMap({ getAttendeesForSession, dark }) {
  const [filterRoom, setFilterRoom] = useState('');

  const roomAttendees = useMemo(() => {
    const m = {};
    for (const s of ALL_SESSIONS) {
      if (!s.room_short) continue;
      const people = getAttendeesForSession(s.code);
      if (!m[s.room_short]) m[s.room_short] = new Set();
      people.forEach(p => m[s.room_short].add(p));
    }
    return m;
  }, [getAttendeesForSession]);

  const filteredSessions = useMemo(() => {
    if (!filterRoom) return [];
    return ALL_SESSIONS.filter(s => s.room_short === filterRoom)
      .sort((a, b) => {
        const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : getStartMin(a) - getStartMin(b);
      });
  }, [filterRoom]);

  const roomList = useMemo(() => [...new Set(ALL_SESSIONS.map(s => s.room_short).filter(Boolean))].sort(), []);

  // SVG colours adapt to dark/light
  const c = dark ? {
    title: '#38bdf8', s2bg: '#1e3a5f', s2stroke: '#38bdf8', s2text: '#38bdf8',
    mzBg: '#1a3048', mzStroke: '#0369a1', mzText: '#7dd3fc',
    nBg: '#3b0764', nStroke: '#7c3aed', nText: '#a78bfa', nInner: '#1a0830', nInnerText: '#c4b5fd', nSub: '#7c3aed',
    bcBg: '#063b1b', bcStroke: '#16a34a', bcText: '#4ade80',
    roomFill: (active) => active ? '#1e4a7f' : '#0d2040',
    roomStroke: (cnt) => cnt > 0 ? '#38bdf8' : '#1e4a7f',
    roomText: '#7dd3fc', roomCnt: '#38bdf8',
    regFill: '#1e3a5f', regText: '#60a5fa',
    legend: [['#38bdf8', 'Breakout Rooms'], ['#4ade80', 'Basecamp'], ['#a78bfa', 'Keynotes'], ['#f59e0b', 'Labs']],
    mapBg: '#030e1e',
  } : {
    title: '#1d4ed8', s2bg: '#dbeafe', s2stroke: '#3b82f6', s2text: '#1d4ed8',
    mzBg: '#e0f2fe', mzStroke: '#0369a1', mzText: '#075985',
    nBg: '#ede9fe', nStroke: '#7c3aed', nText: '#6d28d9', nInner: '#f5f3ff', nInnerText: '#6d28d9', nSub: '#7c3aed',
    bcBg: '#dcfce7', bcStroke: '#16a34a', bcText: '#15803d',
    roomFill: (active) => active ? '#bfdbfe' : '#e0f2fe',
    roomStroke: (cnt) => cnt > 0 ? '#1d4ed8' : '#93c5fd',
    roomText: '#1e3a5f', roomCnt: '#1d4ed8',
    regFill: '#dbeafe', regText: '#1d4ed8',
    legend: [['#3b82f6', 'Breakout Rooms'], ['#16a34a', 'Basecamp'], ['#7c3aed', 'Keynotes'], ['#d97706', 'Labs']],
    mapBg: '#f8fafc',
  };

  const RoomRect = ({ r, x, y, w = 60, h = 26 }) => {
    const key = 'Room ' + r;
    const cnt = (roomAttendees[key] || new Set()).size;
    const active = filterRoom === key;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setFilterRoom(active ? '' : key)}>
        <rect x={x} y={y} width={w} height={h} rx="4" fill={c.roomFill(active)} stroke={c.roomStroke(cnt)} strokeWidth={cnt > 0 ? 2 : 1} />
        <text x={x + w / 2} y={y + 12} textAnchor="middle" fill={c.roomText} fontSize="9" fontFamily="monospace">Rm {r}</text>
        {cnt > 0 && <text x={x + w / 2} y={y + 22} textAnchor="middle" fill={c.roomCnt} fontSize="8" fontFamily="monospace">{cnt}👤</text>}
      </g>
    );
  };

  const Zone = ({ label, sublabel, short, x, y, w, h, zc, sc }) => {
    const cnt = (short || []).reduce((acc, r) => { (roomAttendees[r] || new Set()).forEach(p => acc.add(p)); return acc; }, new Set()).size;
    const active = short?.length === 1 && filterRoom === short[0];
    return (
      <g style={{ cursor: short?.length ? 'pointer' : 'default' }} onClick={() => { if (short?.length === 1) setFilterRoom(active ? '' : short[0]); }}>
        <rect x={x} y={y} width={w} height={h} rx="5" fill={active ? zc + 'cc' : zc} stroke={cnt > 0 ? sc : sc + '55'} strokeWidth={cnt > 0 ? 2 : 1} opacity="0.9" />
        {label.split('\n').map((line, li) => (
          <text key={li} x={x + w / 2} y={y + h / 2 - (label.includes('\n') ? 8 : 3) + li * 13} textAnchor="middle" fill={sc} fontSize="9" fontWeight="700" fontFamily="monospace">{line}</text>
        ))}
        <text x={x + w / 2} y={y + h - 7} textAnchor="middle" fill={sc} fontSize="7.5" fontFamily="monospace" opacity="0.7">{sublabel}</text>
        {cnt > 0 && <text x={x + w - 8} y={y + 14} textAnchor="middle" fill={sc} fontSize="9" fontFamily="monospace">{cnt}👤</text>}
      </g>
    );
  };

  const zoneData = dark ? [
    { label: "South Theater\n1 + 2", sublabel: "Hall A", short: ['Basecamp South Theater 1', 'Basecamp South Theater 2'], zc: "#064e3b", sc: "#10b981" },
    { label: "Vertical Village\nTheater 1+2", sublabel: "Hall A/B", short: ['Vertical Village Theater 1', 'Vertical Village Theater 2'], zc: "#065f46", sc: "#34d399" },
    { label: "Theater 3 + 4", sublabel: "Hall B/C", short: ['Basecamp South Theater 3', 'Basecamp South Theater 4'], zc: "#064e3b", sc: "#10b981" },
    { label: "Builders Hub\nTheater", sublabel: "Hall D", short: ['Builders Hub Theater'], zc: "#1e3a5f", sc: "#38bdf8" },
    { label: "AI Pop Up", sublabel: "Hall D", short: ['AI Pop Up'], zc: "#4a1d96", sc: "#a78bfa" },
    { label: "Hands-on Labs\n1 / 2 / 3", sublabel: "Hall E", short: ['Hands-on Labs 1', 'Hands-on Labs 2', 'Hands-on Labs 3'], zc: "#78350f", sc: "#f59e0b" },
    { label: "Partner Booths 190+", sublabel: "Hall F", short: [], zc: "#1e3a5f", sc: "#60a5fa" },
    { label: "Industry Zone", sublabel: "South", short: [], zc: "#7f1d1d", sc: "#f87171" },
  ] : [
    { label: "South Theater\n1 + 2", sublabel: "Hall A", short: ['Basecamp South Theater 1', 'Basecamp South Theater 2'], zc: "#bbf7d0", sc: "#15803d" },
    { label: "Vertical Village\nTheater 1+2", sublabel: "Hall A/B", short: ['Vertical Village Theater 1', 'Vertical Village Theater 2'], zc: "#a7f3d0", sc: "#047857" },
    { label: "Theater 3 + 4", sublabel: "Hall B/C", short: ['Basecamp South Theater 3', 'Basecamp South Theater 4'], zc: "#bbf7d0", sc: "#15803d" },
    { label: "Builders Hub\nTheater", sublabel: "Hall D", short: ['Builders Hub Theater'], zc: "#bfdbfe", sc: "#1d4ed8" },
    { label: "AI Pop Up", sublabel: "Hall D", short: ['AI Pop Up'], zc: "#ddd6fe", sc: "#6d28d9" },
    { label: "Hands-on Labs\n1 / 2 / 3", sublabel: "Hall E", short: ['Hands-on Labs 1', 'Hands-on Labs 2', 'Hands-on Labs 3'], zc: "#fde68a", sc: "#b45309" },
    { label: "Partner Booths 190+", sublabel: "Hall F", short: [], zc: "#bfdbfe", sc: "#1e40af" },
    { label: "Industry Zone", sublabel: "South", short: [], zc: "#fecaca", sc: "#b91c1c" },
  ];

  const zonePos = [
    { x: 52, y: 364, w: 140, h: 70 }, { x: 202, y: 364, w: 140, h: 70 }, { x: 352, y: 364, w: 130, h: 70 },
    { x: 492, y: 364, w: 130, h: 70 }, { x: 632, y: 364, w: 130, h: 70 },
    { x: 52, y: 444, w: 200, h: 60 }, { x: 262, y: 444, w: 250, h: 60 }, { x: 522, y: 444, w: 130, h: 60 },
  ];

  return (
    <div>
      <h2 style={S.h2}>🗺 Venue Map — Moscone Center</h2>
      <div style={{ overflowX: 'auto', background: 'var(--map-bg)', borderRadius: 8, border: '1px solid var(--map-border)', padding: 16, marginBottom: 20 }}>
        <svg viewBox="0 0 820 560" width="100%" style={{ maxWidth: 820 }}>
          <text x="410" y="24" textAnchor="middle" fill={c.title} fontSize="14" fontWeight="700" fontFamily="monospace">Moscone Center — Snowflake Summit 26</text>

          <rect x="40" y="40" width="340" height="168" rx="8" fill={c.s2bg} opacity="0.6" stroke={c.s2stroke} strokeWidth="1.5" />
          <text x="210" y="60" textAnchor="middle" fill={c.s2text} fontSize="11" fontWeight="700" fontFamily="monospace">MOSCONE SOUTH — Level 2</text>
          {[['205',60,72],['206',130,72],['208',200,72],['209',270,72],['210',60,108],['211',130,108],['212',200,108],['213',270,108],['214',60,144],['215',130,144],['216',200,144]].map(([r,x,y]) => <RoomRect key={r} r={r} x={x} y={y} />)}

          <rect x="40" y="222" width="340" height="102" rx="8" fill={c.mzBg} opacity="0.7" stroke={c.mzStroke} strokeWidth="1.5" />
          <text x="210" y="240" textAnchor="middle" fill={c.mzText} fontSize="10" fontWeight="700" fontFamily="monospace">MOSCONE SOUTH — Upper Mezzanine</text>
          {[['151',55,252],['152',125,252],['158',195,252],['159',265,252],['160',55,286]].map(([r,x,y]) => <RoomRect key={r} r={r} x={x} y={y} w={58} />)}

          <rect x="420" y="40" width="360" height="120" rx="8" fill={c.nBg} opacity="0.7" stroke={c.nStroke} strokeWidth="1.5" />
          <text x="600" y="60" textAnchor="middle" fill={c.nText} fontSize="11" fontWeight="700" fontFamily="monospace">MOSCONE NORTH — Keynotes</text>
          <rect x="460" y="72" width="280" height="68" rx="6" fill={c.nInner} stroke={c.nStroke} strokeWidth="1" />
          <text x="600" y="110" textAnchor="middle" fill={c.nInnerText} fontSize="10" fontFamily="monospace">🎤 Main Keynote Hall</text>
          <text x="600" y="126" textAnchor="middle" fill={c.nSub} fontSize="8" fontFamily="monospace">North Hall — Opening / Platform / Partner Keynotes</text>

          <rect x="40" y="336" width="740" height="210" rx="8" fill={c.bcBg} opacity="0.7" stroke={c.bcStroke} strokeWidth="1.5" />
          <text x="410" y="356" textAnchor="middle" fill={c.bcText} fontSize="11" fontWeight="700" fontFamily="monospace">BASECAMP — Expo Floor (South Halls A–F)</text>

          {zoneData.map((z, i) => <Zone key={i} {...z} {...zonePos[i]} />)}

          <rect x="310" y="522" width="200" height="20" rx="4" fill={c.regFill} stroke={c.s2stroke} strokeWidth="1" />
          <text x="410" y="535" textAnchor="middle" fill={c.regText} fontSize="9" fontFamily="monospace">🎟 Registration — Howard St Entrance</text>

          {c.legend.map(([col, lbl], i) => (
            <g key={i}>
              <rect x={50 + i * 180} y={508} width={10} height={10} rx="2" fill={col} />
              <text x={65 + i * 180} y={517} fill={col} fontSize="8" fontFamily="monospace">{lbl}</text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select style={{ ...S.input, width: 'auto' }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
          <option value="">Click a room above or select…</option>
          {roomList.map(r => <option key={r} value={r}>{r} ({ALL_SESSIONS.filter(s => s.room_short === r).length} sessions)</option>)}
        </select>
      </div>

      {filterRoom && (
        <div>
          <h3 style={S.h3}>Sessions in {filterRoom} ({filteredSessions.length})</h3>
          {(() => {
            // Group by day + time slot for timeline layout
            const groups = {};
            for (const s of filteredSessions) {
              const key = `${s.day}||${s.time.split(' - ')[0]}`;
              if (!groups[key]) groups[key] = { label: s.time.split(' - ')[0], day: s.day, sessions: [] };
              groups[key].sessions.push(s);
            }
            return Object.values(groups).map(({ label, day, sessions }) => (
              <div key={`${day}${label}`} style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
                {/* Timeline left column */}
                <div style={{ width: 90, flexShrink: 0, paddingTop: 2, textAlign: 'right', paddingRight: 16, position: 'relative' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--time-text)', whiteSpace: 'nowrap' }}>{label}</span>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{day}</div>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: -24, width: 2, background: 'var(--border)' }} />
                  <div style={{ position: 'absolute', right: -5, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} />
                </div>
                {/* Cards */}
                <div style={{ flex: 1, paddingLeft: 16 }}>
                  {sessions.map(s => (
                    <SessionCard key={s.code} session={s} myName={null} attendees={getAttendeesForSession(s.code)} onRegister={() => {}} onUnregister={() => {}} />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

// ── Guide Modal ───────────────────────────────────────────────────────────────
const GUIDE_STEPS = [
  { icon: '❄️', title: 'Welcome to Summit 26 Tracker', body: 'Your team\'s hub for Snowflake Summit 2026 in San Francisco, Jun 1–4. Browse 528 sessions, build your agenda, and see what your teammates are attending — all in one place.' },
  { icon: '👤', title: 'Set Your Name First', body: 'Tap "+ Set Name" in the top bar and type your name. This is how your teammates will see you. If your name is already in the system, just select it from the dropdown.' },
  { icon: '📋', title: 'Browse & Join Sessions', body: 'Use the Schedule tab to explore all sessions. Filter by day, track, or search by keyword. Tap "+ Join" on any session to add it to your plan. Tap "✓ Joined" to remove it.' },
  { icon: '👥', title: 'See Your Team\'s Plan', body: 'The Team tab shows everyone\'s session count and free time slots. Tap a teammate\'s card to see their full daily schedule. Green slots = everyone is free — great for group meetups!' },
  { icon: '🗺️', title: 'Navigate the Venue', body: 'The Map tab shows the full Moscone Center layout. Tap any room to see all sessions happening there, including who from your team is attending each one.' },
];

function GuideModal({ onClose }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const isLast = step === GUIDE_STEPS.length - 1;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {GUIDE_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 999, background: i === step ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', transition: 'all 0.2s' }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{current.icon}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>{current.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{current.body}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button style={{ ...S.btn('default'), flex: 1, padding: '10px 0' }} onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <button style={{ ...S.btn('primary'), flex: 2, padding: '10px 0', fontSize: 14 }} onClick={() => isLast ? onClose() : setStep(s => s + 1)}>
            {isLast ? 'Get Started →' : 'Next →'}
          </button>
        </div>
        <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
          Skip guide
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'schedule', label: 'Schedule', icon: '📋' },
  { id: 'myplan',   label: 'My Plan',  icon: '📅' },
  { id: 'team',     label: 'Team',     icon: '👥' },
  { id: 'map',      label: 'Map',      icon: '🗺️' },
];

export default function App() {
  const isMobile = useIsMobile();
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('sf_unlocked') === '1');
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem('sf_guide_seen') !== '1');
  const [view, setView] = useState('schedule');
  const [myName, setMyName] = useState(() => localStorage.getItem('sf_my_name') || '');
  const [nameInput, setNameInput] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('sf_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sf_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const { registrations, knownNames, loading, register, unregister, addName, refresh, getAttendeesForSession, getSessionsForPerson } = useAttendees();

  const handleUnlock = () => { localStorage.setItem('sf_unlocked', '1'); setUnlocked(true); };
  const handleGuideClose = () => { localStorage.setItem('sf_guide_seen', '1'); setShowGuide(false); };
  const handleSetName = () => {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem('sf_my_name', n);
    setMyName(n); addName(n); setShowNameInput(false); setNameInput('');
  };
  const handleClearName = () => { localStorage.removeItem('sf_my_name'); setMyName(''); };

  if (!unlocked) return <GateScreen onUnlock={handleUnlock} />;

  return (
    <div style={{ ...S.app, paddingBottom: isMobile ? 64 : 0 }}>
      {showGuide && <GuideModal onClose={handleGuideClose} />}

      {/* Top bar */}
      <div style={{ ...S.nav, padding: isMobile ? '8px 16px' : '10px 24px' }}>
        <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>❄️ Summit 26</span>

        {/* Desktop nav tabs — hidden on mobile */}
        {!isMobile && NAV_ITEMS.map(n => (
          <button key={n.id} style={S.navBtn(view === n.id)} onClick={() => setView(n.id)}>{n.icon} {n.label}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isSupabaseReady() && !isMobile && (
            <span style={{ fontSize: 10, color: 'var(--badge-local-text)', background: 'var(--badge-local-bg)', padding: '2px 8px', borderRadius: 4 }}>Local mode</span>
          )}
          <button style={{ ...S.btn('default'), fontSize: 13, padding: '4px 8px' }} onClick={refresh} title="Sync">⟳</button>
          <button style={{ ...S.btn('default'), fontSize: 14, padding: '4px 8px' }} onClick={() => setDark(d => !d)} title="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
          <button style={{ ...S.btn('default'), fontSize: 13, padding: '4px 8px' }} onClick={() => setShowGuide(true)} title="Help">?</button>

          {myName ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--me-text)', background: 'var(--me-bg)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--me-border)', maxWidth: isMobile ? 140 : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👤 {isMobile ? myName.split(' ')[0] : `${myName} · ${registrations[myName]?.size || 0} sessions`}
              </span>
              <button style={{ ...S.btn('default'), fontSize: 11, padding: '4px 8px' }} onClick={handleClearName}>✕</button>
            </div>
          ) : showNameInput ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...S.input, width: isMobile ? 130 : 170 }} placeholder="Your name…" value={nameInput}
                onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSetName()}
                list="known-names" autoFocus />
              <datalist id="known-names">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
              <button style={S.btn('primary')} onClick={handleSetName}>Set</button>
              <button style={{ ...S.btn('default'), padding: '4px 8px' }} onClick={() => setShowNameInput(false)}>✕</button>
            </div>
          ) : (
            <button style={S.btn('primary')} onClick={() => setShowNameInput(true)}>+ {isMobile ? 'Name' : 'Set Name'}</button>
          )}
        </div>
      </div>

      <div style={{ ...S.content, padding: isMobile ? '12px 12px' : '20px 24px' }}>
        {loading
          ? <div style={{ color: 'var(--text2)', padding: 60, textAlign: 'center' }}>Loading…</div>
          : <>
            {view === 'schedule' && <ScheduleView myName={myName} onRegister={register} onUnregister={unregister} getAttendeesForSession={getAttendeesForSession} registrations={registrations} isMobile={isMobile} />}
            {view === 'myplan' && <MyPlanView name={myName} getSessionsForPerson={getSessionsForPerson} getAttendeesForSession={getAttendeesForSession} onRegister={register} onUnregister={unregister} isMobile={isMobile} />}
            {view === 'team' && <TeamView knownNames={knownNames} registrations={registrations} getSessionsForPerson={getSessionsForPerson} getAttendeesForSession={getAttendeesForSession} isMobile={isMobile} />}
            {view === 'map' && <RoomMap getAttendeesForSession={getAttendeesForSession} dark={dark} isMobile={isMobile} />}
          </>
        }
      </div>

      {/* Footer — desktop only */}
      {!isMobile && (
        <div style={{ padding: '10px 24px', borderTop: '1px solid var(--footer-border)', fontSize: 10, color: 'var(--footer-text)', display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          <span>❄️ Snowflake Summit 26 · {ALL_SESSIONS.length} sessions · San Francisco, Jun 1–4 2026</span>
          <span style={{ color: isSupabaseReady() ? '#4ade80' : 'var(--badge-local-text)' }}>
            {isSupabaseReady() ? '🟢 Live sync' : '🟡 Local only'}
          </span>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)', display: 'flex', zIndex: 100, boxShadow: '0 -2px 10px rgba(0,0,0,0.08)' }}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{ flex: 1, border: 'none', cursor: 'pointer', padding: '8px 4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', color: view === n.id ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.15s' }}>
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <span style={{ fontSize: 10, fontWeight: view === n.id ? 700 : 400 }}>{n.label}</span>
              {view === n.id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 1 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
