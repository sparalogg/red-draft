import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { useDraft } from '../../context/DraftContext';

import { ref, get } from 'firebase/database';
import { database } from '../../services/firebase';
import { useChampions } from '../../hooks/useChampions';


const SettingsModal = ({ show, onHide }) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, changeLanguage } = useSettings();
  const draftContext = useDraft();
  const { champions } = useChampions();

  // Stato per i valori del form
  const [formValues, setFormValues] = useState({
    timePerPick: settings.timePerPick || 30,
    timePerBan: settings.timePerBan || 30,
    numberOfBans: settings.numberOfBans || 2,
    mirrorPicks: settings.mirrorPicks || false,
    teamBonusTime: settings.teamBonusTime || 0,
    coinFlipEnabled: settings.coinFlipEnabled || false,
    language: settings.language || 'en',
    startingTeam: settings.startingTeam || 'coinFlip',
    blueTeamName: draftContext.state.teamNames?.blue || t('teams.blue'),
    redTeamName: draftContext.state.teamNames?.red || t('teams.red'),
    disabledChampions: draftContext.state.settings?.disabledChampions || ['empty']
  });

  // Stato per i codici di accesso
  const [accessCodes, setAccessCodes] = useState({
    draftCode: '',
    adminCode: '',
    blueCode: '',
    redCode: ''
  });

  const [language, setLanguage] = useState(settings.language || 'en');

  useEffect(() => {
    //console.log('Language from settings:', settings.language);
    setLanguage(settings.language || 'en');
  }, [settings.language]);

  // Aggiorna i valori del form quando cambiano le impostazioni o viene aperto il modal
  useEffect(() => {
    if (show) {
      setFormValues({
        timePerPick: settings.timePerPick || 30,
        timePerBan: settings.timePerBan || 30,
        numberOfBans: settings.numberOfBans || 2,
        mirrorPicks: settings.mirrorPicks || false,
        teamBonusTime: settings.teamBonusTime || 0,
        coinFlipEnabled: settings.coinFlipEnabled || false,
        language: settings.language || 'en',
        startingTeam: settings.startingTeam || 'coinFlip',
        blueTeamName: draftContext.state.teamNames?.blue || t('teams.blue'),
        redTeamName: draftContext.state.teamNames?.red || t('teams.red'),
        disabledChampions: draftContext.state.settings?.disabledChampions || ['empty']
      });

      const currentDraftId = draftContext.state.draftId;
        
      // Funzione per caricare i codici di accesso
      const fetchAccessCodes = async () => {
        try {
          const draftRef = ref(database, `drafts/${currentDraftId}`);
          const snapshot = await get(draftRef);
          
          if (snapshot.exists()) {
            const draftData = snapshot.val();
            
            // Verifica se esiste il nodo 'codes'
            if (draftData.codes) {
              //console.log("Codici trovati:", draftData.codes);
              
              setAccessCodes({
                draftCode: currentDraftId || 'N/A',
                adminCode: draftData.codes.admin_code || 'N/A',
                blueCode: draftData.codes.team_blu_code || 'N/A',
                redCode: draftData.codes.team_red_code || 'N/A'
              });
            } else {
              console.warn("Nodo 'codes' non trovato per questo draft");
              setAccessCodes({
                draftCode: currentDraftId || 'N/A',
                adminCode: 'N/A',
                blueCode: 'N/A',
                redCode: 'N/A'
              });
            }
          }
        } catch (error) {
          console.error("Errore nel recupero dei codici:", error);
        }
      };
      
      // Esegui il caricamento dei codici
      fetchAccessCodes();
    }
  }, [show, settings, draftContext.state, t]);


  // Gestore dei cambiamenti degli input
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) : value
    }));
  };

  
  const handleDisabledChampionsChange = (e) => {
    // Converte l'HTMLCollection delle opzioni selezionate in un array di valori
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    
    setFormValues(prev => ({
      ...prev,
      disabledChampions: selectedOptions
    }));
  };

  // Gestore del cambio lingua
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    
    /*console.log('Cambio lingua:', {
      oldLanguage: language,
      newLanguage: newLanguage
    });*/

    // Aggiorna lo stato locale
    setLanguage(newLanguage);

    // Cambia la lingua di i18n
    i18n.changeLanguage(newLanguage);

    // Aggiorna le impostazioni globali
    changeLanguage(newLanguage);
  };

  // Gestore del salvataggio delle impostazioni
  const handleSaveSettings = async () => {
    try {

          // Crea un array completo con tutti i valori
        const disabledChampionsArray = [...formValues.disabledChampions];
        
        // Crea un oggetto con proprietà separate per ogni campione disabilitato
        const disabledChampionsObject = {};
        disabledChampionsArray.forEach(championId => {
          disabledChampionsObject[championId] = true;
        });
        
      // Validazione dei valori
      const validatedSettings = {
        timePerPick: Math.min(Math.max(parseInt(formValues.timePerPick) || 30, 5), 120),
        timePerBan: Math.min(Math.max(parseInt(formValues.timePerBan) || 30, 5), 60),
        numberOfBans: parseInt(formValues.numberOfBans) || 2,
        mirrorPicks: Boolean(formValues.mirrorPicks),
        teamBonusTime: Math.min(Math.max(parseInt(formValues.teamBonusTime) || 0, 0), 300),
        coinFlipEnabled: Boolean(formValues.coinFlipEnabled),
        language: formValues.language || 'en',
        startingTeam: formValues.startingTeam || 'coinFlip',  
        disabledChampions: disabledChampionsArray,
        disabledChampionsMap: disabledChampionsObject
      };
      
      // Log per debug
      //console.log('Saving settings:', validatedSettings);
      
      // 1. Prima di tutto, aggiorna i nomi dei team
      // Pulisci eventuali spazi all'inizio e alla fine
      const blueTeamName = formValues.blueTeamName.trim();
      const redTeamName = formValues.redTeamName.trim();
      
      await draftContext.updateTeamNames(blueTeamName, redTeamName);
      
      // 2. Poi aggiorna le impostazioni del draft (questo aggiorna Firebase)
      await draftContext.updateDraftSettings({
        ...validatedSettings,
        disabledChampions: formValues.disabledChampions
      });

      const championsGrid = document.querySelector('.champions-grid');
        if (championsGrid) {
          // Aggiunge e rimuove una classe temporanea per forzare una revisione del DOM
          championsGrid.classList.add('settings-updated');
          setTimeout(() => {
            championsGrid.classList.remove('settings-updated');
          }, 100);
        }
        
      // 3. Infine aggiorna le impostazioni locali
      updateSettings(validatedSettings);
      changeLanguage(validatedSettings.language);
      
      // Chiudi il modal solo quando tutte le operazioni sono completate
      onHide();
      
      //console.log('Settings successfully updated and propagated');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert("Si è verificato un errore durante il salvataggio delle impostazioni. Riprova.");
    }
  };

  // Se il modal non è mostrato, non renderizzare nulla
  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} id="settingsModal" tabIndex="-1" aria-labelledby="settingsModalLabel">
      <div className="modal-dialog">
        <div className="modal-content login-card">
          <div className="modal-header">
            <h5 className="modal-title" id="settingsModalLabel">{t('settings.title')}</h5>
            <button type="button" className="btn-close" onClick={onHide} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="white" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
            </button>
          </div>
          <div className="modal-body">

                        {/* Language */}
                <div className="mb-3">
              <label htmlFor="languageSelect" className="form-label">Language / Lingua</label>
              <select
              className="form-select"
              id="language"
              name="language"
              value={formValues.language}
              onChange={handleLanguageChange} // Assicurati che questo sia esattamente il nome del metodo
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
            </div>
            <hr></hr>

            {/* Codici di Accesso */}
            <div className="access-codes-section mb-4">
              <h6>{t('settings.accesscodes')} </h6>
              
              <div className="access-code-item">
                <label>{t('settings.code_draft')}:</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={accessCodes.draftCode} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(accessCodes.draftCode)}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              
              <div className="access-code-item">
                <label>{t('settings.code_draft_admin')}:</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={accessCodes.adminCode} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(accessCodes.adminCode)}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              
              <div className="access-code-item">
                <label>{t('settings.code_draft_blue')}:</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={accessCodes.blueCode} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(accessCodes.blueCode)}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              
              <div className="access-code-item">
                <label>{t('settings.code_draft_red')}:</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={accessCodes.redCode} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(accessCodes.redCode)}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="blueTeamName" className="form-label">
                {t('settings.name_team_blu')}
              </label>
              <input
                type="text"
                className="form-control"
                id="blueTeamName"
                name="blueTeamName"
                value={formValues.blueTeamName}
                onChange={handleInputChange}
                maxLength={20}
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="redTeamName" className="form-label">
              {t('settings.name_team_red')}
              </label>
              <input
                type="text"
                className="form-control"
                id="redTeamName"
                name="redTeamName"
                value={formValues.redTeamName}
                onChange={handleInputChange}
                maxLength={20}
              />
            </div>

            {/* Time per pick */}
            <div className="mb-3">
              <label htmlFor="timePerPick" className="form-label">{t('settings.timePerPick')}</label>
              <input
                type="number"
                className="form-control"
                id="timePerPick"
                name="timePerPick"
                value={formValues.timePerPick}
                onChange={handleInputChange}
                min="5"
                max="120"
              />
            </div>
            
            {/* Time per ban */}
            <div className="mb-3">
              <label htmlFor="timePerBan" className="form-label">{t('settings.timePerBan')}</label>
              <input
                type="number"
                className="form-control"
                id="timePerBan"
                name="timePerBan"
                value={formValues.timePerBan}
                onChange={handleInputChange}
                min="5"
                max="60"
              />
            </div>
            
            {/* Number of bans */}
            <div className="mb-3">
              <label htmlFor="numberOfBans" className="form-label">{t('settings.numberOfBans')}</label>
              <select
                className="form-select"
                id="numberOfBans"
                name="numberOfBans"
                value={formValues.numberOfBans}
                onChange={handleInputChange}
              >
                <option value="1">1 ban</option>
                <option value="2">2 bans</option>
                <option value="3">3 bans</option>
                <option value="4">4 bans - beta</option>
              </select>
            </div>

            {/* Coin flip */}
            <div className="mb-3">
              <label htmlFor="startingTeam" className="form-label">
                {t('settings.starterTeam')}
              </label>
              <select
                className="form-select"
                id="startingTeam"
                name="startingTeam"
                value={formValues.startingTeam}
                onChange={handleInputChange}
              >
                <option value="coinFlip">{t('settings.starterTeam_coinFlip')}</option>
                <option value="blue">{t('settings.starterTeam_blue')}</option>
                <option value="red">{t('settings.starterTeam_red')}</option>
              </select>
            </div>
            
            {/* Mirror picks */}
            <div className="mb-3">
              <label className="form-label">{t('settings.mirrorPicks')}</label>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="mirrorPicksToggle"
                  name="mirrorPicks"
                  checked={formValues.mirrorPicks}
                  onChange={handleInputChange}
                />
                <label className="form-check-label" htmlFor="mirrorPicksToggle">
                  {t('settings.mirrorPicksDesc')}
                </label>
              </div>
            </div>
            
            {/* Team Bonus Time */}
            <div className="mb-3">
              <label htmlFor="teamBonusTime" className="form-label">
                {t('settings.teamBonusTime', 'Tempo Bonus per Squadra (secondi)')}
              </label>
              <input
                type="number"
                className="form-control"
                id="teamBonusTime"
                name="teamBonusTime"
                value={formValues.teamBonusTime}
                onChange={handleInputChange}
                min="0"
                max="300"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="disabledChampions" className="form-label">
                {t('settings.campioni_disabilitati', 'Campioni Disabilitati')}
              </label>
              <select
                multiple
                className="form-select"
                id="disabledChampions"
                name="disabledChampions"
                value={formValues.disabledChampions}
                onChange={handleDisabledChampionsChange}
                style={{ height: '200px' }}
              >
                {champions.map(champion => (
                  <option 
                    key={champion.id} 
                    value={champion.id}
                  >
                    {champion.id === 'empty' ? 'Empty Champion (Default disabled)' : champion.name}
                  </option>
                ))}
              </select>
              <div className="form-text">
                {t('settings.info_campioni1', 'Tieni premuto Ctrl (o Cmd su Mac) per selezionare più campioni.')}
                <br/>
                {t('settings.info_campioni2', 'Il campione vuoto è disabilitato per default ma può essere reso disponibile.')}
              </div>
            </div>
            
          </div>
          <div>
            <center>
              <small>After saving the settings click on the draft reset button</small>
            </center>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary mode-tab predModeTabLeft" 
              onClick={onHide}
            >
              {t('settings.close')}
            </button>
            <button 
              type="button" 
              className="btn btn-primary mode-tab predModeTabRight" 
              onClick={handleSaveSettings}
            >
              {t('settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;