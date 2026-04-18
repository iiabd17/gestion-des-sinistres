import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Pages/authentification/Login'
import Dashboard from './Pages/Dashboard/Dashboard'
import NewDeclaration from './Pages/Declaration/NewDeclaration'
import Declarations from './Pages/Declarations/Declarations'
import DossierValidation from './Pages/Declarations/DossierValidation'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/declarations" element={<Declarations />} />
        <Route path="/declarations/new" element={<NewDeclaration />} />
        <Route path="/declarations/valider/:id" element={<DossierValidation />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
