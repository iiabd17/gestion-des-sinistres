import { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Declarations.css'

/* ── Statut → couleur ────────────────────────────────── */
const statutBadge = {
  'OUVERT':                { bg: '#fef3c7', color: '#d97706', label: 'OUVERT' },
  'EN_EXPERTISE':          { bg: '#dbeafe', color: '#1d4ed8', label: 'EN EXPERTISE' },
  'REJET_POUR_COMPLEMENT': { bg: '#fee2e2', color: '#b91c1c', label: 'À COMPLÉTER' },
  'TRANSMIS_ASSUREUR':     { bg: '#d1fae5', color: '#065f46', label: 'TRANSMIS' },
  'EN_VALIDATION_LEGAL':   { bg: '#ede9fe', color: '#7c3aed', label: 'VALIDATION LÉGAL' },
  'EN_VALIDATION_HSE':     { bg: '#fce7f3', color: '#be185d', label: 'VALIDATION HSE' },
  'VALIDE':                { bg: '#d1fae5', color: '#065f46', label: 'VALIDÉ' },
  'REJETE':                { bg: '#fee2e2', color: '#b91c1c', label: 'REJETÉ' },
  'CLOTURE':               { bg: '#e2e8f0', color: '#475569', label: 'CLÔTURÉ' },
  'ARCHIVE':               { bg: '#f1f5f9', color: '#64748b', label: 'ARCHIVÉ' },
}

export default function Declarations() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useContext(AuthContext)
  const role = user?.role || ''

  const [tab, setTab] = useState(location.state?.tab || 'completer')

  // Tab "À Compléter" data (sinistres OUVERT ou REJET_POUR_COMPLEMENT)
  const [dossiersCompleter, setDossiersCompleter] = useState([])
  const [loadingCompleter, setLoadingCompleter] = useState(true)

  // Tab "À Valider" data (sinistres EN_EXPERTISE)
  const [dossiersValider, setDossiersValider] = useState([])
  const [loadingValider, setLoadingValider] = useState(true)

  // Filters
  const [filterNature, setFilterNature] = useState('Tous')
  const [filterDate, setFilterDate] = useState('')
  const [natures, setNatures] = useState([])

  // Charger les constantes
  useEffect(() => {
    api.get('/constants/')
      .then(res => {
        setNatures(res.data.natures || [])
      })
      .catch(() => {})
  }, [])

  // Charger les dossiers à compléter
  useEffect(() => {
    setLoadingCompleter(true)
    // Sinistres ouverts OU rejetés pour complément
    Promise.all([
      api.get('/sinistres/?statut=OUVERT&page_size=50').catch(() => ({ data: { results: [] } })),
      api.get('/sinistres/?statut=REJET_POUR_COMPLEMENT&page_size=50').catch(() => ({ data: { results: [] } })),
    ]).then(([openRes, rejectRes]) => {
      const open = openRes.data?.results || openRes.data || []
      const rejected = rejectRes.data?.results || rejectRes.data || []
      setDossiersCompleter([...open, ...rejected])
    }).finally(() => setLoadingCompleter(false))
  }, [])

  // Charger les dossiers à valider
  useEffect(() => {
    setLoadingValider(true)
    api.get('/sinistres/?statut=EN_EXPERTISE&page_size=50')
      .then(res => {
        setDossiersValider(res.data?.results || res.data || [])
      })
      .catch(() => {})
      .finally(() => setLoadingValider(false))
  }, [])

  // Filtrage côté frontend
  const filteredCompleter = dossiersCompleter.filter(d => {
    if (filterNature !== 'Tous' && d.nature !== filterNature) return false
    if (filterDate && d.dateSurvenance !== filterDate) return false
    return true
  })

  return (
    <div className="dcl-layout">
      <Sidebar />

      <div className="dcl-main">
        {/* Top bar */}
        <header className="dcl-topbar">
          <div className="dcl-topbar-actions">
            <button className="dcl-icon-btn" aria-label="Notifications">
              <IconBell />
              <span className="dcl-notif-dot" />
            </button>
            <button className="dcl-icon-btn" aria-label="Profil">
              <IconUser />
            </button>
          </div>
        </header>

        <main className="dcl-content">
          {/* ── Primary tabs ────────────────────────── */}
          <div className="dcl-primary-tabs">
            {/* Tab "À Compléter" visible par Ingénieur, Assurance, Admin */}
            {['INGENIEUR', 'ASSURANCE', 'ADMIN'].includes(role) && (
              <button
                className={`dcl-ptab ${tab === 'completer' ? 'dcl-ptab--active' : ''}`}
                onClick={() => setTab('completer')}
              >
                Déclarations à Compléter ({dossiersCompleter.length})
              </button>
            )}
            {/* Tab "À Valider" visible par Assurance, Admin */}
            {['ASSURANCE', 'ADMIN'].includes(role) && (
              <button
                className={`dcl-ptab ${tab === 'valider' ? 'dcl-ptab--active' : ''}`}
                onClick={() => setTab('valider')}
              >
                Déclarations à Valider ({dossiersValider.length})
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════
              TAB 1 – À COMPLETER
          ══════════════════════════════════════════ */}
          {tab === 'completer' && (
            <div className="dcl-body" style={{ flexDirection: 'row' }}>
              <div className="dcl-table-col" style={{ flex: 1 }}>
                <div className="dcl-section-head" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div>
                      <h1 className="dcl-title">Déclarations à Compléter</h1>
                      <p className="dcl-subtitle">
                        {dossiersCompleter.length} dossier(s) nécessitent une expertise technique
                      </p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="dcl-filter-grid">
                    <div className="dcl-filter-field">
                      <label>DATE</label>
                      <input
                        type="date"
                        className="dcl-filter-input"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                    </div>

                    <div className="dcl-filter-field">
                      <label>NATURE</label>
                      <select
                        className="dcl-filter-select"
                        value={filterNature}
                        onChange={(e) => setFilterNature(e.target.value)}
                      >
                        <option value="Tous">Tous</option>
                        {natures.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
                      </select>
                    </div>

                    <button
                      className="dcl-reset-btn"
                      onClick={() => {
                        setFilterDate('');
                        setFilterNature('Tous');
                      }}
                      title="Réinitialiser les filtres"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                  </div>
                </div>

                {loadingCompleter ? (
                  <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Chargement...</p>
                ) : filteredCompleter.length === 0 ? (
                  <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Aucun dossier à compléter.</p>
                ) : (
                  <table className="dcl-table">
                    <thead>
                      <tr>
                        <th>ID DOSSIER</th>
                        <th>SITE</th>
                        <th>DATE</th>
                        <th>NATURE</th>
                        <th>STATUT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompleter.map((d) => {
                        const badge = statutBadge[d.statut] || { bg: '#f0f0f0', color: '#555' }
                        return (
                          <tr key={d.idSinistre}>
                            <td className="dcl-id">{d.idSinistre}</td>
                            <td>
                              <span className="dcl-site">{d.codeSite}</span>
                              <span className="dcl-ville">{d.wilaya}</span>
                            </td>
                            <td className="dcl-date">
                              {new Date(d.dateSurvenance).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td>
                              <span className="dcl-nature-badge"
                                style={{ background: '#fce7f3', color: '#be185d' }}>
                                {d.nature_label}
                              </span>
                            </td>
                            <td>
                              <span className="dcl-badge-attente"
                                style={{ background: badge.bg, color: badge.color }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: badge.color, display: 'inline-block', marginRight: 4 }} />
                                {badge.label}
                              </span>
                            </td>
                            <td>
                              <button
                                className="dcl-complete-btn"
                                style={{ background: '#fce7f3', color: '#be185d', boxShadow: 'none' }}
                                onClick={() => navigate(`/declarations/completer/${d.idSinistre}`)}
                              >
                                Compléter
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB 2 – À VALIDER
          ══════════════════════════════════════════ */}
          {tab === 'valider' && (
            <div className="dcl-val-container">
              <div className="dcl-val-head">
                <h1 className="dcl-title">Déclarations à Valider</h1>
                <p className="dcl-subtitle">Dossiers expertisés en attente de décision</p>
              </div>

              {/* Stat strip */}
              <div className="dcl-stats-strip">
                <div className="dcl-stat-item">
                  <span className="dcl-stat-label">TOTAL EN ATTENTE</span>
                  <span className="dcl-stat-val">{dossiersValider.length}</span>
                </div>
                <div className="dcl-stat-divider" />
                <div className="dcl-stat-item">
                  <span className="dcl-stat-label">MONTANT TOTAL ESTIMÉ</span>
                  <span className="dcl-stat-val">
                    {dossiersValider.reduce((sum, d) => sum + (parseFloat(d.montantEstime) || 0), 0).toLocaleString('fr-FR')}
                    <small> DZD</small>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="dcl-val-table-wrap">
                {loadingValider ? (
                  <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Chargement...</p>
                ) : dossiersValider.length === 0 ? (
                  <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Aucun dossier en attente de validation.</p>
                ) : (
                  <table className="dcl-table">
                    <thead>
                      <tr>
                        <th>ID DOSSIER</th>
                        <th>SITE</th>
                        <th>DATE</th>
                        <th>NATURE</th>
                        <th>MONTANT ESTIMÉ</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossiersValider.map(d => (
                        <tr key={d.idSinistre}>
                          <td className="dcl-id">{d.idSinistre}</td>
                          <td>
                            <span className="dcl-site">{d.codeSite}</span>
                            <span className="dcl-ville">{d.wilaya}</span>
                          </td>
                          <td className="dcl-date">
                            {new Date(d.dateSurvenance).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td>
                            <span className="dcl-nature-badge"
                              style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                              {d.nature_label}
                            </span>
                          </td>
                          <td className="dcl-montant">
                            <span className="dcl-montant-val">
                              {parseFloat(d.montantEstime || 0).toLocaleString('fr-FR')}
                            </span>
                            <span className="dcl-montant-devise">DZD</span>
                          </td>
                          <td>
                            <button
                              className="dcl-view-btn"
                              aria-label="Voir le dossier"
                              onClick={() => navigate(`/declarations/valider/${d.idSinistre}`)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
