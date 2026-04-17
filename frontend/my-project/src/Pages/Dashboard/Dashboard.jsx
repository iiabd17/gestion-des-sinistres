
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './Dashboard.css'

/* ── static data ─────────────────────────────────────── */
const sinistres = [
  { id: '#CLM-92381', type: 'Panne d\'équipement',      date: '24 Oct 2023', statut: 'ARCHIVE' },
  { id: '#CLM-92384', type: 'Coupure Fibre Optique',   date: '24 Oct 2023', statut: 'EN COURS D\'EXAMEN' },
  { id: '#CLM-92385', type: 'Coupure Fibre Optique',   date: '23 Oct 2023', statut: 'CLOTURE' },
  { id: '#CLM-92389', type: 'Surtension Électrique',   date: '23 Oct 2023', statut: 'TRANSMIS A L\'ASSUREUR' },
  { id: '#CLM-92392', type: 'Vandalisme de Site',       date: '22 Oct 2023', statut: 'EN COURS D\'EXAMEN' },
]

const flux = [
  {
    dot: 'red',
    time: '09:42',
    title: 'Nouveau sinistre déclaré par Ops Terrain Alger',
    desc: 'Le dossier #CLM-92395 concerne 3 stations de base.',
  },
  {
    dot: 'blue',
    time: '08:15',
    title: 'Indemnisation traitée',
    desc: 'La finance a approuvé le paiement pour le #CLM-92381.',
  },
  {
    dot: 'gray',
    time: 'Hier',
    title: 'Rapport d\'audit mensuel généré',
    desc: 'Disponible pour examen dans l\'onglet Gestion.',
  },
  {
    dot: 'red',
    time: '23 Oct',
    title: 'Alerte de Sécurité: Entrées multiples',
    desc: 'Le site 402B a détecté un accès non autorisé.',
  },
]

const statutClass = {
  'ARCHIVE':                'badge-archive',
  'EN COURS D\'EXAMEN':    'badge-examen',
  'CLOTURE':               'badge-cloture',
  'TRANSMIS A L\'ASSUREUR':'badge-transmis',
}


export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="db-layout">

      <Sidebar />

      {/* ── Main area ──────────────────────────────── */}
      <div className="db-main">

        {/* top bar */}
        <header className="db-topbar">
          <div className="db-topbar-actions">
            <button className="db-icon-btn" aria-label="Notifications">
              <IconBell />
              <span className="db-notif-dot" />
            </button>
            <button className="db-icon-btn db-avatar" aria-label="Profil">
              <IconUser />
            </button>
          </div>
        </header>

        {/* page content */}
        <main className="db-content">

          {/* greeting */}
          <div className="db-greeting">
            <h1 className="db-greeting-name">Bonjour, Hachemi Redouane</h1>
            <p className="db-greeting-sub">
              Le tableau de bord des sinistres est à jour. 12 tâches requièrent votre attention.
            </p>
          </div>

          {/* stat cards */}
          <div className="db-stats">
            {/* card 1 */}
            <div className="db-stat-card">
              <span className="db-stat-label">TOTAL DES SINISTRES</span>
              <span className="db-stat-value">+9000</span>
              <span className="db-stat-trend db-stat-trend--up">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="1 11 5 7 9 9 15 3" />
                </svg>
                +12.5% par rapport au mois dernier
              </span>
            </div>

            {/* card 2 */}
            <div className="db-stat-card">
              <span className="db-stat-label">EN ATTENTE DE VALIDATION</span>
              <span className="db-stat-value db-stat-value--sm">24</span>
              <div className="db-progress-row">
                <span className="db-progress-label">Vitesse de traitement</span>
                <span className="db-progress-pct">84%</span>
              </div>
              <div className="db-progress-track">
                <div className="db-progress-bar" style={{ width: '84%' }} />
              </div>
            </div>
          </div>

          {/* bottom split: table + flux */}
          <div className="db-bottom">

            {/* sinistres table */}
            <section className="db-table-section">
              <div className="db-section-header">
                <h2 className="db-section-title">Sinistres Récents</h2>
                <a href="#" className="db-voir-tout">Voir toute l'activité →</a>
              </div>
              <table className="db-table">
                <thead>
                  <tr>
                    <th>ID DOSSIER</th>
                    <th>TYPE DE SINISTRE</th>
                    <th>DATE</th>
                    <th>STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {sinistres.map((s) => (
                    <tr key={s.id}>
                      <td className="db-id">{s.id}</td>
                      <td>{s.type}</td>
                      <td className="db-date">{s.date}</td>
                      <td>
                        <span className={`db-badge ${statutClass[s.statut]}`}>
                          {s.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* flux system */}
            <section className="db-flux">
              <h2 className="db-section-title">Flux du Système</h2>
              <ul className="db-flux-list">
                {flux.map((item, i) => (
                  <li key={i} className="db-flux-item">
                    <span className={`db-flux-dot db-flux-dot--${item.dot}`} />
                    <div className="db-flux-body">
                      <span className="db-flux-time">{item.time}</span>
                      <p className="db-flux-title">{item.title}</p>
                      <p className="db-flux-desc">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>

      {/* FAB */}
      <button className="db-fab" aria-label="Nouvelle déclaration" onClick={() => navigate('/declarations/new')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}

/* ── Icon components ─────────────────────────────────── */
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
