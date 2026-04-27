import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AsyncSelect from 'react-select/async'
import api from '../../../api'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './NewDeclaration.css'

const incidentCategories = [
  {
    nature: 'Fibre Optique',
    types: [
      { value: 'FIBRE_OPTIQUE', label: 'Fibre Optique' },
    ]
  },
  {
    nature: 'Acte de Sabotage',
    types: [
      { value: 'ACTE_DE_SABOTAGE', label: 'Acte de Sabotage' },
    ]
  },
  {
    nature: 'Vol',
    types: [
      { value: 'VOL', label: 'Vol' },
      { value: 'VOL_PE', label: 'Vol + PE' },
    ]
  },
  {
    nature: 'Incendie',
    types: [
      { value: 'INCENDIE', label: 'Incendie' },
      { value: 'INCENDIE_PE', label: 'Incendie + PE' },
      { value: 'INCENDIE_SURTENSION_ELEC', label: 'Incendie Surtension Électrique' },
    ]
  },
  {
    nature: 'Intempérie',
    types: [
      { value: 'VENT_VIOLENT', label: 'Vent Violent' },
      { value: 'FOUDRE', label: 'Foudre' },
      { value: 'PLUIE', label: 'Pluie' },
    ]
  },
  {
    nature: 'Catastrophe Naturelle',
    types: [
      { value: 'TREMBLEMENT_DE_TERRE', label: 'Tremblement de Terre' },
      { value: 'TEMPETE', label: 'Tempête' },
      { value: 'INONDATION', label: 'Inondation' },
      { value: 'GLISSEMENT_DE_TERRAIN', label: 'Glissement de Terrain' },
      { value: 'DEGAT_DES_EAUX', label: 'Dégât des Eaux' },
    ]
  },
  {
    nature: 'Violence Politique',
    types: [
      { value: 'GREVES_EMEUTES', label: 'Grèves Émeutes' },
      { value: 'MOUVEMENT_POPULAIRE', label: 'Mouvement Populaire' },
      { value: 'AUTRES', label: 'Autres' },
    ]
  },
  {
    nature: 'RC',
    types: [
      { value: 'BRIS_DE_MACHINES', label: 'Bris de Machines' },
      { value: 'BRIS_DE_GLACES', label: 'Bris de Glaces' },
      { value: 'ACCIDENT_APPAREILS_ELEC', label: 'Accident aux Appareils Électriques' },
      { value: 'RISQUES_INFORMATIQUES_ELEC', label: 'Risques Informatiques & Électroniques' },
      { value: 'CHUTE_AERONEF_OBJET_SPATIAL', label: "Chute d'Aéronef ou Objet Spatial" },
      { value: 'TRANSPORT_INTERNE', label: 'Transport Interne' },
      { value: 'DOMMAGES', label: 'Dommages' },
    ]
  }
]

