
import { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Dashboard.css'

/* ── Statut badge mapping ─────────────────────────────── */
const statutClass = {
  'ARCHIVE':               'badge-archive',
  'OUVERT':                'badge-examen',
  'EN_EXPERTISE':          'badge-examen',
  'REJET_POUR_COMPLEMENT': 'badge-examen',
  'TRANSMIS_ASSUREUR':     'badge-transmis',
  'EN_VALIDATION_LEGAL':   'badge-transmis',
  'EN_VALIDATION_HSE':     'badge-transmis',
  'VALIDE':                'badge-cloture',
  'REJETE':                'badge-archive',
  'CLOTURE':               'badge-cloture',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [sinistres, setSinistres] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [enAttenteCount, setEnAttenteCount] = useState(0)
  const [loadingSinistres, setLoadingSinistres] = useState(true)

  useEffect(() => {
    // Charger les 5 sinistres les plus récents
    api.get('/sinistres/?page_size=5')
      .then(res => {
        const data = res.data
        // DRF paginated response: { count, next, previous, results }
        if (data.results) {
          setSinistres(data.results)
          setTotalCount(data.count)
        } else {
          // Fallback si pas de pagination
          setSinistres(Array.isArray(data) ? data.slice(0, 5) : [])
          setTotalCount(Array.isArray(data) ? data.length : 0)
        }
      })
      .catch(err => {
        console.error('Erreur chargement sinistres:', err)
      })
      .finally(() => setLoadingSinistres(false))

    // Compter les sinistres en attente (OUVERT + EN_EXPERTISE)
    api.get('/sinistres/?statut=OUVERT&page_size=1')
      .then(res => {
        const ouvertCount = res.data.count || 0
        api.get('/sinistres/?statut=EN_EXPERTISE&page_size=1')
          .then(res2 => {
            const expertiseCount = res2.data.count || 0
            setEnAttenteCount(ouvertCount + expertiseCount)
          })
      })
      .catch(() => {})
  }, [])

  const userName = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Utilisateur'

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
            <span style={{ fontSize: '0.85rem', color: '#4A5568', fontWeight: 500 }}>
              {userName}
            </span>
          </div>
        </header>

        {/* page content */}
        <main className="db-content">

          {/* greeting */}
          <div className="db-greeting">
            <h1 className="db-greeting-name">Bonjour, {userName}</h1>
            <p className="db-greeting-sub">
              {loadingSinistres
                ? 'Chargement du tableau de bord...'
                : `Le tableau de bord est à jour. ${enAttenteCount} dossier(s) en attente.`
              }
            </p>
          </div>

          {/* stat cards */}
          <div className="db-stats">
            {/* card 1 */}
            <div className="db-stat-card">
              <span className="db-stat-label">TOTAL DES SINISTRES</span>
              <span className="db-stat-value">{totalCount}</span>
            </div>

            {/* card 2 */}
            <div className="db-stat-card">
              <span className="db-stat-label">EN ATTENTE DE TRAITEMENT</span>
              <span className="db-stat-value db-stat-value--sm">{enAttenteCount}</span>
            </div>
          </div>

          {/* bottom split: table + info */}
          <div className="db-bottom">

            {/* sinistres table */}
            <section className="db-table-section">
              <div className="db-section-header">
                <h2 className="db-section-title">Sinistres Récents</h2>
                <Link to="/gestion" className="db-voir-tout">Voir toute l'activité →</Link>
              </div>

              {loadingSinistres ? (
                <p style={{ padding: '1.5rem', color: '#94A3B8', textAlign: 'center' }}>
                  Chargement...
                </p>
              ) : sinistres.length === 0 ? (
                <p style={{ padding: '1.5rem', color: '#94A3B8', textAlign: 'center' }}>
                  Aucun sinistre enregistré.
                </p>
              ) : (
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
                      <tr key={s.idSinistre} style={{ cursor: 'pointer' }} onClick={() => navigate(`/gestion/${s.idSinistre}`)}>
                        <td className="db-id">{s.idSinistre}</td>
                        <td>{s.typeSinistre_label || s.nature_label}</td>
                        <td className="db-date">
                          {new Date(s.dateSurvenance).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td>
                          <span className={`db-badge ${statutClass[s.statut] || 'badge-examen'}`}>
                            {s.statut_label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Résumé rapide */}
            <section className="db-flux">
              <h2 className="db-section-title">Informations</h2>
              <ul className="db-flux-list">
                <li className="db-flux-item">
                  <span className="db-flux-dot db-flux-dot--blue" />
                  <div className="db-flux-body">
                    <span className="db-flux-time">Rôle</span>
                    <p className="db-flux-title">{user?.role || 'Non défini'}</p>
                    <p className="db-flux-desc">Votre niveau d'accès dans le système.</p>
                  </div>
                </li>
                <li className="db-flux-item">
                  <span className="db-flux-dot db-flux-dot--red" />
                  <div className="db-flux-body">
                    <span className="db-flux-time">Dossiers</span>
                    <p className="db-flux-title">{totalCount} sinistre(s) au total</p>
                    <p className="db-flux-desc">dont {enAttenteCount} en attente de traitement.</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </main>
      </div>

      {/* FAB */}
      {['EQUIPE_TERRAIN', 'ASSURANCE', 'ADMIN'].includes(user?.role) && (
        <button className="db-fab" aria-label="Nouvelle déclaration" onClick={() => navigate('/declarations/new')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/* ── Icon components ─────────────────────────────────── */
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
