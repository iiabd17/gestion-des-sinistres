import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './GestionDossiers.css'

/* ── Constants ───────────────────────────────────────── */
const WILAYAS = [
  "01 Adrar", "02 Chlef", "03 Laghouat", "04 Oum El Bouaghi", "05 Batna", "06 Béjaïa", "07 Biskra", 
  "08 Béchar", "09 Blida", "10 Bouira", "11 Tamanrasset", "12 Tébessa", "13 Tlemcen", "14 Tiaret", 
  "15 Tizi Ouzou", "16 Alger", "17 Djelfa", "18 Jijel", "19 Sétif", "20 Saïda", "21 Skikda", 
  "22 Sidi Bel Abbès", "23 Annaba", "24 Guelma", "25 Constantine", "26 Médéa", "27 Mostaganem", 
  "28 M'Sila", "29 Mascara", "30 Ouargla", "31 Oran", "32 El Bayadh", "33 Illizi", 
  "34 Bordj Bou Arreridj", "35 Boumerdès", "36 El Tarf", "37 Tindouf", "38 Tissemsilt", "39 El Oued", 
  "40 Khenchela", "41 Souk Ahras", "42 Tipaza", "43 Mila", "44 Aïn Defla", "45 Naâma", 
  "46 Aïn Témouchent", "47 Ghardaïa", "48 Relizane", "49 Timimoun", "50 Bordj Badji Mokhtar", 
  "51 Ouled Djellal", "52 Béni Abbès", "53 In Salah", "54 In Guezzam", "55 Touggourt", "56 Djanet", 
  "57 El M'Ghair", "58 El Meniaa", "59 Aflou", "60 Barika", "61 Ksar Chellala", "62 Messaad", 
  "63 Aïn Oussera", "64 Boussaâda", "65 El Abiodh Sidi Cheikh", "66 El Kantara", "67 Bir El Ater", 
  "68 Ksar El Boukhari", "69 El Aricha"
];

const STATUS_OPTIONS = [
  "Tous", 
  "EN COURS D'EXAMEN", 
  "TRANSMIS A L'ASSUREUR", 
  "CLOTURE", 
  "ARCHIVE"
];

const TYPE_OPTIONS = [
  "Tous types",
  "Vol de cables", 
  "Incendie local", 
  "Dommage Électrique", 
  "Tentative d'intrusion"
];

const mockDossiers = [
  {
    id: '#CLM-2024-001',
    date: '12 Mars 2024',
    site: 'Bordj El Kiffan (D-23)',
    type: 'Vol de cables',
    statut: "EN COURS D'EXAMEN",
    cout: '450,000.00',
    typeIcon: IconFile
  },
  {
    id: '#CLM-2024-002',
    date: '08 Mars 2024',
    site: 'Oran - Bir El Djir',
    type: 'Incendie local',
    statut: "TRANSMIS A L'ASSUREUR",
    cout: '1,200,000.00',
    typeIcon: IconShield
  },
  {
    id: '#CLM-2024-003',
    date: '01 Mars 2024',
    site: 'Sétif - Zone Industrielle',
    type: 'Dommage Électrique',
    statut: "CLOTURE",
    cout: '85,000.00',
    typeIcon: IconBolt
  },
  {
    id: '#CLM-2024-004',
    date: '25 Février 2024',
    site: 'Alger - Hydra Hub',
    type: "Tentative d'intrusion",
    statut: "ARCHIVE",
    cout: '0.00',
    typeIcon: IconLock
  }
];

