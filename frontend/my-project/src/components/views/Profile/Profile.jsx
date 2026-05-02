import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../componenets/Sidebar/Sidebar';
import { AuthContext } from '../../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../../api';
import './Profile.css';

export default function Profile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tel: '',
    email: '',
  });
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    api.get('/accounts/profile/')
      .then(res => {
        setProfileData(res.data);
        setFormData({
          tel: res.data.tel || '',
          email: res.data.email || '',
        });
      })
      .catch(err => {
        console.error("Erreur chargement profil", err);
        toast.error("Impossible de charger les informations du profil.");
      });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.put('/accounts/profile/update/', formData)
      .then(res => {
        toast.success("Profil mis à jour avec succès");
        fetchProfile();
      })
      .catch(err => {
        const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : "Erreur de mise à jour";
        toast.error(errorMsg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="pr-layout">
      <Sidebar />
      <div className="pr-main">
        {/* TOPBAR */}
        <header className="pr-topbar">
          <div className="pr-topbar-actions">
            <button className="pr-icon-btn" onClick={() => navigate('/notifications')}>
              <IconBell />
            </button>
            <button className="pr-icon-btn pr-icon-btn--active" onClick={() => navigate('/profile')}>
              <IconUserC />
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="pr-content">
          <div className="pr-header">
            <h1>Mon Profil</h1>
            <p>Gérez vos informations personnelles et paramètres de compte.</p>
          </div>

          {!profileData ? (
            <div className="pr-loading">Chargement des données...</div>
          ) : (
            <div className="pr-card">
              <div className="pr-card-left">
                <div className="pr-avatar-large">
                  {profileData.nom.charAt(0)}{profileData.prenom.charAt(0)}
                </div>
                <h2>{profileData.nom} {profileData.prenom}</h2>
                <span className="pr-role-badge">{profileData.role || 'UTILISATEUR'}</span>
                <div className="pr-info-text">
                  <p><strong>Nom d'utilisateur:</strong> {profileData.username}</p>
                  <p><strong>Statut:</strong> {profileData.estActif ? 'Actif' : 'Inactif'}</p>
                  {profileData.matricule && <p><strong>Matricule:</strong> {profileData.matricule}</p>}
                  {profileData.departement && <p><strong>Département:</strong> {profileData.departement}</p>}
                  {profileData.fonction && <p><strong>Fonction:</strong> {profileData.fonction}</p>}
                  {profileData.specialite && <p><strong>Spécialité:</strong> {profileData.specialite}</p>}
                  {profileData.matriculeTechnique && <p><strong>Matricule Technique:</strong> {profileData.matriculeTechnique}</p>}
                  {profileData.division && <p><strong>Division:</strong> {profileData.division}</p>}
                  {profileData.zoneIntervention && <p><strong>Zone d'Intervention:</strong> {profileData.zoneIntervention}</p>}
                  {profileData.role_assurance && <p><strong>Niveau:</strong> {profileData.role_assurance}</p>}
                </div>
              </div>

              <div className="pr-card-right">
                <h3>Informations de Contact</h3>
                <form onSubmit={handleSubmit} className="pr-form">
                  <div className="pr-field">
                    <label>Adresse Email *</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      required 
                      className="pr-input"
                    />
                  </div>
                  <div className="pr-field">
                    <label>Numéro de Téléphone</label>
                    <input 
                      type="text" 
                      name="tel" 
                      value={formData.tel} 
                      onChange={handleChange} 
                      placeholder="Ex: 05XXXXXXXX"
                      className="pr-input"
                    />
                  </div>
                  
                  <div className="pr-actions">
                    <button type="submit" className="pr-btn-submit" disabled={loading}>
                      {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconUserC() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
