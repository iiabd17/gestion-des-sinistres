import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './DossierGestionDetail.css'

/* ── Mock Data for Details ──────────────────────────── */
const dossierData = {
  'CLM-2024-8842': {
    title: 'Sinistre Site BTS-042',
    lastUpdate: 'Il y a 14 minutes par Système',
    nature: 'Vandalisme & Vol de Câbles',
    date: '14 Mars 2024 • 02:45',
    site: 'Wilaya d’Alger (BTS-042)',
    progression: [
      { id: '1', label: 'DÉCLARÉ', date: '14 Mars', status: 'completed' },
      { id: '2', label: 'ROUTAGE', date: '15 Mars', status: 'completed' },
      { id: '3', label: 'EXPERTISE', date: '18 Mars', status: 'completed' },
      { id: '4', label: 'DÉCISION', date: 'En cours', status: 'active' },
      { id: '5', label: 'CLÔTURE', date: '...', status: 'locked' }
    ],
    fichiers: [
      { name: 'PV_Police_Alger_Si...', meta: 'PDF • 2.4 MB • 14 Mars 2024', icon: IconFileText },
      { name: 'Photo_Dommages_...', meta: 'JPG • 4.8 MB • 14 Mars 2024', icon: IconImage },
      { name: 'Devis_Reparation_...', meta: 'DOCX • 1.1 MB • 16 Mars 2024', icon: IconWord },
      { name: 'Inventaire_Materiel...', meta: 'XLSX • 840 KB • 15 Mars 2024', icon: IconExcel }
    ],
    finance: {
      cout: '450.000',
      progress: 75,
      seuil: '600.000 DZD'
    },
    routage: 'Dossier Transmis à l’Assureur'
  }
}

export default function DossierGestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Normalize ID for lookup
  const data = dossierData[id] || dossierData['CLM-2024-8842']

  return (
    <div className="dg-layout">
      <Sidebar />

      <div className="dg-main">
        {/* Topbar */}
        <header className="dg-topbar">
          <div className="dg-topbar-actions">
            <button className="dg-icon-btn"><IconBell /></button>
            <button className="dg-icon-btn"><IconUser /></button>
          </div>
        </header>

        <main className="dg-content">
          {/* Breadcrumbs */}
          <nav className="dg-breadcrumbs">
            <span>Dossiers</span>
            <span className="dg-bc-sep">›</span>
            <span className="dg-bc-id">#{id || 'CLM-2024-8842'}</span>
          </nav>

          {/* Header */}
          <section className="dg-page-header">
            <div className="dg-title-group">
              <h1>{data.title}</h1>
              <p>Dernière mise à jour : {data.lastUpdate}</p>
            </div>
            <div className="dg-header-actions">
              <button className="dg-btn dg-btn-white"><IconEdit /> Modifier</button>
              <button className="dg-btn dg-btn-white"><IconDownload /> Export PDF</button>
              <button className="dg-btn dg-btn-red">Fermer le Dossier</button>
            </div>
          </section>

          <div className="dg-grid">
            {/* LEFT COLUMN */}
            <div className="dg-left">
              
              {/* Résumé section */}
              <div className="dg-card">
                <div className="dg-card-header">
                  <IconAlertCircle className="dg-card-icon" />
                  <h2 className="dg-card-title">Résumé de l’Incident</h2>
                </div>
                <div className="dg-info-row">
                  <div className="dg-info-field">
                    <label>TYPE DE SINISTRE</label>
                    <span className="dg-info-val">{data.nature}</span>
                  </div>
                  <div className="dg-info-field">
                    <label>DATE DE L’ÉVÉNEMENT</label>
                    <span className="dg-info-val">{data.date}</span>
                  </div>
                  <div className="dg-info-field">
                    <label>SITE CONCERNÉ</label>
                    <span className="dg-info-val" style={{ borderBottom: '1px dashed #cbd5e0' }}>{data.site}</span>
                  </div>
                </div>
              </div>

              {/* Progression section */}
              <div className="dg-card">
                <div className="dg-card-header">
                  <IconTrendingUp className="dg-card-icon" />
                  <h2 className="dg-card-title">Progression du Dossier</h2>
                </div>
                <div className="dg-stepper">
                  <div className="dg-step-connector">
                    <div className="dg-step-connector-progress" style={{ width: '75%' }} />
                  </div>
                  {data.progression.map((step, index) => (
                    <div key={step.id} className={`dg-step dg-step--${step.status}`}>
                      <div className="dg-step-point">
                        {step.status === 'completed' ? <IconCheck /> : (step.status === 'locked' ? <IconLockSmall /> : <IconZap />)}
                      </div>
                      <span className="dg-step-label">{step.label}</span>
                      <span className="dg-step-date">{step.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pièces Jointes section */}
              <div className="dg-card">
                <div className="dg-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconPaperclip className="dg-card-icon" />
                    <h2 className="dg-card-title">Pièces Jointes</h2>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: '#E2000F', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ Ajouter un document</button>
                </div>
                <div className="dg-pj-grid">
                  {data.fichiers.map((file, i) => (
                    <div key={i} className="dg-pj-card">
                      <div className="dg-pj-icon"><file.icon /></div>
                      <div className="dg-pj-info">
                        <span className="dg-pj-name">{file.name}</span>
                        <span className="dg-pj-meta">{file.meta}</span>
                      </div>
                      <IconDownloadCloud className="dg-pj-dl" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="dg-sidebar">
              
              {/* Financial card */}
              <div className="side-card">
                <h3 className="dg-fin-title">Détails Financiers</h3>
                <div className="dg-fin-val-group">
                  <span className="dg-fin-label">Coût Estimé des Dommages</span>
                  <div className="dg-fin-amount">
                    {data.finance.cout} <span className="dg-fin-currency">DZD</span>
                  </div>
                </div>
                <div className="dg-progress-container">
                  <div className="dg-progress-bar">
                    <div className="dg-progress-fill" style={{ width: `${data.finance.progress}%` }} />
                  </div>
                  <span className="dg-progress-text">{data.finance.progress}% du Seuil</span>
                </div>
                <div className="dg-threshold-box">
                  <div className="dg-threshold-info">
                    <IconAlertTriangle />
                  </div>
                  <div>
                    <span className="dg-fin-label" style={{ marginBottom: 0 }}>Seuil de Franchise</span>
                    <div className="dg-threshold-val">{data.finance.seuil}</div>
                  </div>
                  <IconAlertBox />
                </div>
              </div>

              {/* Routing card */}
              <div className="dg-routing-card">
                <div className="dg-routing-head">
                  <IconBriefcase />
                  <span>Résultat du Routage</span>
                </div>
                <div className="dg-routing-status-box">
                  <span className="dg-rs-label">STATUT ACTUEL</span>
                  <span className="dg-rs-val">{data.routage}</span>
                </div>
              </div>

            </div>
          </div>
        </main>

        <button className="dg-fab-archive">
          <IconArchiveSmall />
          archive
        </button>
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconEdit() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconDownload() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IconAlertCircle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function IconPaperclip() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> }
function IconTrendingUp() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function IconBriefcase() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }
function IconCheck() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IconLockSmall() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:12 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function IconZap() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }

function IconFileText() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function IconImage() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function IconWord() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13v4"/><path d="M12 13v4"/><path d="M15 13v4"/></svg> }
function IconExcel() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8vv4h-8z"/></svg> }
function IconDownloadCloud() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:18 }}><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg> }
function IconAlertTriangle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IconAlertBox() { return <svg viewBox="0 0 24 24" fill="none" stroke="#feb2b2" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function IconArchiveSmall() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg> }