export default function GestionDossiers() {
  const navigate = useNavigate();
  const [filterSite, setFilterSite] = useState('Tous les sites');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterType, setFilterType] = useState('Tous types');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="gd-layout">
      <Sidebar />

      <div className="gd-main">
        {/* Topbar */}
        <header className="gd-topbar">
          <div className="gd-topbar-actions">
            <button className="gd-icon-btn"><IconBell /><span className="gd-notif-dot" /></button>
            <button className="gd-icon-btn"><IconUser /></button>
          </div>
        </header>

        <main className="gd-content">
          {/* Header */}
          <div className="gd-header">
            <div className="gd-title-group">
              <h1>Gestion des Dossiers</h1>
              <p>Visualisez et gérez l'ensemble des sinistres en cours de traitement.</p>
            </div>
            <div className="gd-header-actions">
              <button className="gd-btn-white">
                <IconDownload />
                Exporter CSV
              </button>
              <button className="gd-btn-red" onClick={() => navigate('/declarations/new')}>
                <IconPlus />
                Nouveau Sinistre
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="gd-filters-card">
            <div className="gd-filter-item">
              <label>SITE / WILAYA</label>
              <select className="gd-select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                <option>Tous les sites</option>
                {WILAYAS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="gd-filter-item">
              <label>STATUT</label>
              <select className="gd-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="gd-filter-item">
              <label>TYPE</label>
              <select className="gd-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="gd-filter-item" style={{ flex: 2 }}>
              <label>PÉRIODE</label>
              <div className="gd-date-range">
                <input type="date" className="gd-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="mm/dd/yyyy" />
                <span style={{ color: '#cbd5e0' }}>→</span>
                <input type="date" className="gd-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="mm/dd/yyyy" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="gd-table-card">
            <table className="gd-table">
              <thead>
                <tr>
                  <th>ID DOSSIER</th>
                  <th>DATE SINISTRE</th>
                  <th>SITE CONCERNÉ</th>
                  <th>TYPE DE SINISTRE</th>
                  <th>STATUT</th>
                  <th>COÛT ESTIMÉ<br/><span style={{ fontSize: '9px', color: '#a0aec0' }}>(DZD)</span></th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {mockDossiers.map(d => (
                  <tr key={d.id}>
                    <td className="gd-id-cell">{d.id.replace(/(.{4})-(.{4})-(.{3})/, '$1-\n$2-\n$3').split('\n').map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}</td>
                    <td className="gd-date-cell">
                      <span style={{ display: 'block', color: '#4a5568' }}>{d.date.split(' ')[0]} {d.date.split(' ')[1]}</span>
                      <span style={{ display: 'block', color: '#a0aec0', fontSize: '12px' }}>{d.date.split(' ')[2]}</span>
                    </td>
                    <td>
                      <div className="gd-site-cell">
                        <IconPin />
                        <span className="gd-site-name">{d.site}</span>
                      </div>
                    </td>
                    <td>
                      <div className="gd-type-badge">
                        <d.typeIcon />
                        {d.type}
                      </div>
                    </td>
                    <td>
                      <span className={`gd-status-badge ${getStatusClass(d.statut)}`}>
                        <span className="dot" />
                        {d.statut}
                      </span>
                    </td>
                    <td className="gd-cost">{d.cout}</td>
                    <td>
                      <button className="gd-action-view" onClick={() => navigate('/gestion/' + d.id.replace('#', ''))}>
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="gd-pagination">
              <span className="gd-page-info">Affichage de 1-10 sur 142 dossiers</span>
              <div className="gd-pages">
                <button className="gd-page-btn" disabled><IconChevronLeft /></button>
                <button className="gd-page-btn active">1</button>
                <button className="gd-page-btn">2</button>
                <button className="gd-page-btn">3</button>
                <span style={{ color: '#cbd5e0', padding: '0 4px' }}>...</span>
                <button className="gd-page-btn">15</button>
                <button className="gd-page-btn"><IconChevronRight /></button>
              </div>
            </div>
          </div>
        </main>

        {/* Floating Action Button */}
        <button className="gd-fab" onClick={() => navigate('/declarations/new')}>
          <IconPlusLarge />
        </button>
      </div>
    </div>
  );
}

function getStatusClass(statut) {
  if (statut.includes("EXAMEN")) return 'status--en-cours';
  if (statut.includes("ASSUREUR")) return 'status--transmis';
  if (statut.includes("CLOTURE")) return 'status--cloture';
  if (statut.includes("ARCHIVE")) return 'status--archive';
  return '';
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconPlusLarge() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconDownload() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function IconEye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }

// Type Icons
function IconFile() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function IconShield() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconBolt() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function IconLock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
