import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import api from '../../../api'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './DossierGestionDetail.css'

export default function DossierGestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [statuts, setStatuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    // Load constants for status dropdown
    api.get('/constants/')
      .then(res => setStatuts(res.data.statuts || []))
      .catch(() => {})

    // Load dossier
    api.get(`/sinistres/${id}/`)
      .then(res => setData(res.data))
      .catch(err => {
        toast.error('Erreur de chargement du dossier')
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('titreDoc', file.name)
    formData.append('typePiece', 'AUTRE')

    try {
      const res = await api.post(`/sinistres/${id}/pieces/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Document ajouté avec succès')
      setData(prev => ({ 
        ...prev, 
        piecesJointes: [...(prev.piecesJointes || []), res.data] 
      }))
    } catch (err) {
      toast.error('Erreur lors de l\'ajout du document')
    }
  }

  const handleStatutChange = async (e) => {
    const newStatut = e.target.value
    try {
      await api.put(`/sinistres/${id}/`, { statut: newStatut })
      setData(prev => ({ 
        ...prev, 
        statut: newStatut, 
        statut_label: statuts.find(s => s.code === newStatut)?.label || newStatut 
      }))
      toast.success('Statut mis à jour')
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const exportPDF = async () => {
    try {
      toast.info('Génération du PDF en cours...')
      const pdf = new jsPDF('p', 'mm', 'a4')
      let y = 20

      // Title
      pdf.setFontSize(22)
      pdf.setTextColor(226, 0, 15) // Djezzy Red
      pdf.text(`Dossier Sinistre: #${id}`, 20, y)
      y += 10
      
      pdf.setFontSize(11)
      pdf.setTextColor(113, 128, 150) // Gray
      pdf.text(`Déclaré le : ${new Date(data.dateCreation).toLocaleDateString('fr-FR')}`, 20, y)
      y += 15

      // Informations section
      pdf.setFontSize(16)
      pdf.setTextColor(26, 32, 44) // Dark
      pdf.text("Informations de l'incident", 20, y)
      y += 10
      
      pdf.setFontSize(12)
      pdf.setTextColor(74, 85, 104)
      const infos = [
        `Type de sinistre : ${data.typeSinistre_label || data.nature_label || ''}`,
        `Date de l'événement : ${new Date(data.dateSurvenance).toLocaleDateString('fr-FR')} ${data.heureSurvenance ? data.heureSurvenance : ''}`,
        `Site concerné : ${data.site_detail?.wilaya || ''} (${data.site_detail?.codeSite || ''})`,
        `Coût estimé des dommages : ${parseFloat(data.montantEstime || 0).toLocaleString('fr-FR')} DZD`,
        `Statut actuel : ${data.statut_label || data.statut || ''}`
      ]

      infos.forEach(info => {
        pdf.text(info, 20, y)
        y += 8
      })
      
      y += 10

      // Images associated
      const imagePieces = (data.piecesJointes || []).filter(p => p.fichier && (p.fichier.toLowerCase().endsWith('.jpg') || p.fichier.toLowerCase().endsWith('.jpeg') || p.fichier.toLowerCase().endsWith('.png')))
      
      if (imagePieces.length > 0) {
        pdf.setFontSize(16)
        pdf.setTextColor(26, 32, 44)
        pdf.text('Images associées', 20, y)
        y += 10
        
        for (const piece of imagePieces) {
          try {
            const imgUrl = piece.fichier.startsWith('http') ? piece.fichier : `http://localhost:8000${piece.fichier}`
            
            // Load image as base64
            const imgData = await new Promise((resolve, reject) => {
              const img = new Image()
              img.crossOrigin = 'Anonymous'
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                resolve(canvas.toDataURL('image/jpeg', 0.8))
              }
              img.onerror = reject
              img.src = imgUrl
            })
            
            // Check if we need a new page
            if (y + 90 > 280) {
              pdf.addPage()
              y = 20
            }
            
            pdf.setFontSize(10)
            pdf.setTextColor(113, 128, 150)
            pdf.text(piece.titreDoc || 'Image', 20, y)
            y += 5
            
            // Fixed height 80, calculate width based on ratio, max 170
            pdf.addImage(imgData, 'JPEG', 20, y, 170, 80, undefined, 'FAST')
            y += 90
            
          } catch (e) {
            console.error("Impossible de charger l'image pour le PDF", e)
          }
        }
      }

      pdf.save(`Dossier_${id}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (err) {
      toast.error("Erreur lors de l'export PDF")
      console.error(err)
    }
  }

  if (loading) return (
    <div className="dg-layout">
      <Sidebar />
      <div className="dg-main" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <p style={{color: '#94A3B8'}}>Chargement...</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="dg-layout">
      <Sidebar />
      <div className="dg-main" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <p style={{color: '#E2000F'}}>Dossier introuvable</p>
      </div>
    </div>
  )

  // Calcs
  const title = `Sinistre ${data.site_detail?.codeSite || ''}`
  const lastUpdate = `Déclaré le : ${new Date(data.dateCreation).toLocaleDateString('fr-FR')}`
  const pieces = data.piecesJointes || []
  
  const cout = parseFloat(data.montantEstime || 0)
  const seuil = 600000 // Arbitrary seuil for UI
  const progress = Math.min((cout / seuil) * 100, 100).toFixed(0)

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

        <main className="dg-content" ref={contentRef}>
          {/* Breadcrumbs */}
          <nav className="dg-breadcrumbs">
            <span>Dossiers</span>
            <span className="dg-bc-sep">›</span>
            <span className="dg-bc-id">#{id}</span>
          </nav>

          {/* Header */}
          <section className="dg-page-header">
            <div className="dg-title-group">
              <h1>{title}</h1>
              <p>{lastUpdate}</p>
            </div>
            <div className="dg-header-actions">
              <button className="dg-btn dg-btn-white" onClick={() => setIsEditing(!isEditing)}>
                <IconEdit /> {isEditing ? 'Terminer' : 'Modifier'}
              </button>
              <button className="dg-btn dg-btn-white" onClick={exportPDF}>
                <IconDownload /> Export PDF
              </button>
              <button className="dg-btn dg-btn-red" onClick={() => navigate('/gestion')}>Fermer</button>
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
                    <span className="dg-info-val">{data.typeSinistre_label || data.nature_label}</span>
                  </div>
                  <div className="dg-info-field">
                    <label>DATE DE L’ÉVÉNEMENT</label>
                    <span className="dg-info-val">
                      {new Date(data.dateSurvenance).toLocaleDateString('fr-FR')} {data.heureSurvenance ? `• ${data.heureSurvenance}` : ''}
                    </span>
                  </div>
                  <div className="dg-info-field">
                    <label>SITE CONCERNÉ</label>
                    <span className="dg-info-val" style={{ borderBottom: '1px dashed #cbd5e0' }}>
                      {data.site_detail?.wilaya ? `${data.site_detail.wilaya} ` : ''} 
                      {data.site_detail?.codeSite ? `(${data.site_detail.codeSite})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pièces Jointes section */}
              <div className="dg-card">
                <div className="dg-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconPaperclip className="dg-card-icon" />
                    <h2 className="dg-card-title">Pièces Jointes</h2>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'none', border: 'none', color: '#E2000F', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + Ajouter un document
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                  />
                </div>
                <div className="dg-pj-grid">
                  {pieces.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontSize: '0.9rem', gridColumn: '1 / -1' }}>Aucune pièce jointe.</p>
                  ) : pieces.map((file, i) => (
                    <div key={i} className="dg-pj-card">
                      <div className="dg-pj-icon"><IconFileText /></div>
                      <div className="dg-pj-info">
                        <span className="dg-pj-name">{file.titreDoc || `Document ${i+1}`}</span>
                        <span className="dg-pj-meta">
                          {new Date(file.dateUpload).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <a 
                        href={file.fichier?.startsWith('http') ? file.fichier : `http://localhost:8000${file.fichier}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{color: 'inherit'}}
                      >
                        <IconDownloadCloud className="dg-pj-dl" />
                      </a>
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
                    {cout.toLocaleString('fr-FR')} <span className="dg-fin-currency">DZD</span>
                  </div>
                </div>
                <div className="dg-progress-container">
                  <div className="dg-progress-bar">
                    <div className="dg-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="dg-progress-text">{progress}% du Seuil</span>
                </div>
                <div className="dg-threshold-box">
                  <div className="dg-threshold-info">
                    <IconAlertTriangle />
                  </div>
                  <div>
                    <span className="dg-fin-label" style={{ marginBottom: 0 }}>Seuil de Franchise</span>
                    <div className="dg-threshold-val">{(seuil).toLocaleString('fr-FR')} DZD</div>
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
                  
                  {!isEditing ? (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: '#fff',
                      padding: '4px 0'
                    }}>
                      {data.statut_label}
                    </div>
                  ) : (
                    <select 
                      className="gd-select" 
                      value={data.statut} 
                      onChange={handleStatutChange}
                      style={{ 
                        marginTop: '8px', 
                        width: '100%', 
                        padding: '10px', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {statuts.map(s => (
                        <option key={s.code} value={s.code} style={{color: '#1a202c'}}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
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
