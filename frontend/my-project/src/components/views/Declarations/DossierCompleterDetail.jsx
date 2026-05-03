import { useState, useEffect, useCallback, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../../api'
import { AuthContext } from '../../../context/AuthContext'
import './DossierValidation.css'
import './DossierCompleterDetail.css'
import ClaimTimeline from '../../ClaimTimeline/ClaimTimeline'

/* ── Nature → badge style ─────────────────── */
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

const EMPTY_EQUIP = { nomMarque: '', quantiteImpactee: 1, valeurComptable: 0 }

export default function DossierCompleterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unreadNotifsCount } = useContext(AuthContext)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showEquipForm, setShowEquipForm] = useState(false)
  const [newEquip, setNewEquip] = useState(EMPTY_EQUIP)

  // ── Fetch sinistre data ──
  useEffect(() => {
    setLoading(true)
    api.get(`/sinistres/${id}/`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Erreur lors du chargement du dossier'))
      .finally(() => setLoading(false))
  }, [id])

  // ── Add equipment ──
  const handleAddEquipement = useCallback(async () => {
    if (!newEquip.nomMarque.trim()) {
      toast.error("Veuillez saisir le nom de l'équipement")
      return
    }
    try {
      const res = await api.post('/equipements/', {
        idEquipement: `EQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nomMarque: newEquip.nomMarque,
        quantiteImpactee: newEquip.quantiteImpactee,
        valeurComptable: newEquip.valeurComptable,
        sinistre: id,
      })
      setData(prev => ({ ...prev, equipements: [...(prev.equipements || []), res.data] }))
      setNewEquip(EMPTY_EQUIP)
      setShowEquipForm(false)
      toast.success('Équipement ajouté')
    } catch {
      toast.error("Erreur lors de l'ajout de l'équipement")
    }
  }, [newEquip, id])

  // ── Remove equipment ──
  const handleRemoveEquipement = useCallback(async (equipId) => {
    try {
      await api.delete(`/equipements/${equipId}/`)
      setData(prev => ({ ...prev, equipements: prev.equipements.filter(e => e.idEquipement !== equipId) }))
      toast.success('Équipement supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }, [])

  // ── Computed values (derived from data) ──
  const equipements = data?.equipements || []
  const pieces = data?.piecesJointes || []
  const totalEstime = equipements.length > 0
    ? equipements.reduce((sum, e) => sum + (parseFloat(e.valeurComptable) || 0) * (e.quantiteImpactee || 1), 0)
    : parseFloat(data?.montantEstime) || 0

  // ── Complete dossier (send to expertise) ──
  const handleCompleterDossier = useCallback(async () => {
    setSubmitting(true)
    try {
      await api.post(`/sinistres/${id}/expertise/`, {
        observationsIngenieur: data?.descriptionDetailliee || 'Expertise complétée.',
        montantEstime: totalEstime,
      })
      toast.success('Dossier complété et transmis pour expertise')
      navigate('/declarations', { state: { tab: 'valider' } })
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Vous n'avez pas la permission de compléter ce dossier.")
      } else {
        toast.error(err.response?.data?.error || 'Erreur lors de la complétion du dossier')
      }
    } finally {
      setSubmitting(false)
    }
  }, [id, data, totalEstime, navigate])

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="dv-page-content">
        <div className="dv-main dcd-center">
          <div className="dcd-spinner" />
          <p className="dcd-loading-text">Chargement du dossier...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="dv-page-content">
        <div className="dv-main dcd-center">
          <p className="dcd-error-text">Dossier introuvable</p>
        </div>
      </div>
    )
  }

  const ns = NATURE_STYLES[data.nature] || { bg: '#f0f0f0', color: '#555' }
  const declarant = data.createur_detail || {}
  const site = data.site_detail || {}
  const gpsText = (site.latitude && site.longitude)
    ? `${site.latitude.toFixed(4)}° N, ${site.longitude.toFixed(4)}° E`
    : 'Non disponible'
  const siteLabel = [site.wilaya, site.nomSite].filter(Boolean).join(' – ') || site.codeSite || 'N/A'
  const dateLabel = data.dateSurvenance
    ? new Date(data.dateSurvenance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const statutLabel = data.statut === 'OUVERT' ? 'DOSSIER EN ATTENTE' : data.statut_label?.toUpperCase() || data.statut

  return (
    <div className="dv-page-content">
      <div className="dv-main">

        <main className="dv-content">
          <ClaimTimeline currentStatus={data.statut} />

          {/* ── Page header ── */}
          <div className="dv-page-header">
            <div className="dv-page-meta">
              <span className="dv-eyebrow">
                <IconDocument />
                {statutLabel}
              </span>
              <span className="dv-eyebrow-id">#{data.idSinistre}</span>
            </div>
            <div className="dv-header-row">
              <h1 className="dv-title">Dossier à Compléter</h1>
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

          {/* ── Two-column body ── */}
          <div className="dv-body">

            {/* LEFT */}
            <div className="dv-left">
              {/* Informations du Déclarant */}
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
                    <div className="dv-gps-val">
                      <IconPin />
                      {gpsText}
                    </div>
                  </div>
                </div>

                <div className="dv-site-photo">
                  <div className="dv-photo-bg" />
                  <div className="dv-photo-overlay" />
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

              {/* Équipements Sinistrés */}
              <section className="dv-card dcd-equip-section">
                <div className="dv-card-title-row dv-card-title-row--between dcd-equip-header">
                  <h2 className="dv-card-title dcd-section-title">Équipements Sinistrés</h2>
                  <button className="dcd-add-btn" onClick={() => setShowEquipForm(!showEquipForm)}>
                    <IconPlus /> Ajouter
                  </button>
                </div>

                {showEquipForm && (
                  <div className="dcd-equip-form">
                    <div className="dcd-form-field">
                      <label className="dcd-form-label">Nom / Marque</label>
                      <input
                        type="text"
                        className="dcd-form-input"
                        placeholder="Ex: Routeur Cisco 9k"
                        value={newEquip.nomMarque}
                        onChange={e => setNewEquip(prev => ({ ...prev, nomMarque: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div className="dcd-form-row">
                      <div className="dcd-form-field">
                        <label className="dcd-form-label">Quantité</label>
                        <input
                          type="number"
                          className="dcd-form-input"
                          min="1"
                          value={newEquip.quantiteImpactee}
                          onChange={e => setNewEquip(prev => ({ ...prev, quantiteImpactee: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="dcd-form-field">
                        <label className="dcd-form-label">Valeur (DZD)</label>
                        <input
                          type="number"
                          className="dcd-form-input"
                          min="0"
                          placeholder="0"
                          value={newEquip.valeurComptable || ''}
                          onChange={e => setNewEquip(prev => ({ ...prev, valeurComptable: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className="dcd-form-actions">
                      <button className="dcd-btn-cancel" onClick={() => { setShowEquipForm(false); setNewEquip(EMPTY_EQUIP) }}>
                        Annuler
                      </button>
                      <button className="dcd-btn-confirm" onClick={handleAddEquipement}>
                        <IconCheck /> Confirmer
                      </button>
                    </div>
                  </div>
                )}

                <ul className="dcd-equip-list">
                  {equipements.length === 0 ? (
                    <li className="dcd-equip-empty">Aucun équipement ajouté</li>
                  ) : equipements.map((item) => (
                    <li key={item.idEquipement} className="dcd-equip-item">
                      <div className="dcd-equip-info">
                        <p className="dcd-equip-name">{item.nomMarque}</p>
                        <p className="dcd-equip-meta">
                          QUANTITÉ: {item.quantiteImpactee}x {item.quantiteImpactee === 1 ? 'UNITÉ' : 'UNITÉS'}
                          {item.valeurComptable > 0 && ` • ${parseFloat(item.valeurComptable).toLocaleString('fr-FR')} DZD`}
                        </p>
                      </div>
                      <button className="dcd-equip-remove" onClick={() => handleRemoveEquipement(item.idEquipement)} aria-label="Supprimer">
                        <IconX />
                      </button>
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
                        <IconFile />
                        <span>{piece.titreDoc || `Document ${i + 1}`}</span>
                      </a>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>

          {/* Bottom action */}
          <div className="dv-actions">
            <button className="dv-pdf-btn" onClick={handleCompleterDossier} disabled={submitting}
              style={{ width: '100%', justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Traitement en cours...' : 'Compléter le dossier'}
              {!submitting && <IconCheckMark />}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Reusable sub-components ─────────────────────────── */
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

/* ── Icons (deduplicated) ────────────────────────────── */
function IconBell() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconUserCard() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconDocument() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> }
function IconX() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconCheck() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> }
function IconCheckMark() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconFolder() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2z"/></svg> }
function IconFile() { return <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
