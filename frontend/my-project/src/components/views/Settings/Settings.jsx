import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Settings.css'

export default function Settings() {
  /* ── Sites state ──────────────────────────────────── */
  const [sites, setSites] = useState([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [siteSearch, setSiteSearch] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [siteNom, setSiteNom] = useState('')
  const [siteWilaya, setSiteWilaya] = useState('')
  const [siteAdresse, setSiteAdresse] = useState('')

  /* ── Ingénieurs state ─────────────────────────────── */
  const [engNom, setEngNom] = useState('')
  const [engPrenom, setEngPrenom] = useState('')
  const [engEmail, setEngEmail] = useState('')
  const [engRole, setEngRole] = useState('INGENIEUR')

  /* ── Équipements state ────────────────────────────── */
  const [eqNom, setEqNom] = useState('')
  const [eqSerie, setEqSerie] = useState('')
  const [eqQuantite, setEqQuantite] = useState('')
  const [eqValeur, setEqValeur] = useState('')

  /* ── Active tab ───────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('sites')

  // Load sites
  useEffect(() => {
    setLoadingSites(true)
    api.get('/sites/?search=' + encodeURIComponent(siteSearch))
      .then(res => {
        setSites(Array.isArray(res.data) ? res.data.slice(0, 20) : [])
      })
      .catch(() => {})
      .finally(() => setLoadingSites(false))
  }, [siteSearch])

  /* ── Handlers ─────────────────────────────────────── */
  const handleAddSite = (e) => {
    e.preventDefault()
    if (!siteCode.trim()) {
      toast.error('Le code du site est obligatoire.')
      return
    }
    api.post('/sites/', {
      codeSite: siteCode,
      nomSite: siteNom,
      wilaya: siteWilaya,
      adresse: siteAdresse,
    })
      .then(() => {
        toast.success('Site ajouté avec succès !')
        setSiteCode(''); setSiteNom(''); setSiteWilaya(''); setSiteAdresse('')
        setSiteSearch('') // refresh
      })
      .catch(err => {
        const msg = err.response?.data
          ? Object.values(err.response.data).flat().join(', ')
          : "Erreur lors de l'ajout."
        toast.error(msg)
      })
  }

  const handleAddIngenieur = (e) => {
    e.preventDefault()
    if (!engNom.trim() || !engEmail.trim()) {
      toast.error('Nom et Email sont obligatoires.')
      return
    }
    // POST to accounts API if available, otherwise show info
    toast.info('Fonctionnalité en cours de développement. Utilisez Django Admin.')
    setEngNom(''); setEngPrenom(''); setEngEmail(''); setEngRole('INGENIEUR')
  }

  const handleAddEquipement = (e) => {
    e.preventDefault()
    if (!eqNom.trim()) {
      toast.error('Le nom de l\'équipement est obligatoire.')
      return
    }
    toast.info('Fonctionnalité en cours de développement.')
    setEqNom(''); setEqSerie(''); setEqQuantite(''); setEqValeur('')
  }

  return (
    <div className="st-layout">
      <Sidebar />

      <div className="st-main">
        {/* Topbar */}
        <header className="st-topbar">
          <div className="st-topbar-actions">
            <button className="st-icon-btn"><IconBell /></button>
            <button className="st-icon-btn"><IconUserCircle /></button>
          </div>
        </header>

        <main className="st-content">
          <header className="st-header">
            <h1>PARAMÈTRES</h1>
            <p>Gérez la configuration de votre plateforme, les sites réseau et l'équipe technique.</p>
          </header>

          {/* ── Tabs ────────────────────────────────── */}
          <div className="st-tabs">
            <button
              className={`st-tab ${activeTab === 'sites' ? 'st-tab--active' : ''}`}
              onClick={() => setActiveTab('sites')}
            >
              <IconTower /> Gestion des Sites
            </button>
            <button
              className={`st-tab ${activeTab === 'ingenieurs' ? 'st-tab--active' : ''}`}
              onClick={() => setActiveTab('ingenieurs')}
            >
              <IconUserPlus /> Gestion des Ingénieurs
            </button>
            <button
              className={`st-tab ${activeTab === 'equipements' ? 'st-tab--active' : ''}`}
              onClick={() => setActiveTab('equipements')}
            >
              <IconCpu /> Gestion des Équipements
            </button>
          </div>

          {/* ══════════════════════════════════════════
              TAB 1 — SITES
          ══════════════════════════════════════════ */}
          {activeTab === 'sites' && (
            <section className="st-card">
              <div className="st-section-head">
                <div className="st-section-title">
                  <h2>Répertoire des Sites</h2>
                  <p>Stations de base enregistrées dans le système.</p>
                </div>
                <input
                  type="text"
                  className="st-search"
                  placeholder="🔍 Rechercher un site..."
                  value={siteSearch}
                  onChange={e => setSiteSearch(e.target.value)}
                />
              </div>

              {/* Sites grid */}
              <div className="st-sites-grid">
                {loadingSites ? (
                  <p className="st-empty">Chargement...</p>
                ) : sites.length === 0 ? (
                  <p className="st-empty">Aucun site trouvé.</p>
                ) : (
                  sites.slice(0, 6).map(site => (
                    <div key={site.codeSite} className="st-site-card">
                      <div className="st-site-icon"><IconTower /></div>
                      <div className="st-site-info">
                        <b>{site.codeSite}</b>
                        <span>{site.nomSite || site.wilaya || '—'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add site form */}
              <form className="st-form-box" onSubmit={handleAddSite}>
                <span className="st-box-label">+ AJOUTER UN NOUVEAU SITE</span>
                <div className="st-form-grid st-form-grid--4">
                  <div className="st-field">
                    <label>CODE SITE *</label>
                    <input
                      className="st-input"
                      placeholder="Ex: AN2301"
                      value={siteCode}
                      onChange={e => setSiteCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="st-field">
                    <label>NOM DU SITE</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Hydra Nord"
                      value={siteNom}
                      onChange={e => setSiteNom(e.target.value)}
                    />
                  </div>
                  <div className="st-field">
                    <label>WILAYA</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Alger"
                      value={siteWilaya}
                      onChange={e => setSiteWilaya(e.target.value)}
                    />
                  </div>
                  <div className="st-field">
                    <label>ADRESSE</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Rue du 11 Décembre"
                      value={siteAdresse}
                      onChange={e => setSiteAdresse(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="st-btn-submit">
                  <IconPlus /> Ajouter le Site
                </button>
              </form>
            </section>
          )}

          {/* ══════════════════════════════════════════
              TAB 2 — INGÉNIEURS
          ══════════════════════════════════════════ */}
          {activeTab === 'ingenieurs' && (
            <section className="st-card">
              <div className="st-section-head">
                <div className="st-section-title">
                  <h2>Équipe Technique</h2>
                  <p>Ingénieurs de terrain certifiés pour l'expertise des sinistres.</p>
                </div>
              </div>

              {/* Add engineer form */}
              <form className="st-form-box" onSubmit={handleAddIngenieur}>
                <span className="st-box-label">+ NOUVEAU PROFIL INGÉNIEUR</span>
                <div className="st-form-grid st-form-grid--2">
                  <div className="st-field">
                    <label>NOM *</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Meziane"
                      value={engNom}
                      onChange={e => setEngNom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="st-field">
                    <label>PRÉNOM</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Samy"
                      value={engPrenom}
                      onChange={e => setEngPrenom(e.target.value)}
                    />
                  </div>
                  <div className="st-field">
                    <label>EMAIL *</label>
                    <input
                      className="st-input"
                      type="email"
                      placeholder="Ex: s.meziane@djezzy.dz"
                      value={engEmail}
                      onChange={e => setEngEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="st-field">
                    <label>RÔLE</label>
                    <select
                      className="st-input"
                      value={engRole}
                      onChange={e => setEngRole(e.target.value)}
                    >
                      <option value="INGENIEUR">Ingénieur</option>
                      <option value="EQUIPE_TERRAIN">Équipe Terrain</option>
                      <option value="HSE">HSE</option>
                      <option value="LEGAL">Légal</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="st-btn-submit">
                  <IconUserPlus /> Ajouter l'Ingénieur
                </button>
              </form>

              <div className="st-info-banner">
                <IconInfo />
                <span>Pour une gestion avancée des comptes, accédez à <b>Django Admin</b> → Comptes → Utilisateurs.</span>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════
              TAB 3 — ÉQUIPEMENTS
          ══════════════════════════════════════════ */}
          {activeTab === 'equipements' && (
            <section className="st-card">
              <div className="st-section-head">
                <div className="st-section-title">
                  <h2>Catalogue des Équipements</h2>
                  <p>Référentiel des équipements réseau et matériels.</p>
                </div>
              </div>

              {/* Add equipment form */}
              <form className="st-form-box" onSubmit={handleAddEquipement}>
                <span className="st-box-label">+ NOUVEL ÉQUIPEMENT</span>
                <div className="st-form-grid st-form-grid--2">
                  <div className="st-field">
                    <label>NOM / MARQUE *</label>
                    <input
                      className="st-input"
                      placeholder="Ex: Routeur Huawei HW-CR-88"
                      value={eqNom}
                      onChange={e => setEqNom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="st-field">
                    <label>NUMÉRO DE SÉRIE</label>
                    <input
                      className="st-input"
                      placeholder="Ex: SN-2024-00452"
                      value={eqSerie}
                      onChange={e => setEqSerie(e.target.value)}
                    />
                  </div>
                  <div className="st-field">
                    <label>QUANTITÉ</label>
                    <input
                      className="st-input"
                      type="number"
                      min="1"
                      placeholder="Ex: 3"
                      value={eqQuantite}
                      onChange={e => setEqQuantite(e.target.value)}
                    />
                  </div>
                  <div className="st-field">
                    <label>VALEUR COMPTABLE (DZD)</label>
                    <input
                      className="st-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 450000.00"
                      value={eqValeur}
                      onChange={e => setEqValeur(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="st-btn-submit">
                  <IconPlus /> Ajouter l'Équipement
                </button>
              </form>

              <div className="st-info-banner">
                <IconInfo />
                <span>Les équipements sont liés aux sinistres lors de l'expertise technique par l'ingénieur.</span>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconTower() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M4.5 7L2 22h20L19.5 7"/><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 12h6"/><path d="M10 16h4"/></svg>; }
function IconUserPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>; }
function IconCpu() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>; }
function IconPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconInfo() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>; }
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconUserCircle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="10"/><path d="M8.21 13.89L7 23s5-1 10 0l-1.21-9.11"/><circle cx="12" cy="9" r="3"/></svg>; }
