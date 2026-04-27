import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Archives.css'

export default function Archives() {
  const navigate = useNavigate()

  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

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
    <div className="arc-layout">
      <Sidebar />

      <div className="arc-main">
        <main className="arc-content">
          {/* Breadcrumbs */}
          <nav className="arc-breadcrumbs">Archives</nav>

          {/* Header */}
          <header className="arc-header">
            <h1>Archives des Dossiers</h1>
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
                  {archives.map(d => (
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
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconBank() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconEye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="15 18 9 12 15 6"/></svg> }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="9 18 15 12 9 6"/></svg> }
