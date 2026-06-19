// app/master/page.js — Master Data module (SOP "Master" sheet)
// Location master · Department master · ID/Instrument master · Lab master
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AddState, AddCentre, AddDepartment, AddInstrument } from './MasterForms';

const TABS = [
  { key: 'states', label: 'States' },
  { key: 'centres', label: 'Centres' },
  { key: 'departments', label: 'Departments' },
  { key: 'instruments', label: 'Instruments' },
];

export default async function MasterPage({ searchParams }) {
  const sp = await searchParams;
  const tab = sp?.tab || 'states';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Master Data</div>
          <div className="page-subtitle">States · Centres · Departments · Instruments</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            className={`tab${tab === t.key ? ' active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'states' && <StatesTab />}
      {tab === 'centres' && <CentresTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'instruments' && <InstrumentsTab />}
    </div>
  );
}

// ── States ─────────────────────────────────────────────────────────────────
async function StatesTab() {
  const states = await prisma.state.findMany({
    include: { _count: { select: { locations: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="card">
      <div className="card-title">
        <span>State Master</span>
        <AddState />
      </div>
      {states.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗺️</div>
          No states defined yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Code</th><th># Centres</th></tr>
            </thead>
            <tbody>
              {states.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td className="mono text-secondary">{s.code || '—'}</td>
                  <td className="mono">{s._count.locations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Centres (Locations) ──────────────────────────────────────────────────────
async function CentresTab() {
  const [centres, states] = await Promise.all([
    prisma.location.findMany({ include: { state: true }, orderBy: { name: 'asc' } }),
    prisma.state.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="card">
      <div className="card-title">
        <span>Centre Master</span>
        <AddCentre states={states} />
      </div>
      {centres.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏥</div>
          No centres defined yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>State</th><th>Address</th></tr>
            </thead>
            <tbody>
              {centres.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td className="mono text-secondary">{c.code || '—'}</td>
                  <td className="text-secondary">{c.state?.name || '—'}</td>
                  <td className="text-secondary" style={{ fontSize: 12 }}>{c.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Departments ──────────────────────────────────────────────────────────────
async function DepartmentsTab() {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="card">
      <div className="card-title">
        <span>Department Master</span>
        <AddDepartment />
      </div>
      {departments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧫</div>
          No departments defined yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th></tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Instruments ──────────────────────────────────────────────────────────────
async function InstrumentsTab() {
  const [instruments, locations] = await Promise.all([
    prisma.instrument.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="card">
      <div className="card-title">
        <span>Instrument Master</span>
        <AddInstrument locations={locations} />
      </div>
      {instruments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          No instruments defined yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Centre</th></tr>
            </thead>
            <tbody>
              {instruments.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.name}</td>
                  <td className="text-secondary">{i.location?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
