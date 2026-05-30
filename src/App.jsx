import { useState, useMemo, useCallback } from 'react';
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
  'Platform & Ops': '#1e40af',
  'Industry': '#7f1d1d',
  'Data Marketplace': '#4d7c0f',
  'Admin': '#374151',
  'General': '#374151',
  'Executive': '#92400e',
  'Security': '#1e3a5f',
  'User Group': '#4a1d96',
};

function parseTime(timeStr) {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
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

const S = {
  app: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui,sans-serif' },
  gate: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%)' },
  nav: { background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  navBtn: (active) => ({ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? '#1d4ed8' : '#f1f5f9', color: active ? '#fff' : '#475569' }),
  content: { padding: '16px 20px', maxWidth: 1400, margin: '0 auto' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  tag: (track) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: (COLORS[track] || '#64748b') + '18', color: COLORS[track] || '#64748b', border: `1px solid ${(COLORS[track] || '#64748b')}33` }),
  btn: (v = 'primary') => ({ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: v === 'primary' ? '#1d4ed8' : v === 'danger' ? '#fee2e2' : v === 'success' ? '#dcfce7' : '#f1f5f9', color: v === 'primary' ? '#fff' : v === 'danger' ? '#dc2626' : v === 'success' ? '#16a34a' : '#475569' }),
  input: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', color: '#0f172a', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' },
  h2: { fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 },
  h3: { fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginBottom: 8 },
};

