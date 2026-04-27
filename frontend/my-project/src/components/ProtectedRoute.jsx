import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F8F9FA' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #E2000F', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    // Non authentifié, on redirige vers le login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Authentifié mais rôle non autorisé, on renvoie vers le dashboard par défaut
    // (on pourrait aussi renvoyer vers une page 403)
    return <Navigate to="/dashboard" replace />;
  }

  // Si on utilise le composant comme layout (via `<Outlet />`) ou comme un wrapper classique (via `children`)
  // Ici on part du principe qu'il est utilisé dans la définition des routes avec <Route element={<ProtectedRoute />}>
  return <Outlet />;
}