export default function NewDeclaration() {
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [type, setType]        = useState('')
  const [date, setDate]        = useState('')
  const [time, setTime]        = useState('')
  const [repairTime, setRepairTime] = useState('')
  const [code, setCode]        = useState('')
  const [selectedSite, setSelectedSite] = useState(null)
  const [desc, setDesc]        = useState('')
  const [address, setAddress]  = useState('')
  const [wilaya, setWilaya]    = useState('')
  const [files, setFiles]      = useState([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)

  // ── Autocomplete : charger les sites depuis l'API ──
  const loadSiteOptions = useCallback((inputValue) => {
    if (!inputValue || inputValue.length < 1) {
      return Promise.resolve([])
    }
    return api.get(`/sites/?search=${encodeURIComponent(inputValue)}`)
      .then(res => {
        return res.data.map(site => ({
          value: site.codeSite,
          label: `${site.codeSite} — ${site.nomSite} (${site.wilaya})`,
          site: site, // on stocke l'objet complet pour l'auto-fill
        }))
      })
      .catch(() => [])
  }, [])

  // ── Auto-fill quand un site est sélectionné ──
  const handleSiteChange = (option) => {
    setSelectedSite(option)
    if (option) {
      setCode(option.value)
      setAddress(option.site.adresseSite || '')
      setWilaya(option.site.wilaya || '')
    } else {
      setCode('')
      setAddress('')
      setWilaya('')
    }
  }

  const handleFiles = (incoming) => {
    const arr = Array.from(incoming).filter(f =>
      ['image/png','image/jpeg','application/pdf'].includes(f.type) && f.size <= 10 * 1024 * 1024
    )
    setFiles(prev => [...prev, ...arr].slice(0, 6))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation basique
    if (!type || !date || !code || !desc) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);

    try {
      // Retrouver la nature à partir du type
      const category = incidentCategories.find(cat => cat.types.some(t => t.value === type));
      
      // Mappage des types frontend vers Backend (qui utilisent parfois des codes spécifiques)
      let natureVal = '';
      if (category) {
        // Un mapping simple basé sur la catégorie du frontend vers le backend NATURE_CHOICES
        const natureMap = {
          'Fibre Optique': 'FIBRE_OPTIQUE',
          'Acte de Sabotage': 'ACTE_DE_SABOTAGE',
          'Vol': 'VOL',
          'Incendie': 'INCENDIE',
          'Intempérie': 'INTEMPERIE',
          'Catastrophe Naturelle': 'CATASTROPHE_NATUREL',
          'Violence Politique': 'VIOLENCE_POLITIQUE',
          'RC': 'RC'
        };
        natureVal = natureMap[category.nature] || category.nature;
      }

      // Génération d'un ID unique pour le sinistre
      const idSinistre = `SIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payload = {
        idSinistre: idSinistre,
        nature: natureVal,
        typeSinistre: type,
        dateSurvenance: date,
        heureSurvenance: time || null,
        descriptionDetailliee: desc,
        codeSite: code,
        urgence: 1 // Par défaut
      };

      // 1. Créer le sinistre
      await api.post('/sinistres/', payload);

      // 2. Uploader les fichiers si présents
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('sinistre', idSinistre);
          formData.append('titreDoc', file.name);
          formData.append('fichier', file);
          
          // Déterminer le type de pièce selon le rôle serait l'idéal, par défaut PHOTO_TERRAIN
          formData.append('typePiece', 'PHOTO_TERRAIN'); 

          await api.post('/pieces/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success('Déclaration de sinistre enregistrée avec succès !');
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        // Afficher la première erreur reçue
        const firstErrorKey = Object.keys(err.response.data)[0];
        const errorMessage = err.response.data[firstErrorKey];
        toast.error(`Erreur: ${firstErrorKey} - ${Array.isArray(errorMessage) ? errorMessage[0] : errorMessage}`);
      } else {
        toast.error('Une erreur est survenue lors de la création du sinistre.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nd-layout">
      <Sidebar />

      <div className="nd-main">
        {/* Top bar */}
        <header className="nd-topbar">
          <div className="nd-topbar-actions">
            <button className="nd-icon-btn" aria-label="Notifications">
              <IconBell />
              <span className="nd-notif-dot" />
            </button>
            <button className="nd-icon-btn" aria-label="Profil">
              <IconUser />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="nd-content">
          {/* Page heading */}
          <div className="nd-heading">
            <span className="nd-eyebrow">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 6 8 1 15 6"/><path d="M3 9v6h10V9"/></svg>
              ENREGISTREMENT DE SINISTRE
            </span>
            <h1 className="nd-title">Nouvelle Déclaration de Sinistre</h1>
            <p className="nd-subtitle">
              Veuillez remplir les informations suivantes avec précision pour faciliter le traitement de votre déclaration
            </p>
          </div>

          <form className="nd-form" onSubmit={handleSubmit} noValidate>
            <div className="nd-cols">

              {/* ── Left column ────────────────────────── */}
              <div className="nd-left">

                {/* Type d'incident */}
                <section className="nd-section-card">
                  <label className="nd-field-label" htmlFor="nd-type">Type d'incident</label>
                  <div className="nd-select-wrap">
                    <select
                      id="nd-type"
                      className="nd-select"
                      value={type}
                      onChange={e => setType(e.target.value)}
                      required
                    >
                      <option value="">Sélectionnez le type d'incident</option>
                      {incidentCategories.map(cat => (
                        <optgroup key={cat.nature} label={cat.nature}>
                          {cat.types.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <svg className="nd-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <p className="nd-helper">VEUILLEZ CLASSIFIER LA NATURE DE L'ÉVÉNEMENT</p>
                </section>

                {/* Détails */}
                <section className="nd-section-card">
                  <h2 className="nd-section-title">Détails de l'incident</h2>
                  <div className="nd-row-2">
                    <div className="nd-field">
                      <label className="nd-field-label" htmlFor="nd-date">DATE DE CONSTATATION</label>
                      <div 
                        className="nd-input-wrap"
                        onClick={() => {
                          const input = document.getElementById('nd-date');
                          if (input && input.showPicker) input.showPicker();
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <svg className="nd-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <input
                          id="nd-date"
                          type="date"
                          className="nd-input"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          onClick={e => {
                            if (e.target.showPicker) e.target.showPicker();
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                    <div className="nd-field">
                      <label className="nd-field-label" htmlFor="nd-time">HEURE DE CONSTATATION</label>
                      <div 
                        className="nd-input-wrap"
                        onClick={() => {
                          const input = document.getElementById('nd-time');
                          if (input && input.showPicker) input.showPicker();
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <svg className="nd-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <input
                          id="nd-time"
                          type="time"
                          className="nd-input"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          onClick={e => {
                            if (e.target.showPicker) e.target.showPicker();
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>

                  {type === 'FIBRE_OPTIQUE' && (
                    <div className="nd-field nd-field--full" style={{ marginBottom: '1.25rem' }}>
                      <label className="nd-field-label" htmlFor="nd-repair-time">HEURE DE RÉPARATION (Fibre Optique)</label>
                      <div 
                        className="nd-input-wrap"
                        onClick={() => {
                          const input = document.getElementById('nd-repair-time');
                          if (input && input.showPicker) input.showPicker();
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <svg className="nd-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <input
                          id="nd-repair-time"
                          type="time"
                          className="nd-input"
                          value={repairTime}
                          onChange={e => setRepairTime(e.target.value)}
                          onClick={e => {
                            if (e.target.showPicker) e.target.showPicker();
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="nd-field nd-field--full">
                    <label className="nd-field-label">CODE DU SITE / LA STATION</label>
                    <AsyncSelect
                      id="nd-code"
                      cacheOptions
                      defaultOptions={false}
                      loadOptions={loadSiteOptions}
                      onChange={handleSiteChange}
                      value={selectedSite}
                      placeholder="Tapez pour rechercher un site (ex: AL, BL, OR)..."
                      noOptionsMessage={({ inputValue }) =>
                        inputValue ? 'Aucun site trouvé' : 'Tapez au moins 1 caractère'
                      }
                      loadingMessage={() => 'Recherche...'}
                      isClearable
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          backgroundColor: '#F8F9FA',
                          border: state.isFocused ? '1.5px solid #E2000F' : '1.5px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '4px 6px',
                          fontSize: '0.95rem',
                          boxShadow: state.isFocused ? '0 0 0 3px rgba(226,0,15,0.10)' : 'none',
                          '&:hover': { borderColor: '#E2000F' },
                          minHeight: '46px',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected ? '#E2000F' : state.isFocused ? '#FFF1F2' : '#fff',
                          color: state.isSelected ? '#fff' : '#1E293B',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: '#94A3B8',
                        }),
                        menu: (base) => ({
                          ...base,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          zIndex: 20,
                        }),
                      }}
                    />
                    <p className="nd-helper">TAPEZ LE CODE OU LE NOM DU SITE POUR LANCER LA RECHERCHE</p>
                  </div>

                  <div className="nd-field nd-field--full">
                    <label className="nd-field-label" htmlFor="nd-desc">DESCRIPTION DÉTAILLÉE</label>
                    <textarea
                      id="nd-desc"
                      className="nd-textarea"
                      placeholder="Décrivez les circonstances de l'incident..."
                      rows={5}
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                    />
                  </div>
                </section>
              </div>

              {/* ── Right column ───────────────────────── */}
              <div className="nd-right">

                {/* Localisation */}
                <section className="nd-section-card">
                  <div className="nd-section-header">
                    <h2 className="nd-section-title">Localisation</h2>
                    <button 
                      type="button" 
                      className="nd-geo-btn"
                      onClick={() => window.open('https://www.google.com/maps', '_blank')}
                      title="Ouvrir Google Maps"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      GÉOLOCALISER
                    </button>
                  </div>

                  {/* Map placeholder */}
                  <div 
                    className="nd-map" 
                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                    style={{ cursor: 'pointer' }}
                    title="Ouvrir Google Maps"
                  >
                    <div className="nd-map-bg" />
                    <div className="nd-map-pin">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <span className="nd-gps-badge">
                      <span className="nd-gps-dot" />
                      SIGNAL GPS STABLE
                    </span>
                  </div>

                  <label 
                    className="nd-field-label nd-field-label--sm" 
                    htmlFor="nd-address"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('https://www.google.com/maps', '_blank');
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    title="Ouvrir Google Maps"
                  >
                    ADRESSE (Auto-remplie)
                  </label>
                  <div className="nd-input-wrap nd-input-wrap--mt">
                    <svg className="nd-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <input
                      id="nd-address"
                      type="text"
                      className="nd-input"
                      placeholder="Sélectionnez un site pour remplir automatiquement..."
                      value={address}
                      readOnly
                      style={{ backgroundColor: '#F1F5F9', cursor: 'default' }}
                    />
                  </div>

                  <label className="nd-field-label nd-field-label--sm" style={{ marginTop: '1rem' }}>
                    WILAYA (Auto-remplie)
                  </label>
                  <div className="nd-input-wrap nd-input-wrap--mt">
                    <svg className="nd-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>
                    <input
                      id="nd-wilaya"
                      type="text"
                      className="nd-input"
                      placeholder="Sélectionnez un site..."
                      value={wilaya}
                      readOnly
                      style={{ backgroundColor: '#F1F5F9', cursor: 'default' }}
                    />
                  </div>
                </section>

                {/* Preuves Multimédia */}
                <section className="nd-section-card">
                  <h2 className="nd-section-title">Preuves Multimédia</h2>

                  <div
                    className={`nd-dropzone ${dragging ? 'nd-dropzone--over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInput.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileInput.current?.click()}
                    aria-label="Zone de dépôt de fichiers"
                  >
                    <svg className="nd-dz-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M32 32l-8-8-8 8"/>
                      <line x1="24" y1="24" x2="24" y2="44"/>
                      <path d="M40.7 37.7A14 14 0 1 0 14 26h-2a10 10 0 1 0 4 19.1"/>
                    </svg>
                    <p className="nd-dz-text">Glisser-disposer vos photos</p>
                    <p className="nd-dz-sub">PNG, JPG ou PDF (Max 10MB)</p>
                    <button
                      type="button"
                      className="nd-dz-btn"
                      onClick={e => { e.stopPropagation(); fileInput.current?.click() }}
                    >
                      PARCOURIR LES FICHIERS
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      multiple
                      className="nd-file-input"
                      onChange={e => handleFiles(e.target.files)}
                    />
                  </div>

                  {/* File previews */}
                  {files.length > 0 && (
                    <div className="nd-previews">
                      {files.map((f, i) => (
                        <div key={i} className="nd-preview-thumb">
                          {f.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(f)} alt={f.name} />
                          ) : (
                            <div className="nd-preview-pdf">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                          )}
                          <button
                            type="button"
                            className="nd-preview-remove"
                            onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                            aria-label="Supprimer"
                          >×</button>
                        </div>
                      ))}
                      {/* empty slot hint */}
                      <div className="nd-preview-thumb nd-preview-thumb--empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    </div>
                  )}
                  {files.length === 0 && (
                    <div className="nd-previews">
                      <div className="nd-preview-thumb nd-preview-thumb--empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    </div>
                  )}
                </section>

                {/* Actions */}
                <div className="nd-actions">
                  <button type="submit" id="btn-submit-declaration" className="nd-submit-btn" disabled={loading}>
                    {loading ? (
                      'Soumission...'
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Soumettre la Déclaration
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="nd-cancel-btn"
                    onClick={() => navigate('/dashboard')}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}

/* ── Topbar icons ─────────────────────────────────────── */
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
