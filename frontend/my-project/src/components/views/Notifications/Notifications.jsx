import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../componenets/Sidebar/Sidebar';
import { toast } from 'react-toastify';
import api from '../../../api';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    setLoading(true);
    api.get('/notifications/')
      .then(res => {
        setNotifications(res.data);
      })
      .catch(err => {
        console.error("Erreur chargement notifications", err);
        toast.error("Impossible de charger les notifications.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleNotificationClick = (notif) => {
    // Marquer comme lue
    if (!notif.is_read) {
      api.post(`/notifications/${notif.id}/read/`)
        .then(() => {
          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        })
        .catch(err => console.error("Erreur marquage notification", err));
    }
    
    // Redirection si lien fourni
    if (notif.lien_action) {
      navigate(notif.lien_action);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="nt-layout">
      <Sidebar />
      <div className="nt-main">
        {/* TOPBAR */}
        <header className="nt-topbar">
          <div className="nt-topbar-actions">
            <button className="nt-icon-btn nt-icon-btn--active" onClick={() => navigate('/notifications')}>
              <IconBell />
              {unreadCount > 0 && <span className="nt-notif-dot" />}
            </button>
            <button className="nt-icon-btn" onClick={() => navigate('/profile')}>
              <IconUserC />
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="nt-content">
          <div className="nt-header">
            <div className="nt-title-row">
              <h1>Centre de Notifications</h1>
              {unreadCount > 0 && (
                <span className="nt-badge-unread">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <p>Retrouvez toutes vos alertes et actions requises.</p>
          </div>

          <div className="nt-list-wrap">
            {loading ? (
              <div className="nt-loading">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="nt-empty">
                <IconCheckCircle />
                <h3>Vous êtes à jour !</h3>
                <p>Aucune notification pour le moment.</p>
              </div>
            ) : (
              <ul className="nt-list">
                {notifications.map(notif => (
                  <li 
                    key={notif.id} 
                    className={`nt-item ${notif.is_read ? 'nt-item--read' : 'nt-item--unread'} ${notif.lien_action ? 'nt-item--clickable' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="nt-item-icon">
                      {notif.is_read ? <IconMailOpen /> : <IconMail />}
                    </div>
                    <div className="nt-item-content">
                      <p className="nt-item-msg">{notif.message}</p>
                      <span className="nt-item-date">{new Date(notif.dateCreation).toLocaleString()}</span>
                    </div>
                    {notif.lien_action && (
                      <div className="nt-item-arrow">
                        <IconChevronRight />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Icons ──
function IconBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}

function IconUserC() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

function IconCheckCircle() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 48, height: 48, color: '#10b981', marginBottom: 16}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

function IconMail() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}

function IconMailOpen() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>;
}

function IconChevronRight() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 16, height: 16, color: '#94a3b8'}}><polyline points="9 18 15 12 9 6"/></svg>;
}
