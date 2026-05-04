import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../api';
import './Notifications.css';

const NATURE_OPTIONS = [
  { value: '', label: 'Toutes les natures' },
  { value: 'VOL', label: 'Vol' },
  { value: 'INCENDIE', label: 'Incendie' },
  { value: 'FIBRE_OPTIQUE', label: 'Fibre Optique' },
  { value: 'ACTE_DE_SABOTAGE', label: 'Acte de Sabotage' },
  { value: 'INTEMPERIE', label: 'Intempérie' },
  { value: 'CATASTROPHE_NATUREL', label: 'Catastrophe Naturelle' },
  { value: 'VIOLENCE_POLITIQUE', label: 'Violence Politique' },
  { value: 'RC', label: 'RC' },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [filterStatut, setFilterStatut] = useState('');
  const [filterNature, setFilterNature] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    setLoading(true);
    api.get('/notifications/')
      .then(res => setNotifications(res.data))
      .catch(() => toast.error("Impossible de charger les notifications."))
      .finally(() => setLoading(false));
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      api.post(`/notifications/${notif.id}/read/`)
        .then(() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)))
        .catch(err => console.error("Erreur marquage notification", err));
    }
    if (notif.lien_action) navigate(notif.lien_action);
  };

  // ── Client-side filtering ──
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filterStatut === 'unread' && n.is_read) return false;
      if (filterStatut === 'read' && !n.is_read) return false;

      if (filterNature) {
        const msg = (n.message || '').toLowerCase();
        const keyword = filterNature.toLowerCase().replace(/_/g, ' ');
        if (!msg.includes(keyword.split(' ')[0]) && !(n.sinistre_id || '').toLowerCase().includes(keyword)) {
          return false;
        }
      }

      if (filterDateFrom) {
        if (new Date(n.dateCreation) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59);
        if (new Date(n.dateCreation) > to) return false;
      }

      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        if (!(n.sinistre_id || '').toLowerCase().includes(q) && !(n.message || '').toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, filterStatut, filterNature, filterDateFrom, filterDateTo, filterSearch]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const hasActiveFilters = filterStatut || filterNature || filterDateFrom || filterDateTo || filterSearch.trim();

  const resetFilters = () => {
    setFilterStatut('');
    setFilterNature('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSearch('');
  };

  return (
    <div className="nt-page-content">
      <div className="nt-content">

        {/* Header */}
        <div className="nt-header">
          <div className="nt-title-row">
            <h1>Centre de Notifications</h1>
            {unreadCount > 0 && (
              <span className="nt-badge-unread">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <p>Retrouvez toutes vos alertes et actions requises.</p>
        </div>

        {/* ── Filters Bar ── */}
        <div className="nt-filters">
          <div className="nt-filter-group">
            <label className="nt-filter-label">STATUT</label>
            <select className="nt-filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="unread">Non lu</option>
              <option value="read">Lu</option>
            </select>
          </div>

          <div className="nt-filter-group">
            <label className="nt-filter-label">NATURE</label>
            <select className="nt-filter-select" value={filterNature} onChange={e => setFilterNature(e.target.value)}>
              {NATURE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="nt-filter-group nt-filter-group--period">
            <label className="nt-filter-label">PÉRIODE</label>
            <div className="nt-period-row">
              <input type="date" className="nt-filter-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              <span className="nt-period-arrow">→</span>
              <input type="date" className="nt-filter-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </div>

          <div className="nt-filter-group nt-filter-group--search">
            <label className="nt-filter-label">RECHERCHER</label>
            <div className="nt-search-wrap">
              <IconSearch />
              <input
                type="text"
                className="nt-filter-input nt-search-input"
                placeholder="Rechercher par ID..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button className="nt-reset-btn" onClick={resetFilters}>✕ Réinitialiser</button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="nt-results-count">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {notifications.length}
          </p>
        )}

        {/* List */}
        <div className="nt-list-wrap">
          {loading ? (
            <div className="nt-loading">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="nt-empty">
              <IconCheckCircle />
              <h3>{hasActiveFilters ? 'Aucun résultat' : 'Vous êtes à jour !'}</h3>
              <p>{hasActiveFilters ? 'Essayez de modifier vos filtres.' : 'Aucune notification pour le moment.'}</p>
            </div>
          ) : (
            <ul className="nt-list">
              {filtered.map(notif => (
                <li
                  key={notif.id}
                  className={`nt-item ${notif.is_read ? 'nt-item--read' : 'nt-item--unread'} ${notif.lien_action ? 'nt-item--clickable' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="nt-item-icon">
                    {notif.is_read ? <IconMailOpen /> : <IconMail />}
                  </div>
                  <div className="nt-item-content">
                    {notif.sinistre_id && (
                      <div className="nt-item-sinistre-id">
                        Dossier: <strong>{notif.sinistre_id}</strong>
                      </div>
                    )}
                    <p className="nt-item-msg">{notif.message}</p>
                    <div className="nt-item-footer">
                      <span className="nt-item-date">{new Date(notif.dateCreation).toLocaleString('fr-FR')}</span>
                      {notif.expediteur_nom && (
                        <span className="nt-item-sender"> • De : {notif.expediteur_nom}</span>
                      )}
                    </div>
                  </div>
                  {notif.lien_action && (
                    <div className="nt-item-arrow"><IconChevronRight /></div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Icons ──
function IconSearch() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15,flexShrink:0,color:'#94a3b8'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IconCheckCircle() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:48,height:48,color:'#10b981',marginBottom:16}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function IconMail() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function IconMailOpen() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>;
}
function IconChevronRight() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,color:'#94a3b8'}}><polyline points="9 18 15 12 9 6"/></svg>;
}
