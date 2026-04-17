import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './DossierValidation.css'

/* ── Mock data (keyed by dossier id) ─────────────────── */
const dossiers = {
  'RZY-2023-6642': {
    site: 'Algiers – Hydra', date: '14 Oct 2023', nature: 'Incendie',
    declarant: { nom: 'Amine Belkacem', emploi: 'DZ-99421', tel: '+213 798 12 34 56', dept: 'Équipe Terrain – Zone Sud' },
    description: 'Pôle technologique Hydra, Bâtiment B. Station de base macro-site indoor. Équipement de transmission principal.',
    gps: '35.7416° N,  3.0371° E',
    equipements: [
      { Icon: IconRouter,  label: 'Routeurs Cisco 9k',     qty: '2x',   val: '320,000 DZD' },
      { Icon: IconCable,   label: 'Câbles Fibre Optique',  qty: '100m', val: '45,000 DZD'  },
      { Icon: IconBattery, label: 'Unité Batterie UPS',    qty: '1x',   val: '85,000 DZD'  },
    ],
    total: '450,000 DZD',
    fichiers: 8,
  },
  'RZY-2023-8911': {
    site: 'Oran-Center', date: '15 Oct 2023', nature: "Dégâts des eaux",
    declarant: { nom: 'Karim Mansouri', emploi: 'DZ-88302', tel: '+213 770 45 67 89', dept: 'Équipe Terrain – Zone Ouest' },
    description: "Centre de commutation principal d'Oran. Inondation du sous-sol suite à de fortes pluies. Matériel de réseau endommagé.",
    gps: '35.6969° N, -0.6330° W',
    equipements: [
      { Icon: IconRouter,  label: 'Switch Cisco Catalyst', qty: '3x',   val: '75,000 DZD' },
      { Icon: IconCable,   label: 'Câblage réseau',        qty: '200m', val: '18,000 DZD' },
      { Icon: IconBattery, label: 'Onduleur APC',          qty: '2x',   val: '27,500 DZD' },
    ],
    total: '120,500 DZD',
    fichiers: 5,
  },
  'RZY-2023-1064': {
    site: 'Constantine', date: '18 Oct 2023', nature: 'Vol Équipement',
    declarant: { nom: 'Salah Benali', emploi: 'DZ-76120', tel: '+213 661 23 45 67', dept: 'Sécurité – Zone Est' },
    description: 'Site BTS Constantine-Nord. Vol de matériel de transmission lors du weekend. Effraction signalée au niveau du local technique.',
    gps: '36.3650° N, 6.6147° E',
    equipements: [
      { Icon: IconRouter,  label: 'Émetteur-récepteur',    qty: '4x',   val: '640,000 DZD' },
      { Icon: IconCable,   label: 'Câbles coaxiaux',       qty: '50m',  val: '12,000 DZD'  },
      { Icon: IconBattery, label: 'Batteries lithium',     qty: '8x',   val: '238,000 DZD' },
    ],
    total: '890,000 DZD',
    fichiers: 3,
  },
  'RZY-2023-1122': {
    site: 'Setif–Industrial', date: '20 Oct 2023', nature: 'Accident',
    declarant: { nom: 'Houda Cherif', emploi: 'DZ-91034', tel: '+213 699 87 65 43', dept: 'Maintenance – Zone Centre' },
    description: "Zone industrielle de Sétif, pylône P-12. Accident de véhicule ayant endommagé la structure support d'antennes.",
    gps: '36.1898° N, 5.4114° E',
    equipements: [
      { Icon: IconRouter,  label: 'Antenne sectorielle',   qty: '2x',   val: '38,000 DZD' },
      { Icon: IconCable,   label: 'Câblage alimentation',  qty: '30m',  val: '9,000 DZD'  },
      { Icon: IconBattery, label: 'Boîtier de protection', qty: '1x',   val: '18,000 DZD' },
    ],
    total: '65,000 DZD',
    fichiers: 6,
  },
}

const natureStyle = {
  'Incendie':         { bg: '#fef9c3', color: '#a16207' },
  "Dégâts des eaux":  { bg: '#dbeafe', color: '#1d4ed8' },
  'Vol Équipement':   { bg: '#ede9fe', color: '#7c3aed' },
  'Accident':         { bg: '#d1fae5', color: '#065f46' },
}

