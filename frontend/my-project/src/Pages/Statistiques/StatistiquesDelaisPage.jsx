import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../../api';
import './StatistiquesDelais.css';
import TimelineBarChart from '../../components/ClaimTimeline/TimelineBarChart';

const STATUT_OPTIONS = [
  { value: 'OUVERT', label: 'Ouvert' },
  { value: 'EN_EXPERTISE', label: 'En Expertise' },
  { value: 'REJET_POUR_COMPLEMENT', label: 'Rejeté pour Complément' },
  { value: 'EN_VALIDATION_LEGAL', label: 'En Validation Légale' },
  { value: 'EN_VALIDATION_HSE', label: 'En Validation HSE' },
  { value: 'TRANSMIS_ASSUREUR', label: "Transmis à l'Assureur" },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'ATTENTE_VALIDATION_FRANCHISE', label: 'En Attente de Clôture (Sous Franchise)' },
  { value: 'CLOTURE_SOUS_FRANCHISE', label: 'Clôturé — Sous Franchise' },
  { value: 'ARCHIVE', label: 'Archivé' },
];

const PERIODE_OPTIONS = [
  { value: 'tout', label: "Tout l'historique" },
  { value: 'annee', label: 'Cette année' },
  { value: 'mois', label: 'Ce mois' },
  { value: 'semaine', label: 'Cette semaine' },
];

const BAR_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#14B8A6', '#E2000F'];

