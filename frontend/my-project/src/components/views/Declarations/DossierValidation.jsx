import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './DossierValidation.css'
import './DossierCompleterDetail.css'

const NATURE_STYLES = {
  'INCENDIE':            { bg: '#fef9c3', color: '#a16207' },
  'VOL':                 { bg: '#ede9fe', color: '#7c3aed' },
  'ACTE_DE_SABOTAGE':    { bg: '#ede9fe', color: '#7c3aed' },
  'FIBRE_OPTIQUE':       { bg: '#dbeafe', color: '#1d4ed8' },
  'INTEMPERIE':          { bg: '#dbeafe', color: '#1d4ed8' },
  'CATASTROPHE_NATUREL': { bg: '#fee2e2', color: '#b91c1c' },
  'VIOLENCE_POLITIQUE':  { bg: '#fce7f3', color: '#be185d' },
  'RC':                  { bg: '#d1fae5', color: '#065f46' },
}

export default function DossierValidation() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/sinistres/${id}/`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Erreur lors du chargement du dossier'))
      .finally(() => setLoading(false))
  }, [id])

  // Validate → transition status so it leaves "à valider" and goes to gestion
  const handleValider = useCallback(async () => {
    setSubmitting(true)
    try {
      await api.post(`/sinistres/${id}/validation/`, {
        action: 'VALIDER',
        commentaire: 'Dossier validé et transmis pour traitement.',
      })
      toast.success('Dossier validé et transmis à la gestion des dossiers')
      navigate('/gestion')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation')
    } finally {
      setSubmitting(false)
    }
  }, [id, navigate])

  // Send back to compléter (OUVERT) and notify ingénieur
  const handleInfoManquante = useCallback(async () => {
    setSubmitting(true)
    try {
      await api.post(`/sinistres/${id}/retour-completion/`, {
        motif: 'Informations manquantes — dossier renvoyé pour complétion.',
      })
      toast.success('Dossier renvoyé pour complétion. L\'ingénieur a été notifié.')
      navigate('/declarations', { state: { tab: 'completer' } })
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Vous n'avez pas la permission d'effectuer cette action.")
      } else {
        toast.error(err.response?.data?.error || 'Erreur lors du retour pour complétion')
      }
    } finally {
      setSubmitting(false)
    }
  }, [id, navigate])

  const exportPDF = async () => {
    try {
      toast.info('Génération du PDF...')
      const pdf = new jsPDF('p', 'mm', 'a4')
      let y = 20

      // Title
      pdf.setFontSize(22); pdf.setTextColor(226, 0, 15)
      pdf.text(`Dossier Sinistre: #${id}`, 20, y); y += 10
      pdf.setFontSize(11); pdf.setTextColor(113, 128, 150)
      pdf.text(`Déclaré le : ${new Date(data.dateCreation).toLocaleDateString('fr-FR')}`, 20, y); y += 15

      // Declarant
      pdf.setFontSize(16); pdf.setTextColor(26, 32, 44)
      pdf.text("Informations du Déclarant", 20, y); y += 10
      pdf.setFontSize(12); pdf.setTextColor(74, 85, 104)
      const decl = data.createur_detail || {}
      const declInfos = [
        `Nom : ${decl.nom_complet || data.createur_nom || 'N/A'}`,
        `Matricule : ${decl.matricule || decl.username || 'N/A'}`,
        `Téléphone : ${decl.tel || 'N/A'}`,
        `Département : ${decl.departement || decl.fonction || 'N/A'}`,
      ]
      declInfos.forEach(info => { pdf.text(info, 20, y); y += 7 })
      y += 5

      // Incident info
      pdf.setFontSize(16); pdf.setTextColor(26, 32, 44)
      pdf.text("Informations de l'incident", 20, y); y += 10
      pdf.setFontSize(12); pdf.setTextColor(74, 85, 104)
      const infos = [
        `Type : ${data.nature_label || ''}`,
        `Date : ${new Date(data.dateSurvenance).toLocaleDateString('fr-FR')}`,
        `Site : ${data.site_detail?.wilaya || ''} – ${data.site_detail?.nomSite || ''} (${data.site_detail?.codeSite || ''})`,
        `Statut : ${data.statut_label || data.statut || ''}`,
      ]
      if (data.descriptionDetailliee) infos.push(`Description : ${data.descriptionDetailliee.substring(0, 120)}`)
      infos.forEach(info => { pdf.text(info, 20, y); y += 7 })
      y += 5

      // Equipment
      const equips = data.equipements || []
      if (equips.length > 0) {
        pdf.setFontSize(16); pdf.setTextColor(26, 32, 44)
        pdf.text("Équipements Sinistrés", 20, y); y += 10
        pdf.setFontSize(11); pdf.setTextColor(74, 85, 104)
        equips.forEach(eq => {
          pdf.text(`• ${eq.nomMarque}  —  ${eq.quantiteImpactee}x  —  ${parseFloat(eq.valeurComptable || 0).toLocaleString('fr-FR')} DZD`, 22, y)
          y += 7
        })
        const total = equips.reduce((s, e) => s + (parseFloat(e.valeurComptable) || 0) * (e.quantiteImpactee || 1), 0)
        pdf.setFontSize(13); pdf.setTextColor(226, 0, 15)
        pdf.text(`Total Estimé : ${total.toLocaleString('fr-FR')} DZD`, 20, y); y += 12
      }

      // Images
      const imagePieces = (data.piecesJointes || []).filter(p => p.fichier && /\.(jpg|jpeg|png)$/i.test(p.fichier))
      for (const piece of imagePieces) {
        try {
          const imgUrl = piece.fichier.startsWith('http') ? piece.fichier : `http://localhost:8000${piece.fichier}`
          const imgData = await new Promise((resolve, reject) => {
            const img = new Image(); img.crossOrigin = 'Anonymous'
            img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); resolve(c.toDataURL('image/jpeg', 0.8)) }
            img.onerror = reject; img.src = imgUrl
          })
          if (y + 90 > 280) { pdf.addPage(); y = 20 }
          pdf.addImage(imgData, 'JPEG', 20, y, 170, 80, undefined, 'FAST'); y += 90
        } catch {}
      }

      pdf.save(`Dossier_${id}.pdf`)
      toast.success('PDF téléchargé')
    } catch { toast.error("Erreur lors de la génération du PDF") }
  }

  if (loading) {
    return (
      <div className="dv-layout"><Sidebar />
        <div className="dv-main dcd-center"><div className="dcd-spinner" /><p className="dcd-loading-text">Chargement du dossier...</p></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="dv-layout"><Sidebar />
        <div className="dv-main dcd-center"><p className="dcd-error-text">Dossier introuvable</p></div>
      </div>
    )
  }

  const ns = NATURE_STYLES[data.nature] || { bg: '#f0f0f0', color: '#555' }
  const declarant = data.createur_detail || {}
  const site = data.site_detail || {}
  const equipements = data.equipements || []
  const pieces = data.piecesJointes || []
  const gpsText = (site.latitude && site.longitude)
    ? `${parseFloat(site.latitude).toFixed(4)}° N, ${parseFloat(site.longitude).toFixed(4)}° E`
    : 'Non disponible'
  const siteLabel = [site.wilaya, site.nomSite].filter(Boolean).join(' – ') || site.codeSite || 'N/A'
  const dateLabel = data.dateSurvenance
    ? new Date(data.dateSurvenance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const statutLabel = data.statut_label?.toUpperCase() || data.statut
  const totalEstime = equipements.length > 0
    ? equipements.reduce((sum, e) => sum + (parseFloat(e.valeurComptable) || 0) * (e.quantiteImpactee || 1), 0)
    : parseFloat(data.montantEstime) || 0

  return (
    <div className="dv-layout">
      <Sidebar />

      <div className="dv-main">
        <header className="dv-topbar">
          <div className="dv-topbar-actions">
            <button className="dv-icon-btn" aria-label="Notifications"><IconBell /><span className="dv-notif-dot" /></button>
            <button className="dv-icon-btn" aria-label="Profil"><IconUser /></button>
          </div>
        </header>

        <main className="dv-content">
          {/* Page header */}
          <div className="dv-page-header">
            <div className="dv-page-meta">
              <span className="dv-eyebrow"><IconDocument />{statutLabel}</span>
              <span className="dv-eyebrow-id">#{data.idSinistre}</span>
            </div>
            <div className="dv-header-row">
              <h1 className="dv-title">Validation du Dossier</h1>
              <div className="dv-chips">
                <ChipItem label="SITE" value={siteLabel} />
                <ChipItem label="DATE" value={dateLabel} />
                <div className="dv-chip">
                  <span className="dv-chip-label">NATURE</span>
                  <span className="dv-chip-val dv-nature" style={{ background: ns.bg, color: ns.color }}>
                    <span className="dv-nature-dot" style={{ background: ns.color }} />
                    {data.nature_label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="dv-body">
            {/* LEFT */}
            <div className="dv-left">
              {/* Déclarant */}
              <section className="dv-card">
                <div className="dv-card-title-row">
                  <IconUserCard />
                  <h2 className="dv-card-title">Informations du Déclarant</h2>
                </div>
                <div className="dv-info-grid">
                  <InfoField label="NOM COMPLET" value={declarant.nom_complet || data.createur_nom} />
                  <InfoField label="EMPLOI CD" value={declarant.matricule || declarant.username} />
                  <InfoField label="NUMÉRO DE TÉLÉPHONE" value={declarant.tel} />
                  <InfoField label="DÉPARTEMENT" value={declarant.departement || declarant.fonction} />
                </div>
              </section>

              {/* Détails Techniques */}
              <section className="dv-card">
                <h2 className="dv-card-title">Détails Techniques</h2>
                <div className="dv-tech-grid">
                  <div className="dv-info-field">
                    <span className="dv-info-label">DESCRIPTION DU SITE</span>
                    <p className="dv-info-desc">{data.descriptionDetailliee || 'Aucune description fournie.'}</p>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">COORDONNÉES GPS</span>
                    <div className="dv-gps-val"><IconPin />{gpsText}</div>
                  </div>
                </div>
                <div className="dv-site-photo">
                  <div className="dv-photo-bg" /><div className="dv-photo-overlay" />
                  <svg className="dv-pylon-icon" viewBox="0 0 60 100" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" aria-hidden="true">
                    <line x1="30" y1="5" x2="30" y2="95"/><line x1="30" y1="20" x2="10" y2="50"/><line x1="30" y1="20" x2="50" y2="50"/>
                    <line x1="30" y1="35" x2="15" y2="55"/><line x1="30" y1="35" x2="45" y2="55"/>
                    <line x1="10" y1="50" x2="50" y2="50"/><line x1="15" y1="55" x2="45" y2="55"/>
                    <line x1="10" y1="50" x2="10" y2="95"/><line x1="50" y1="50" x2="50" y2="95"/>
                    <line x1="10" y1="95" x2="50" y2="95"/><line x1="5" y1="5" x2="55" y2="5"/>
                    <circle cx="30" cy="5" r="3" fill="#E2000F" stroke="none"/>
                  </svg>
                </div>
              </section>
            </div>

            {/* RIGHT */}
            <div className="dv-right">
              {/* Équipements */}
              <section className="dv-card">
                <div className="dv-card-title-row dv-card-title-row--between">
                  <h2 className="dv-card-title dcd-section-title">Équipements Sinistrés</h2>
                </div>
                <ul className="dcd-equip-list">
                  {equipements.length === 0 ? (
                    <li className="dcd-equip-empty">Aucun équipement déclaré</li>
                  ) : equipements.map((item, i) => (
                    <li key={item.idEquipement || i} className="dcd-equip-item">
                      <div className="dcd-equip-info">
                        <p className="dcd-equip-name">{item.nomMarque}</p>
                        <p className="dcd-equip-meta">
                          QUANTITÉ: {item.quantiteImpactee}x
                          {item.valeurComptable > 0 && ` • ${parseFloat(item.valeurComptable).toLocaleString('fr-FR')} DZD`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Estimation Financière */}
              <section className="dv-card">
                <h2 className="dv-card-title dcd-section-title">Estimation Financière (DZD)</h2>
                <div className="dcd-fin-box">
                  <span className="dcd-fin-currency">DA</span>
                  <span className="dcd-fin-amount">{totalEstime.toLocaleString('fr-FR')}</span>
                </div>
                <p className="dcd-fin-note">
                  {equipements.length > 0
                    ? `Basé sur ${equipements.length} équipement(s) déclaré(s)`
                    : 'Montant estimé initial'}
                </p>
              </section>

              {/* Pièces Jointes */}
              <section className="dv-card">
                <div className="dv-card-title-row dv-card-title-row--between">
                  <h2 className="dv-card-title">Pièces Jointes</h2>
                  <span className="dv-files-count">
                    <IconFolder />
                    {pieces.length} Fichier{pieces.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="dv-pj-grid">
                  {pieces.length === 0 ? (
                    <p className="dcd-pj-empty">Aucune pièce jointe</p>
                  ) : pieces.map((piece, i) => {
                    const fileUrl = piece.fichier?.startsWith('http') ? piece.fichier : `http://localhost:8000${piece.fichier}`
                    const isImage = piece.fichier && /\.(jpg|jpeg|png|gif|webp)$/i.test(piece.fichier)
                    return isImage ? (
                      <a key={piece.idPiece || i} href={fileUrl} target="_blank" rel="noopener noreferrer"
                        className="dv-pj-thumb" style={{ backgroundImage: `url(${fileUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    ) : (
                      <a key={piece.idPiece || i} href={fileUrl} target="_blank" rel="noopener noreferrer" className="dv-pj-thumb dv-pj-pdf">
                        <IconFile /><span>{piece.titreDoc || `Document ${i + 1}`}</span>
                      </a>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="dv-actions">
            <button className="dv-hold-btn" onClick={handleInfoManquante} disabled={submitting}>
              Mettre en Attente (Infos Manquantes)
            </button>
            <button className="dv-pdf-btn" onClick={exportPDF}>
              Imprimer le Dossier
              <IconArrow />
            </button>
            <button className="dv-validate-btn" onClick={handleValider} disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}>
              <IconCheck />
              {submitting ? 'Traitement...' : 'Valider le Dossier'}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Reusable sub-components ── */
function ChipItem({ label, value }) {
  return (
    <div className="dv-chip">
      <span className="dv-chip-label">{label}</span>
      <span className="dv-chip-val">{value}</span>
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div className="dv-info-field">
      <span className="dv-info-label">{label}</span>
      <span className="dv-info-val">{value || 'N/A'}</span>
    </div>
  )
}

/* ── Icons ── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconUserCard() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconDocument() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconFolder() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2z"/></svg> }
function IconFile() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function IconArrow() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }
function IconCheck() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> }
