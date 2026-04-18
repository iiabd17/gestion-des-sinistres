import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './Declarations.css'

/* ── Static data ─────────────────────────────────────── */
const dossiersCompleter = [
  {
    id: '#D-2023-884', site: 'AL0452_Cheraga', ville: 'Alger Ouest',
    date: '12 Oct 2023', nature: 'Vol de CPbles', statut: 'EN ATTENTE',
  },
  {
    id: '#D-2023-882', site: 'OR0012_Boutiela', ville: 'Oran Sud',
    date: '11 Oct 2023', nature: 'Vandalisme BTS', statut: 'EN ATTENTE',
  },
  {
    id: '#D-2023-881', site: 'CO7704_AïnMendjeli', ville: 'Constantine',
    date: '11 Oct 2023', nature: 'Batteries HB', statut: 'EN ATTENTE',
  },
]

const equipements = [
  { label: 'CPBles Cuivre 50m', qty: 'Quantité: 3' },
  { label: 'Routeur Core Huawei', qty: 'Référence: HW-CR-88' },
  { label: 'Batterie 12V 100Ah', qty: 'Quantité: 6' },
]

const natureTabs = ['Tous', "Vol d'Équipements", 'Vandalisme']

const dossiersValider = [
  { id: '#RZY-2023-6642', site: 'Algiers–Hydra', ville: 'Rué Coleé', date: '14 Oct 2023', nature: 'Incendie',            montant: '450,000.00', devise: 'DZD' },
  { id: '#RZY-2023-8911', site: 'Oran-Center',   ville: 'Repérant Officiø', date: '15 Oct 2023', nature: 'Dégâts des eaux',  montant: '120,500.00', devise: 'DZD' },
  { id: '#RZY-2023-1064', site: 'Constantine',    ville: 'Rue Salah Bi', date: '18 Oct 2023', nature: 'Vol Équipement',  montant: '890,000.00', devise: 'DZD' },
  { id: '#RZY-2023-1122', site: 'Setif–Industrial', ville: 'Storage Ltd', date: '20 Oct 2023', nature: 'Accident',           montant: '65,000.00',  devise: 'DZD' },
]

const natureColors = {
  'Incendie':        { bg: '#fef9c3', color: '#a16207' },
  'Dégâts des eaux': { bg: '#dbeafe', color: '#1d4ed8' },
  'Vol Équipement':  { bg: '#ede9fe', color: '#7c3aed' },
  'Accident':        { bg: '#d1fae5', color: '#065f46' },
  "Vol de CPbles":   { bg: '#fee2e2', color: '#b91c1c' },
  'Vandalisme BTS':  { bg: '#fce7f3', color: '#be185d' },
  'Batteries HB':    { bg: '#e0f2fe', color: '#0369a1' },
}

