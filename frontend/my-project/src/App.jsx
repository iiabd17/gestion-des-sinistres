import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './Pages/authentification/LoginPage';
import DashboardPage from './Pages/Dashboard/DashboardPage';
import NewDeclarationPage from './Pages/Declaration/NewDeclarationPage';
import DeclarationsPage from './Pages/Declarations/DeclarationsPage';
import DossierValidationPage from './Pages/Declarations/DossierValidationPage';
import DossierCompleterDetailPage from './Pages/Declarations/DossierCompleterDetailPage';
import GestionDossiersPage from './Pages/GestionDossiers/GestionDossiersPage';
import DossierGestionDetailPage from './Pages/GestionDossiers/DossierGestionDetailPage';
import ArchivesPage from './Pages/Archives/ArchivesPage';
import SettingsPage from './Pages/Settings/SettingsPage';
import ProfilePage from './Pages/Profile/ProfilePage';
import NotificationsPage from './Pages/Notifications/NotificationsPage';
import StatistiquesDelaisPage from './Pages/Statistiques/StatistiquesDelaisPage';
import SupportPage from './Pages/Support/SupportPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ── All authenticated routes share AppLayout (Sidebar + Header) ── */}
          <Route element={<AppLayout />}>

            {/* Routes Protégées - Tout rôle connecté */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/support" element={<SupportPage />} />
            </Route>

            {/* Routes Équipe Terrain & Assurance */}
            <Route element={<ProtectedRoute allowedRoles={['EQUIPE_TERRAIN', 'INGENIEUR', 'ASSURANCE', 'ADMIN']} />}>
              <Route path="/declarations/new" element={<NewDeclarationPage />} />
            </Route>

            {/* Routes Déclarations (liste) */}
            <Route element={<ProtectedRoute allowedRoles={['EQUIPE_TERRAIN', 'INGENIEUR', 'ASSURANCE', 'HSE', 'LEGAL', 'ADMIN']} />}>
              <Route path="/declarations" element={<DeclarationsPage />} />
              <Route path="/declarations/completer/:id" element={<DossierCompleterDetailPage />} />
            </Route>

            {/* Routes Validation/Gestion (Assurance, Légal, HSE, Ingénieur) */}
            <Route element={<ProtectedRoute allowedRoles={['ASSURANCE', 'LEGAL', 'HSE', 'INGENIEUR', 'ADMIN']} />}>
              <Route path="/declarations/valider/:id" element={<DossierValidationPage />} />
              <Route path="/gestion" element={<GestionDossiersPage />} />
              <Route path="/gestion/:id" element={<DossierGestionDetailPage />} />
            </Route>

            {/* Routes Archives */}
            <Route element={<ProtectedRoute allowedRoles={['LEGAL', 'ASSURANCE', 'ADMIN', 'HSE', 'INGENIEUR']} />}>
              <Route path="/archives" element={<ArchivesPage />} />
              <Route path="/archives/:id" element={<DossierGestionDetailPage />} />
            </Route>

            {/* Routes Statistiques (Assurance / Admin) */}
            <Route element={<ProtectedRoute allowedRoles={['ASSURANCE', 'ADMIN']} />}>
              <Route path="/statistiques-delais" element={<StatistiquesDelaisPage />} />
            </Route>

            {/* Routes Paramètres */}
            <Route element={<ProtectedRoute allowedRoles={['ASSURANCE', 'ADMIN', 'INGENIEUR']} />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
