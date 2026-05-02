import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Pour éviter les sauts de page pendant la vérification
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // jwt-decode ne vérifie pas automatiquement l'expiration, on peut le faire manuellement
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          // Token expiré
          logout();
        } else {
          // Mettre à jour l'utilisateur avec le rôle et autres infos du payload
          setUser({
            role: decoded.role,
            nom: decoded.nom,
            prenom: decoded.prenom,
          });
        }
      } catch (error) {
        console.error("Token invalide:", error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Poll for notifications if user is logged in
  useEffect(() => {
    let interval;
    if (user) {
      const fetchNotifs = () => {
        api.get('/notifications/')
          .then(res => {
            const unread = res.data.filter(n => !n.is_read).length;
            setUnreadNotifsCount(unread);
          })
          .catch(err => console.error("Erreur polling notifications:", err));
      };
      
      fetchNotifs(); // Fetch immediately
      interval = setInterval(fetchNotifs, 30000); // Fetch every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const login = (tokenData) => {
    localStorage.setItem('access_token', tokenData.access);
    localStorage.setItem('refresh_token', tokenData.refresh);
    
    // Le CustomTokenObtainPairSerializer renvoie aussi les infos `user` dans la réponse API
    // Mais on peut aussi les décoder depuis le token comme fallback.
    const decoded = jwtDecode(tokenData.access);
    setUser({
      role: decoded.role,
      nom: decoded.nom,
      prenom: decoded.prenom,
    });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, unreadNotifsCount, setUnreadNotifsCount }}>
      {children}
    </AuthContext.Provider>
  );
};
