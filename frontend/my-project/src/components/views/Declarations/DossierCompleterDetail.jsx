import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AsyncSelect from 'react-select/async'
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

const EMPTY_EQUIP = { nomMarque: '', quantiteImpactee: 1, valeurComptable: '' }

export default function DossierCompleterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unreadNotifsCount } = useContext(AuthContext)
  const fileInputRef = useRef(null)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showEquipForm, setShowEquipForm] = useState(false)
  const [newEquip, setNewEquip] = useState(EMPTY_EQUIP)
  const [observationsIngenieur, setObservationsIngenieur] = useState('')

  // ── Equipment autocomplete state ──
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [refAvgValue, setRefAvgValue] = useState(null)

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
        quantiteImpactee: newEquip.quantiteImpactee || 1,
        valeurComptable: newEquip.valeurComptable || 0,
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

  // ── Fetch equipment suggestions (AsyncSelect) ──
  const loadEquipOptions = useCallback((inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return Promise.resolve([])
    }
    return api.get(`/equipements/suggestions/?q=${encodeURIComponent(inputValue)}`)
      .then(res => {
        return (res.data || []).map(eq => ({
          value: eq.nomMarque,
          label: eq.nomMarque,
          avgValue: eq.avgValue,
          count: eq.count
        }))
      })
      .catch(() => [])
  }, [])

  const handleEquipSelect = (option) => {
    if (option) {
      setNewEquip(prev => ({
        ...prev,
        nomMarque: option.value,
        valeurComptable: option.avgValue || 0,
      }))
      setRefAvgValue(option.avgValue)
    } else {
      setNewEquip(prev => ({ ...prev, nomMarque: '', valeurComptable: '' }))
      setRefAvgValue(null)
    }
  }

  // Handle manual typing in the AsyncSelect
  const handleEquipInputChange = (inputValue, { action }) => {
    if (action === 'input-change') {
      setNewEquip(prev => ({ ...prev, nomMarque: inputValue }))
      setRefAvgValue(null)
    }
  }

  // ── Value validation helper ──
  const getValueWarning = () => {
    if (!refAvgValue || refAvgValue === 0 || !newEquip.valeurComptable) return null
    const ratio = newEquip.valeurComptable / refAvgValue
    if (ratio > 1.2) return { type: 'high', msg: `Valeur élevée — ${Math.round(ratio * 100)}% de la moyenne historique (${refAvgValue.toLocaleString('fr-FR')} DZD)` }
    if (ratio < 0.2) return { type: 'low', msg: `Valeur très faible — ${Math.round(ratio * 100)}% de la moyenne historique (${refAvgValue.toLocaleString('fr-FR')} DZD)` }
    return null
  }
  const valueWarning = getValueWarning()

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

  // ── File upload ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('titreDoc', file.name)
    formData.append('typePiece', 'AUTRE')
    try {
      const res = await api.post(`/sinistres/${id}/pieces/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Document ajouté')
      setData(prev => ({ ...prev, piecesJointes: [...(prev.piecesJointes || []), res.data] }))
    } catch (err) {
      console.error("Upload error:", err.response?.status, err.response?.data)
      const detail = err.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
        : ''
      toast.error(`Erreur lors de l'ajout${detail ? ': ' + detail : ''}`)
    }
  }

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
        observationsIngenieur: observationsIngenieur.trim() || data?.descriptionDetailliee || 'Expertise complétée.',
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
  // Ingénieur can only edit while dossier is still in expertise phase
  const canEdit = ['OUVERT', 'EN_EXPERTISE', 'REJET_POUR_COMPLEMENT'].includes(data.statut)
  const gpsText = (site.latitude && site.longitude)
    ? `${site.latitude.toFixed(4)}° N, ${site.longitude.toFixed(4)}° E`
    : 'Non disponible'
  const siteLabel = [site.wilaya, site.nomSite].filter(Boolean).join(' – ') || site.codeSite || 'N/A'
  const dateLabel = data.dateSurvenance
    ? new Date(data.dateSurvenance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const timeLabel = data.heureSurvenance ? data.heureSurvenance.substring(0, 5) : 'N/A'
  const urgenceLabel = data.urgence === 3 ? 'HAUTE' : data.urgence === 2 ? 'MOYENNE' : 'FAIBLE'
  const statutLabel = data.statut === 'OUVERT' ? 'DOSSIER EN ATTENTE' : data.statut_label?.toUpperCase() || data.statut

  return (
    <div className="dv-page-content">
      <div className="dv-main">

        <main className="dv-content">
          <ClaimTimeline currentStatus={data.statut} nature={data.nature} />

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
            </div>
          </div>

          {/* Commentaire assurance (full width, above body) */}
          {data.motifRejet && (
            <section className="dv-card" style={{ border: '1.5px solid #fde68a', background: '#fffbeb' }}>
              <div className="dv-card-title-row">
                <span style={{ fontSize: 18 }}>⚠️</span>
                <h2 className="dv-card-title" style={{ color: '#92400e' }}>Commentaire de l'Assurance</h2>
              </div>
              <p style={{ fontSize: 13.5, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{data.motifRejet}</p>
            </section>
          )}

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
                    <span className="dv-info-label">DESCRIPTION INITIALE DU SITE</span>
                    <p className="dv-info-desc">{data.descriptionDetailliee || 'Aucune description fournie.'}</p>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">TYPE DE SINISTRE</span>
                    <p className="dv-info-val" style={{ fontWeight: 700, color: '#0F172A' }}>{data.typeSinistre_label || data.typeSinistre}</p>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">HEURE DE SURVENANCE</span>
                    <p className="dv-info-val">{timeLabel}</p>
                  </div>

                  <div className="dv-info-field">
                    <span className="dv-info-label">COORDONNÉES GPS</span>
                    <div className="dv-gps-val"><IconPin />{gpsText}</div>
                  </div>
                </div>

                <div className="dv-site-photo" style={{ marginTop: '20px' }}>
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

              {/* Équipements Sinistrés - Hidden for Equipe Terrain */}
              {user?.role !== 'EQUIPE_TERRAIN' && (
                <section className="dv-card dcd-equip-section">
                  <div className="dv-card-title-row dv-card-title-row--between dcd-equip-header">
                    <h2 className="dv-card-title dcd-section-title">Équipements Sinistrés</h2>
                    {canEdit && (
                      <button className="dcd-add-btn" onClick={() => setShowEquipForm(!showEquipForm)}>
                        <IconPlus /> Ajouter
                      </button>
                    )}
                  </div>

                {showEquipForm && (
                  <div className="dcd-equip-form">
                    <div className="dcd-form-field" style={{ position: 'relative' }}>
                      <label className="dcd-form-label">Nom / Marque</label>
                      <AsyncSelect
                        cacheOptions
                        defaultOptions={false}
                        loadOptions={loadEquipOptions}
                        onChange={handleEquipSelect}
                        onInputChange={handleEquipInputChange}
                        inputValue={newEquip.nomMarque}
                        value={newEquip.nomMarque ? { value: newEquip.nomMarque, label: newEquip.nomMarque } : null}
                        placeholder="Ex: Routeur Cisco 9k..."
                        noOptionsMessage={({ inputValue }) =>
                          inputValue ? 'Aucun équipement trouvé' : 'Tapez au moins 2 caractères'
                        }
                        loadingMessage={() => 'Recherche...'}
                        isClearable
                        formatOptionLabel={(option) => (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{option.label}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              ~{option.avgValue?.toLocaleString('fr-FR')} DZD • {option.count}x
                            </span>
                          </div>
                        )}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            backgroundColor: '#fff',
                            border: state.isFocused ? '1.5px solid #E2000F' : '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '2px',
                            fontSize: '0.95rem',
                            boxShadow: state.isFocused ? '0 0 0 3px rgba(226,0,15,0.10)' : 'none',
                            '&:hover': { borderColor: '#E2000F' },
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? '#E2000F' : state.isFocused ? '#FFF1F2' : '#fff',
                            color: state.isSelected ? '#fff' : '#1E293B',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                          }),
                        }}
                      />
                    </div>
                    <div className="dcd-form-row">
                      <div className="dcd-form-field">
                        <label className="dcd-form-label">Quantité</label>
                        <input
                          type="number"
                          className="dcd-form-input"
                          min="1"
                          value={newEquip.quantiteImpactee === '' ? '' : newEquip.quantiteImpactee}
                          onChange={e => setNewEquip(prev => ({ ...prev, quantiteImpactee: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="dcd-form-field">
                        <label className="dcd-form-label">Valeur (DZD)</label>
                        <input
                          type="number"
                          className="dcd-form-input"
                          min="0"
                          placeholder="0"
                          value={newEquip.valeurComptable === '' ? '' : newEquip.valeurComptable}
                          onChange={e => setNewEquip(prev => ({ ...prev, valeurComptable: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                          style={valueWarning ? { borderColor: valueWarning.type === 'high' ? '#ef4444' : '#f59e0b' } : {}}
                        />
                        {valueWarning && (
                          <div style={{
                            marginTop: '6px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: valueWarning.type === 'high' ? '#fef2f2' : '#fffbeb',
                            color: valueWarning.type === 'high' ? '#dc2626' : '#d97706',
                            border: `1px solid ${valueWarning.type === 'high' ? '#fecaca' : '#fde68a'}`
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            {valueWarning.msg}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="dcd-form-actions">
                      <button className="dcd-btn-cancel" onClick={() => { setShowEquipForm(false); setNewEquip(EMPTY_EQUIP); setRefAvgValue(null) }}>
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
                      {canEdit && (
                        <button className="dcd-equip-remove" onClick={() => handleRemoveEquipement(item.idEquipement)} aria-label="Supprimer">
                          <IconX />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

              {/* Estimation Financière - Hidden for Equipe Terrain */}
              {user?.role !== 'EQUIPE_TERRAIN' && (
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
              )}

              {/* Pièces Jointes */}
              <section className="dv-card">
                <div className="dv-card-title-row dv-card-title-row--between">
                  <h2 className="dv-card-title">Pièces Jointes</h2>
                  <div className="dv-files-count" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {canEdit && (
                      <button className="dcd-add-btn" onClick={() => fileInputRef.current?.click()}>+ Ajouter</button>
                    )}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <span className="dv-files-count">
                      <IconFolder />
                      {pieces.length} Fichier{pieces.length !== 1 ? 's' : ''}
                    </span>
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
                        <IconFile />
                        <span>{piece.titreDoc || `Document ${i + 1}`}</span>
                      </a>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>

          {/* Bottom action - only visible while dossier is in EN_EXPERTISE */}
          {user?.role !== 'EQUIPE_TERRAIN' && canEdit && (
            <div className="dv-actions">
              <button className="dv-pdf-btn" onClick={handleCompleterDossier} disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Traitement en cours...' : 'Compléter le dossier'}
                {!submitting && <IconCheckMark />}
              </button>
            </div>
          )}
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
