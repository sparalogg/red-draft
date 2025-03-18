import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './context/i18n';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { DraftProvider } from './context/DraftContext';
import DraftPage from './pages/DraftPage';
import LoginPage from './pages/LoginPage';
import DraftHistoryPage from './pages/DraftHistoryPage';
import './styles/main.css';
import './styles/login.css';
import './styles/multiplayer.css';
import './styles/history.css';
import { cleanupOldRoles } from './utils/draftRoleStorage';
import QuickAccessPage from './pages/QuickAccessPage';
import QueryParamRedirect from './pages/QueryParamRedirect'; // Importa la nuova componente

/**
 * Main App component with provider setup and routing
 */

const App = () => {
  // Default settings
  const defaultSettings = {
    timePerPick: 30,
    timePerBan: 30,
    numberOfBans: 2,
    mirrorPicks: false,
    language: 'en'
  };

  // Gestione reindirizzamenti salvati da 404.html
  useEffect(() => {
    const redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== window.location.href) {
      window.history.replaceState(null, null, redirect);
    }
  }, []);

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', {
      reason: event.reason,
      type: typeof event.reason,
      stack: event.reason instanceof Error ? event.reason.stack : 'No stack trace'
    });
    
    // Previeni il comportamento di default
    event.preventDefault();
  });
  
  return (
    <Router basename="/">
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <SettingsProvider initialSettings={defaultSettings}>
            <DraftProvider settings={defaultSettings}>
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/draft/:draftId" element={<DraftPage />} />
                <Route path="/history" element={<DraftHistoryPage />} />
                <Route 
                  path="/quick-access/:draftId/:accessCode" 
                  element={<QuickAccessPage />} 
                />
                {/* Nuova rotta per gestire i parametri di query */}
                <Route path="/" element={<QueryParamRedirect />} />
                {/* Catch-all route come ultima opzione */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DraftProvider>
          </SettingsProvider>
        </AuthProvider>
      </I18nextProvider>
    </Router>
  );
};

export default App;