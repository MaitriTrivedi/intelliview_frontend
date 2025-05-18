import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Interview from './pages/Interview';
import Navbar from './components/Navbar';
import { logNetworkInfo } from './utils/networkUtils';
import { ENABLE_API_LOGS } from './config/environment';
import './App.css';

// Protected route component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [networkStatus, setNetworkStatus] = useState({
    mainServerReachable: null,
    llmServiceReachable: null
  });

  // Log network configuration on startup
  useEffect(() => {
    const checkNetworkStatus = async () => {
      if (ENABLE_API_LOGS) {
        const status = await logNetworkInfo();
        setNetworkStatus(status);
      }
    };
    
    checkNetworkStatus();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <main className="content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />
              <Route path="/interview" element={
                <PrivateRoute>
                  <Interview />
                </PrivateRoute>
              } />
              </Routes>
          </main>
          {ENABLE_API_LOGS && (
            <div style={{ 
              position: 'fixed', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              background: '#f8f9fa', 
              padding: '4px 10px', 
              fontSize: '10px', 
              color: '#666',
              borderTop: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Main Server: {
                networkStatus.mainServerReachable === null ? 'Checking...' :
                networkStatus.mainServerReachable ? '✅ Connected' : '❌ Disconnected'
              }</span>
              <span>LLM Service: {
                networkStatus.llmServiceReachable === null ? 'Checking...' :
                networkStatus.llmServiceReachable ? '✅ Connected' : '❌ Disconnected'
              }</span>
            </div>
          )}
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