// ── Gate ─────────────────────────────────────────────────────────────────────
function GateScreen({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const check = () => {
    if (code.trim().toLowerCase() === ACCESS_CODE) onUnlock();
    else setError('Invalid access code. Try again.');
  };
  return (
    <div style={S.gate}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>❄️</div>
        <h1 style={{ color: '#0f172a', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Snowflake Summit 26</h1>
        <p style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>Ritchie Bros Team Tracker · San Francisco, Jun 1–4</p>
        <input
          style={{ ...S.input, marginBottom: 12, textAlign: 'center', letterSpacing: 3, fontSize: 15 }}
          type="password"
          placeholder="Access code"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && check()}
          autoFocus
        />
        {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</p>}
        <button style={{ ...S.btn('primary'), width: '100%', padding: '10px 0', fontSize: 14 }} onClick={check}>
          Enter →
        </button>
      </div>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, myName, attendees, onRegister, onUnregister }) {
  const isRegistered = myName && attendees.includes(myName);
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${COLORS[session.track] || '#1e4a7f'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{session.code}</span>
            <span style={S.tag(session.track)}>{session.track}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, marginBottom: 6 }}>{session.title}</div>
          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>⏰ {session.time}</span>
            {session.room_short && <span>📍 {session.room_short}</span>}
          </div>
        </div>
        {myName && (
          isRegistered
            ? <button style={S.btn('danger')} onClick={() => onUnregister(session.code)}>✓ Joined</button>
            : <button style={S.btn('success')} onClick={() => onRegister(session.code)}>+ Join</button>
        )}
      </div>
      {attendees.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {attendees.map(n => (
            <span key={n} style={{ ...S.pill, background: n === myName ? '#dbeafe' : '#f1f5f9', borderColor: n === myName ? '#3b82f6' : '#cbd5e1', color: n === myName ? '#1d4ed8' : '#475569' }}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────
function ScheduleView({ myName, onRegister, onUnregister, getAttendeesForSession, registrations }) {
  const [filterDay, setFilterDay] = useState(DAYS[0]);
  const [filterTrack, setFilterTrack] = useState('');
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);

  const mySessionCodes = useMemo(() => {
    if (!myName || !registrations[myName]) return new Set();
    return registrations[myName];
  }, [myName, registrations]);

  const filtered = useMemo(() =>
    ALL_SESSIONS
      .filter(s => {
        if (filterDay && s.day !== filterDay) return false;
        if (filterTrack && s.track !== filterTrack) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!s.title.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q) && !s.room_short?.toLowerCase().includes(q)) return false;
        }
        if (showMine && !mySessionCodes.has(s.code)) return false;
        return true;
      })
      .sort((a, b) => {
        const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : getStartMin(a) - getStartMin(b);
      }),
  [filterDay, filterTrack, search, showMine, mySessionCodes]);

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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
          <button style={S.btn(showMine ? 'primary' : 'default')} onClick={() => setShowMine(!showMine)}>
            {showMine ? '★ My Sessions' : '☆ My Sessions'}
          </button>
        )}
        <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{filtered.length} sessions</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', ...DAYS].map(d => (
          <button key={d || 'all'} style={S.navBtn(filterDay === d)} onClick={() => setFilterDay(d)}>
            {d || 'All Days'}
          </button>
        ))}
      </div>

      {grouped.map(({ label, day, sessions }) => (
        <div key={`${day}${label}`} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, fontFamily: 'monospace', marginBottom: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 4 }}>⏰ {label}</span>
            {filterDay === '' && <span style={{ color: '#64748b' }}>{day}</span>}
            <span style={{ color: '#94a3b8', fontSize: 10 }}>{sessions.length} sessions</span>
          </div>
          {sessions.map(s => (
            <SessionCard
              key={s.code}
              session={s}
              myName={myName}
              attendees={getAttendeesForSession(s.code)}
              onRegister={(code) => onRegister(myName, code)}
              onUnregister={(code) => onUnregister(myName, code)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── My Plan ───────────────────────────────────────────────────────────────────
function MyPlanView({ name, getSessionsForPerson, getAttendeesForSession, onRegister, onUnregister }) {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  const myCodes = useMemo(() => new Set(getSessionsForPerson(name)), [name, getSessionsForPerson]);

  const byDay = useMemo(() => {
    const g = {};
    for (const d of DAYS) {
      g[d] = ALL_SESSIONS
        .filter(s => myCodes.has(s.code) && s.day === d)
        .sort((a, b) => getStartMin(a) - getStartMin(b));
    }
    return g;
  }, [myCodes]);

  const dayMine = byDay[selectedDay] || [];
  const dayAll = useMemo(() =>
    ALL_SESSIONS.filter(s => s.day === selectedDay).sort((a, b) => getStartMin(a) - getStartMin(b)),
  [selectedDay]);

  const freeSlots = useMemo(() => {
    const slots = {};
    for (const s of dayAll) {
      if (myCodes.has(s.code)) continue;
      if (dayMine.some(m => overlaps(s, m))) continue;
      const key = s.time.split(' - ')[0];
      slots[key] = (slots[key] || 0) + 1;
    }
    return slots;
  }, [dayAll, dayMine, myCodes]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const remaining = useMemo(() =>
    dayAll.filter(s => !myCodes.has(s.code) && getStartMin(s) >= nowMin),
  [dayAll, myCodes, nowMin]);

  if (!name) {
    return (
      <div style={{ color: '#475569', padding: 60, textAlign: 'center', fontSize: 14 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
        Set your name in the top bar to see your personal plan.
      </div>
    );
  }

  return (
    <div>
      <h2 style={S.h2}>📅 {name}'s Plan — {Object.values(byDay).flat().length} sessions total</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {DAYS.map(d => (
          <button key={d} style={S.navBtn(selectedDay === d)} onClick={() => setSelectedDay(d)}>
            {d} ({byDay[d]?.length || 0})
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>
        <div>
          <h3 style={S.h3}>✅ Registered ({dayMine.length})</h3>
          {dayMine.length === 0
            ? <p style={{ color: '#475569', fontSize: 13 }}>Nothing registered yet — browse the schedule!</p>
            : dayMine.map(s => (
              <SessionCard
                key={s.code}
                session={s}
                myName={name}
                attendees={getAttendeesForSession(s.code)}
                onRegister={() => {}}
                onUnregister={(code) => onUnregister(name, code)}
              />
            ))
          }
        </div>

        <div>
          <h3 style={S.h3}>🕐 Your Free Time Slots</h3>
          {Object.keys(freeSlots).length === 0 && dayMine.length > 0
            ? <p style={{ color: '#16a34a', fontSize: 12 }}>Fully booked — no open slots!</p>
            : Object.entries(freeSlots).map(([time, count]) => (
              <div key={time} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#1d4ed8' }}>⏰ {time}</span>
                <span style={{ color: '#64748b' }}>{count} sessions available</span>
              </div>
            ))
          }

          <h3 style={{ ...S.h3, marginTop: 20 }}>🔜 Still Available Today ({remaining.length})</h3>
          {remaining.slice(0, 6).map(s => (
            <div key={s.code} style={{ ...S.card, fontSize: 12 }}>
              <div style={{ color: '#0f172a', marginBottom: 2, fontWeight: 600 }}>{s.title}</div>
              <div style={{ color: '#64748b', marginBottom: 6 }}>{s.time} · {s.room_short}</div>
              <button style={{ ...S.btn('success'), fontSize: 11 }} onClick={() => onRegister(name, s.code)}>+ Add to plan</button>
            </div>
          ))}
          {remaining.length > 6 && <p style={{ color: '#475569', fontSize: 11 }}>+{remaining.length - 6} more…</p>}
        </div>
      </div>
    </div>
  );
}

// ── Team View ─────────────────────────────────────────────────────────────────
function TeamView({ knownNames, getSessionsForPerson, getAttendeesForSession }) {
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

  // Team free time: slots where no one has a session
  const teamFreeTime = useMemo(() => {
    if (knownNames.length === 0) return [];
    const dayAll = ALL_SESSIONS.filter(s => s.day === selectedDay).sort((a, b) => getStartMin(a) - getStartMin(b));
    const uniqueTimes = [...new Set(dayAll.map(s => s.time.split(' - ')[0]))];
    return uniqueTimes.map(t => {
      const atThisTime = dayAll.filter(s => s.time.split(' - ')[0] === t);
      const busy = knownNames.filter(name => {
        const codes = new Set(getSessionsForPerson(name));
        return atThisTime.some(s => codes.has(s.code));
      });
      return { time: t, busy, free: knownNames.filter(n => !busy.includes(n)) };
    });
  }, [knownNames, selectedDay, getSessionsForPerson]);

  const personSessions = useMemo(() => {
    if (!selectedPerson) return [];
    const codes = new Set(getSessionsForPerson(selectedPerson));
    return ALL_SESSIONS
      .filter(s => codes.has(s.code) && s.day === selectedDay)
      .sort((a, b) => getStartMin(a) - getStartMin(b));
  }, [selectedPerson, selectedDay, getSessionsForPerson]);

  return (
    <div>
      <h2 style={S.h2}>👥 Team Overview</h2>

      {knownNames.length === 0 && (
        <p style={{ color: '#475569', fontSize: 14, padding: 20 }}>No team members yet — set your name in the top bar and join some sessions!</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8, marginBottom: 24 }}>
        {stats.map(({ name, total, byDay }) => (
          <div
            key={name}
            style={{ ...S.card, cursor: 'pointer', border: selectedPerson === name ? '1px solid #3b82f6' : S.card.border }}
            onClick={() => setSelectedPerson(name === selectedPerson ? null : name)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{name}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{total}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{ flex: 1, textAlign: 'center', background: '#f8fafc', borderRadius: 4, padding: '4px 2px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: byDay[d] > 0 ? '#1d4ed8' : '#cbd5e1' }}>{byDay[d]}</div>
                  <div style={{ fontSize: 8, color: '#94a3b8' }}>{d.split(',')[0]}</div>
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
            ? <p style={{ color: '#475569', fontSize: 13 }}>No sessions for this day.</p>
            : personSessions.map(s => (
              <div key={s.code} style={S.card}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={S.tag(s.track)}>{s.track}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>⏰ {s.time} · 📍 {s.room_short}</div>
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
      {knownNames.length === 0 ? (
        <p style={{ color: '#475569', fontSize: 13 }}>Add team members first.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 6 }}>
          {teamFreeTime.map(({ time, busy, free }) => (
            <div key={time} style={{ ...S.card, background: free.length === knownNames.length ? '#f0fdf4' : '#ffffff', borderColor: free.length === knownNames.length ? '#86efac' : '#e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, marginBottom: 6 }}>⏰ {time}</div>
              {free.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#16a34a' }}>Free: </span>
                  {free.map(n => <span key={n} style={{ ...S.pill, background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a', marginRight: 3 }}>{n}</span>)}
                </div>
              )}
              {busy.length > 0 && (
                <div>
                  <span style={{ fontSize: 10, color: '#dc2626' }}>Busy: </span>
                  {busy.map(n => <span key={n} style={{ ...S.pill, background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', marginRight: 3 }}>{n}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Room Map ──────────────────────────────────────────────────────────────────
function RoomMap({ getAttendeesForSession }) {
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
    return ALL_SESSIONS
      .filter(s => s.room_short === filterRoom)
      .sort((a, b) => {
        const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        return di !== 0 ? di : getStartMin(a) - getStartMin(b);
      });
  }, [filterRoom]);

  const roomList = useMemo(() =>
    [...new Set(ALL_SESSIONS.map(s => s.room_short).filter(Boolean))].sort(),
  []);

  const RoomRect = ({ r, x, y, w = 60, h = 26 }) => {
    const key = 'Room ' + r;
    const cnt = (roomAttendees[key] || new Set()).size;
    const active = filterRoom === key;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setFilterRoom(active ? '' : key)}>
        <rect x={x} y={y} width={w} height={h} rx="4" fill={active ? '#bfdbfe' : '#e0f2fe'} stroke={cnt > 0 ? '#1d4ed8' : '#93c5fd'} strokeWidth={cnt > 0 ? 2 : 1} />
        <text x={x + w / 2} y={y + 12} textAnchor="middle" fill="#1e3a5f" fontSize="9" fontFamily="monospace">Rm {r}</text>
        {cnt > 0 && <text x={x + w / 2} y={y + 22} textAnchor="middle" fill="#1d4ed8" fontSize="8" fontFamily="monospace">{cnt}👤</text>}
      </g>
    );
  };

  const Zone = ({ label, sublabel, short, x, y, w, h, c, sc }) => {
    const cnt = (short || []).reduce((acc, r) => {
      const s = roomAttendees[r] || new Set();
      s.forEach(p => acc.add(p));
      return acc;
    }, new Set()).size;
    const active = short?.length === 1 && filterRoom === short[0];
    return (
      <g style={{ cursor: short?.length ? 'pointer' : 'default' }} onClick={() => { if (short?.length === 1) setFilterRoom(active ? '' : short[0]); }}>
        <rect x={x} y={y} width={w} height={h} rx="5" fill={active ? c + 'cc' : c} stroke={cnt > 0 ? sc : sc + '55'} strokeWidth={cnt > 0 ? 2 : 1} opacity="0.9" />
        {label.split('\n').map((line, li) => (
          <text key={li} x={x + w / 2} y={y + h / 2 - (label.includes('\n') ? 8 : 3) + li * 13} textAnchor="middle" fill={sc} fontSize="9" fontWeight="700" fontFamily="monospace">{line}</text>
        ))}
        <text x={x + w / 2} y={y + h - 7} textAnchor="middle" fill={sc} fontSize="7.5" fontFamily="monospace" opacity="0.7">{sublabel}</text>
        {cnt > 0 && <text x={x + w - 8} y={y + 14} textAnchor="middle" fill={sc} fontSize="9" fontFamily="monospace">{cnt}👤</text>}
      </g>
    );
  };

  return (
    <div>
      <h2 style={S.h2}>🗺 Venue Map — Moscone Center</h2>
      <div style={{ overflowX: 'auto', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16, marginBottom: 20 }}>
        <svg viewBox="0 0 820 560" width="100%" style={{ maxWidth: 820 }}>
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <text x="410" y="24" textAnchor="middle" fill="#1d4ed8" fontSize="14" fontWeight="700" fontFamily="monospace">Moscone Center — Snowflake Summit 26</text>

          {/* Moscone South Level 2 */}
          <rect x="40" y="40" width="340" height="168" rx="8" fill="#dbeafe" opacity="0.8" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="210" y="60" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="700" fontFamily="monospace">MOSCONE SOUTH — Level 2</text>
          {[['205', 60, 72], ['206', 130, 72], ['208', 200, 72], ['209', 270, 72],
            ['210', 60, 108], ['211', 130, 108], ['212', 200, 108], ['213', 270, 108],
            ['214', 60, 144], ['215', 130, 144], ['216', 200, 144]].map(([r, x, y]) => (
            <RoomRect key={r} r={r} x={x} y={y} />
          ))}

          {/* Moscone South Mezzanine */}
          <rect x="40" y="222" width="340" height="102" rx="8" fill="#e0f2fe" opacity="0.8" stroke="#0369a1" strokeWidth="1.5" />
          <text x="210" y="240" textAnchor="middle" fill="#075985" fontSize="10" fontWeight="700" fontFamily="monospace">MOSCONE SOUTH — Upper Mezzanine</text>
          {[['151', 55, 252], ['152', 125, 252], ['158', 195, 252], ['159', 265, 252], ['160', 55, 286]].map(([r, x, y]) => (
            <RoomRect key={r} r={r} x={x} y={y} w={58} />
          ))}

          {/* Moscone North */}
          <rect x="420" y="40" width="360" height="120" rx="8" fill="#ede9fe" opacity="0.9" stroke="#7c3aed" strokeWidth="1.5" />
          <text x="600" y="60" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="700" fontFamily="monospace">MOSCONE NORTH — Keynotes</text>
          <rect x="460" y="72" width="280" height="68" rx="6" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="1" />
          <text x="600" y="110" textAnchor="middle" fill="#6d28d9" fontSize="10" fontFamily="monospace">🎤 Main Keynote Hall</text>
          <text x="600" y="126" textAnchor="middle" fill="#7c3aed" fontSize="8" fontFamily="monospace">North Hall — Opening / Platform / Partner Keynotes</text>

          {/* Basecamp */}
          <rect x="40" y="336" width="740" height="210" rx="8" fill="#dcfce7" opacity="0.8" stroke="#16a34a" strokeWidth="1.5" />
          <text x="410" y="356" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="700" fontFamily="monospace">BASECAMP — Expo Floor (South Halls A–F)</text>

          <Zone label={"South Theater\n1 + 2"} sublabel="Hall A" short={['Basecamp South Theater 1', 'Basecamp South Theater 2']} x={52} y={364} w={140} h={70} c="#064e3b" sc="#10b981" />
          <Zone label={"Vertical Village\nTheater 1+2"} sublabel="Hall A/B" short={['Vertical Village Theater 1', 'Vertical Village Theater 2']} x={202} y={364} w={140} h={70} c="#065f46" sc="#34d399" />
          <Zone label={"Theater 3 + 4"} sublabel="Hall B/C" short={['Basecamp South Theater 3', 'Basecamp South Theater 4']} x={352} y={364} w={130} h={70} c="#064e3b" sc="#10b981" />
          <Zone label={"Builders Hub\nTheater"} sublabel="Hall D" short={['Builders Hub Theater']} x={492} y={364} w={130} h={70} c="#1e3a5f" sc="#38bdf8" />
          <Zone label={"AI Pop Up"} sublabel="Hall D" short={['AI Pop Up']} x={632} y={364} w={130} h={70} c="#4a1d96" sc="#a78bfa" />
          <Zone label={"Hands-on Labs\n1 / 2 / 3"} sublabel="Hall E" short={['Hands-on Labs 1', 'Hands-on Labs 2', 'Hands-on Labs 3']} x={52} y={444} w={200} h={60} c="#78350f" sc="#f59e0b" />
          <Zone label={"Partner Booths 190+"} sublabel="Hall F" short={[]} x={262} y={444} w={250} h={60} c="#1e3a5f" sc="#60a5fa" />
          <Zone label={"Industry Zone"} sublabel="South" short={[]} x={522} y={444} w={130} h={60} c="#7f1d1d" sc="#f87171" />

          <rect x="310" y="522" width="200" height="20" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="410" y="535" textAnchor="middle" fill="#1d4ed8" fontSize="9" fontFamily="monospace">🎟 Registration — Howard St Entrance</text>

          {[['#3b82f6', 'Breakout Rooms'], ['#16a34a', 'Basecamp'], ['#7c3aed', 'Keynotes'], ['#d97706', 'Hands-on Labs']].map(([c, l], i) => (
            <g key={i}>
              <rect x={50 + i * 180} y={508} width={10} height={10} rx="2" fill={c} />
              <text x={65 + i * 180} y={517} fill={c} fontSize="8" fontFamily="monospace">{l}</text>
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
          {filteredSessions.map(s => (
            <div key={s.code} style={{ ...S.card, borderLeft: `3px solid ${COLORS[s.track] || '#1e4a7f'}` }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={S.tag(s.track)}>{s.track}</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{s.day}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>⏰ {s.time}</div>
              {getAttendeesForSession(s.code).length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {getAttendeesForSession(s.code).map(n => <span key={n} style={S.pill}>{n}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('sf_unlocked') === '1');
  const [view, setView] = useState('schedule');
  const [myName, setMyName] = useState(() => localStorage.getItem('sf_my_name') || '');
  const [nameInput, setNameInput] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const { registrations, knownNames, loading, lastSync, register, unregister, addName, refresh, getAttendeesForSession, getSessionsForPerson } = useAttendees();

  const handleUnlock = () => { sessionStorage.setItem('sf_unlocked', '1'); setUnlocked(true); };
  const handleSetName = () => {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem('sf_my_name', n);
    setMyName(n);
    addName(n);
    setShowNameInput(false);
    setNameInput('');
  };
  const handleClearName = () => { localStorage.removeItem('sf_my_name'); setMyName(''); };

  if (!unlocked) return <GateScreen onUnlock={handleUnlock} />;

  return (
    <div style={S.app}>
      <div style={S.nav}>
        <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: 15 }}>❄️ Summit 26</span>
        {[
          { id: 'schedule', label: '📋 Schedule' },
          { id: 'myplan', label: '📅 My Plan' },
          { id: 'team', label: '👥 Team' },
          { id: 'map', label: '🗺 Map' },
        ].map(n => (
          <button key={n.id} style={S.navBtn(view === n.id)} onClick={() => setView(n.id)}>{n.label}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isSupabaseReady() && (
            <span title="Add Supabase env vars to enable team sync" style={{ fontSize: 10, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>Local mode</span>
          )}
          <button style={{ ...S.btn('default'), fontSize: 11, padding: '4px 10px' }} onClick={refresh} title="Sync with server">⟳</button>

          {myName ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', padding: '5px 12px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                👤 {myName} · {(registrations[myName]?.size || 0)} sessions
              </span>
              <button style={{ ...S.btn('default'), fontSize: 11, padding: '4px 8px' }} onClick={handleClearName} title="Switch user">✕</button>
            </div>
          ) : showNameInput ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...S.input, width: 170 }}
                placeholder="Your name…"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetName()}
                list="known-names"
                autoFocus
              />
              <datalist id="known-names">
                {knownNames.map(n => <option key={n} value={n} />)}
              </datalist>
              <button style={S.btn('primary')} onClick={handleSetName}>Set</button>
              <button style={{ ...S.btn('default'), padding: '4px 8px' }} onClick={() => setShowNameInput(false)}>✕</button>
            </div>
          ) : (
            <button style={S.btn('primary')} onClick={() => setShowNameInput(true)}>+ Set Name</button>
          )}
        </div>
      </div>

      <div style={S.content}>
        {loading
          ? <div style={{ color: '#475569', padding: 60, textAlign: 'center' }}>Loading…</div>
          : <>
            {view === 'schedule' && <ScheduleView myName={myName} onRegister={register} onUnregister={unregister} getAttendeesForSession={getAttendeesForSession} registrations={registrations} />}
            {view === 'myplan' && <MyPlanView name={myName} getSessionsForPerson={getSessionsForPerson} getAttendeesForSession={getAttendeesForSession} onRegister={register} onUnregister={unregister} />}
            {view === 'team' && <TeamView knownNames={knownNames} registrations={registrations} getSessionsForPerson={getSessionsForPerson} getAttendeesForSession={getAttendeesForSession} />}
            {view === 'map' && <RoomMap getAttendeesForSession={getAttendeesForSession} />}
          </>
        }
      </div>

      <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span>❄️ Snowflake Summit 26 · {ALL_SESSIONS.length} sessions · San Francisco, Jun 1–4 2026</span>
        <span style={{ color: isSupabaseReady() ? '#4ade80' : '#f59e0b' }}>
          {isSupabaseReady() ? '🟢 Live sync enabled' : '🟡 Local only — add Supabase for team sync'}
        </span>
      </div>
    </div>
  );
}
