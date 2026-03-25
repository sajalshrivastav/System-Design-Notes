import { useState, useEffect } from 'react';

export default function useNotes() {
  const [data, setData] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/notes.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        const flattened = json.weeks.flatMap(w => 
          w.days.map(d => ({ ...d, weekNum: w.week, weekLabel: w.label }))
        );
        setAllNotes(flattened);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load notes data:", e);
        setError(e);
        setLoading(false);
      });
  }, []);

  return { data, allNotes, loading, error };
}
