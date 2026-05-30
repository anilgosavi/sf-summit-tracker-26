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

function openMapsNav(room) {
  const dest = encodeURIComponent(`${room}, Moscone Center, 747 Howard St, San Francisco, CA`);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const url = isIOS
    ? `https://maps.apple.com/?daddr=${dest}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  window.open(url, '_blank');
}
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
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span>⏰ {session.time}</span>
                {session.room_short && (
                  <span
                    onClick={e => { e.stopPropagation(); openMapsNav(session.room_short); }}
                    title={`Directions to ${session.room_short}`}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                  >
                    📍 {session.room_short}
                  </span>
                )}
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

// Building floors — top to bottom = upper floors to ground
const BUILDING_FLOORS = [
  {
    id: 'north', label: 'Moscone North', sublabel: 'Keynotes', icon: '🎤', color: '#7c3aed',
    note: 'Main Keynote Hall — Opening, Platform & Partner Keynotes',
    zones: null,
    rooms: [],
  },
  {
    id: 'mz', label: 'Upper Mezzanine', sublabel: 'Moscone South', icon: '🔼', color: '#0369a1',
    note: null,
    zones: [{ label: 'Mezzanine Corridor', rooms: ['Room 151','Room 152','Room 158','Room 159','Room 160'] }],
    rooms: ['Room 151','Room 152','Room 158','Room 159','Room 160'],
  },
  {
    id: 'l2', label: 'Level 2', sublabel: 'Moscone South', icon: '🏢', color: '#0284c7',
    note: null,
    zones: [
      { label: 'North Wing', rooms: ['Room 205','Room 206','Room 208','Room 209'] },
      { label: 'Central Wing', rooms: ['Room 210','Room 211','Room 212','Room 213'] },
      { label: 'South Wing', rooms: ['Room 214','Room 215','Room 216'] },
    ],
    rooms: ['Room 205','Room 206','Room 208','Room 209','Room 210','Room 211','Room 212','Room 213','Room 214','Room 215','Room 216'],
  },
  {
    id: 'bc', label: 'Basecamp', sublabel: 'Ground Floor · Expo', icon: '🏕️', color: '#059669',
    note: null,
    zones: [
      { label: 'Hall A — South Theaters', rooms: ['Basecamp South Theater 1','Basecamp South Theater 2','Vertical Village Theater 1','Vertical Village Theater 2'] },
      { label: 'Hall B/C — Theaters 3 & 4', rooms: ['Basecamp South Theater 3','Basecamp South Theater 4'] },
      { label: 'Hall D — Builders Hub & AI', rooms: ['Builders Hub Theater','AI Pop Up'] },
      { label: 'Hall E — Hands-on Labs', rooms: ['Hands-on Labs 1','Hands-on Labs 2','Hands-on Labs 3'] },
    ],
    rooms: ['Basecamp South Theater 1','Basecamp South Theater 2','Basecamp South Theater 3','Basecamp South Theater 4','Vertical Village Theater 1','Vertical Village Theater 2','Builders Hub Theater','Hands-on Labs 1','Hands-on Labs 2','Hands-on Labs 3','AI Pop Up'],
  },
];

// ── Room Map ──────────────────────────────────────────────────────────────────
function RoomMap({ getAttendeesForSession, dark, isMobile }) {
  const [activeFloor, setActiveFloor] = useState('l2');
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

  const sessionCounts = useMemo(() => {
    const m = {};
    for (const s of ALL_SESSIONS) {
      if (!s.room_short) continue;
      m[s.room_short] = (m[s.room_short] || 0) + 1;
    }
    return m;
  }, []);

  const filteredSessions = useMemo(() => {
    if (!filterRoom) return [];
    return ALL_SESSIONS.filter(s => s.room_short === filterRoom)
      .sort((a, b) => {
        const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : getStartMin(a) - getStartMin(b);
      });
  }, [filterRoom]);

  const floor = BUILDING_FLOORS.find(f => f.id === activeFloor);

  const RoomCard = ({ room, color }) => {
    const attendees = [...(roomAttendees[room] || new Set())];
    const count = sessionCounts[room] || 0;
    const hasTeam = attendees.length > 0;
    const isActive = filterRoom === room;
    const short = room.replace('Room ', 'Rm ').replace('Basecamp South Theater ', 'S.Theater ').replace('Vertical Village Theater ', 'VV Theater ').replace('Hands-on Labs ', 'Lab ');
    return (
      <div onClick={() => setFilterRoom(isActive ? '' : room)} style={{
        background: isActive ? color : 'var(--surface)',
        border: `2px solid ${hasTeam || isActive ? color : 'var(--border)'}`,
        borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
        transition: 'all 0.15s', position: 'relative',
        boxShadow: hasTeam ? `0 0 0 3px ${color}25` : 'none',
        minWidth: 0,
      }}>
        {hasTeam && (
          <div style={{ position: 'absolute', top: -7, right: -7, background: color, color: '#fff', borderRadius: 999, width: 18, height: 18, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
            {attendees.length}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{short}</div>
        <div style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--text3)' }}>{count} sessions</div>
        {hasTeam && (
          <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
            {attendees.slice(0, 4).map(n => (
              <span key={n} style={{ width: 16, height: 16, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.35)' : color, color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {n.charAt(0)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 style={S.h2}>🗺 Moscone Center — Floor Guide</h2>

      {/* Building schematic */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>

        {/* Building label */}
        <div style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>📍 Moscone Center, San Francisco</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Howard St Entrance ↓</span>
        </div>

        {/* Floor strips — stacked like a real building (top floor first) */}
        {BUILDING_FLOORS.map((f, idx) => {
          const isActive = activeFloor === f.id;
          const floorAttendees = [...f.rooms.reduce((acc, r) => { (roomAttendees[r] || new Set()).forEach(p => acc.add(p)); return acc; }, new Set())];
          const totalSessions = f.rooms.reduce((a, r) => a + (sessionCounts[r] || 0), 0);
          return (
            <div key={f.id}>
              {/* Floor header row */}
              <div
                onClick={() => { setActiveFloor(f.id); setFilterRoom(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  cursor: 'pointer', background: isActive ? `${f.color}12` : 'transparent',
                  borderLeft: `4px solid ${isActive ? f.color : 'transparent'}`,
                  borderBottom: idx < BUILDING_FLOORS.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {/* Floor level indicator */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isActive ? f.color : 'var(--surface2)', border: `2px solid ${isActive ? f.color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? f.color : 'var(--text)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{f.sublabel}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {f.rooms.length > 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.rooms.length} rooms · {totalSessions} sessions</div>}
                  {floorAttendees.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', marginTop: 3 }}>
                      {floorAttendees.slice(0,4).map(n => (
                        <span key={n} style={{ width: 18, height: 18, borderRadius: '50%', background: f.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n.charAt(0)}</span>
                      ))}
                      {floorAttendees.length > 4 && <span style={{ fontSize: 9, color: f.color }}>+{floorAttendees.length - 4}</span>}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>{isActive ? '▾' : '▸'}</span>
              </div>

              {/* Expanded floor plan */}
              {isActive && (
                <div style={{ padding: '12px 16px 16px', background: `${f.color}08`, borderBottom: idx < BUILDING_FLOORS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {f.note ? (
                    <div style={{ padding: 16, textAlign: 'center', background: `${f.color}15`, borderRadius: 8, border: `1px dashed ${f.color}60` }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontSize: 13, color: f.color, fontWeight: 600 }}>{f.note}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>No individual room selection for keynotes</div>
                    </div>
                  ) : (
                    <div>
                      {/* Hallway visual */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <div style={{ height: 2, flex: 1, background: `${f.color}40`, borderRadius: 1 }} />
                        <span style={{ fontSize: 9, color: f.color, fontWeight: 600, whiteSpace: 'nowrap' }}>MAIN CORRIDOR</span>
                        <div style={{ height: 2, flex: 1, background: `${f.color}40`, borderRadius: 1 }} />
                      </div>

                      {/* Zones (wings/halls) */}
                      {f.zones?.map((zone, zi) => (
                        <div key={zi} style={{ marginBottom: zi < f.zones.length - 1 ? 12 : 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: f.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                            {zone.label}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '85px' : '100px'}, 1fr))`, gap: 7, paddingLeft: 14, borderLeft: `2px solid ${f.color}30` }}>
                            {zone.rooms.map(room => <RoomCard key={room} room={room} color={f.color} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Ground marker */}
        <div style={{ background: 'var(--surface2)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>🚪 STREET LEVEL — Howard St</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      </div>

      {/* Selected room sessions */}
      {filterRoom && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h3 style={{ ...S.h3, marginBottom: 0 }}>📍 {filterRoom}</h3>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{filteredSessions.length} sessions</span>
            <button style={{ ...S.btn('default'), fontSize: 11, padding: '3px 8px', marginLeft: 'auto' }} onClick={() => setFilterRoom('')}>✕ Clear</button>
          </div>
          {(() => {
            const groups = {};
            for (const s of filteredSessions) {
              const key = `${s.day}||${s.time.split(' - ')[0]}`;
              if (!groups[key]) groups[key] = { label: s.time.split(' - ')[0], day: s.day, sessions: [] };
              groups[key].sessions.push(s);
            }
            return Object.values(groups).map(({ label, day, sessions }) => (
              <div key={`${day}${label}`} style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
                <div style={{ width: isMobile ? 62 : 90, flexShrink: 0, paddingTop: 2, textAlign: 'right', paddingRight: isMobile ? 10 : 16, position: 'relative' }}>
                  <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: 'var(--time-text)', whiteSpace: 'nowrap' }}>{label}</span>
                  <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>{day}</div>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: -24, width: 2, background: 'var(--border)' }} />
                  <div style={{ position: 'absolute', right: -5, top: 4, width: 10, height: 10, borderRadius: '50%', background: floor.color, border: '2px solid var(--bg)' }} />
                </div>
                <div style={{ flex: 1, paddingLeft: isMobile ? 10 : 16, minWidth: 0 }}>
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

// ── Navigate View ────────────────────────────────────────────────────────────
const MOSCONE = { lat: 37.7839, lng: -122.4034, name: 'Moscone Center', address: '747 Howard St, San Francisco, CA 94103' };

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bearingDeg(lat1, lng1, lat2, lng2) {
  const dLng = (lng2-lng1)*Math.PI/180;
  const y = Math.sin(dLng)*Math.cos(lat2*Math.PI/180);
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180) - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLng);
  return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
}

function compassDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg/45) % 8];
}

// Indoor wayfinding: known room positions on floor
const FLOOR_ROOMS = {
  l2:  ['Room 205','Room 206','Room 208','Room 209','Room 210','Room 211','Room 212','Room 213','Room 214','Room 215','Room 216'],
  mz:  ['Room 151','Room 152','Room 158','Room 159','Room 160'],
  bc:  ['Basecamp South Theater 1','Basecamp South Theater 2','Basecamp South Theater 3','Basecamp South Theater 4','Vertical Village Theater 1','Vertical Village Theater 2','Builders Hub Theater','Hands-on Labs 1','Hands-on Labs 2','Hands-on Labs 3','AI Pop Up'],
};

const FLOOR_LABELS = { l2: 'Level 2', mz: 'Upper Mezzanine', bc: 'Basecamp', north: 'Moscone North' };

function getFloorForRoom(room) {
  for (const [f, rooms] of Object.entries(FLOOR_ROOMS)) if (rooms.includes(room)) return f;
  return null;
}

function getWalkingSteps(fromFloor, fromRoom, toRoom) {
  const toFloor = getFloorForRoom(toRoom);
  if (!toFloor) return [];
  const steps = [];
  if (!fromFloor || fromFloor === 'entrance') {
    steps.push('🚪 Enter through the Howard St entrance');
  }
  if (toFloor === 'l2') {
    if (fromFloor !== 'l2') steps.push('🛗 Take the escalator or elevator to Level 2 (Moscone South)');
    const wing = ['Room 205','Room 206','Room 208','Room 209'].includes(toRoom) ? 'North Wing' :
                 ['Room 214','Room 215','Room 216'].includes(toRoom) ? 'South Wing' : 'Central Wing';
    steps.push(`🚶 Walk along the main corridor toward the ${wing}`);
    steps.push(`📍 ${toRoom} will be on your ${toRoom.endsWith('5') || toRoom.endsWith('8') ? 'left' : 'right'} side`);
  } else if (toFloor === 'mz') {
    if (fromFloor !== 'mz') steps.push('🛗 Take the elevator to the Upper Mezzanine (Moscone South)');
    steps.push('🚶 Walk along the mezzanine corridor');
    steps.push(`📍 ${toRoom} will be numbered in sequence along the corridor`);
  } else if (toFloor === 'bc') {
    if (fromFloor !== 'bc') steps.push('⬇️ Head down to the Ground Floor / Basecamp');
    const hall = toRoom.includes('Theater 1') || toRoom.includes('Theater 2') ? 'Hall A (South)' :
                 toRoom.includes('Theater 3') || toRoom.includes('Theater 4') ? 'Hall B/C' :
                 toRoom.includes('Builders') ? 'Hall D' :
                 toRoom.includes('Hands-on') || toRoom.includes('AI Pop Up') ? 'Hall D/E' : 'Expo Floor';
    steps.push(`🏕️ Walk through the Basecamp expo floor toward ${hall}`);
    steps.push(`📍 Follow the signs for "${toRoom}"`);
  }
  return steps;
}

function NavigateView({ myName, getSessionsForPerson, knownNames, isMobile }) {
  const [gps, setGps] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [fromFloor, setFromFloor] = useState('entrance');
  const [destRoom, setDestRoom] = useState('');
  const [teamLocs, setTeamLocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_team_locs') || '{}'); } catch { return {}; }
  });
  const [myLoc, setMyLoc] = useState(() => localStorage.getItem('sf_my_loc') || '');
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);

  // GPS
  const requestGps = () => {
    if (!navigator.geolocation) { setGpsStatus('unsupported'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) }); setGpsStatus('ok'); },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const distKm = gps ? haversineKm(gps.lat, gps.lng, MOSCONE.lat, MOSCONE.lng) : null;
  const distStr = distKm == null ? null : distKm < 0.1 ? '< 100m — You\'re here!' : distKm < 1 ? `${Math.round(distKm*1000)}m away` : `${distKm.toFixed(1)} km away`;
  const walkMin = distKm ? Math.max(1, Math.round(distKm / 0.083)) : null;
  const bearing = gps ? bearingDeg(gps.lat, gps.lng, MOSCONE.lat, MOSCONE.lng) : null;

  const mapsUrl = gps
    ? `https://www.google.com/maps/dir/?api=1&origin=${gps.lat},${gps.lng}&destination=${MOSCONE.lat},${MOSCONE.lng}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MOSCONE.address)}`;
  const appleMapsUrl = gps
    ? `http://maps.apple.com/?saddr=${gps.lat},${gps.lng}&daddr=${MOSCONE.lat},${MOSCONE.lng}&dirflg=w`
    : `http://maps.apple.com/?q=${encodeURIComponent(MOSCONE.address)}`;

  // Next session
  const myCodes = new Set(getSessionsForPerson(myName));
  const mySessions = ALL_SESSIONS.filter(s => myCodes.has(s.code)).sort((a,b) => {
    const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    return di !== 0 ? di : getStartMin(a) - getStartMin(b);
  });
  const todayDayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextSession = mySessions.find(s => {
    const dayMatch = s.day.startsWith(todayDayName);
    return dayMatch && getStartMin(s) > nowMin;
  }) || mySessions.find(s => DAYS.indexOf(s.day) > DAYS.indexOf(DAYS.find(d => d.startsWith(todayDayName)) || DAYS[0]));

  const nextMinsUntil = nextSession ? Math.max(0, getStartMin(nextSession) - nowMin) : null;

  // Team locations
  const broadcastLocation = (room) => {
    if (!myName) return;
    const locs = { ...teamLocs, [myName]: { room, ts: Date.now() } };
    setTeamLocs(locs);
    setMyLoc(room);
    localStorage.setItem('sf_team_locs', JSON.stringify(locs));
    localStorage.setItem('sf_my_loc', room);
  };

  const clearLocation = () => {
    const locs = { ...teamLocs };
    delete locs[myName];
    setTeamLocs(locs);
    setMyLoc('');
    localStorage.setItem('sf_team_locs', JSON.stringify(locs));
    localStorage.removeItem('sf_my_loc');
  };

  const steps = destRoom ? getWalkingSteps(fromFloor, null, destRoom) : [];
  const destFloor = destRoom ? getFloorForRoom(destRoom) : null;

  const allRooms = Object.values(FLOOR_ROOMS).flat();
  const Card = ({ children, style }) => <div style={{ ...S.card, padding: 16, marginBottom: 12, ...style }}>{children}</div>;
  const SectionTitle = ({ icon, title }) => <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, display:'flex', gap:6, alignItems:'center'}}><span>{icon}</span>{title}</div>;

  return (
    <div>
      <h2 style={S.h2}>🧭 Navigate — Summit Wayfinding</h2>

      {/* Next Session */}
      {myName && nextSession && (
        <Card style={{ borderLeft: '4px solid var(--accent)', background: 'var(--accent-bg)' }}>
          <SectionTitle icon="⏱️" title="Your Next Session" />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{nextSession.title}</div>
          <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text2)', marginBottom:10, flexWrap:'wrap' }}>
            <span>⏰ {nextSession.time}</span>
            <span>📍 {nextSession.room_short}</span>
            <span>📅 {nextSession.day}</span>
            {nextMinsUntil !== null && nextMinsUntil <= 120 && (
              <span style={{ fontWeight:700, color: nextMinsUntil < 15 ? '#dc2626' : nextMinsUntil < 30 ? '#d97706' : 'var(--accent)' }}>
                {nextMinsUntil === 0 ? '🔴 Starting now!' : `🕐 In ${nextMinsUntil} min`}
              </span>
            )}
          </div>
          <button style={{ ...S.btn('primary'), fontSize: 12 }} onClick={() => setDestRoom(nextSession.room_short)}>
            🧭 Navigate there →
          </button>
        </Card>
      )}
      {myName && !nextSession && (
        <Card style={{ background: 'var(--surface2)' }}>
          <p style={{ color:'var(--text2)', fontSize:13, margin:0 }}>No upcoming sessions today. Check your plan to add some!</p>
        </Card>
      )}

      {/* Outdoor GPS */}
      <Card>
        <SectionTitle icon="🌍" title="Get to the Venue" />
        <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:12 }}>
          {/* Compass */}
          <div style={{ width:80, height:80, borderRadius:'50%', border:'2px solid var(--border)', flexShrink:0, position:'relative', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {bearing !== null ? (
              <>
                <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:'1px dashed var(--border)' }}/>
                <div style={{ width:4, height:32, background:'linear-gradient(var(--accent) 50%, var(--border) 50%)', borderRadius:2, transformOrigin:'50% 100%', transform:`rotate(${bearing}deg)`, position:'absolute', bottom:'50%', left:'calc(50% - 2px)' }}/>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', zIndex:1 }}/>
                {['N','E','S','W'].map((d,i) => (
                  <span key={d} style={{ position:'absolute', fontSize:8, fontWeight:700, color:'var(--text3)', ...[{top:4,left:'50%',transform:'translateX(-50%)'},{right:4,top:'50%',transform:'translateY(-50%)'},{bottom:4,left:'50%',transform:'translateX(-50%)'},{left:4,top:'50%',transform:'translateY(-50%)'}][i] }}>{d}</span>
                ))}
              </>
            ) : (
              <span style={{ fontSize:28 }}>🧭</span>
            )}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Moscone Center</div>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:8 }}>747 Howard St, San Francisco</div>
            {gps && (
              <div style={{ fontSize:12, fontWeight:600, color:'var(--accent)', marginBottom:4 }}>
                {distStr} · {compassDir(bearing)} direction
              </div>
            )}
            {walkMin && distKm > 0.05 && (
              <div style={{ fontSize:11, color:'var(--text2)' }}>🚶 ~{walkMin} min walk</div>
            )}
            {gpsStatus === 'loading' && <div style={{ fontSize:11, color:'var(--text2)' }}>📡 Getting your location…</div>}
            {gpsStatus === 'error' && <div style={{ fontSize:11, color:'var(--error)' }}>⚠️ Location access denied</div>}
            {gpsStatus === 'unsupported' && <div style={{ fontSize:11, color:'var(--error)' }}>⚠️ GPS not available on this device</div>}
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {gpsStatus !== 'ok' && (
            <button style={S.btn('primary')} onClick={requestGps}>
              📍 {gpsStatus === 'loading' ? 'Getting location…' : 'Use my location'}
            </button>
          )}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('default'), textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
            🗺️ Google Maps
          </a>
          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('default'), textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
            🍎 Apple Maps
          </a>
        </div>
      </Card>

      {/* Indoor Navigation */}
      <Card>
        <SectionTitle icon="🏢" title="Indoor Navigation" />
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:8, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>📌 I am currently at</label>
            <select style={S.input} value={fromFloor} onChange={e => setFromFloor(e.target.value)}>
              <option value="entrance">Howard St Entrance</option>
              <option value="l2">Level 2</option>
              <option value="mz">Upper Mezzanine</option>
              <option value="bc">Basecamp / Ground Floor</option>
              <option value="north">Moscone North</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--text2)', display:'block', marginBottom:4 }}>🎯 I want to go to</label>
            <select style={S.input} value={destRoom} onChange={e => setDestRoom(e.target.value)}>
              <option value="">Select a room…</option>
              {Object.entries(FLOOR_ROOMS).map(([f, rooms]) => (
                <optgroup key={f} label={FLOOR_LABELS[f]}>
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {steps.length > 0 && destRoom && (
          <div>
            {/* Visual floor indicator */}
            <div style={{ display:'flex', gap:0, marginBottom:14, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
              {[{id:'entrance',label:'Entrance',icon:'🚪'},{id:'bc',label:'Basecamp',icon:'🏕️'},{id:'l2',label:'Level 2',icon:'🏢'},{id:'mz',label:'Mezz.',icon:'🔼'},{id:'north',label:'North',icon:'🎤'}].map((f,i) => {
                const isFrom = fromFloor === f.id;
                const isDest = destFloor === f.id;
                const isPath = (() => {
                  const floors = ['entrance','bc','l2','mz','north'];
                  const fi = floors.indexOf(fromFloor), di = floors.indexOf(destFloor || 'l2');
                  const ci = floors.indexOf(f.id);
                  return fi !== -1 && di !== -1 && ci >= Math.min(fi,di) && ci <= Math.max(fi,di);
                })();
                return (
                  <div key={f.id} style={{ flex:1, textAlign:'center', padding:'8px 2px', background: isDest ? 'var(--accent)' : isFrom ? '#f0fdf4' : isPath ? 'var(--accent-bg)' : 'var(--surface2)', borderRight: i<4 ? '1px solid var(--border)' : 'none', transition:'all 0.2s' }}>
                    <div style={{ fontSize:16 }}>{f.icon}</div>
                    <div style={{ fontSize:9, fontWeight: isFrom||isDest ? 700 : 400, color: isDest ? '#fff' : isFrom ? '#15803d' : 'var(--text2)' }}>{f.label}</div>
                    {isFrom && <div style={{ fontSize:7, color:'#15803d', fontWeight:700 }}>YOU</div>}
                    {isDest && <div style={{ fontSize:7, color:'#fff', fontWeight:700 }}>DEST</div>}
                  </div>
                );
              })}
            </div>

            {/* Steps */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4, paddingTop:2 }}>{step}</div>
                </div>
              ))}
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'#059669', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>✓</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#059669', paddingTop:2 }}>You've arrived at {destRoom}!</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Team Radar */}
      <Card>
        <SectionTitle icon="👥" title="Team Radar — Where is everyone?" />
        <p style={{ fontSize:11, color:'var(--text2)', marginBottom:10, marginTop:0 }}>Share your current room so teammates can find you.</p>

        {/* Share my location */}
        {myName && (
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <select style={{ ...S.input, flex:1, minWidth:180 }} value={myLoc} onChange={e => broadcastLocation(e.target.value)}>
              <option value="">📍 I'm at…</option>
              <option value="Lobby / Registration">🚪 Lobby / Registration</option>
              <option value="Expo Floor">🏕️ Expo Floor / Basecamp</option>
              {Object.entries(FLOOR_ROOMS).map(([f, rooms]) => (
                <optgroup key={f} label={FLOOR_LABELS[f]}>
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
              ))}
            </select>
            {myLoc && <button style={S.btn('default')} onClick={clearLocation}>✕</button>}
          </div>
        )}

        {/* Live locations */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {Object.entries(teamLocs).filter(([, v]) => v.room).map(([name, { room, ts }]) => {
            const minsAgo = Math.round((Date.now() - ts) / 60000);
            const isStale = minsAgo > 30;
            return (
              <div key={name} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 10px', background:'var(--surface2)', borderRadius:8, opacity: isStale ? 0.5 : 1 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{name.charAt(0)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{name}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>📍 {room}</div>
                </div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{minsAgo < 2 ? 'just now' : `${minsAgo}m ago`}</div>
                {!isStale && (
                  <button onClick={() => setDestRoom(room)} style={{ ...S.btn('default'), fontSize:10, padding:'3px 7px' }}>→ Nav</button>
                )}
              </div>
            );
          })}
          {Object.keys(teamLocs).filter(n => teamLocs[n].room).length === 0 && (
            <p style={{ color:'var(--text3)', fontSize:12, margin:0 }}>No teammates have shared their location yet.</p>
          )}
        </div>
      </Card>

      <div style={{ fontSize:10, color:'var(--text3)', padding:'4px 0', textAlign:'center' }}>
        💡 Indoor positioning uses manual selection — true blue-dot indoor GPS requires venue beacons not available at Moscone.
      </div>
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
  { id: 'navigate', label: 'Navigate', icon: '🧭' },
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
            {view === 'navigate' && <NavigateView myName={myName} getSessionsForPerson={getSessionsForPerson} knownNames={knownNames} isMobile={isMobile} />}
          </>
        }
      </div>

      {/* Footer — desktop only */}
      {!isMobile && (
        <div style={{ padding: '10px 24px', borderTop: '1px solid var(--footer-border)', fontSize: 10, color: 'var(--footer-text)', display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
          <span>❄️ Snowflake Summit 26 · {ALL_SESSIONS.length} sessions · San Francisco, Jun 1–4 2026</span>
          <span style={{ color: 'var(--text3)' }}>made by Anil Gosavi</span>
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
