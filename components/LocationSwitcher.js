'use client';
// components/LocationSwitcher.js — active centre selector (state → location)
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COOKIE = 'qms_loc';

export default function LocationSwitcher({ states = [], locations = [], current = null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function select(id) {
    if (id) document.cookie = `${COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    else document.cookie = `${COOKIE}=; path=/; max-age=0`;
    setOpen(false);
    router.refresh();
  }

  // Group locations by state name
  const byState = {};
  for (const loc of locations) {
    const key = loc.state?.name || 'Other';
    (byState[key] ||= []).push(loc);
  }

  return (
    <div className="loc-switch" ref={ref}>
      <button className="loc-switch-btn" onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 15 }}>📍</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
          <span className="loc-switch-state">{current?.state?.name || 'All States'}</span>
          <span>{current?.name || 'All Centres'}</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div className="loc-menu">
          <div
            className={`loc-menu-item ${!current ? 'active' : ''}`}
            onClick={() => select(null)}
          >
            <span>🌐 All Centres</span>
            {!current && <span>✓</span>}
          </div>
          {Object.entries(byState).map(([stateName, locs]) => (
            <div key={stateName}>
              <div className="loc-menu-group">{stateName}</div>
              {locs.map(loc => (
                <div
                  key={loc.id}
                  className={`loc-menu-item ${current?.id === loc.id ? 'active' : ''}`}
                  onClick={() => select(loc.id)}
                >
                  <span>{loc.name}</span>
                  {current?.id === loc.id && <span>✓</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