export default function DossierValidation() {
  const { id } = useParams()
  const navigate = useNavigate()

  /* Normalise the id - URL uses the raw id like RZY-2023-6642 */
  const data = dossiers[id] || dossiers['RZY-2023-6642']
  const ns   = natureStyle[data.nature] || { bg: '#f0f0f0', color: '#555' }

  return (
    <div className="dv-layout">
      <Sidebar />

      <div className="dv-main">
        {/* Topbar */}
        <header className="dv-topbar">
          <div className="dv-topbar-actions">
            <button className="dv-icon-btn" aria-label="Notifications">
              <IconBell />
              <span className="dv-notif-dot" />
            </button>
            <button className="dv-icon-btn" aria-label="Profil">
              <IconUser />
            </button>
          </div>
        </header>

        <main className="dv-content">
          {/* ── Page header ──────────────────────── */}
          <div className="dv-page-header">
            <div className="dv-page-meta">
              <span className="dv-eyebrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                DOSSIER EN RÉVISION
              </span>
              <span className="dv-eyebrow-id">#{id || 'RZY-2023-0842'}</span>
            </div>
            <div className="dv-header-row">
              <h1 className="dv-title">Validation du Dossier</h1>
              <div className="dv-chips">
                <div className="dv-chip">
                  <span className="dv-chip-label">SITE</span>
                  <span className="dv-chip-val">{data.site}</span>
                </div>
                <div className="dv-chip">
                  <span className="dv-chip-label">DATE</span>
                  <span className="dv-chip-val">{data.date}</span>
                </div>
                <div className="dv-chip">
                  <span className="dv-chip-label">NATURE</span>
                  <span className="dv-chip-val dv-nature" style={{ background: ns.bg, color: ns.color }}>
                    <span className="dv-nature-dot" style={{ background: ns.color }} />
                    {data.nature}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Two-column body ──────────────────── */}
          <div className="dv-body">

            {/* LEFT ─────────────────────────────── */}
            <div className="dv-left">

              {/* Informations du Déclarant */}
              <section className="dv-card">
                <div className="dv-card-title-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <h2 className="dv-card-title">Informations du Déclarant</h2>
                </div>
                <div className="dv-info-grid">
                  <div className="dv-info-field">
                    <span className="dv-info-label">NOM COMPLET</span>
                    <span className="dv-info-val">{data.declarant.nom}</span>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">EMPLOI CD</span>
                    <span className="dv-info-val">{data.declarant.emploi}</span>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">NUMÉRO DE TÉLÉPHONE</span>
                    <span className="dv-info-val">{data.declarant.tel}</span>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">DÉPARTEMENT</span>
                    <span className="dv-info-val">{data.declarant.dept}</span>
                  </div>
                </div>
              </section>

              {/* Détails Techniques */}
              <section className="dv-card">
                <h2 className="dv-card-title">Détails Techniques</h2>
                <div className="dv-tech-grid">
                  <div className="dv-info-field">
                    <span className="dv-info-label">DESCRIPTION DU SITE</span>
                    <p className="dv-info-desc">{data.description}</p>
                  </div>
                  <div className="dv-info-field">
                    <span className="dv-info-label">COORDONNÉES GPS</span>
                    <div className="dv-gps-val">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {data.gps}
                    </div>
                  </div>
                </div>

                {/* Site photo */}
                <div className="dv-site-photo">
                  <div className="dv-photo-bg" />
                  <div className="dv-photo-overlay" />
                  {/* pylône SVG overlay */}
                  <svg className="dv-pylon-icon" viewBox="0 0 60 100" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" aria-hidden="true">
                    <line x1="30" y1="5" x2="30" y2="95"/>
                    <line x1="30" y1="20" x2="10" y2="50"/><line x1="30" y1="20" x2="50" y2="50"/>
                    <line x1="30" y1="35" x2="15" y2="55"/><line x1="30" y1="35" x2="45" y2="55"/>
                    <line x1="10" y1="50" x2="50" y2="50"/>
                    <line x1="15" y1="55" x2="45" y2="55"/>
                    <line x1="10" y1="50" x2="10" y2="95"/><line x1="50" y1="50" x2="50" y2="95"/>
                    <line x1="10" y1="95" x2="50" y2="95"/>
                    <line x1="5" y1="5" x2="55" y2="5"/>
                    <circle cx="30" cy="5" r="3" fill="#E2000F" stroke="none"/>
                  </svg>
                </div>
              </section>
            </div>

            {/* RIGHT ────────────────────────────── */}
            <div className="dv-right">

              {/* Équipements Estimés */}
              <section className="dv-card">
                <h2 className="dv-card-title">Équipements Estimés</h2>
                <table className="dv-equip-table">
                  <thead>
                    <tr>
                      <th>ARTICLE</th>
                      <th>QUANTITÉ</th>
                      <th>VALEUR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equipements.map((item, i) => {
                      const IconComponent = item.Icon;
                      return (
                        <tr key={i}>
                          <td>
                            <div className="dv-equip-label">
                              <span className="dv-equip-icon"><IconComponent /></span>
                              {item.label}
                            </div>
                          </td>
                          <td className="dv-equip-qty">{item.qty}</td>
                          <td className="dv-equip-val">{item.val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="dv-total-row">
                  <span className="dv-total-label">Total Estimé</span>
                  <span className="dv-total-val">{data.total}</span>
                </div>
              </section>

              {/* Pièces Jointes */}
              <section className="dv-card">
                <div className="dv-card-title-row dv-card-title-row--between">
                  <h2 className="dv-card-title">Pièces Jointes</h2>
                  <span className="dv-files-count">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2z"/></svg>
                    {data.fichiers} Fichiers
                  </span>
                </div>
                <div className="dv-pj-grid">
                  <div className="dv-pj-thumb dv-pj-img1" />
                  <div className="dv-pj-thumb dv-pj-img2" />
                  <div className="dv-pj-thumb dv-pj-pdf">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#E2000F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>Rapport.pdf</span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* ── Bottom actions ───────────────────── */}
          <div className="dv-actions">
            <button
              className="dv-hold-btn"
              onClick={() => navigate('/declarations')}
            >
              Mettre en Attente (Infos Manquantes)
            </button>
            <button className="dv-pdf-btn">
              Générer PDF
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Equipment icons ─────────────────────────────────── */
function IconRouter() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="22" height="12" rx="2"/><circle cx="6" cy="15" r="1"/><circle cx="10" cy="15" r="1"/><path d="M5 9V7a7 7 0 0 1 14 0v2"/></svg>
}
function IconCable() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
}
function IconBattery() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>
}
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
