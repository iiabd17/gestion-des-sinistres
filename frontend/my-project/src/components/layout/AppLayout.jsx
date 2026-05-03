import { useContext, useState } from 'react'
import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import Sidebar from '../../componenets/Sidebar/Sidebar'
import './AppLayout.css'

export default function AppLayout() {
  const { user, loading, unreadNotifsCount } = useContext(AuthContext)
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /* ── Auth guard ── */
  if (loading) {
    return (
      <div className="al-loading">
        <div className="al-spinner" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userName = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur'

  return (
    <div className="al-layout">
      {/* ── Mobile overlay ── */}
      {mobileMenuOpen && (
        <div className="al-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div className={`al-sidebar-wrap ${mobileMenuOpen ? 'al-sidebar-wrap--open' : ''}`}>
        <Sidebar />
      </div>

      {/* ── Main area ── */}
      <div className="al-main">
        {/* ── Global header ── */}
        <header className="al-header">
          {/* Hamburger (mobile only) */}
          <button
            className="al-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Right actions */}
          <div className="al-header-actions">
            <button
              className="al-header-btn"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              style={{ position: 'relative' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifsCount > 0 && <span className="al-notif-dot" />}
            </button>

            <button
              className="al-header-btn al-avatar-btn"
              onClick={() => navigate('/profile')}
              aria-label="Profil"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            <span className="al-user-name">{userName}</span>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="al-page">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