function CustomSelect({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="sd-custom-select" ref={dropdownRef}>
      <button 
        type="button"
        className={`sd-select-trigger ${isOpen ? 'sd-select-trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sd-select-value">{selected?.label || 'Sélectionner...'}</span>
        <svg className={`sd-select-chevron ${isOpen ? 'sd-select-chevron--open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className="sd-select-menu">
          {options.map(opt => (
            <div 
              key={opt.value}
              className={`sd-select-option ${value === opt.value ? 'sd-select-option--active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span className="sd-option-label">{opt.label}</span>
              {value === opt.value && (
                <svg className="sd-option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatistiquesDelaisPage() {
  const [selectedStatut, setSelectedStatut] = useState('EN_EXPERTISE');
  const [periode, setPeriode] = useState('tout');
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timelineModal, setTimelineModal] = useState({ isOpen: false, data: null, loading: false });
  const [timeUnit, setTimeUnit] = useState('heures');

  const handleViewTimeline = async (idSinistre) => {
    setTimelineModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await api.get(`/sinistres/${idSinistre}/`);
      setTimelineModal({ isOpen: true, data: res.data, loading: false });
    } catch (err) {
      console.error("Erreur lors de la récupération de l'historique", err);
      setTimelineModal({ isOpen: false, data: null, loading: false });
    }
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/stats/delais-detail/?statut=${selectedStatut}&periode=${periode}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur lors de la récupération des délais", err))
      .finally(() => setLoading(false));
  }, [selectedStatut, periode]);

  const selectedLabel = STATUT_OPTIONS.find(o => o.value === selectedStatut)?.label || selectedStatut;

  // Apply client-side sort & search
  const filteredDetails = (data?.details || [])
    .filter(d => searchTerm ? d.idSinistre?.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    .sort((a, b) => {
      if (sortOrder === 'date_desc') return new Date(b.date_entree || 0) - new Date(a.date_entree || 0);
      if (sortOrder === 'date_asc')  return new Date(a.date_entree || 0) - new Date(b.date_entree || 0);
      if (sortOrder === 'desc')      return b.duree_heures - a.duree_heures;
      return a.duree_heures - b.duree_heures;
    });

  return (
    <div className="sd-page-content">
        <main className="sd-content">
          {/* Breadcrumbs */}
          <nav className="sd-breadcrumbs">
            <span>Statistiques</span>
            <span className="sd-bc-sep">›</span>
            <span className="sd-bc-active">Analyse des Délais</span>
          </nav>

          {/* Page Header */}
          <div className="sd-page-header">
            <div className="sd-title-group">
              <h1>Analyse des Délais</h1>
              <p>Examinez le temps passé par chaque sinistre dans une étape spécifique du workflow.</p>
            </div>
          </div>

          {/* Filters */}
          <div className="sd-filters-card">
            <div className="sd-filter-group">
              <div className="sd-filter-item">
                <div className="sd-filter-icon"><IconFilter /></div>
                <div className="sd-filter-field">
                  <label htmlFor="sd-statut">Étape du workflow</label>
                  <CustomSelect
                    value={selectedStatut}
                    onChange={setSelectedStatut}
                    options={STATUT_OPTIONS}
                  />
                </div>
              </div>

              <div className="sd-filter-divider" />

              <div className="sd-filter-item">
                <div className="sd-filter-icon sd-filter-icon--blue"><IconCalendar /></div>
                <div className="sd-filter-field">
                  <label htmlFor="sd-periode">Période</label>
                  <CustomSelect
                    value={periode}
                    onChange={setPeriode}
                    options={PERIODE_OPTIONS}
                  />
                </div>
              </div>

              <div className="sd-filter-divider" />

              <div className="sd-filter-item">
                <div className="sd-filter-icon sd-filter-icon--purple"><IconSort /></div>
                <div className="sd-filter-field">
                  <label htmlFor="sd-sort">Tri</label>
                  <CustomSelect
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={[
                      { value: 'date_desc', label: 'Plus récent → ancien' },
                      { value: 'date_asc',  label: 'Plus ancien → récent' },
                      { value: 'desc',      label: 'Plus long → court' },
                      { value: 'asc',       label: 'Plus court → long' }
                    ]}
                  />
                </div>
              </div>


            </div>
          </div>

          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Chargement des données...</p>
            </div>
          ) : data && filteredDetails.length > 0 ? (
            <>
              {/* Stats Cards */}
              <div className="sd-stats-row">
                <div className="sd-stat-card">
                  <div className="sd-stat-icon-wrap sd-stat-blue"><IconFolder /></div>
                  <div className="sd-stat-info">
                    <span className="sd-stat-label">Dossiers concernés</span>
                    <span className="sd-stat-value">{filteredDetails.length}</span>
                  </div>
                </div>
                <div className="sd-stat-card">
                  <div className="sd-stat-icon-wrap sd-stat-purple"><IconClock /></div>
                  <div className="sd-stat-info">
                    <span className="sd-stat-label">Temps Moyen</span>
                    <span className="sd-stat-value">{data.moyenne_heures}<span className="sd-stat-unit">h</span></span>
                  </div>
                </div>
                <div className="sd-stat-card">
                  <div className="sd-stat-icon-wrap sd-stat-red"><IconArrowUp /></div>
                  <div className="sd-stat-info">
                    <span className="sd-stat-label">Temps Maximum</span>
                    <span className="sd-stat-value">{data.max_heures}<span className="sd-stat-unit">h</span></span>
                  </div>
                </div>
                <div className="sd-stat-card">
                  <div className="sd-stat-icon-wrap sd-stat-green"><IconArrowDown /></div>
                  <div className="sd-stat-info">
                    <span className="sd-stat-label">Temps Minimum</span>
                    <span className="sd-stat-value">
                      {data.min_heures > 0 && data.min_heures < 1 ? '< 1' : data.min_heures}
                      <span className="sd-stat-unit">h</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="sd-chart-card">
                <div className="sd-chart-header">
                  <div>
                    <h3>Temps passé par sinistre</h3>
                    <p>Étape : <strong>{selectedLabel}</strong></p>
                  </div>
                  <span className="sd-chart-badge">
                    {data.details.filter(d => d.en_cours).length} en cours
                  </span>
                </div>
                <div className="sd-chart-container">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={filteredDetails} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E2000F" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#E2000F" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="idSinistre"
                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                        label={{ value: 'Heures', angle: -90, position: 'insideLeft', style: { fill: '#94A3B8', fontSize: 12 } }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(226,0,15,0.04)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                          padding: '12px 16px',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        formatter={(value, name, props) => [
                          `${value} heures ${props.payload.en_cours ? '⏳ (Toujours en cours)' : '✅'}`,
                          'Durée'
                        ]}
                        labelFormatter={(label) => `Dossier: ${label}`}
                      />
                      <Bar dataKey="duree_heures" radius={[6, 6, 0, 0]} barSize={Math.max(12, Math.min(32, 600 / filteredDetails.length))}>
                        {filteredDetails.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.en_cours ? '#F59E0B' : BAR_COLORS[index % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detail Table */}
              <div className="sd-table-card">
                <div className="sd-table-header">
                  <h3>Détails par dossier</h3>
                  <span className="sd-table-count">{filteredDetails.length} résultats</span>
                </div>
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>ID DOSSIER</th>
                      <th>DURÉE (HEURES)</th>
                      <th>DURÉE (JOURS)</th>
                      <th>DATE ENTRÉE</th>
                      <th>DATE SORTIE</th>
                      <th>STATUT</th>
                      <th style={{ width: 60, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.map((d, i) => (
                      <tr key={i}>
                        <td className="sd-td-id">{d.idSinistre}</td>
                        <td className="sd-td-val">{d.duree_heures}</td>
                        <td className="sd-td-val">{d.duree_jours}</td>
                        <td className="sd-td-date">
                          {d.date_entree ? new Date(d.date_entree).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="sd-td-date">
                          {d.date_sortie ? new Date(d.date_sortie).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          <span className={`sd-status-badge ${d.en_cours ? 'sd-status--active' : 'sd-status--done'}`}>
                            {d.en_cours ? 'En cours' : 'Terminé'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="sd-icon-btn" 
                            style={{ width: 32, height: 32, margin: '0 auto' }}
                            title="Voir la timeline du workflow"
                            onClick={() => handleViewTimeline(d.idSinistre)}
                          >
                            <IconEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="sd-empty">
              <div className="sd-empty-icon"><IconEmpty /></div>
              <h3>Aucune donnée trouvée</h3>
              <p>Aucun historique de sinistre trouvé pour l'étape <strong>{selectedLabel}</strong> durant la période sélectionnée.</p>
            </div>
          )}

          {/* Modal Timeline */}
          {timelineModal.isOpen && (
            <div className="sd-modal-overlay" onClick={() => setTimelineModal({ isOpen: false, data: null, loading: false })}>
              <div className="sd-modal" onClick={e => e.stopPropagation()}>
                <div className="sd-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h3 style={{ margin: 0 }}>Timeline du Dossier #{timelineModal.data?.idSinistre || '...'}</h3>
                    <select 
                      className="sd-select" 
                      style={{ padding: '4px 8px', fontSize: 13, height: 'auto', minWidth: 100 }}
                      value={timeUnit} 
                      onChange={e => setTimeUnit(e.target.value)}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="heures">Heures</option>
                      <option value="jours">Jours</option>
                    </select>
                  </div>
                  <button className="sd-modal-close" onClick={() => setTimelineModal({ isOpen: false, data: null, loading: false })}>&times;</button>
                </div>
                
                <div className="sd-modal-body">
                  {timelineModal.loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><div className="sd-spinner" style={{ margin: '0 auto' }} /></div>
                  ) : timelineModal.data ? (
                    <div className="sd-timeline-list" style={{ marginTop: 20 }}>
                      {(() => {
                        const hist = timelineModal.data.historiqueStatuts || [];
                        if (hist.length === 0) return <p>Aucun historique.</p>;
                        
                        // Sort chronologically (oldest first) so that timeline goes left to right properly
                        const sortedHist = [...hist].sort((a, b) => new Date(a.dateChangement) - new Date(b.dateChangement));
                        
                        const chartData = sortedHist.map((h, i) => {
                          const startDate = new Date(h.dateChangement);
                          let endDate = new Date(); // now
                          if (i < sortedHist.length - 1) {
                             endDate = new Date(sortedHist[i+1].dateChangement);
                          } else if (['CLOTURE', 'ARCHIVE', 'CLOTURE_SOUS_FRANCHISE'].includes(h.nouveauStatut)) {
                             endDate = startDate;
                          }
                          
                          const diffMs = endDate - startDate;
                          // Prevent negative hours just in case of weird same-second anomalies
                          const diffMsNonNegative = Math.max(0, diffMs);
                          let diffVal = 0;
                          
                          if (timeUnit === 'minutes') {
                             diffVal = Number((diffMsNonNegative / (1000 * 60)).toFixed(2));
                          } else if (timeUnit === 'heures') {
                             diffVal = Number((diffMsNonNegative / (1000 * 60 * 60)).toFixed(2));
                          } else if (timeUnit === 'jours') {
                             diffVal = Number((diffMsNonNegative / (1000 * 60 * 60 * 24)).toFixed(2));
                          }
                          
                          const isLast = i === sortedHist.length - 1;
                          
                          return {
                            statut: h.nouveauStatut_label || h.nouveauStatut,
                            valeur: diffVal,
                            en_cours: isLast && diffMs > 0
                          };
                        });

                        return <TimelineBarChart data={chartData} unit={timeUnit} />;
                      })()}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#dc2626' }}>Erreur lors du chargement des données.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
    </div>
  );
}

/* ── Icons ──────────────────────────────────── */
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconFilter() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconFolder() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
}
function IconClock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconArrowUp() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
}
function IconArrowDown() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
}
function IconSort() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/><line x1="4" y1="6" x2="11" y2="6"/><line x1="4" y1="10" x2="9" y2="10"/><line x1="4" y1="14" x2="7" y2="14"/></svg>
}
function IconSearch() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconEmpty() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:48,height:48}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}

function IconEye() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
