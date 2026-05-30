import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady } from './supabase';

const LOCAL_KEY = 'sf_summit_registrations';
const NAMES_KEY = 'sf_summit_names';

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch { return {}; }
}
function saveLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}
function loadNames() {
  try {
    return JSON.parse(localStorage.getItem(NAMES_KEY) || '[]');
  } catch { return []; }
}
function saveNames(names) {
  localStorage.setItem(NAMES_KEY, JSON.stringify(names));
}

export function useAttendees() {
  // registrations: { [name]: Set<sessionCode> }
  const [registrations, setRegistrations] = useState({});
  const [knownNames, setKnownNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseReady()) {
      const local = loadLocal();
      const rehydrated = {};
      for (const [name, codes] of Object.entries(local)) {
        rehydrated[name] = new Set(codes);
      }
      setRegistrations(rehydrated);
      setKnownNames(loadNames());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('name, session_code');
      if (error) throw error;

      const reg = {};
      for (const row of data) {
        if (!reg[row.name]) reg[row.name] = new Set();
        reg[row.name].add(row.session_code);
      }
      setRegistrations(reg);

      const { data: nameData } = await supabase.from('names').select('name');
      if (nameData) setKnownNames(nameData.map(r => r.name));

      setLastSync(new Date());
    } catch (e) {
      console.warn('Supabase error, falling back to local:', e);
      const local = loadLocal();
      const rehydrated = {};
      for (const [name, codes] of Object.entries(local)) {
        rehydrated[name] = new Set(codes);
      }
      setRegistrations(rehydrated);
      setKnownNames(loadNames());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    if (!isSupabaseReady()) return;
    const channel = supabase
      .channel('registrations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh]);

  const addName = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setKnownNames(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed].sort();
      saveNames(next);
      return next;
    });
    if (isSupabaseReady()) {
      await supabase.from('names').upsert({ name: trimmed }, { onConflict: 'name' });
    }
  }, []);

  const register = useCallback(async (name, sessionCode) => {
    const trimmed = name.trim();
    setRegistrations(prev => {
      const next = { ...prev };
      if (!next[trimmed]) next[trimmed] = new Set();
      next[trimmed] = new Set([...next[trimmed], sessionCode]);
      const serializable = {};
      for (const [k, v] of Object.entries(next)) serializable[k] = [...v];
      saveLocal(serializable);
      return next;
    });
    await addName(trimmed);
    if (isSupabaseReady()) {
      await supabase.from('registrations').upsert(
        { name: trimmed, session_code: sessionCode },
        { onConflict: 'name,session_code' }
      );
    }
  }, [addName]);

  const unregister = useCallback(async (name, sessionCode) => {
    const trimmed = name.trim();
    setRegistrations(prev => {
      const next = { ...prev };
      if (!next[trimmed]) return prev;
      next[trimmed] = new Set([...next[trimmed]].filter(c => c !== sessionCode));
      if (next[trimmed].size === 0) delete next[trimmed];
      const serializable = {};
      for (const [k, v] of Object.entries(next)) serializable[k] = [...v];
      saveLocal(serializable);
      return next;
    });
    if (isSupabaseReady()) {
      await supabase.from('registrations')
        .delete()
        .eq('name', trimmed)
        .eq('session_code', sessionCode);
    }
  }, []);

  const getAttendeesForSession = useCallback((sessionCode) => {
    return Object.entries(registrations)
      .filter(([, codes]) => codes.has(sessionCode))
      .map(([name]) => name)
      .sort();
  }, [registrations]);

  const getSessionsForPerson = useCallback((name) => {
    return registrations[name] ? [...registrations[name]] : [];
  }, [registrations]);

  return {
    registrations, knownNames, loading, lastSync,
    register, unregister, addName, refresh,
    getAttendeesForSession, getSessionsForPerson,
  };
}
