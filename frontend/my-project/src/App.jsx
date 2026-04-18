import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Pages/authentification/Login'
import Dashboard from './Pages/Dashboard/Dashboard'
import NewDeclaration from './Pages/Declaration/NewDeclaration'
import Declarations from './Pages/Declarations/Declarations'
import DossierValidation from './Pages/Declarations/DossierValidation'
import DossierCompleterDetail from './Pages/Declarations/DossierCompleterDetail'
import GestionDossiers from './Pages/GestionDossiers/GestionDossiers'
import DossierGestionDetail from './Pages/GestionDossiers/DossierGestionDetail'
import Archives from './Pages/Archives/Archives'
import Settings from './Pages/Settings/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/declarations" element={<Declarations />} />
        <Route path="/declarations/new" element={<NewDeclaration />} />
        <Route path="/declarations/completer/:id" element={<DossierCompleterDetail />} />
        <Route path="/declarations/valider/:id" element={<DossierValidation />} />
        <Route path="/gestion" element={<GestionDossiers />} />
        <Route path="/gestion/:id" element={<DossierGestionDetail />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
