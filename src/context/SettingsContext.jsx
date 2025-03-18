import React, { createContext, useContext, useState } from 'react';

const defaultSettings = {
  timePerPick: 30,
  timePerBan: 30,
  numberOfBans: 2,
  mirrorPicks: false,
  language: 'en',
  teamBonusTime: 30,
  startingTeam: 'coinFlip' // 'coinFlip', 'blue', 'red'
};

// Create context
const SettingsContext = createContext();

// Provider component
export function SettingsProvider({ children, initialSettings = {} }) {
  // Prova a caricare le impostazioni da localStorage
  const loadedSettings = (() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      return savedSettings 
        ? JSON.parse(savedSettings) 
        : {};
    } catch (e) {
      console.error("Error loading settings from localStorage:", e);
      return {};
    }
  })();

  const [settings, setSettings] = useState({
    ...defaultSettings,
    ...initialSettings,
    ...loadedSettings
  });
  
  // Function to update settings
  const updateSettings = (newSettings) => {
   
    setSettings(prevSettings => {
      const updatedSettings = {
        ...defaultSettings,  // Usa i valori di default come base
        ...prevSettings,     // Sovrapponi le impostazioni precedenti
        ...newSettings       // Infine sovrapponi le nuove impostazioni
      };
      
      return updatedSettings;
    });
  
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        ...defaultSettings,
        ...newSettings
      }));
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  };

  // Function to update language
  const changeLanguage = (language) => {
    //console.log("Changing language in context to:", language);
    
    const validLang = language && ['en', 'it'].includes(language) ? language : 'en';
    
    setSettings(prevSettings => ({
      ...prevSettings,
      language: validLang
    }));
  
    // Salva in localStorage
    try {
      localStorage.setItem('appLanguage', validLang);
    } catch (e) {
      console.error("Failed to save language to localStorage:", e);
    }
  };

  // Creiamo un oggetto con lo state e le funzioni per modificarlo
  const value = {
    settings,
    updateSettings,
    changeLanguage
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook for using the settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}