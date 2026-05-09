import { Routes, Route } from 'react-router-dom'
import MemberFlow from './pages/MemberFlow'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import Datenschutz from './pages/Datenschutz'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MemberFlow />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
    </Routes>
  )
}
