import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './Archives.css'

/* ── Mock Data ───────────────────────────────────────── */
const archiveDossiers = [
  {
    id: 'CL-2023-0041',
    date: '12 Oct 2023',
    site: 'Alger - Sidi Yahia',
    region: 'REGION CENTRE',
    nature: 'Vol d’équipement',
    cout: '845.000,00',
    statut: 'ARCHIVÉ'
  },
  {
    id: 'CL-2023-0028',
    date: '05 Sep 2023',
    site: 'Oran - Centre',
    region: 'REGION OUEST',
    nature: 'Coupure Fibre Optique',
    cout: '120.500,00',
    statut: 'ARCHIVÉ'
  },
  {
    id: 'CL-2023-0012',
    date: '22 Août 2023',
    site: 'Constantine - Belle Vue',
    region: 'REGION EST',
    nature: 'Incendie Mineur',
    cout: '2.140.000,00',
    statut: 'ARCHIVÉ'
  },
  {
    id: 'CL-2023-0005',
    date: '10 Juil 2023',
    site: 'Alger - Dar El Beida',
    region: 'REGION CENTRE',
    nature: 'Bris de Glace',
    cout: '45.000,00',
    statut: 'ARCHIVÉ'
  },
  {
    id: 'CL-2022-0988',
    date: '28 Juin 2023',
    site: 'Tizi Ouzou - Centre',
    region: 'REGION CENTRE',
    nature: 'Vol d’équipement',
    cout: '1.102.500,00',
    statut: 'ARCHIVÉ'
  }
];

export default function Archives() {
  const navigate = useNavigate();

  return (
    <div className="arc-layout">
      <Sidebar />

      <div className="arc-main">
        <main className="arc-content">
          {/* Breadcrumbs */}
          <nav className="arc-breadcrumbs">Archives</nav>

          {/* Header */}
          <header className="arc-header">
            <h1>Archives des Dossiers</h1>
            <button className="arc-btn-export">
              <IconDownload />
              Exporter (CSV)
            </button>
          </header>

          {/* Stats Grid */}
          <section className="arc-stats-grid">
            <div className="arc-stat-card">
              <span className="arc-stat-label">TOTAL ARCHIVÉS</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">1,284</span>
                <span className="arc-trend-badge">+12%</span>
              </div>
            </div>

            <div className="arc-stat-card">
              <span className="arc-stat-label">VALEUR TOTALE (DZD)</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">42.5M</span>
                <div className="arc-stat-icon icon-bank"><IconBank /></div>
              </div>
            </div>

            <div className="arc-stat-card">
              <span className="arc-stat-label">DÉLAI MOYEN (JOURS)</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">14</span>
                <div className="arc-stat-icon icon-clock"><IconClock /></div>
              </div>
            </div>

            <div className="arc-stat-card">
              <span className="arc-stat-label">SITES COUVERTS</span>
              <div className="arc-stat-main">
                <span className="arc-stat-val">48</span>
                <div className="arc-stat-icon icon-pin"><IconPin /></div>
              </div>
            </div>
          </section>

          {/* Filter Bar */}
          <div className="arc-filter-bar">
            <div className="arc-filter-item">
              <IconCalendar />
              <span>Dernière année</span>
              <IconChevronDown />
            </div>
            <div className="arc-filter-sep" />
            <div className="arc-filter-item">
              <IconBuilding />
              <span>Tous les Sites</span>
              <IconChevronDown />
            </div>
            <div className="arc-filter-sep" />
            <div className="arc-filter-item">
              <IconActivity />
              <span>Toutes les Natures</span>
              <IconChevronDown />
            </div>
            <button className="arc-btn-more">
              <IconFilter />
              Plus de Filtres
            </button>
          </div>

          {/* Table Card */}
          <div className="arc-table-card">
            <table className="arc-table">
              <thead>
                <tr>
                  <th>ID DOSSIER</th>
                  <th>DATE D'ARCHIVAGE</th>
                  <th>SITE CONCERNÉ</th>
                  <th>NATURE DU SINISTRE</th>
                  <th>COÛT FINAL (DZD)</th>
                  <th>STATUT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {archiveDossiers.map(d => (
                  <tr key={d.id}>
                    <td className="arc-id">{d.id}</td>
                    <td className="arc-date">{d.date}</td>
                    <td>
                      <div className="arc-site-group">
                        <span className="arc-site-name">{d.site}</span>
                        <span className="arc-region">{d.region}</span>
                      </div>
                    </td>
                    <td>
                      <span className="arc-nature-badge">{d.nature}</span>
                    </td>
                    <td className="arc-cost">{d.cout}</td>
                    <td>
                      <span className="arc-status">{d.statut}</span>
                    </td>
                    <td>
                      <button className="arc-action-btn" onClick={() => navigate('/gestion/' + d.id)}>
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="arc-pagination">
              <span className="arc-info">Affichage de 1 à 5 sur 1,284 dossiers</span>
              <div className="arc-pages">
                <button className="arc-p-btn" disabled><IconChevronLeft /></button>
                <button className="arc-p-btn active">1</button>
                <button className="arc-p-btn">2</button>
                <button className="arc-p-btn">3</button>
                <span style={{ color: '#cbd5e0', padding: '0 4px' }}>...</span>
                <button className="arc-p-btn">257</button>
                <button className="arc-p-btn"><IconChevronRight /></button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────── */
function IconDownload() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IconBank() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconClock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconBuilding() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/></svg> }
function IconActivity() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
function IconChevronDown() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14}}><polyline points="6 9 12 15 18 9"/></svg> }
function IconFilter() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14}}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
function IconEye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="15 18 9 12 15 6"/></svg> }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16}}><polyline points="9 18 15 12 9 6"/></svg> }
