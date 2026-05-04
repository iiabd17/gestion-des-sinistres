import { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import api from '../../../api'
import { toast } from 'react-toastify'
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
  'ATTENTE_VALIDATION_FRANCHISE': { bg: '#fffff0', color: '#d69e2e', label: 'ATTENTE CLÔTURE' },
  'VALIDE':                { bg: '#d1fae5', color: '#065f46', label: 'VALIDÉ' },
  'REJETE':                { bg: '#fee2e2', color: '#b91c1c', label: 'REJETÉ' },
  'CLOTURE':               { bg: '#e2e8f0', color: '#475569', label: 'CLÔTURÉ' },
  'ARCHIVE':               { bg: '#f1f5f9', color: '#64748b', label: 'ARCHIVÉ' },
}

export default function Declarations() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, unreadNotifsCount } = useContext(AuthContext)
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
  const [filterWilaya, setFilterWilaya] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [natures, setNatures] = useState([])
  const [wilayas, setWilayas] = useState([])

  // Gallery Modal
  const [showGallery, setShowGallery] = useState(false)
  const [selectedSinistre, setSelectedSinistre] = useState(null)

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
      const combined = [...open, ...rejected]
      setDossiersCompleter(combined)
      
      // Extract unique wilayas
      const w = [...new Set(combined.map(d => d.wilaya))].filter(Boolean).sort()
      setWilayas(prev => [...new Set([...prev, ...w])])
    }).finally(() => setLoadingCompleter(false))
  }, [])

  // Charger les dossiers à valider
  useEffect(() => {
    setLoadingValider(true)
    Promise.all([
      api.get('/sinistres/?statut=EN_EXPERTISE&page_size=50').catch(() => ({ data: { results: [] } })),
      api.get('/sinistres/?statut=ATTENTE_VALIDATION_FRANCHISE&page_size=50').catch(() => ({ data: { results: [] } })),
    ]).then(([expRes, attRes]) => {
      const exp = expRes.data?.results || expRes.data || []
      const att = attRes.data?.results || attRes.data || []
      setDossiersValider([...exp, ...att])
    }).finally(() => setLoadingValider(false))
  }, [])

  // Helper to calculate delay in hours
  const getDelayInfo = (dateStr) => {
    if (!dateStr) return { hours: 0, label: 'N/A', level: 'none' }
    const diffMs = new Date() - new Date(dateStr)
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    let label = `${diffHours}h`
    if (diffHours >= 24) label = `${Math.floor(diffHours / 24)}j`
    
    let level = 'none'
    if (diffHours > 72) level = 'danger'
    else if (diffHours > 24) level = 'warning'
    
    return { hours: diffHours, label, level }
  }

  // Filtrage côté frontend
  const filteredCompleter = dossiersCompleter.filter(d => {
    if (filterNature !== 'Tous' && d.nature !== filterNature) return false
    if (filterDate && d.dateSurvenance !== filterDate) return false
    if (filterWilaya !== 'Tous' && d.wilaya !== filterWilaya) return false
    if (searchTerm && !d.idSinistre?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const filteredValider = dossiersValider.filter(d => {
    if (filterNature !== 'Tous' && d.nature !== filterNature) return false
    if (filterDate && d.dateSurvenance !== filterDate) return false
    if (filterWilaya !== 'Tous' && d.wilaya !== filterWilaya) return false
    if (filterStatut !== 'Tous' && d.statut !== filterStatut) return false
    if (searchTerm && !d.idSinistre?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleExportCSV = () => {
    const list = tab === 'completer' ? filteredCompleter : filteredValider
    if (list.length === 0) return toast.info("Rien à exporter")
    
    const headers = ["ID", "Site", "Wilaya", "Date", "Nature", "Statut", "Montant"]
    const rows = list.map(d => [
      d.idSinistre, d.codeSite, d.wilaya, d.dateSurvenance, d.nature_label, d.statut_label, d.montantEstime
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `sinistres_${tab}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Export terminé")
  }

  const openGallery = (sinistre) => {
    api.get(`/sinistres/${sinistre.idSinistre}/`)
      .then(res => {
        setSelectedSinistre(res.data)
        setShowGallery(true)
      })
      .catch(() => toast.error("Erreur chargement photos"))
  }

  return (
    <div className="dcl-page-content">
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
                      <div>
                        <h1 className="dcl-title">
                          {role === 'EQUIPE_TERRAIN' ? 'Mes Déclarations' : 'Déclarations à Compléter'}
                        </h1>
                        <p className="dcl-subtitle">
                          {role === 'EQUIPE_TERRAIN'
                            ? `${filteredCompleter.length} dossier(s) déclaré(s)`
                            : `${filteredCompleter.length} dossier(s) nécessitent une expertise technique`}
                        </p>
                      </div>
                      <div className="dcl-action-group">
                        {['EQUIPE_TERRAIN', 'ADMIN'].includes(role) && (
                          <button 
                            className="dcl-export-btn" 
                            style={{ background: '#E2000F', color: '#fff' }}
                            onClick={() => navigate('/declarations/new')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Nouveau
                          </button>
                        )}
                        <button className="dcl-export-btn" onClick={handleExportCSV}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Exporter
                        </button>
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
                        <option value="Tous">Natures</option>
                        {natures.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
                      </select>
                    </div>

                    <div className="dcl-filter-field">
                      <label>WILAYA</label>
                      <select
                        className="dcl-filter-select"
                        value={filterWilaya}
                        onChange={(e) => setFilterWilaya(e.target.value)}
                      >
                        <option value="Tous">Wilayas</option>
                        {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>

                    <button
                      className="dcl-reset-btn"
                      onClick={() => {
                        setFilterDate('');
                        setFilterNature('Tous');
                        setFilterWilaya('Tous');
                        setSearchTerm('');
                      }}
                      title="Réinitialiser les filtres"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>

                    <div className="dcl-filter-field" style={{ flex: 1.2 }}>
                      <label>RECHERCHER</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '36px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14, height:14, marginRight:6, flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input 
                          type="text" 
                          placeholder="Rechercher par ID..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12px', fontWeight: 600, color: '#2d3748', background: 'transparent' }}
                        />
                      </div>
                    </div>
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
                        <th>DÉLAI</th>
                        <th>STATUT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompleter.map((d) => {
                        const badge = statutBadge[d.statut] || { bg: '#f0f0f0', color: '#555' }
                        const delay = getDelayInfo(d.dernier_mouvement)
                        return (
                          <tr key={d.idSinistre} className={delay.level === 'danger' ? 'dcl-row--urgent' : ''}>
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
                              <span className={`dcl-delay-badge dcl-delay-badge--${delay.level}`}>
                                {delay.label}
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
                              <div className="dcl-action-group">
                                <button className="dcl-photo-btn" onClick={() => openGallery(d)} title="Voir les photos">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </button>
                                <button
                                  className="dcl-complete-btn"
                                  style={{ background: '#fce7f3', color: '#be185d', boxShadow: 'none' }}
                                  onClick={() => navigate(`/declarations/completer/${d.idSinistre}`)}
                                >
                                  {role === 'EQUIPE_TERRAIN' ? 'Voir' : 'Compléter'}
                                </button>
                              </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <h1 className="dcl-title">Déclarations à Valider</h1>
                    <p className="dcl-subtitle">Dossiers expertisés en attente de décision</p>
                  </div>
                  <button className="dcl-export-btn" onClick={handleExportCSV}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Exporter
                  </button>
                </div>
              </div>

              {/* Filters for Valider */}
              <div className="dcl-filter-grid" style={{ marginBottom: 0 }}>
                <div className="dcl-filter-field">
                  <label>WILAYA</label>
                  <select className="dcl-filter-select" value={filterWilaya} onChange={(e) => setFilterWilaya(e.target.value)}>
                    <option value="Tous">Wilayas</option>
                    {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="dcl-filter-field">
                  <label>STATUT</label>
                  <select className="dcl-filter-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                    <option value="Tous">Statuts</option>
                    <option value="EN_EXPERTISE">En Expertise</option>
                    <option value="ATTENTE_VALIDATION_FRANCHISE">Attente Franchise</option>
                  </select>
                </div>
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
                        <th>DÉLAI</th>
                        <th>NATURE</th>
                        <th>MONTANT ESTIMÉ</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredValider.map(d => {
                        const delay = getDelayInfo(d.dernier_mouvement)
                        return (
                          <tr key={d.idSinistre} className={delay.level === 'danger' ? 'dcl-row--urgent' : ''}>
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
                              <span className={`dcl-delay-badge dcl-delay-badge--${delay.level}`}>
                                {delay.label}
                              </span>
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
                              <div className="dcl-action-group">
                                <button className="dcl-photo-btn" onClick={() => openGallery(d)} title="Voir les photos">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </button>
                                <button
                                  className="dcl-view-btn"
                                  aria-label="Voir le dossier"
                                  onClick={() => navigate(`/declarations/valider/${d.idSinistre}`)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                              </div>
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
        </main>

        {/* Gallery Modal */}
        {showGallery && (
          <div className="photo-modal-overlay" onClick={() => setShowGallery(false)}>
            <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
              <button className="photo-modal-close" onClick={() => setShowGallery(false)}>&times;</button>
              <h2 style={{margin:0, fontSize:18}}>Photos - {selectedSinistre?.idSinistre}</h2>
              <div className="photo-gallery">
                {selectedSinistre?.piecesJointes?.filter(p => /\.(jpg|jpeg|png|webp)$/i.test(p.fichier)).map((p, i) => {
                  const url = p.fichier.startsWith('http') ? p.fichier : `http://localhost:8000${p.fichier}`
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="gallery-item" style={{backgroundImage: `url(${url})`}} />
                  )
                })}
                {selectedSinistre?.piecesJointes?.filter(p => /\.(jpg|jpeg|png|webp)$/i.test(p.fichier)).length === 0 && (
                  <p style={{color:'#64748b', gridColumn:'1/-1', textAlign:'center', padding:40}}>Aucune photo disponible</p>
                )}
              </div>
            </div>
          </div>
        )}
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
