import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import './Archives.css'

export default function Archives() {
  const navigate = useNavigate()

  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/sinistres/?statut=ARCHIVE&page=${currentPage}&page_size=10`)
      .then(res => {
        const data = res.data
        if (data.results) {
          setArchives(data.results)
          setTotalCount(data.count)
        } else {
          setArchives(Array.isArray(data) ? data : [])
          setTotalCount(Array.isArray(data) ? data.length : 0)
        }
      })
      .catch(err => {
        console.error('Erreur chargement archives:', err)
      })
      .finally(() => setLoading(false))
  }, [currentPage])

  const totalPages = Math.ceil(totalCount / 10)

  // Calculer les stats dynamiquement
  const totalMontant = archives.reduce((sum, d) => sum + (parseFloat(d.montantEstime) || 0), 0)

  return (
    <div className="arc-page-content">
        <main className="arc-content">
          {/* Breadcrumbs */}
          <nav className="arc-breadcrumbs">Archives</nav>

          {/* Header */}
          <header className="arc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Archives des Dossiers</h1>
            <div className="arc-search" style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '300px' }}>
              <IconSearch style={{ marginRight: '10px', color: '#a0aec0', width: 18, height: 18 }} />
              <input 
                type="text" 
                placeholder="Rechercher par ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#2d3748', background: 'transparent' }}
              />
            </div>
          </header>

          {/* Stats Grid */}
          <section className="arc-stats-grid">
            <div className="arc-stat-card">
              <span className="arc-stat-label">TOTAL ARCHIVÉS</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">{totalCount.toLocaleString('fr-FR')}</span>
              </div>
            </div>

            <div className="arc-stat-card">
              <span className="arc-stat-label">VALEUR TOTALE (DZD)</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">{totalMontant > 1000000 ? `${(totalMontant / 1000000).toFixed(1)}M` : totalMontant.toLocaleString('fr-FR')}</span>
                <div className="arc-stat-icon icon-bank"><IconBank /></div>
              </div>
            </div>

            <div className="arc-stat-card">
              <span className="arc-stat-label">SITES CONCERNÉS</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">{new Set(archives.map(a => a.codeSite)).size}</span>
                <div className="arc-stat-icon icon-pin"><IconPin /></div>
              </div>
            </div>
          </section>

          {/* Table Card */}
          <div className="arc-table-card">
            {loading ? (
              <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Chargement des archives...</p>
            ) : archives.length === 0 ? (
              <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center' }}>Aucun dossier archivé.</p>
            ) : (
              <table className="arc-table">
                <thead>
                  <tr>
                    <th>ID DOSSIER</th>
                    <th>DATE</th>
                    <th>SITE CONCERNÉ</th>
                    <th>NATURE DU SINISTRE</th>
                    <th>COÛT ESTIMÉ (DZD)</th>
                    <th>STATUT</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {archives
                    .filter(d => searchTerm ? d.idSinistre?.toLowerCase().includes(searchTerm.toLowerCase()) : true)
                    .map(d => (
                    <tr key={d.idSinistre}>
                      <td className="arc-id">{d.idSinistre}</td>
                      <td className="arc-date">
                        {new Date(d.dateSurvenance).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <div className="arc-site-group">
                          <span className="arc-site-name">{d.codeSite}</span>
                          <span className="arc-region">{d.wilaya}</span>
                        </div>
                      </td>
                      <td>
                        <span className="arc-nature-badge">{d.nature_label}</span>
                      </td>
                      <td className="arc-cost">
                        {parseFloat(d.montantEstime || 0).toLocaleString('fr-FR')}
                      </td>
                      <td>
                        <span className="arc-status">ARCHIVÉ</span>
                      </td>
                      <td>
                        <button className="arc-action-btn" onClick={() => navigate('/gestion/' + d.idSinistre)}>
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
              <div className="arc-pagination">
                <span className="arc-info">
                  Affichage de {(currentPage - 1) * 10 + 1} à {Math.min(currentPage * 10, totalCount)} sur {totalCount.toLocaleString('fr-FR')} dossiers
                </span>
                <div className="arc-pages">
                  <button className="arc-p-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <IconChevronLeft />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`arc-p-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && <span style={{ color: '#cbd5e0', padding: '0 4px' }}>...</span>}
                  {totalPages > 5 && (
                    <button className="arc-p-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                  )}
                  <button className="arc-p-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <IconChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconBank() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconEye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="15 18 9 12 15 6"/></svg> }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="9 18 15 12 9 6"/></svg> }
function IconSearch() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
