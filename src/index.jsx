import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './context/i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Utilizziamo createRoot come raccomandato per React 18
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);