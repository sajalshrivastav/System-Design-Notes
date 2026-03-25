import { useState, useEffect, useCallback } from 'react';

export default function useNotes() {
  const [allTracks, setAllTracks] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    fetch('/notes.json')
      .then(res => res.json())
      .then(json => {
        // Support legacy shape { weeks: [...] } and new shape { "system-design": {...} }
        setAllTracks(
          json.weeks
            ? { 'system-design': { label: 'System Design', available: true, weeks: json.weeks } }
            : json
        );
        setLoading(false);
      })
      .catch(e => {
        console.error('Failed to load notes.json:', e);
        setError(e);
        setLoading(false);
      });
  }, []); // runs exactly once

  // Stable references — won't cause downstream useEffect re-fires
  const getWeeks = useCallback(
    (trackId) => allTracks[trackId]?.weeks ?? [],
    [allTracks]
  );

  const getAllNotes = useCallback(
    (trackId) =>
      (allTracks[trackId]?.weeks ?? []).flatMap(w =>
        w.days.map(d => ({ ...d, weekNum: w.week, weekLabel: w.label }))
      ),
    [allTracks]
  );

  return { allTracks, getWeeks, getAllNotes, loading, error };
}
