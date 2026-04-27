import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Settings.css'

export default function Settings() {
  const [sites, setSites] = useState([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [siteSearch, setSiteSearch] = useState('')

  // New site form
  const [siteCode, setSiteCode] = useState('')
  const [siteLoc, setSiteLoc] = useState('')

  // Load sites from backend (first 20)
  useEffect(() => {
    setLoadingSites(true)
    api.get('/sites/?search=' + encodeURIComponent(siteSearch))
      .then(res => {
        setSites(Array.isArray(res.data) ? res.data.slice(0, 20) : [])
      })
      .catch(() => {})
      .finally(() => setLoadingSites(false))
  }, [siteSearch])

  const handleAddSite = () => {
    if (!siteCode.trim()) {
      toast.error('Le code du site est obligatoire.')
      return
    }
    api.post('/sites/', { codeSite: siteCode, nomSite: siteLoc })
      .then(() => {
        toast.success('Site ajouté avec succès !')
        setSiteCode('')
        setSiteLoc('')
        // Refresh
        setSiteSearch(prev => prev + ' ')
        setTimeout(() => setSiteSearch(''), 100)
      })
      .catch(err => {
        if (err.response?.data) {
          const firstKey = Object.keys(err.response.data)[0]
          toast.error(`Erreur: ${err.response.data[firstKey]}`)
        } else {
          toast.error("Erreur lors de l'ajout du site.")
        }
      })
  }

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
              <div>
                <input
                  type="text"
                  placeholder="Rechercher un site..."
                  value={siteSearch}
                  onChange={e => setSiteSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    marginRight: 8,
                    minWidth: 200,
                  }}
                />
              </div>
            </div>

            <div className="st-sites-grid">
              {loadingSites ? (
                <p style={{ color: '#94A3B8', padding: '1rem' }}>Chargement...</p>
              ) : sites.length === 0 ? (
                <p style={{ color: '#94A3B8', padding: '1rem' }}>Aucun site trouvé.</p>
              ) : (
                sites.slice(0, 6).map(site => (
                  <div key={site.codeSite} className="st-site-card">
                    <div className="st-site-icon"><IconTower /></div>
                    <div className="st-site-info">
                      <b>{site.codeSite}</b>
                      <span>{site.nomSite || site.wilaya || 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
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
                  placeholder="Nom / Localisation"
                  value={siteLoc}
                  onChange={e => setSiteLoc(e.target.value)}
                />
                <button className="st-btn-pink" onClick={handleAddSite} style={{ whiteSpace: 'nowrap' }}>
                  + Ajouter
                </button>
              </div>
            </div>
          </section>

          {/* Gestion des Ingénieurs (placeholder — endpoint backend non implémenté) */}
          <section className="st-card">
            <div className="st-section-head">
              <div className="st-section-title">
                <h2>Gestion des Ingénieurs</h2>
                <p>Équipe technique de terrain certifiée.</p>
              </div>
            </div>

            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
              <p style={{ fontSize: '0.9rem' }}>
                La gestion des ingénieurs sera disponible dans une prochaine mise à jour.
              </p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Utilisez l'interface Django Admin pour gérer les comptes en attendant.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconTower() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M4.5 7L2 22h20L19.5 7"/><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 12h6"/><path d="M10 16h4"/></svg>; }
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#718096' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconUserCircle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#718096' }}><circle cx="12" cy="12" r="10"/><path d="M8.21 13.89L7 23s5-1 10 0l-1.21-9.11"/><circle cx="12" cy="9" r="3"/></svg>; }
