import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './GestionDossiers.css'

export default function GestionDossiers() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [filterStatut, setFilterStatut] = useState('')
  const [filterNature, setFilterNature] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Constants from backend
  const [natures, setNatures] = useState([])
  const [statuts, setStatuts] = useState([])

  // Charger les constantes
  useEffect(() => {
    api.get('/constants/')
      .then(res => {
        setNatures(res.data.natures || [])
        setStatuts(res.data.statuts || [])
      })
      .catch(() => {})
  }, [])

  // Charger les dossiers
  useEffect(() => {
    setLoading(true)
    let url = `/sinistres/?page=${currentPage}&page_size=10`
    if (filterStatut) url += `&statut=${filterStatut}`
    if (filterNature) url += `&nature=${filterNature}`

    api.get(url)
      .then(res => {
        const data = res.data
        if (data.results) {
          setDossiers(data.results)
          setTotalCount(data.count)
        } else {
          setDossiers(Array.isArray(data) ? data : [])
          setTotalCount(Array.isArray(data) ? data.length : 0)
        }
      })
      .catch(err => {
        console.error('Erreur chargement dossiers:', err)
      })
      .finally(() => setLoading(false))
  }, [currentPage, filterStatut, filterNature])

  const totalPages = Math.ceil(totalCount / 10)

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
              {['EQUIPE_TERRAIN', 'ASSURANCE', 'ADMIN'].includes(user?.role) && (
                <button className="gd-btn-red" onClick={() => navigate('/declarations/new')}>
                  <IconPlus />
                  Nouveau Sinistre
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="gd-filters-card">
            <div className="gd-filter-item">
              <label>STATUT</label>
              <select className="gd-select" value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setCurrentPage(1); }}>
                <option value="">Tous les statuts</option>
                {statuts.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
            <div className="gd-filter-item">
              <label>NATURE</label>
              <select className="gd-select" value={filterNature} onChange={e => { setFilterNature(e.target.value); setCurrentPage(1); }}>
                <option value="">Toutes les natures</option>
                {natures.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
              </select>
            </div>
            <div className="gd-filter-item" style={{ flex: 2 }}>
              <label>PÉRIODE</label>
              <div className="gd-date-range">
                <input type="date" className="gd-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span style={{ color: '#cbd5e0' }}>→</span>
                <input type="date" className="gd-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="gd-table-card">
            {loading ? (
              <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Chargement des dossiers...</p>
            ) : dossiers.length === 0 ? (
              <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Aucun dossier trouvé.</p>
            ) : (
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
                  {dossiers.map(d => (
                    <tr key={d.idSinistre}>
                      <td className="gd-id-cell">{d.idSinistre}</td>
                      <td className="gd-date-cell">
                        {new Date(d.dateSurvenance).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <div className="gd-site-cell">
                          <IconPin />
                          <span className="gd-site-name">{d.codeSite} ({d.wilaya})</span>
                        </div>
                      </td>
                      <td>
                        <div className="gd-type-badge">
                          {d.typeSinistre_label || d.nature_label}
                        </div>
                      </td>
                      <td>
                        <span className={`gd-status-badge ${getStatusClass(d.statut)}`}>
                          <span className="dot" />
                          {d.statut_label}
                        </span>
                      </td>
                      <td className="gd-cost">{parseFloat(d.montantEstime || 0).toLocaleString('fr-FR')}</td>
                      <td>
                        <button className="gd-action-view" onClick={() => navigate('/gestion/' + d.idSinistre)}>
                          <IconEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="gd-pagination">
                <span className="gd-page-info">
                  Affichage de {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalCount)} sur {totalCount} dossiers
                </span>
                <div className="gd-pages">
                  <button className="gd-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <IconChevronLeft />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`gd-page-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && <span style={{ color: '#cbd5e0', padding: '0 4px' }}>...</span>}
                  {totalPages > 5 && (
                    <button className="gd-page-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                  )}
                  <button className="gd-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <IconChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* FAB */}
        {['EQUIPE_TERRAIN', 'ASSURANCE', 'ADMIN'].includes(user?.role) && (
          <button className="gd-fab" onClick={() => navigate('/declarations/new')}>
            <IconPlusLarge />
          </button>
        )}
      </div>
    </div>
  );
}

function getStatusClass(statut) {
  if (statut === 'OUVERT' || statut === 'EN_EXPERTISE' || statut === 'REJET_POUR_COMPLEMENT') return 'status--en-cours';
  if (statut === 'TRANSMIS_ASSUREUR' || statut === 'EN_VALIDATION_LEGAL' || statut === 'EN_VALIDATION_HSE') return 'status--transmis';
  if (statut === 'CLOTURE' || statut === 'VALIDE') return 'status--cloture';
  if (statut === 'ARCHIVE' || statut === 'REJETE') return 'status--archive';
  return '';
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconPlusLarge() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconEye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
