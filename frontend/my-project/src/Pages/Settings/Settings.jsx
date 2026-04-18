import { useState } from 'react'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './Settings.css'

/* ── Mock Data ───────────────────────────────────────── */
const mockSites = [
  { id: 'AL0452', label: 'Alger, Hydra Nord' },
  { id: 'OR0012', label: 'Oran, Centre-Ville' }
];

const mockEngineers = [
  { 
    id: 1, 
    initials: 'SM', 
    name: 'Samy Meziane', 
    email: 's.meziane@djezzy.dz', 
    role: 'RF Engineer', 
    status: 'Actif', 
    color: 'blue' 
  },
  { 
    id: 2, 
    initials: 'LB', 
    name: 'Leila Belkaid', 
    email: 'l.belkaid@djezzy.dz', 
    role: 'Site Manager', 
    status: 'Actif', 
    color: 'red' 
  },
  { 
    id: 3, 
    initials: 'RA', 
    name: 'Reda Amrani', 
    email: 'r.amrani@djezzy.dz', 
    role: 'Technician', 
    status: 'Inactif', 
    color: 'grey' 
  }
];

export default function Settings() {
  const [siteCode, setSiteCode] = useState('');
  const [siteLoc, setSiteLoc] = useState('');

  return (
    <div className="st-layout">
      <Sidebar />

      <div className="st-main">
        {/* Topbar */}
        <header style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', background: '#fff', borderBottom: '1px solid #edf2f7' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <IconBell />
            <IconUserCircle />
          </div>
        </header>

        <main className="st-content">
          <header className="st-header">
            <h1>PARAMÈTRES</h1>
            <p>Gérez la configuration de votre plateforme et les accès réseau.</p>
          </header>

          {/* Gestion des Sites */}
          <section className="st-card">
            <div className="st-section-head">
              <div className="st-section-title">
                <h2>Gestion des Sites</h2>
                <p>Répertoire des stations de base actives.</p>
              </div>
              <button className="st-btn-pink">+ Ajouter un Nouveau Site</button>
            </div>

            <div className="st-sites-grid">
              {mockSites.map(site => (
                <div key={site.id} className="st-site-card">
                  <div className="st-site-icon"><IconTower /></div>
                  <div className="st-site-info">
                    <b>{site.id}</b>
                    <span>{site.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="st-new-site-box">
              <span className="st-box-label">NOUVEAU SITE</span>
              <div className="st-box-inputs">
                <input 
                  className="st-input-glass" 
                  placeholder="Code Site (ex: AN2301)" 
                  value={siteCode}
                  onChange={e => setSiteCode(e.target.value)}
                />
                <input 
                  className="st-input-glass" 
                  placeholder="Localisation" 
                  value={siteLoc}
                  onChange={e => setSiteLoc(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Gestion des Ingénieurs */}
          <section className="st-card">
            <div className="st-section-head">
              <div className="st-section-title">
                <h2>Gestion des Ingénieurs</h2>
                <p>Équipe technique de terrain certifiée.</p>
              </div>
              <button className="st-btn-black">
                <IconUserPlus />
                Ajouter un Ingénieur
              </button>
            </div>

            <table className="st-eng-table">
              <thead>
                <tr>
                  <th>INGÉNIEUR</th>
                  <th>RÔLE</th>
                  <th>STATUT</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {mockEngineers.map(eng => (
                  <tr key={eng.id}>
                    <td>
                      <div className="st-user-cell">
                        <div className={`st-avatar st-avatar--${eng.color}`}>{eng.initials}</div>
                        <div className="st-user-info">
                          <b>{eng.name}</b>
                          <span>{eng.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="st-role-badge">{eng.role}</span>
                    </td>
                    <td>
                      <div className="st-status-badge">
                        <span className={`st-status-dot st-status-dot--${eng.status === 'Actif' ? 'active' : 'inactive'}`} />
                        {eng.status}
                      </div>
                    </td>
                    <td>
                      <button className="st-more-btn"><IconMoreVertical /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="st-new-site-box st-bottom-form">
              <span className="st-box-label">NOUVEAU PROFIL INGÉNIEUR</span>
              <div className="st-box-inputs">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#4a5568' }}>NOM COMPLET</label>
                  <input className="st-input-glass" placeholder="" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#4a5568' }}>EMAIL</label>
                  <input className="st-input-glass" placeholder="" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#4a5568' }}>RÔLE</label>
                  <select className="st-select-glass">
                    <option>RF Engineer</option>
                    <option>Site Manager</option>
                    <option>Technician</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconTower() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M4.5 7L2 22h20L19.5 7"/><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 12h6"/><path d="M10 16h4"/></svg>; }
function IconUserPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>; }
function IconMoreVertical() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>; }
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#718096' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconUserCircle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#718096' }}><circle cx="12" cy="12" r="10"/><path d="M8.21 13.89L7 23s5-1 10 0l-1.21-9.11"/><circle cx="12" cy="9" r="3"/></svg>; }