export default function Declarations() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('completer')       // 'completer' | 'valider'
  const [natureTab, setNatureTab] = useState('Tous')
  const [selected, setSelected]   = useState(dossiersCompleter[0])
  const [page, setPage]           = useState(1)

  /* filter by nature */
  const filtered = natureTab === 'Tous'
    ? dossiersCompleter
    : dossiersCompleter.filter(d =>
        natureTab === "Vol d'Équipements"
          ? d.nature.toLowerCase().includes('vol')
          : d.nature.toLowerCase().includes('vandalisme')
      )

  return (
    <div className="dcl-layout">
      <Sidebar />

      <div className="dcl-main">
        {/* Top bar */}
        <header className="dcl-topbar">
          <div className="dcl-topbar-actions">
            <button className="dcl-icon-btn" aria-label="Notifications">
              <IconBell />
              <span className="dcl-notif-dot" />
            </button>
            <button className="dcl-icon-btn" aria-label="Profil">
              <IconUser />
            </button>
          </div>
        </header>

        <main className="dcl-content">
          {/* ── Primary tabs ────────────────────────── */}
          <div className="dcl-primary-tabs">
            <button
              className={`dcl-ptab ${tab === 'completer' ? 'dcl-ptab--active' : ''}`}
              onClick={() => setTab('completer')}
            >
              Déclarations à Completer
            </button>
            <button
              className={`dcl-ptab ${tab === 'valider' ? 'dcl-ptab--active' : ''}`}
              onClick={() => setTab('valider')}
            >
              Déclarations à Valider
            </button>
          </div>

          {/* ══════════════════════════════════════════
              TAB 1 – À COMPLETER
          ══════════════════════════════════════════ */}
          {tab === 'completer' && (
            <div className="dcl-body">
              {/* Left: table section */}
              <div className="dcl-table-col">
                <div className="dcl-section-head">
                  <div>
                    <h1 className="dcl-title">Déclarations à Completer</h1>
                    <p className="dcl-subtitle">6 dossiers nécessitent votre expertise technique</p>
                  </div>
                  {/* Nature filter tabs */}
                  <div className="dcl-filter-tabs">
                    {natureTabs.map(t => (
                      <button
                        key={t}
                        className={`dcl-ftab ${natureTab === t ? 'dcl-ftab--active' : ''}`}
                        onClick={() => setNatureTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <table className="dcl-table">
                  <thead>
                    <tr>
                      <th>ID DOSSIER</th>
                      <th>SITE</th>
                      <th>DATE</th>
                      <th>NATURE</th>
                      <th>STATUT</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr
                        key={d.id}
                        className={selected?.id === d.id ? 'dcl-row--selected' : ''}
                        onClick={() => setSelected(d)}
                      >
                        <td className="dcl-id">{d.id}</td>
                        <td>
                          <span className="dcl-site">{d.site}</span>
                          <span className="dcl-ville">{d.ville}</span>
                        </td>
                        <td className="dcl-date">{d.date}</td>
                        <td>
                          <span className="dcl-nature-badge"
                            style={{ background: natureColors[d.nature]?.bg || '#f0f0f0', color: natureColors[d.nature]?.color || '#555' }}>
                            {d.nature}
                          </span>
                        </td>
                        <td>
                          <span className="dcl-badge-attente">EN ATTENTE</span>
                        </td>
                        <td>
                          <button
                            className="dcl-complete-btn"
                            onClick={e => { e.stopPropagation(); setSelected(d) }}
                          >
                            Compléter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right: detail panel */}
              {selected && (
                <aside className="dcl-panel">
                  <div className="dcl-panel-header">
                    <div>
                      <p className="dcl-panel-label">Approbation Dossier</p>
                      <p className="dcl-panel-id">{selected.id}</p>
                    </div>
                    <button className="dcl-panel-ajouter">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Ajouter
                    </button>
                  </div>

                  {/* Équipements */}
                  <div className="dcl-panel-section">
                    <p className="dcl-panel-section-title">Équipements Sinistrés</p>
                    <ul className="dcl-equip-list">
                      {equipements.map((eq, i) => (
                        <li key={i} className="dcl-equip-item">
                          <span className="dcl-equip-dot" />
                          <div>
                            <p className="dcl-equip-name">{eq.label}</p>
                            <p className="dcl-equip-qty">{eq.qty}</p>
                          </div>
                          <svg className="dcl-equip-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Estimation financière */}
                  <div className="dcl-panel-section">
                    <p className="dcl-panel-section-title">Estimation Financière (DZD)</p>
                    <div className="dcl-estimation">
                      <span className="dcl-estimation-currency">DA</span>
                      <span className="dcl-estimation-value">1450000.00</span>
                    </div>
                    <p className="dcl-estimation-note">Basé sur les tarifs de remplacement Oct 2023</p>
                  </div>

                  {/* Photos */}
                  <div className="dcl-panel-section">
                    <p className="dcl-panel-section-title">Preuves Photographiques</p>
                    <div className="dcl-photos">
                      <div className="dcl-photo dcl-photo--1" />
                      <div className="dcl-photo dcl-photo--2" />
                      <div className="dcl-photo dcl-photo--empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className="dcl-panel-cta"
                    onClick={() => navigate('/declarations/new')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Compléter le dossier
                  </button>
                </aside>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB 2 – À VALIDER
          ══════════════════════════════════════════ */}
          {tab === 'valider' && (
            <div className="dcl-val-container">
              <div className="dcl-val-head">
                <h1 className="dcl-title">Déclarations à Valider</h1>
                <p className="dcl-subtitle">Dossiers complétés en attente de décision finale</p>
              </div>

              {/* Stat strip */}
              <div className="dcl-stats-strip">
                <div className="dcl-stat-item">
                  <span className="dcl-stat-label">TOTAL EN ATTENTE</span>
                  <span className="dcl-stat-val">24</span>
                </div>
                <div className="dcl-stat-divider" />
                <div className="dcl-stat-item">
                  <span className="dcl-stat-label">URGENT (48H)</span>
                  <span className="dcl-stat-val dcl-stat-val--red">08</span>
                </div>
                <div className="dcl-stat-divider" />
                <div className="dcl-stat-item">
                  <span className="dcl-stat-label">MONTANT TOTAL</span>
                  <span className="dcl-stat-val">1.4M <small>DZD</small></span>
                </div>
              </div>

              {/* Table */}
              <div className="dcl-val-table-wrap">
                <table className="dcl-table">
                  <thead>
                    <tr>
                      <th>ID DOSSIER</th>
                      <th>SITE</th>
                      <th>DATE</th>
                      <th>NATURE</th>
                      <th>MONTANT ESTIMÉ</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersValider.map(d => (
                      <tr key={d.id}>
                        <td className="dcl-id">{d.id}</td>
                        <td>
                          <span className="dcl-site">{d.site}</span>
                          <span className="dcl-ville">{d.ville}</span>
                        </td>
                        <td className="dcl-date">{d.date}</td>
                        <td>
                          <span className="dcl-nature-badge"
                            style={{ background: natureColors[d.nature]?.bg || '#f0f0f0', color: natureColors[d.nature]?.color || '#555' }}>
                            {d.nature}
                          </span>
                        </td>
                        <td className="dcl-montant">
                          <span className="dcl-montant-val">{d.montant}</span>
                          <span className="dcl-montant-devise">{d.devise}</span>
                        </td>
                        <td>
                          <button
                            className="dcl-view-btn"
                            aria-label="Voir le dossier"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/declarations/valider/${d.id}`);
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="dcl-pagination">
                  <span className="dcl-page-info">Affichage de 1-4 sur 24 dossiers</span>
                  <div className="dcl-pages">
                    <button className="dcl-page-btn" disabled>‹</button>
                    {[1,2,3].map(p => (
                      <button
                        key={p}
                        className={`dcl-page-btn ${page === p ? 'dcl-page-btn--active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button className="dcl-page-btn">›</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────── */
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
