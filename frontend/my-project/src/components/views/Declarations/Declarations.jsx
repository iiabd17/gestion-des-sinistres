import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../../componenets/Sidebar/Sidebar'
import './Declarations.css'

/* ── Static data ─────────────────────────────────────── */
const defaultDossiersCompleter = [
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

const defaultDossiersValider = [
  { id: '#RZY-2023-6642', site: 'Algiers–Hydra', ville: 'Rué Coleé', date: '14 Oct 2023', nature: 'Incendie', montant: '450,000.00', devise: 'DZD' },
  { id: '#RZY-2023-8911', site: 'Oran-Center', ville: 'Repérant Officiø', date: '15 Oct 2023', nature: 'Dégâts des eaux', montant: '120,500.00', devise: 'DZD' },
  { id: '#RZY-2023-1064', site: 'Constantine', ville: 'Rue Salah Bi', date: '18 Oct 2023', nature: 'Vol Équipement', montant: '890,000.00', devise: 'DZD' },
  { id: '#RZY-2023-1122', site: 'Setif–Industrial', ville: 'Storage Ltd', date: '20 Oct 2023', nature: 'Accident', montant: '65,000.00', devise: 'DZD' },
]

const natureColors = {
  'Incendie': { bg: '#fef9c3', color: '#a16207' },
  'Dégâts des eaux': { bg: '#dbeafe', color: '#1d4ed8' },
  'Vol Équipement': { bg: '#ede9fe', color: '#7c3aed' },
  'Accident': { bg: '#d1fae5', color: '#065f46' },
  "Vol de CPbles": { bg: '#fee2e2', color: '#b91c1c' },
  'Vandalisme BTS': { bg: '#fce7f3', color: '#be185d' },
  'Batteries HB': { bg: '#e0f2fe', color: '#0369a1' },
}

const WILAYAS = [
  "01 Adrar", "02 Chlef", "03 Laghouat", "04 Oum El Bouaghi", "05 Batna", "06 Béjaïa", "07 Biskra",
  "08 Béchar", "09 Blida", "10 Bouira", "11 Tamanrasset", "12 Tébessa", "13 Tlemcen", "14 Tiaret",
  "15 Tizi Ouzou", "16 Alger", "17 Djelfa", "18 Jijel", "19 Sétif", "20 Saïda", "21 Skikda",
  "22 Sidi Bel Abbès", "23 Annaba", "24 Guelma", "25 Constantine", "26 Médéa", "27 Mostaganem",
  "28 M'Sila", "29 Mascara", "30 Ouargla", "31 Oran", "32 El Bayadh", "33 Illizi",
  "34 Bordj Bou Arreridj", "35 Boumerdès", "36 El Tarf", "37 Tindouf", "38 Tissemsilt", "39 El Oued",
  "40 Khenchela", "41 Souk Ahras", "42 Tipaza", "43 Mila", "44 Aïn Defla", "45 Naâma",
  "46 Aïn Témouchent", "47 Ghardaïa", "48 Relizane", "49 Timimoun", "50 Bordj Badji Mokhtar",
  "51 Ouled Djellal", "52 Béni Abbès", "53 In Salah", "54 In Guezzam", "55 Touggourt", "56 Djanet",
  "57 El M'Ghair", "58 El Meniaa", "59 Aflou", "60 Barika", "61 Ksar Chellala", "62 Messaad",
  "63 Aïn Oussera", "64 Boussaâda", "65 El Abiodh Sidi Cheikh", "66 El Kantara", "67 Bir El Ater",
  "68 Ksar El Boukhari", "69 El Aricha"
];

const STATUTS = ["Tous", "EN ATTENTE", "VALIDÉ", "REJETÉ"];
const NATURE_OPTIONS = ["Tous", ...Object.keys(natureColors)];

export default function Declarations() {
  const navigate = useNavigate()
  const location = useLocation()

  const [dossiersCompleter, setDossiersCompleter] = useState(() => {
    const saved = localStorage.getItem('dossiersCompleter')
    if (saved) return JSON.parse(saved)
    localStorage.setItem('dossiersCompleter', JSON.stringify(defaultDossiersCompleter))
    return defaultDossiersCompleter
  })

  const [dossiersValider, setDossiersValider] = useState(() => {
    const saved = localStorage.getItem('dossiersValider')
    if (saved) return JSON.parse(saved)
    localStorage.setItem('dossiersValider', JSON.stringify(defaultDossiersValider))
    return defaultDossiersValider
  })

  // Start on 'completer' tab if location.state.tab === 'completer'
  const [tab, setTab] = useState(location.state?.tab || 'completer')
  const [selected, setSelected] = useState(dossiersCompleter[0] || null)
  const [page, setPage] = useState(1)

  // Advanced Filters State
  const [filterDate, setFilterDate] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterNature, setFilterNature] = useState('Tous')
  const [filterSite, setFilterSite] = useState('Tous')

  /* filter logic */
  const filtered = dossiersCompleter.filter(d => {
    // Nature pill filter (we can re-use filterNature state)
    if (filterNature !== 'Tous' && d.nature !== filterNature) return false;

    // Statut filter
    if (filterStatut !== 'Tous' && d.statut !== filterStatut) return false;

    // Site filter (Wilaya)
    if (filterSite !== 'Tous') {
      const wilayaName = filterSite.split(' ').slice(1).join(' ').toLowerCase();
      const match = d.site.toLowerCase().includes(wilayaName) || (d.ville && d.ville.toLowerCase().includes(wilayaName));
      if (!match) return false;
    }

    return true;
  });

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
            <div className="dcl-body" style={{ flexDirection: 'row' }}>
              {/* Left: table section */}
              <div className="dcl-table-col" style={{ flex: 1 }}>
                <div className="dcl-section-head" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div>
                      <h1 className="dcl-title">Déclarations à Completer</h1>
                      <p className="dcl-subtitle">6 dossiers nécessitent votre expertise technique</p>
                    </div>
                  </div>

                  {/* Advanced Filters Grid */}
                  <div className="dcl-filter-grid">
                    <div className="dcl-filter-field">
                      <label>DATE</label>
                      <input
                        type="date"
                        className="dcl-filter-input"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                    </div>

                    <div className="dcl-filter-field">
                      <label>NATURE</label>
                      <select
                        className="dcl-filter-select"
                        value={filterNature}
                        onChange={(e) => setFilterNature(e.target.value)}
                      >
                        {NATURE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="dcl-filter-field">
                      <label>SITE (WILAYA)</label>
                      <select
                        className="dcl-filter-select"
                        value={filterSite}
                        onChange={(e) => setFilterSite(e.target.value)}
                      >
                        <option value="Tous">Tous les sites</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>

                    <button
                      className="dcl-reset-btn"
                      onClick={() => {
                        setFilterDate('');
                        setFilterStatut('Tous');
                        setFilterNature('Tous');
                        setFilterSite('Tous');
                      }}
                      title="Réinitialiser les filtres"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
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
                    {filtered.map((d, i) => (
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
                          <span className="dcl-badge-attente">
                            {/* Dot icon simulated */}
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#d97706', display: 'inline-block', marginRight: 4 }} />
                            EN ATTENTE
                          </span>
                        </td>
                        <td>
                          <button
                            className="dcl-complete-btn"
                            style={{ background: '#fce7f3', color: '#be185d', boxShadow: 'none' }}
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/declarations/completer/${d.id.replace('#', '')}`);
                            }}
                          >
                            Completer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


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
                              navigate(`/declarations/valider/${d.id.replace('#', '')}`);
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
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
                    {[1, 2, 3].map(p => (
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
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
