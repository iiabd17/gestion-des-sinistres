import { useState, useEffect, useRef, useContext } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api from '../../../api'
import { toast } from 'react-toastify'
import { AuthContext } from '../../../context/AuthContext'
import jsPDF from 'jspdf'
import '../Declarations/DossierValidation.css'
import '../Declarations/DossierCompleterDetail.css'
import './DossierGestionDetail.css'
import ClaimTimeline from '../../ClaimTimeline/ClaimTimeline'

const NATURE_STYLES = {
  'INCENDIE': { bg: '#fef9c3', color: '#a16207' },
  'VOL': { bg: '#ede9fe', color: '#7c3aed' },
  'ACTE_DE_SABOTAGE': { bg: '#ede9fe', color: '#7c3aed' },
  'FIBRE_OPTIQUE': { bg: '#dbeafe', color: '#1d4ed8' },
  'INTEMPERIE': { bg: '#dbeafe', color: '#1d4ed8' },
  'CATASTROPHE_NATUREL': { bg: '#fee2e2', color: '#b91c1c' },
  'VIOLENCE_POLITIQUE': { bg: '#fce7f3', color: '#be185d' },
  'RC': { bg: '#d1fae5', color: '#065f46' },
}

export default function DossierGestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const { user, unreadNotifsCount } = useContext(AuthContext)
  const isAdminOrAssurance = ['ADMIN', 'ASSURANCE'].includes(user?.role)

  const [data, setData] = useState(null)
  const [statuts, setStatuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [numeroPV, setNumeroPV] = useState('')

  useEffect(() => {
    api.get('/constants/').then(res => setStatuts(res.data.statuts || [])).catch(() => { })
    api.get(`/sinistres/${id}/`)
      .then(res => {
        setData(res.data)
        setNumeroPV(res.data.numeroPV || '')
      })
      .catch(() => toast.error('Erreur de chargement du dossier'))
      .finally(() => setLoading(false))
  }, [id])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('titreDoc', file.name)
    formData.append('typePiece', user?.role === 'HSE' ? 'RAPPORT_HSE' : 'AUTRE')
    try {
      const res = await api.post(`/sinistres/${id}/pieces/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Document ajouté')
      setData(prev => ({ ...prev, piecesJointes: [...(prev.piecesJointes || []), res.data] }))

      // HSE: after uploading rapport, auto-validate if dossier is EN_VALIDATION_HSE
      if (user?.role === 'HSE' && data.statut === 'EN_VALIDATION_HSE') {
        try {
          const valRes = await api.post(`/sinistres/${id}/validation-hse/`, {
            observationsHSE: `Rapport HSE ajouté : ${file.name}`,
          })
          setData(valRes.data)
          toast.success('Dossier validé par HSE')
        } catch (err) {
          toast.error(err.response?.data?.error || 'Erreur lors de la validation HSE')
        }
      }
    } catch (err) {
      console.error("Upload error:", err.response?.status, err.response?.data)
      const detail = err.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
        : ''
      toast.error(`Erreur lors de l'ajout${detail ? ': ' + detail : ''}`)
    }
  }

  const handleStatutChange = async (e) => {
    const newStatut = e.target.value
    try {
      await api.put(`/sinistres/${id}/`, { statut: newStatut })
      setData(prev => ({ ...prev, statut: newStatut, statut_label: statuts.find(s => s.code === newStatut)?.label || newStatut }))
      toast.success('Statut mis à jour')
    } catch { toast.error('Erreur lors de la mise à jour') }
  }

  const handleSavePV = async () => {
    if (!numeroPV || numeroPV === data.numeroPV) return
    try {
      await api.patch(`/sinistres/${id}/`, { numeroPV })
      setData(prev => ({ ...prev, numeroPV }))
      toast.success('Numéro du PV sauvegardé')

      // Legal: after saving PV, auto-validate if dossier is EN_VALIDATION_LEGAL
      if (user?.role === 'LEGAL' && data.statut === 'EN_VALIDATION_LEGAL') {
        try {
          const valRes = await api.post(`/sinistres/${id}/validation-legal/`, {
            numeroPV,
          })
          setData(valRes.data)
          toast.success('Dossier validé par le service Légal')
        } catch (err) {
          toast.error(err.response?.data?.error || 'Erreur lors de la validation légale')
        }
      }
    } catch { toast.error('Erreur lors de la sauvegarde du PV') }
  }

  const handleValidateFranchise = async () => {
    try {
      const res = await api.post(`/sinistres/${id}/validation-franchise/`)
      setData(res.data)
      toast.success('Clôture validée avec succès')
    } catch (error) {
      toast.error('Erreur lors de la validation de la clôture')
    }
  }

  const handleCloturer = async () => {
    if (!window.confirm('Clôturer définitivement ce dossier ?')) return
    try {
      const res = await api.post(`/sinistres/${id}/cloturer/`)
      setData(res.data)
      toast.success('Dossier clôturé avec succès')
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de la clôture")
    }
  }

  const handleArchiver = async () => {
    if (!window.confirm('Archiver définitivement ce dossier ?')) return
    try {
      const res = await api.post(`/sinistres/${id}/archiver/`)
      setData(res.data)
      toast.success('Dossier archivé avec succès')
      // Si on est dans la vue gestion, on redirige vers la liste car le dossier n'y appartient plus
      if (location.pathname.startsWith('/gestion')) {
        navigate('/gestion')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'archivage")
    }
  }

  const exportPDF = async () => {
    try {
      toast.info('Génération du PDF...')
      const pdf = new jsPDF('p', 'mm', 'a4')

      try {
        const logoImg = await new Promise((resolve, reject) => {
          const img = new Image(); img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = '/djezzy-logo.png';
        });
        const c = document.createElement('canvas');
        c.width = logoImg.width; c.height = logoImg.height;
        c.getContext('2d').drawImage(logoImg, 0, 0);
        const logoData = c.toDataURL('image/png');
        pdf.addImage(logoData, 'PNG', 160, 10, 30, 30);
      } catch (e) {
        console.error("Erreur chargement logo", e);
      }

      let y = 30
      pdf.setFontSize(22); pdf.setTextColor(226, 0, 15)
      pdf.text(`Dossier Sinistre: #${id}`, 20, y); y += 10
      pdf.setFontSize(11); pdf.setTextColor(113, 128, 150)
      pdf.text(`Déclaré le : ${new Date(data.dateCreation).toLocaleDateString('fr-FR')}`, 20, y); y += 8
      
      const validationHistory = data.historiqueStatuts?.find(h => h.nouveauStatut === 'VALIDE');
      if (validationHistory) {
        pdf.text(`Validé par : ${validationHistory.modifiePar_nom || 'Inconnu'}`, 20, y); y += 10
      } else {
        y += 2
      }

      pdf.setFontSize(16); pdf.setTextColor(26, 32, 44)
      pdf.text("Informations de l'incident", 20, y); y += 10
      pdf.setFontSize(12); pdf.setTextColor(74, 85, 104)
      
      const cout = data.equipements?.length > 0 
        ? data.equipements.reduce((s, e) => s + (parseFloat(e.valeurComptable) || 0) * (e.quantiteImpactee || 1), 0) 
        : parseFloat(data.montantEstime || 0)

      const infos = [
        `Type : ${data.nature_label || ''}`,
        `Date : ${new Date(data.dateSurvenance).toLocaleDateString('fr-FR')}`,
        `Site : ${data.site_detail?.wilaya || ''} (${data.site_detail?.codeSite || ''})`,
        `Coût estimé : ${cout.toLocaleString('fr-FR')} DZD`,
        `Statut : ${data.statut_label || data.statut || ''}`,
      ]
      infos.forEach(info => { pdf.text(info, 20, y); y += 8 })

      const addSection = (title, items) => {
        y += 5;
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.setFontSize(14); pdf.setTextColor(26, 32, 44);
        pdf.text(title, 20, y); y += 8;
        pdf.setFontSize(11); pdf.setTextColor(74, 85, 104);
        items.forEach(item => {
          if (!item) return;
          const lines = pdf.splitTextToSize(item, 170);
          lines.forEach(line => {
            if (y > 280) { pdf.addPage(); y = 20; }
            pdf.text(line, 20, y); y += 6;
          });
        });
        y += 2;
      };

      const declarant = data.createur_detail || {};
      addSection("Informations du Déclarant", [
        `Nom complet : ${declarant.nom_complet || data.createur_nom || 'N/A'}`,
        `Téléphone : ${declarant.tel || 'N/A'}`,
        `Matricule / Emploi : ${declarant.matricule || declarant.username || 'N/A'}`,
        `Département / Fonction : ${declarant.departement || declarant.fonction || 'N/A'}`
      ]);

      addSection("Détails Techniques", [
        `Description : ${data.descriptionDetailliee || 'N/A'}`,
        `Coordonnées GPS du site : ${data.site_detail?.latitude && data.site_detail?.longitude ? `${data.site_detail.latitude}° N, ${data.site_detail.longitude}° E` : 'Non disponible'}`,
        `Heure de survenance : ${data.heureSurvenance ? data.heureSurvenance.substring(0, 5) : 'Non spécifiée'}`
      ]);

      if (data.equipements && data.equipements.length > 0) {
        const eqList = data.equipements.map(e => `- ${e.nomMarque} (Qté: ${e.quantiteImpactee || 1}) : ${parseFloat(e.valeurComptable || 0).toLocaleString('fr-FR')} DZD`);
        addSection("Équipements Sinistrés", eqList);
      }

      if (data.numeroPV || data.observationsLegal) {
        addSection("Service Légal", [
          data.numeroPV ? `Numéro du PV de Police : ${data.numeroPV}` : '',
          data.observationsLegal ? `Observations : ${data.observationsLegal}` : ''
        ].filter(Boolean));
      }

      if (data.observationsHSE || data.mesuresCorrectives) {
        addSection("Service HSE", [
          data.observationsHSE ? `Observations HSE : ${data.observationsHSE}` : '',
          data.mesuresCorrectives ? `Mesures Correctives : ${data.mesuresCorrectives}` : ''
        ].filter(Boolean));
      }

      if (data.motifRejet) {
        addSection("Commentaire Assurance / Rejet", [data.motifRejet]);
      }

      pdf.save(`Dossier_${id}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch { toast.error("Erreur lors de la génération du PDF") }
  }

  if (loading) return (
    <div className="dv-page-content">
      <div className="dv-main dcd-center"><div className="dcd-spinner" /><p className="dcd-loading-text">Chargement...</p></div>
    </div>
  )
  if (!data) return (
    <div className="dv-page-content">
      <div className="dv-main dcd-center"><p className="dcd-error-text">Dossier introuvable</p></div>
    </div>
  )

  const ns = NATURE_STYLES[data.nature] || { bg: '#f0f0f0', color: '#555' }
  const declarant = data.createur_detail || {}
  const site = data.site_detail || {}
  const equipements = data.equipements || []
  const pieces = data.piecesJointes || []
  const siteLabel = [site.wilaya, site.nomSite].filter(Boolean).join(' – ') || site.codeSite || 'N/A'
  const dateLabel = data.dateSurvenance
    ? new Date(data.dateSurvenance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const gpsText = (site.latitude && site.longitude)
    ? `${parseFloat(site.latitude).toFixed(4)}° N, ${parseFloat(site.longitude).toFixed(4)}° E`
    : 'Non disponible'
  const cout = equipements.length > 0
    ? equipements.reduce((s, e) => s + (parseFloat(e.valeurComptable) || 0) * (e.quantiteImpactee || 1), 0)
    : parseFloat(data.montantEstime || 0)

  const canModify = () => {
    if (user?.role === 'EQUIPE_TERRAIN') return false;
    if (['CLOTURE', 'CLOTURE_SOUS_FRANCHISE', 'ARCHIVE'].includes(data.statut)) return false;
    
    if (user?.role === 'INGENIEUR') {
      return ['OUVERT', 'EN_EXPERTISE', 'REJET_POUR_COMPLEMENT'].includes(data.statut);
    }
    if (user?.role === 'HSE') {
      return data.statut === 'EN_VALIDATION_HSE';
    }
    if (user?.role === 'LEGAL') {
      return data.statut === 'EN_VALIDATION_LEGAL';
    }
    return true;
  };
  return (
    <div className="dv-page-content">
      <div className="dv-main">

        <main className="dv-content">
          <ClaimTimeline currentStatus={data.statut} nature={data.nature} />
          <div className="dv-page-header">
            <div className="dv-page-meta">
              <span className="dv-eyebrow"><IconDocument />{data.statut_label?.toUpperCase() || data.statut}</span>
              <span className="dv-eyebrow-id">#{data.idSinistre}</span>
            </div>
            <div className="dv-header-row">
              <h1 className="dv-title">Dossier</h1>
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
              {/* Action buttons */}
              <div className="dgd-actions-row">
                {data.statut === 'ATTENTE_VALIDATION_FRANCHISE' && isAdminOrAssurance && (
                  <button className="dgd-btn-secondary" style={{ background: '#E2000F', color: 'white', borderColor: '#E2000F' }} onClick={handleValidateFranchise}>
                    Valider Clôture
                  </button>
                )}
                {['VALIDE', 'EN_VALIDATION_LEGAL', 'EN_VALIDATION_HSE', 'TRANSMIS_ASSUREUR', 'REJETE'].includes(data.statut) && isAdminOrAssurance && (
                  <button className="dgd-btn-secondary" style={{ background: '#E2000F', color: 'white', borderColor: '#E2000F' }} onClick={handleCloturer}>
                    <IconCheckCircle /> Clôturer
                  </button>
                )}
                {data.statut !== 'ARCHIVE' && isAdminOrAssurance && (
                  <button
                    className="dgd-btn-secondary"
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                    onClick={handleArchiver}
                  >
                    <IconArchive /> Archiver
                  </button>
                )}
                {canModify() && (
                  <button className="dgd-btn-secondary" onClick={() => setIsEditing(!isEditing)}>
                    <IconEdit /> {isEditing ? 'Terminer' : 'Modifier'}
                  </button>
                )}
                <button className="dgd-btn-secondary" onClick={exportPDF}>
                  <IconDownload /> Export PDF
                </button>
                <button className="dgd-btn-close" onClick={() => {
                  if (location.pathname.startsWith('/archives')) {
                    navigate('/archives')
                  } else {
                    navigate('/gestion')
                  }
                }}>Fermer</button>
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
                  <InfoField label="TÉLÉPHONE" value={declarant.tel} />
                  <InfoField label="DÉPARTEMENT" value={declarant.departement || declarant.fonction} />
                </div>
              </section>

              {/* Détails Techniques */}
              <section className="dv-card">
                <h2 className="dv-card-title">Détails Techniques</h2>
                <div className="dv-tech-grid">
                  <div className="dv-info-field">
                    <span className="dv-info-label">DESCRIPTION</span>
                    <p className="dv-info-desc">{data.descriptionDetailliee || 'Aucune description fournie.'}</p>
                  </div>
                  {data.nature === 'FIBRE_OPTIQUE' && (
                    <div className="dv-info-field">
                      <span className="dv-info-label">HEURE DE RÉPARATION (FIBRE OPTIQUE)</span>
                      <p className="dv-info-val">{data.heureSurvenance ? data.heureSurvenance.substring(0, 5) : 'N/A'}</p>
                    </div>
                  )}
                  <div className="dv-info-field">
                    <span className="dv-info-label">COORDONNÉES GPS DU SITE</span>
                    <div className="dv-gps-val"><IconPin />{gpsText}</div>
                  </div>

                </div>
                <div className="dv-site-photo">
                  <div className="dv-photo-bg" /><div className="dv-photo-overlay" />
                  <svg className="dv-pylon-icon" viewBox="0 0 60 100" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" aria-hidden="true">
                    <line x1="30" y1="5" x2="30" y2="95" /><line x1="30" y1="20" x2="10" y2="50" /><line x1="30" y1="20" x2="50" y2="50" />
                    <line x1="30" y1="35" x2="15" y2="55" /><line x1="30" y1="35" x2="45" y2="55" />
                    <line x1="10" y1="50" x2="50" y2="50" /><line x1="15" y1="55" x2="45" y2="55" />
                    <line x1="10" y1="50" x2="10" y2="95" /><line x1="50" y1="50" x2="50" y2="95" />
                    <line x1="10" y1="95" x2="50" y2="95" /><line x1="5" y1="5" x2="55" y2="5" />
                    <circle cx="30" cy="5" r="3" fill="#E2000F" stroke="none" />
                  </svg>
                </div>
              </section>


              {/* Input Numéro PV Légal */}
              {data.statut === 'EN_VALIDATION_LEGAL' && (
                <section className="dv-card" style={{ marginBottom: '24px', border: user?.role === 'LEGAL' ? '1.5px solid #E2000F' : undefined, background: user?.role === 'LEGAL' ? '#fffbfb' : undefined }}>
                  <h2 className="dv-card-title dcd-section-title" style={{ fontSize: '13px' }}>NUMÉRO DU PV DE POLICE</h2>
                  {user?.role === 'LEGAL' && (
                    <p style={{ fontSize: '12px', color: '#E2000F', marginTop: '4px', marginBottom: '12px', fontWeight: 500 }}>
                      ⚠ Vous devez renseigner le numéro du PV pour valider cette étape.
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginTop: '12px' }}>
                    <div style={{ color: '#9ca3af', marginRight: '12px', display: 'flex' }}><IconGavel /></div>
                    {user?.role === 'LEGAL' ? (
                      <input
                        type="text"
                        value={numeroPV}
                        onChange={(e) => setNumeroPV(e.target.value)}
                        placeholder="Saisissez le N° du PV (ex: PV-2026-00123)"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: '100%', color: '#1e293b', fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    ) : (
                      <span style={{ fontSize: '14px', color: '#4b5563', fontFamily: 'monospace' }}>
                        {numeroPV || 'En attente du service Légal...'}
                      </span>
                    )}
                  </div>
                  {user?.role === 'LEGAL' && (
                    <button
                      onClick={handleSavePV}
                      disabled={!numeroPV || !numeroPV.trim()}
                      style={{
                        marginTop: '16px', width: '100%', padding: '12px 24px',
                        background: numeroPV?.trim() ? '#E2000F' : '#fca5a5',
                        color: '#fff', border: 'none', borderRadius: '10px',
                        fontSize: '13px', fontWeight: 700, cursor: numeroPV?.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s', boxShadow: numeroPV?.trim() ? '0 4px 12px rgba(226,0,15,0.2)' : 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <IconGavel /> Valider le PV et passer l'étape Légale
                    </button>
                  )}
                </section>
              )}

              {/* Service Légal */}
              {data.observationsLegal && user?.role !== 'EQUIPE_TERRAIN' && (
                <section className="dv-card">
                  <h2 className="dv-card-title">Service Légal</h2>
                  <div className="dv-info-grid">
                    <InfoField label="OBSERVATIONS" value={data.observationsLegal} />
                  </div>
                </section>
              )}

              {/* Service HSE */}
              {(data.observationsHSE || data.mesuresCorrectives) && user?.role !== 'EQUIPE_TERRAIN' && (
                <section className="dv-card">
                  <h2 className="dv-card-title">Service HSE</h2>
                  <div className="dv-info-grid">
                    {data.observationsHSE && <InfoField label="OBSERVATIONS HSE" value={data.observationsHSE} />}
                    {data.mesuresCorrectives && <InfoField label="MESURES CORRECTIVES" value={data.mesuresCorrectives} />}
                  </div>
                </section>
              )}

              {/* Commentaire Assurance */}
              {data.motifRejet && (
                <section className="dv-card" style={{ border: '1.5px solid #fde68a', background: '#fffbeb' }}>
                  <div className="dv-card-title-row">
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <h2 className="dv-card-title" style={{ color: '#92400e' }}>Commentaire de l'Assurance</h2>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{data.motifRejet}</p>
                </section>
              )}

              {/* Historique */}
              {(data.historiqueStatuts || []).length > 0 && (
                <section className="dv-card">
                  <h2 className="dv-card-title">Historique des Statuts</h2>
                  <div className="dgd-history-list">
                    {[...data.historiqueStatuts].reverse().slice(0, showFullHistory ? undefined : 2).map((h, i) => (
                      <div key={i} className="dgd-history-item">
                        <div className="dgd-history-dot" />
                        <div>
                          <p className="dgd-history-label">{h.ancienStatut || '—'} → {h.nouveauStatut}</p>
                          {h.commentaire && <p className="dgd-history-comment">{h.commentaire}</p>}
                          <p className="dgd-history-date">{new Date(h.dateChangement).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.historiqueStatuts.length > 2 && (
                    <button
                      className="dgd-btn-secondary"
                      style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
                      onClick={() => setShowFullHistory(!showFullHistory)}
                    >
                      {showFullHistory ? 'Voir moins' : 'Voir tout l\'historique'}
                    </button>
                  )}
                </section>
              )}
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
                  <span className="dcd-fin-amount">{cout.toLocaleString('fr-FR')}</span>
                </div>
                <p className="dcd-fin-note" style={{ marginBottom: '12px' }}>
                  {equipements.length > 0
                    ? `Basé sur ${equipements.length} équipement(s)`
                    : 'Montant estimé initial'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Franchise applicable</span>
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>
                    {typeof data.franchise_info === 'number' && data.franchise_info > 0
                      ? `${data.franchise_info.toLocaleString('fr-FR')} DA`
                      : data.franchise_info === 0 ? 'Aucune (0 DA)' : data.franchise_info}
                  </span>
                </div>
              </section>

              {/* Pièces Jointes */}
              <section className="dv-card">
                <div className="dv-card-title-row dv-card-title-row--between">
                  <h2 className="dv-card-title">Pièces Jointes</h2>
                  <div className="dv-files-count" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isEditing && canModify() && <button onClick={() => fileInputRef.current?.click()} className="dcd-add-btn">+ Ajouter</button>}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <span className="dv-files-count"><IconFolder />{pieces.length} Fichier{pieces.length !== 1 ? 's' : ''}</span>
                  </div>
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
        </main>
      </div>
    </div>
  )
}

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

function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> }
function IconUserCard() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> }
function IconDocument() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> }
function IconEdit() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> }
function IconDownload() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> }
function IconFolder() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2z" /></svg> }
function IconFile() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> }
function IconGavel() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" /></svg> }
function IconCheckCircle() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> }
function IconArchive() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> }
