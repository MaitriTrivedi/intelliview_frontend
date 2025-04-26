import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home'; // Protected dashboard
import ResumeUpload from './pages/ResumeUpload';
import Interview from './pages/Interview';
import Result from './pages/Result';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage'; // 👈 Import landing page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} /> {/* 👈 Public home */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
