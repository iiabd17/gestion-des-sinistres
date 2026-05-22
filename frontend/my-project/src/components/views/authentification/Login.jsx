import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import api from '../../../api'
import { toast } from 'react-toastify'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPopup, setShowForgotPopup] = useState(false)
  const [forgotName, setForgotName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/token/', {
        username: email,
        password: password
      })

      // Use the login function from AuthContext which handles token storage and user decoding
      login(response.data)

      navigate('/dashboard')
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Identifiants incorrects. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotName.trim()) {
      toast.error('Veuillez saisir votre nom ou matricule.')
      return
    }
    try {
      await api.post('/accounts/forgot-password/', { identifier: forgotName })
      toast.success(`Demande envoyée. L'administrateur contactera ${forgotName} pour réinitialiser le mot de passe.`)
      setShowForgotPopup(false)
      setForgotName('')
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error)
      } else {
        toast.error('Une erreur est survenue lors de l\'envoi de la demande.')
      }
    }
  }

  return (
    <div className="lp-wrapper">

      {/* ── Left dark panel ── */}
      <div className="lp-left">
        <div className="lp-overlay" />

        {/* Logo */}
        <div className="lp-logo">
          <img src="/logo.png" alt="Logo" className="lp-logo-image" />
          <span className="lp-logo-text">DJEZZY</span>
        </div>

        {/* Hero text */}
        <div className="lp-hero">
          <h1 className="lp-hero-title">
            Portail de
            <span className="lp-hero-red"> Gestion des<br />Sinistres</span>
          </h1>
          <p className="lp-hero-desc">
            Accédez à la suite professionnelle pour les experts
            en assurance et les gestionnaires de sinistres.
            Fluide, dynamique et fiable.
          </p>
        </div>

        <p className="lp-footer">© 2026 Djezzy. Tous droits réservés.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="lp-right">
        <div className="lp-card">
          <h2 className="lp-title">Ravi de vous revoir</h2>
          <p className="lp-subtitle">
            Veuillez saisir vos identifiants pour accéder à votre compte .
          </p>

          {error && (
            <div style={{ color: '#E2000F', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <form className="lp-form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="lp-field">
              <label htmlFor="lp-email" className="lp-label">
                E-mail ou Nom d'utilisateur
              </label>
              <div className="lp-input-wrap">
                {/* user icon */}
                <svg className="lp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="lp-email"
                  type="text"
                  className="lp-input"
                  placeholder="nom@djezzy.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="lp-field">
              <div className="lp-label-row">
                <label htmlFor="lp-password" className="lp-label">Mot de passe</label>
                <button type="button" className="lp-forgot" onClick={(e) => { e.preventDefault(); setShowForgotPopup(true); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Mot de passe oublié ?</button>
              </div>
              <div className="lp-input-wrap">
                {/* lock icon */}
                <svg className="lp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="lp-password"
                  type={showPassword ? 'text' : 'password'}
                  className="lp-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="lp-remember" htmlFor="lp-remember">
              <input
                id="lp-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Se souvenir de cet appareil</span>
            </label>

            {/* Submit */}
            <button type="submit" id="btn-login" className="lp-btn" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && (
                <svg className="lp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Forgot Password Popup ── */}
      {showForgotPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForgotPopup(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', transform: 'translateY(0)', transition: 'all 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>Réinitialiser le mot de passe</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Veuillez saisir votre nom ou matricule. Une demande sera envoyée à l'administrateur.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="lp-forgot-name" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Nom ou Matricule</label>
                <input
                  id="lp-forgot-name"
                  type="text"
                  placeholder="Saisissez votre nom ou matricule"
                  value={forgotName}
                  onChange={(e) => setForgotName(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#E2000F'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPopup(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                  onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', background: '#E2000F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(226, 0, 15, 0.2)' }}
                  onMouseOver={(e) => e.target.style.background = '#c8000d'}
                  onMouseOut={(e) => e.target.style.background = '#E2000F'}
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
