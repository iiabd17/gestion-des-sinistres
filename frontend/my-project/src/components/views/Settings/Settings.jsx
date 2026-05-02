import { useState, useEffect, useContext, useRef } from 'react'
import { toast } from 'react-toastify'
import { AuthContext } from '../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Settings.css'

const ROLES = [
  { value: 'EQUIPE_TERRAIN', label: 'Équipe Terrain' },
  { value: 'INGENIEUR', label: 'Ingénieur' },
  { value: 'LEGAL', label: 'Service Légal' },
  { value: 'HSE', label: 'Service HSE' },
  { value: 'ASSURANCE', label: 'Service Assurance' },
]

export default function Settings() {
  const { user, unreadNotifsCount } = useContext(AuthContext)
  const navigate = useNavigate()
  const role = user?.role || ''
  const isAdmin = ['ASSURANCE', 'ADMIN'].includes(role)
  const canEquip = ['ASSURANCE', 'ADMIN', 'INGENIEUR'].includes(role)

  // Default tab: ingénieur goes straight to equipment
  const [activeTab, setActiveTab] = useState(isAdmin ? 'sites' : 'equipements')

  // ── Sites ──
  const [sites, setSites] = useState([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [siteSearch, setSiteSearch] = useState('')
  const [siteForm, setSiteForm] = useState({ codeSite:'', nomSite:'', wilaya:'', region:'', adresseSite:'', typeSite:'', owner:'', commune:'' })
  const [showAddSiteForm, setShowAddSiteForm] = useState(false)
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [showAddEqForm, setShowAddEqForm] = useState(false)
  
  // Modal de suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [siteToDelete, setSiteToDelete] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // ── Comptes ──
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userForm, setUserForm] = useState({ username:'', nom:'', prenom:'', email:'', tel:'', password:'', role:'INGENIEUR', role_assurance:'AGENT' })

  // ── Équipements ──
  const [eqForm, setEqForm] = useState({ nomMarque:'', numeroSerie:'', quantiteImpactee:'', valeurComptable:'' })

  // Load sites
  useEffect(() => {
    if (activeTab !== 'sites') return
    setLoadingSites(true)
    api.get('/sites/?search=' + encodeURIComponent(siteSearch))
      .then(r => setSites(Array.isArray(r.data) ? r.data.slice(0, 20) : []))
      .catch(() => {})
      .finally(() => setLoadingSites(false))
  }, [siteSearch, activeTab])

  // Load users
  useEffect(() => {
    if (activeTab !== 'comptes' || !isAdmin) return
    setLoadingUsers(true)
    api.get('/accounts/users/')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Impossible de charger les utilisateurs."))
      .finally(() => setLoadingUsers(false))
  }, [activeTab])

  // ── Handlers ──
  const handleAddSite = (e) => {
    e.preventDefault()
    if (!siteForm.codeSite.trim()) return toast.error('Code site obligatoire.')
    api.post('/sites/', siteForm)
      .then(() => { 
        toast.success('Site ajouté !'); 
        setSiteForm({ codeSite:'', nomSite:'', wilaya:'', region:'', adresseSite:'', typeSite:'', owner:'', commune:'' }); 
        setSiteSearch('');
        setShowAddSiteForm(false);
      })
      .catch(err => toast.error(err.response?.data ? Object.values(err.response.data).flat().join(', ') : "Erreur"))
  }

  const handleDeleteSite = (code) => {
    setSiteToDelete(code)
    setDeleteConfirmText('')
    setDeleteModalOpen(true)
  }

  const confirmDeleteSite = () => {
    if (deleteConfirmText !== siteToDelete) return
    api.delete(`/sites/${siteToDelete}/`)
      .then(() => { 
        toast.success('Site supprimé.')
        setSites(s => s.filter(x => x.codeSite !== siteToDelete))
        setDeleteModalOpen(false)
      })
      .catch(() => toast.error("Ce site est lié à un sinistre et ne peut pas être supprimé."))
  }

  const handleExportSites = () => {
    toast.info("Génération de l'exportation en cours...");
    api.get('/sites/export/', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'sites_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Exportation réussie.");
      })
      .catch(() => {
        toast.error("Erreur lors de l'exportation des sites.");
      });
  }

  const validatePassword = (pw) => {
    if (pw.length < 8 || pw.length > 12) return 'Le mot de passe doit contenir entre 8 et 12 caractères.'
    if (!/\d/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre.'
    return null
  }

  const handleAddUser = (e) => {
    e.preventDefault()
    const pwErr = validatePassword(userForm.password)
    if (pwErr) return toast.error(pwErr)
    if (!userForm.nom || !userForm.email || !userForm.username) return toast.error('Champs obligatoires manquants.')
    const payload = { ...userForm }
    if (payload.role !== 'ASSURANCE') delete payload.role_assurance
    api.post('/accounts/users/create/', payload)
      .then(r => { 
        toast.success(r.data.message); 
        setUserForm({ username:'', nom:'', prenom:'', email:'', tel:'', password:'', role:'INGENIEUR', role_assurance:'AGENT' }); 
        setUsers(u => [r.data.user, ...u]);
        setShowAddUserForm(false);
      })
      .catch(err => toast.error(err.response?.data ? JSON.stringify(err.response.data) : "Erreur"))
  }

  const handleToggleUser = (id) => {
    api.patch(`/accounts/users/${id}/toggle-status/`)
      .then(r => { toast.success(r.data.message); setUsers(u => u.map(x => x.id === id ? { ...x, estActif: r.data.estActif } : x)) })
      .catch(err => toast.error(err.response?.data?.message || "Erreur"))
  }

  const handleAddEquipement = (e) => {
    e.preventDefault()
    if (!eqForm.nomMarque.trim()) return toast.error("Nom de l'équipement obligatoire.")
    toast.info("Les équipements sont liés aux sinistres via l'expertise. Utilisez la page de complétion du dossier.")
    setEqForm({ nomMarque:'', numeroSerie:'', quantiteImpactee:'', valeurComptable:'' })
    setShowAddEqForm(false)
  }

  const sf = (field, val) => setSiteForm(p => ({ ...p, [field]: val }))
  const uf = (field, val) => setUserForm(p => ({ ...p, [field]: val }))
  const ef = (field, val) => setEqForm(p => ({ ...p, [field]: val }))

  return (
    <div className="st-layout">
      <Sidebar />
      <div className="st-main">
        <header className="st-topbar">
          <div className="st-topbar-actions">
            <button className="st-icon-btn" onClick={() => navigate('/notifications')} style={{position: 'relative'}}>
              <IconBell />
              {unreadNotifsCount > 0 && <span className="st-notif-dot" style={{position: 'absolute', top: 8, right: 10, width: 8, height: 8, backgroundColor: '#E2000F', borderRadius: '50%', border: '2px solid #fff'}} />}
            </button>
            <button className="st-icon-btn" onClick={() => navigate('/profile')}>
              <IconUserC />
            </button>
          </div>
        </header>
        <main className="st-content">
          <header className="st-header"><h1>PARAMÈTRES</h1><p>Gérez les sites, les comptes utilisateurs et les équipements.</p></header>

          {/* Tabs */}
          <div className="st-tabs">
            {isAdmin && <button className={`st-tab ${activeTab==='sites'?'st-tab--active':''}`} onClick={()=>setActiveTab('sites')}><IconTower /> Sites</button>}
            {isAdmin && <button className={`st-tab ${activeTab==='comptes'?'st-tab--active':''}`} onClick={()=>setActiveTab('comptes')}><IconUserPlus /> Comptes</button>}
            {canEquip && <button className={`st-tab ${activeTab==='equipements'?'st-tab--active':''}`} onClick={()=>setActiveTab('equipements')}><IconCpu /> Équipements</button>}
          </div>

          {/* ═══ TAB SITES ═══ */}
          {activeTab==='sites' && isAdmin && (
            <section className="st-card">
              <div className="st-section-head" style={{ alignItems: 'flex-start' }}>
                <div className="st-section-title"><h2>Répertoire des Sites</h2><p>{sites.length} site(s) affichés</p></div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <input type="text" className="st-search" placeholder="🔍 Rechercher..." value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} />
                  <button className="st-btn-submit" onClick={() => setShowAddSiteForm(!showAddSiteForm)}>
                    <IconPlus /> {showAddSiteForm ? 'Fermer' : 'Ajouter un site'}
                  </button>
                  <button className="st-btn-white" onClick={handleExportSites}>⬇ Exporter</button>
                </div>
              </div>

              {/* Add site form (Toggled) */}
              {showAddSiteForm && (
                <form className="st-form-box" onSubmit={handleAddSite} style={{ marginTop: 0, marginBottom: '24px' }}>
                  <span className="st-box-label">+ NOUVEAU SITE</span>
                  <div className="st-form-grid st-form-grid--4">
                    <div className="st-field"><label>CODE SITE *</label><input className="st-input" placeholder="AN2301" value={siteForm.codeSite} onChange={e=>sf('codeSite',e.target.value)} required /></div>
                    <div className="st-field"><label>NOM</label><input className="st-input" placeholder="Hydra Nord" value={siteForm.nomSite} onChange={e=>sf('nomSite',e.target.value)} /></div>
                    <div className="st-field"><label>WILAYA</label><input className="st-input" placeholder="Alger" value={siteForm.wilaya} onChange={e=>sf('wilaya',e.target.value)} /></div>
                    <div className="st-field"><label>RÉGION</label><input className="st-input" placeholder="Centre" value={siteForm.region} onChange={e=>sf('region',e.target.value)} /></div>
                    <div className="st-field"><label>ADRESSE</label><input className="st-input" placeholder="Rue..." value={siteForm.adresseSite} onChange={e=>sf('adresseSite',e.target.value)} /></div>
                    <div className="st-field"><label>COMMUNE</label><input className="st-input" placeholder="Hydra" value={siteForm.commune} onChange={e=>sf('commune',e.target.value)} /></div>
                    <div className="st-field"><label>TYPE</label><input className="st-input" placeholder="BTS" value={siteForm.typeSite} onChange={e=>sf('typeSite',e.target.value)} /></div>
                    <div className="st-field"><label>OWNER</label><input className="st-input" placeholder="Djezzy" value={siteForm.owner} onChange={e=>sf('owner',e.target.value)} /></div>
                  </div>
                  <button type="submit" className="st-btn-submit"><IconPlus /> Enregistrer le site</button>
                </form>
              )}

              {/* Sites list */}
              <div className="st-table-wrap">
                {loadingSites ? <p className="st-empty">Chargement...</p> : sites.length===0 ? <p className="st-empty">Aucun site trouvé.</p> : (
                  <table className="st-table">
                    <thead><tr><th>CODE</th><th>NOM</th><th>WILAYA</th><th>RÉGION</th><th>TYPE</th><th></th></tr></thead>
                    <tbody>{sites.map(s=>(
                      <tr key={s.codeSite}>
                        <td style={{fontWeight:700,color:'#E2000F'}}>{s.codeSite}</td>
                        <td>{s.nomSite||'—'}</td><td>{s.wilaya||'—'}</td><td>{s.region||'—'}</td><td>{s.typeSite||'—'}</td>
                        <td><button className="st-del-btn" onClick={()=>handleDeleteSite(s.codeSite)}>✕</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ═══ TAB COMPTES ═══ */}
          {activeTab==='comptes' && isAdmin && (
            <section className="st-card">
              <div className="st-section-head" style={{ alignItems: 'flex-start' }}>
                <div className="st-section-title"><h2>Gestion des Comptes</h2><p>{users.length} utilisateur(s) enregistrés</p></div>
                <button className="st-btn-submit" onClick={() => setShowAddUserForm(!showAddUserForm)}>
                  <IconPlus /> {showAddUserForm ? 'Fermer' : 'Ajouter un compte'}
                </button>
              </div>

              {/* Add user form (Toggled) */}
              {showAddUserForm && (
                <form className="st-form-box" onSubmit={handleAddUser} style={{ marginTop: 0, marginBottom: '24px' }}>
                  <span className="st-box-label">+ NOUVEAU COMPTE</span>
                  <div className="st-form-grid st-form-grid--3">
                    <div className="st-field"><label>NOM *</label><input className="st-input" value={userForm.nom} onChange={e=>uf('nom',e.target.value)} required /></div>
                    <div className="st-field"><label>PRÉNOM *</label><input className="st-input" value={userForm.prenom} onChange={e=>uf('prenom',e.target.value)} required /></div>
                    <div className="st-field"><label>NOM D'UTILISATEUR *</label><input className="st-input" value={userForm.username} onChange={e=>uf('username',e.target.value)} required /></div>
                    <div className="st-field"><label>EMAIL PRO *</label><input className="st-input" type="email" placeholder="nom@djezzy.dz" value={userForm.email} onChange={e=>uf('email',e.target.value)} required /></div>
                    <div className="st-field"><label>TÉLÉPHONE</label><input className="st-input" placeholder="05XXXXXXXX" value={userForm.tel} onChange={e=>uf('tel',e.target.value)} /></div>
                    <div className="st-field">
                      <label>MOT DE PASSE * <small style={{color:'#94a3b8'}}>(8–12 car., 1 chiffre min.)</small></label>
                      <input className="st-input" type="password" value={userForm.password} onChange={e=>uf('password',e.target.value)} required minLength={8} maxLength={12} />
                    </div>
                    <div className="st-field"><label>RÔLE *</label>
                      <select className="st-input" value={userForm.role} onChange={e=>uf('role',e.target.value)}>
                        {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    {userForm.role==='ASSURANCE' && (
                      <div className="st-field"><label>SOUS-RÔLE ASSURANCE</label>
                        <select className="st-input" value={userForm.role_assurance} onChange={e=>uf('role_assurance',e.target.value)}>
                          <option value="AGENT">Agent</option><option value="DIRECTRICE">Directrice</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="st-btn-submit"><IconUserPlus /> Créer le Compte</button>
                </form>
              )}

              {/* Users table */}
              <div className="st-table-wrap">
                {loadingUsers ? <p className="st-empty">Chargement...</p> : users.length===0 ? <p className="st-empty">Aucun utilisateur.</p> : (
                  <table className="st-table">
                    <thead><tr><th>NOM</th><th>EMAIL</th><th>RÔLE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                    <tbody>{users.map(u=>(
                      <tr key={u.id}>
                        <td style={{fontWeight:600}}>{u.nom} {u.prenom}</td>
                        <td style={{color:'#64748b',fontSize:13}}>{u.email}</td>
                        <td><span className="st-role-badge">{u.role}</span></td>
                        <td>
                          <span className={`st-status-badge ${u.estActif?'st-status--active':'st-status--inactive'}`}>
                            <span className="st-status-dot" /> {u.estActif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>
                          <button className="st-toggle-btn" onClick={()=>handleToggleUser(u.id)} title={u.estActif?'Désactiver':'Activer'}>{u.estActif?'⏸':'▶'}</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>

            </section>
          )}

          {/* ═══ TAB ÉQUIPEMENTS ═══ */}
          {activeTab==='equipements' && canEquip && (
            <section className="st-card">
              <div className="st-section-head" style={{ alignItems: 'flex-start' }}>
                <div className="st-section-title"><h2>Catalogue des Équipements</h2><p>Référentiel des équipements réseau et matériels techniques.</p></div>
                <button className="st-btn-submit" onClick={() => setShowAddEqForm(!showAddEqForm)}>
                  <IconPlus /> {showAddEqForm ? 'Fermer' : 'Ajouter un équipement'}
                </button>
              </div>

              {/* Add equipment form (Toggled) */}
              {showAddEqForm && (
                <form className="st-form-box" onSubmit={handleAddEquipement} style={{ marginTop: 0, marginBottom: '24px' }}>
                  <span className="st-box-label">+ NOUVEL ÉQUIPEMENT</span>
                  <div className="st-form-grid st-form-grid--2">
                    <div className="st-field"><label>NOM / MARQUE *</label><input className="st-input" placeholder="Routeur Huawei HW-CR-88" value={eqForm.nomMarque} onChange={e=>ef('nomMarque',e.target.value)} required /></div>
                    <div className="st-field"><label>N° DE SÉRIE</label><input className="st-input" placeholder="SN-2024-00452" value={eqForm.numeroSerie} onChange={e=>ef('numeroSerie',e.target.value)} /></div>
                    <div className="st-field"><label>QUANTITÉ</label><input className="st-input" type="number" min="1" placeholder="3" value={eqForm.quantiteImpactee} onChange={e=>ef('quantiteImpactee',e.target.value)} /></div>
                    <div className="st-field"><label>VALEUR COMPTABLE (DZD)</label><input className="st-input" type="number" min="0" step="0.01" placeholder="450000" value={eqForm.valeurComptable} onChange={e=>ef('valeurComptable',e.target.value)} /></div>
                  </div>
                  <button type="submit" className="st-btn-submit"><IconPlus /> Ajouter</button>
                </form>
              )}

              <div className="st-info-banner"><IconInfo /><span>Les équipements sont liés aux sinistres lors de l'expertise technique. Accédez à <b>Déclarations → Compléter</b> pour associer un équipement à un dossier.</span></div>
            </section>
          )}

          {/* ═══ MODAL SUPPRESSION SITE ═══ */}
          {deleteModalOpen && (
            <div className="st-modal-overlay">
              <div className="st-modal">
                <div className="st-modal-icon"><IconAlertTriangle /></div>
                <h3>Suppression du site</h3>
                <p>Cette action est irréversible. Pour confirmer, veuillez taper le code du site : <strong>{siteToDelete}</strong></p>
                
                <input 
                  type="text" 
                  className="st-input st-modal-input" 
                  placeholder={siteToDelete}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />

                <div className="st-modal-actions">
                  <button className="st-btn-white" onClick={() => setDeleteModalOpen(false)}>Annuler</button>
                  <button 
                    className="st-btn-danger" 
                    onClick={confirmDeleteSite}
                    disabled={deleteConfirmText !== siteToDelete}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

/* ── Icons ── */
function IconTower(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M4.5 7L2 22h20L19.5 7"/><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 12h6"/></svg>}
function IconUserPlus(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
function IconCpu(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg>}
function IconPlus(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
function IconInfo(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
function IconBell(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
function IconUserC(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M6.17 18.34A4 4 0 0 1 10 16h4a4 4 0 0 1 3.83 2.34"/></svg>}
function IconAlertTriangle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:28,height:28}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
