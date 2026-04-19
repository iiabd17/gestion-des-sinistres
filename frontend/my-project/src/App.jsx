import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './Pages/authentification/LoginPage'
import DashboardPage from './Pages/Dashboard/DashboardPage'
import NewDeclarationPage from './Pages/Declaration/NewDeclarationPage'
import DeclarationsPage from './Pages/Declarations/DeclarationsPage'
import DossierValidationPage from './Pages/Declarations/DossierValidationPage'
import DossierCompleterDetailPage from './Pages/Declarations/DossierCompleterDetailPage'
import GestionDossiersPage from './Pages/GestionDossiers/GestionDossiersPage'
import DossierGestionDetailPage from './Pages/GestionDossiers/DossierGestionDetailPage'
import ArchivesPage from './Pages/Archives/ArchivesPage'
import SettingsPage from './Pages/Settings/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/declarations" element={<DeclarationsPage />} />
        <Route path="/declarations/new" element={<NewDeclarationPage />} />
        <Route path="/declarations/completer/:id" element={<DossierCompleterDetailPage />} />
        <Route path="/declarations/valider/:id" element={<DossierValidationPage />} />
        <Route path="/gestion" element={<GestionDossiersPage />} />
        <Route path="/gestion/:id" element={<DossierGestionDetailPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
