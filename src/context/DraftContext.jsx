import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { generateDraftSequence } from '../hooks/useDraftSequence';
import { database } from '../services/firebase';
import { ref, onValue, set, update, get, onDisconnect, remove  } from 'firebase/database';
import ConnectionStatus from '../components/common/ConnectionStatus';

// Timeout più lungo per le operazioni Firebase
const DEFAULT_TIMEOUT = 60000; // 60 secondi

// Funzione di utilità per aggiungere timeout e retry alle richieste Firebase
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase request timeout')), DEFAULT_TIMEOUT)
        )
      ]);
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Initial state
const initialState = {
  currentPhase: 'notStarted', 
  currentTeam: 'blue',
  currentTimer: 30,
  isPaused: false,
  coinFlipInProgress: false,
  coinFlipResult: null,
  selectedChampion: null,
  startingTeamChoice: null,
  startingTeam: 'coinFlip',
  selectedChampions: {
    blue: [],
    red: []
  },
  bannedChampions: {
    blue: [],
    red: []
  },
  disabledChampions: ['empty'],
  currentSelections: [], 
  requiredSelections: 1,
  isMultipleSelectionStep: false,
  draftSequence: [],
  currentStepIndex: 0,
  draftId: null,
  userTeam: null,
  isUsingBonusTime: {
    blue: false,
    red: false
  },
  slotSelections: {},
  teamNames: {
    blue: 'Blue',
    red: 'Red'
  },
  teamBonusTime: {
    blue: 0,
    red: 0
  },
  settings: {
    timePerPick: 30,
    timePerBan: 30,
    numberOfBans: 2,
    teamBonusTime: 30,
    mirrorPicks: false
  }
};

// Action types
const ACTIONS = {
  SET_DRAFT_STATE: 'SET_DRAFT_STATE',
  START_DRAFT: 'START_DRAFT',
  RESET_DRAFT: 'RESET_DRAFT',
  TOGGLE_PAUSE: 'TOGGLE_PAUSE',
  UPDATE_TIMER: 'UPDATE_TIMER',
  SET_COIN_FLIP_STATUS: 'SET_COIN_FLIP_STATUS',
  RESET_TIMER: 'RESET_TIMER',
  SELECT_CHAMPION: 'SELECT_CHAMPION',
  CONFIRM_SELECTION: 'CONFIRM_SELECTION',
  MOVE_TO_NEXT_STEP: 'MOVE_TO_NEXT_STEP',
  COMPLETE_DRAFT: 'COMPLETE_DRAFT',
  SET_DRAFT_ID: 'SET_DRAFT_ID',
  SET_USER_TEAM: 'SET_USER_TEAM',
  UPDATE_TEAM_NAME: 'UPDATE_TEAM_NAME',
  UPDATE_DRAFT_SETTINGS: 'UPDATE_DRAFT_SETTINGS',
  SET_BONUS_TIME: 'SET_BONUS_TIME',
  UPDATE_TEAM_NAMES: 'UPDATE_TEAM_NAMES',
  UPDATE_DISABLED_CHAMPIONS: 'UPDATE_DISABLED_CHAMPIONS'
};

// Utility function for champion selectability
const isChampionSelectable = (state, championId, isReusable) => {
  // Always selectable if reusable

  if (state.disabledChampions && state.disabledChampions.includes(championId)) {
    return false;
  }

  if (isReusable) return true;
  
  const { selectedChampions, bannedChampions, currentTeam, settings } = state;
  
  // Normalize selections and bans
  const blueSelected = selectedChampions.blue || [];
  const redSelected = selectedChampions.red || [];
  const blueBanned = bannedChampions.blue || [];
  const redBanned = bannedChampions.red || [];
  
  // Check if banned
  const isBanned = blueBanned.includes(championId) || redBanned.includes(championId);
  if (isBanned) return false;
  
  // Mirror picks logic
  if (!settings.mirrorPicks) {
    // Without mirror picks, champion can be selected only once total
    return !blueSelected.includes(championId) && !redSelected.includes(championId);
  } else {
    // With mirror picks, champion can be selected once per team
    const currentTeamSelections = currentTeam === 'blue' ? blueSelected : redSelected;
    return !currentTeamSelections.includes(championId);
  }
};

// Reducer function
function draftReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_DRAFT_STATE:
      // Assicurati che le strutture di selezione vengano sempre reimpostate correttamente
      // se è stato eseguito un reset
      if (action.payload.currentPhase === 'notStarted' && 
          state.currentPhase !== 'notStarted') {
        // È stato eseguito un reset, assicuriamoci che le strutture siano pulite
        return {
          ...state,
          ...action.payload,
          // Forza esplicitamente questi campi a essere vuoti
          selectedChampions: { blue: [], red: [] },
          bannedChampions: { blue: [], red: [] },
          slotSelections: {},
          currentSelections: []
        };
      }
      
      
      // Aggiornamento normale
      return {
        ...state,
        ...action.payload
      };

      case ACTIONS.UPDATE_DISABLED_CHAMPIONS:
        ////console.log("Updating disabled champions:", action.payload);
        return {
          ...state,
          disabledChampions: action.payload, // Anche fuori da settings
          settings: {
            ...state.settings,
            disabledChampions: action.payload
          }
        };

      case ACTIONS.SET_PAUSE_STATE:
      return {
        ...state,
        isPaused: action.payload
      };

      case ACTIONS.SET_COIN_FLIP_STATUS:
        console.log("Reducer: SET_COIN_FLIP_STATUS", action.payload);
        return {
          ...state,
          coinFlipInProgress: action.payload.inProgress, 
          coinFlipResult: action.payload.result,
          startingTeamChoice: action.payload.startingTeamChoice
        };

      case ACTIONS.UPDATE_TEAM_NAMES:
        return {
          ...state,
          teamNames: {
            ...state.teamNames,
            blue: action.payload.blue || state.teamNames.blue,
            red: action.payload.red || state.teamNames.red
          }
        };

      case ACTIONS.TOGGLE_PAUSE:
        return {
          ...state,
          isPaused: !state.isPaused
        };
    

      case ACTIONS.UPDATE_DRAFT_SETTINGS:
        return {
          ...state,
          settings: {
            ...state.settings,
            ...action.payload
          },
          // Inizializza il tempo bonus se specificato
          teamBonusTime: action.payload.teamBonusTime !== undefined
            ? { blue: action.payload.teamBonusTime, red: action.payload.teamBonusTime }
            : state.teamBonusTime,
            disabledChampions: action.payload.disabledChampions || state.disabledChampions,
        };

        case ACTIONS.START_DRAFT:
          return {
            ...state,
            currentPhase: 'inProgress',
            currentStepIndex: 0,
            selectedChampions: { blue: [], red: [] },
            bannedChampions: { blue: [], red: [] },
            slotSelections: {},
            isPaused: false,
            draftSequence: action.payload.draftSequence,
            currentTeam: action.payload.startingTeam || action.payload.draftSequence[0].team,
            currentTimer: action.payload.initialTimer,
            currentSelections: [],
            isMultipleSelectionStep: action.payload.draftSequence[0].multiSelect || false,
            requiredSelections: action.payload.draftSequence[0].selectCount || 1,
            teamBonusTime: action.payload.teamBonusTime || { blue: 0, red: 0 },
            coinFlipInProgress: false,
            coinFlipResult: null,
            startingTeamChoice: null
          };

          case ACTIONS.RESET_DRAFT:
            return {
              ...initialState,
              draftId: state.draftId,
              userTeam: state.userTeam,
              teamNames: state.teamNames,
              codes: state.codes,
              settings: state.settings,
              createdAt: state.createdAt,
              teamBonusTime: {
                blue: state.settings?.teamBonusTime || 0,
                red: state.settings?.teamBonusTime || 0
              },
              isUsingBonusTime: { blue: false, red: false },
              coinFlipInProgress: false,
              coinFlipResult: null,
              startingTeamChoice: null,
              lastResetTimestamp: Date.now()
            };



        case ACTIONS.SET_BONUS_TIME:
          return {
            ...state,
            teamBonusTime: {
              blue: action.payload.blue,
              red: action.payload.red
            }
          };
    
          case ACTIONS.UPDATE_TIMER: {
            const currentTeam = action.payload.currentTeam;
            let currentTimer = state.currentTimer;
            let remainingBonusTime = state.teamBonusTime[currentTeam];
            let isUsingBonusTime = {...(state.isUsingBonusTime || {})};
          
            // Se il timer principale è 0
            if (currentTimer === 0) {
              // Se c'è tempo bonus rimanente
              if (remainingBonusTime > 0) {
                currentTimer = remainingBonusTime;
                isUsingBonusTime[currentTeam] = true;
              } else {
                // Se non c'è tempo bonus, prepara per la selezione automatica
                return {
                  ...state,
                  currentTimer: 0,
                  teamBonusTime: {
                    ...state.teamBonusTime,
                    [currentTeam]: 0
                  },
                  isUsingBonusTime: {
                    ...state.isUsingBonusTime,
                    [currentTeam]: false
                  }
                };
              }
            } else {
              // Decrementa il timer normale
              currentTimer = currentTimer > 0 ? currentTimer - 1 : 0;
            }
          
            // Se sta usando il tempo bonus, decrementa anche il tempo bonus
            if (isUsingBonusTime[currentTeam]) {
              remainingBonusTime = Math.max(remainingBonusTime - 1, 0);
              
              // Se il tempo bonus è esaurito, rimuovi il flag
              if (remainingBonusTime === 0) {
                isUsingBonusTime[currentTeam] = false;
              }
            }
          
            return {
              ...state,
              currentTimer,
              teamBonusTime: {
                ...state.teamBonusTime,
                [currentTeam]: remainingBonusTime
              },
              isUsingBonusTime
            };
          }
    


        
    case ACTIONS.RESET_TIMER:
      return {
        ...state,
        currentTimer: action.payload
      };

      case ACTIONS.SELECT_CHAMPION: {
        const { champion, team, multipleChampions } = action.payload;
        
        // Se abbiamo ricevuto selezioni multiple direttamente
        if (multipleChampions && multipleChampions.length > 0) {
          return {
            ...state,
            selectedChampion: multipleChampions[multipleChampions.length - 1],
            currentSelections: multipleChampions
          };
        }
        
        if (!champion || !champion.id) {
          console.warn("Invalid champion data:", champion);
          return state;
        }
        
        let newSelections = [...(state.currentSelections || [])];
        
        // Cerca se il campione è già presente nelle selezioni correnti
        const existingIndex = newSelections.findIndex(c => c.id === champion.id);
        
        if (existingIndex >= 0) {
          // Se già selezionato, rimuovilo (toggle)
          newSelections.splice(existingIndex, 1);
        } else {
          // Se non selezionato e non si tratta di una selezione multipla, sostituisci
          if (!state.isMultipleSelectionStep) {
            newSelections = [champion];
          } 
          // Per selezioni multiple
          else {
            // Se non hai raggiunto il limite, aggiungi
            if (newSelections.length < state.requiredSelections) {
              newSelections.push(champion);
            } 
            // Se hai raggiunto il limite, non fare nulla
            else {
              return state;
            }
          }
        }
      
        return {
          ...state,
          selectedChampion: champion,
          currentSelections: newSelections
        };
      }

    case ACTIONS.CONFIRM_SELECTION: {
      const currentStep = state.draftSequence[state.currentStepIndex];
      
      if (!currentStep) {
        console.warn("No current step found for confirmation");
        return state;
      }
      
      const team = currentStep.team;
      const isPickStep = currentStep.type === 'pick';
      const isBanStep = currentStep.type === 'ban';
      
      // Deep copy to prevent mutations
      const selectedChampions = JSON.parse(JSON.stringify(state.selectedChampions || { blue: [], red: [] }));
      const bannedChampions = JSON.parse(JSON.stringify(state.bannedChampions || { blue: [], red: [] }));
      const slotSelections = JSON.parse(JSON.stringify(state.slotSelections || {}));
      
      // Reset bonus time flag quando si conferma la selezione
      const isUsingBonusTime = {...(state.isUsingBonusTime || {})};
      isUsingBonusTime[team] = false;
    
      // Handle slot mapping
      const primarySlot = currentStep.slot;
      
      if (state.currentSelections.length > 0) {
        slotSelections[primarySlot] = state.currentSelections[0].id;
      }
      
      // Handle additional slots
      if (currentStep.additionalSlots && state.currentSelections.length > 1) {
        currentStep.additionalSlots.forEach((slot, index) => {
          if (state.currentSelections[index + 1]) {
            slotSelections[slot] = state.currentSelections[index + 1].id;
          }
        });
      }
      
      // Handle bans and picks
      if (isBanStep) {
        const validBans = (state.currentSelections || [])
          .filter(c => c && !c.isReusable)
          .map(c => c.id);
        
        bannedChampions[team] = [...(bannedChampions[team] || []), ...validBans];
      } else if (isPickStep) {
        const validPicks = (state.currentSelections || [])
          .filter(c => c && !c.isReusable)
          .map(c => c.id);
        
        selectedChampions[team] = [...(selectedChampions[team] || []), ...validPicks];
      }
      
      return {
        ...state,
        selectedChampions,
        bannedChampions,
        slotSelections,
        currentSelections: [],
        selectedChampion: null,
        // Resetta il flag del tempo bonus quando si conferma la selezione
        isUsingBonusTime
      };
    }

    case ACTIONS.MOVE_TO_NEXT_STEP: {
      const nextStepIndex = state.currentStepIndex + 1;
      
      // Check if draft is complete
      if (nextStepIndex >= state.draftSequence.length) {
        return {
          ...state,
          currentPhase: 'completed',
          currentStepIndex: nextStepIndex
        };
      }
      
      const nextStep = state.draftSequence[nextStepIndex];
      
      const initialTimer = nextStep.type === 'ban' 
        ? action.payload.timePerBan 
        : action.payload.timePerPick;
    
      return {
        ...state,
        currentStepIndex: nextStepIndex,
        currentTeam: nextStep.team,
        currentTimer: initialTimer,
        currentPhase: nextStep.type,
        isMultipleSelectionStep: nextStep.multiSelect || false,
        requiredSelections: nextStep.selectCount || 1,
        currentSelections: []
        // NON reimpostare isUsingBonusTime qui
      };
    }

    case ACTIONS.COMPLETE_DRAFT:
      return {
        ...state,
        currentPhase: 'completed'
      };

    case ACTIONS.SET_DRAFT_ID:
      return {
        ...state,
        draftId: action.payload
      };

    case ACTIONS.SET_USER_TEAM:
      return {
        ...state,
        userTeam: action.payload
      };
        
    case ACTIONS.UPDATE_TEAM_NAME:
      return {
        ...state,
        teamNames: {
          ...state.teamNames,
          [action.payload.team]: action.payload.name
        }
      };
  
    default:
      return state;
  }
}

// Create context
const DraftContext = createContext();

// Provider component
export function DraftProvider({ children, settings }) {
  const [state, dispatch] = useReducer(draftReducer, {
    ...initialState,
    settings: { ...initialState.settings, ...settings }
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Genera un codice draft casuale
  const generateDraftCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const getRandomLetter = () => letters.charAt(Math.floor(Math.random() * letters.length));
    const getRandomDigits = (length) => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
      }
      return result;
    };
    
    return `${getRandomLetter()}${getRandomLetter()}${getRandomDigits(6)}${getRandomLetter()}${getRandomLetter()}`;
  };
  
  // Genera codici di accesso
  const generateAccessCodes = (draftId) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const getRandomLetter = () => letters.charAt(Math.floor(Math.random() * letters.length));
    const getRandomDigits = (length) => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
      }
      return result;
    };
    
    return {
      admin: `AD${getRandomDigits(6)}${getRandomLetter()}${getRandomLetter()}`,
      blue: `BL${getRandomDigits(6)}${getRandomLetter()}${getRandomLetter()}`,
      red: `RD${getRandomDigits(6)}${getRandomLetter()}${getRandomLetter()}`
    };
  };

  useEffect(() => {
    return () => {
      // Pulisce l'intervallo di presenza quando il componente viene smontato
      if (window.presenceInterval) {
        clearInterval(window.presenceInterval);
      }
    };
  }, []);

  useEffect(() => {
    // Listener specifico per shouldStartDraft
    if (!state.draftId) return;
    
    const draftRef = ref(database, `drafts/${state.draftId}`);
    
    const unsubscribe = onValue(draftRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Controlla se dovrebbe avviare il draft
        if (data.shouldStartDraft && data.startingTeam) {
          //console.log(`${state.userTeam}: shouldStartDraft rilevato con team:`, data.startingTeam);
          
          // Se non è l'admin che ha impostato il flag, avvia il draft
          if (state.userTeam !== 'admin' || data.currentPhase === 'notStarted') {
            //console.log(`${state.userTeam}: Avvio draft con team:`, data.startingTeam);
            
            // Usiamo un timeout di 500ms per assicurarci che tutti gli altri stati siano aggiornati
            // ma non aggiungiamo ulteriore ritardo qui perché il ritardo principale è già stato
            // aggiunto nel CoinFlipModal
            setTimeout(() => {
              startDraft(data.startingTeam);
            }, 500);
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [state.draftId, state.userTeam]);


  // Sincronizza lo stato con Firebase
  useEffect(() => {
    if (!state.draftId || !isInitialized) return;

    const draftRef = ref(database, `drafts/${state.draftId}`);
    
    const updateData = {
      currentPhase: state.currentPhase,
      currentTeam: state.currentTeam,
      currentTimer: state.currentTimer,
      isPaused: state.isPaused,
      selectedChampions: state.selectedChampions,
      bannedChampions: state.bannedChampions,
      currentStepIndex: state.currentStepIndex,
      draftSequence: state.draftSequence,
      slotSelections: state.slotSelections,
      teamNames: state.teamNames,
      isUsingBonusTime: state.isUsingBonusTime,
      teamBonusTime: state.teamBonusTime,
      settings: state.settings,
      isMultipleSelectionStep: state.isMultipleSelectionStep,
      requiredSelections: state.requiredSelections
    };
    
    withRetry(() => update(draftRef, updateData))
      .catch(error => {
        console.error("Error updating Firebase:", error);
      });
      
  }, [
    state.currentPhase,
    state.currentTeam,
    state.currentTimer,
    state.isPaused,
    state.selectedChampions,
    state.bannedChampions,
    state.currentStepIndex,
    state.draftId,
    state.slotSelections,
    state.teamNames,
    state.settings,
    state.isMultipleSelectionStep,
    state.requiredSelections,
    isInitialized
  ]);


  const createDraft = async (championsData, blueTeamName = 'Blue Team', redTeamName = 'Red Team') => {try {
    await cleanupOldDrafts();
    
    const draftCode = generateDraftCode();
    const draftRef = ref(database, `drafts/${draftCode}`);
    const accessCodes = generateAccessCodes(draftCode);
  
    // Create a fully defined settings object
    const completeSettings = {
      // Default values from initialState.settings
      timePerPick: 30,
      timePerBan: 30,
      numberOfBans: 2,
      teamBonusTime: 30,
      mirrorPicks: false,
      startingTeam: 'coinFlip',
      language: 'en',
      disabledChampions: ['empty'],
      
      // Merge with existing state settings, overriding defaults
      ...state.settings
    };
  
    // Validate and normalize settings
    const normalizedSettings = {
      timePerPick: Math.min(Math.max(completeSettings.timePerPick, 5), 120),
      timePerBan: Math.min(Math.max(completeSettings.timePerBan, 5), 60),
      numberOfBans: completeSettings.numberOfBans || 2,
      teamBonusTime: Math.min(Math.max(completeSettings.teamBonusTime, 0), 300),
      mirrorPicks: !!completeSettings.mirrorPicks,
      startingTeam: completeSettings.startingTeam || 'coinFlip',
      language: completeSettings.language || 'en',
      disabledChampions: Array.isArray(completeSettings.disabledChampions) 
        ? completeSettings.disabledChampions 
        : ['empty']
    };
  
    // Prepara lo stato iniziale (solo dati serializzabili)
    const serializableState = {
      currentPhase: initialState.currentPhase,
      currentTeam: initialState.currentTeam,
      currentTimer: normalizedSettings.timePerPick,
      isPaused: initialState.isPaused,
      selectedChampions: initialState.selectedChampions,
      bannedChampions: initialState.bannedChampions,
      currentSelections: initialState.currentSelections,
      requiredSelections: initialState.requiredSelections,
      isMultipleSelectionStep: initialState.isMultipleSelectionStep,
      draftSequence: initialState.draftSequence,
      currentStepIndex: initialState.currentStepIndex,
      draftId: draftCode,
      disabledChampions: normalizedSettings.disabledChampions,
      startingTeam: normalizedSettings.startingTeam,
      language: normalizedSettings.language,
      slotSelections: initialState.slotSelections,
      teamNames: {
        blue: blueTeamName,
        red: redTeamName
      },
      // Aggiunta dei codici nella struttura corretta
      codes: {
        admin_code: accessCodes.admin,
        draft_code: draftCode,
        team_blu_code: accessCodes.blue,
        team_red_code: accessCodes.red
      },
      // Use the normalized settings
      settings: normalizedSettings,
      teamBonusTime: {
        blue: normalizedSettings.teamBonusTime,
        red: normalizedSettings.teamBonusTime
      },
      isUsingBonusTime: { blue: false, red: false },
      createdAt: Date.now()
    };
  
    // Se abbiamo ricevuto dati campioni, inizializza
    if (championsData) {
      serializableState.availableChampions = championsData.map(champion => champion.id);
    }
  
    // Salva il draft su Firebase
    await withRetry(() => set(draftRef, serializableState));
  
    // Crea record nella cronologia draft
    const historyRef = ref(database, `draftHistory/${draftCode}`);
    await withRetry(() => set(historyRef, {
      draftId: draftCode,
      createdAt: Date.now(),
      status: 'active',
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 ore
      teamNames: {
        blue: blueTeamName,
        red: redTeamName
      },
      // Aggiungi anche i codici nella cronologia
      codes: {
        admin_code: accessCodes.admin,
        draft_code: draftCode,
        team_blu_code: accessCodes.blue,
        team_red_code: accessCodes.red
      },
      settings: normalizedSettings
    }));
  
    // Imposta l'ID del draft e il team utente
    dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftCode });
    dispatch({ type: ACTIONS.SET_USER_TEAM, payload: 'admin' });
  
    return {
      draftCode,
      accessCodes,
      teamNames: {
        blue: blueTeamName,
        red: redTeamName
      }
    };
  } catch (error) {
    console.error("Errore durante la creazione del draft:", error);
    throw error;
  }
  };

  // Metodo per unirsi a un draft esistente
  const joinDraft = async (draftCode, team) => {
    try {
      const draftRef = ref(database, `drafts/${draftCode}`);
      const snapshot = await withRetry(() => get(draftRef));
      
      if (!snapshot.exists()) {
        throw new Error("Draft non trovato");
      }
      
      // Aggiorna lo stato di presenza per questo utente
      const presenceRef = ref(database, `drafts/${draftCode}/presence/${team}`);
      await withRetry(() => set(presenceRef, Date.now()));
      
      // Configura un sistema per aggiornare la presenza periodicamente
      const presenceInterval = setInterval(() => {
        set(presenceRef, Date.now())
          .catch(e => console.error("Errore aggiornamento presenza:", e));
      }, 30000); // Aggiorna ogni 30 secondi
      
      // Configura la rimozione della presenza alla disconnessione
      const onDisconnectRef = ref(database, `drafts/${draftCode}/presence/${team}`);
      onDisconnect(onDisconnectRef).remove();
      
      // Salva l'intervallo per poterlo cancellare quando necessario
      window.presenceInterval = presenceInterval;
  
      // Imposta listener per aggiornamenti in tempo reale
      onValue(draftRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Log per debug - rimuovi in produzione
          console.log("Firebase update received:", {
            coinFlipInProgress: data.coinFlipInProgress,
            coinFlipResult: data.coinFlipResult,
            startingTeamChoice: data.startingTeamChoice,
            currentPhase: data.currentPhase
          });
          
          // Assicurati che i campi relativi al coinflip siano esplicitamente inclusi
          dispatch({ 
            type: ACTIONS.SET_DRAFT_STATE, 
            payload: {
              ...data,
              // Assicurati che questi campi siano sempre presenti
              codes: data.codes || { 
                admin_code: 'N/A', 
                team_blu_code: 'N/A', 
                team_red_code: 'N/A', 
                draft_code: draftCode 
              },
              teamBonusTime: data.teamBonusTime || { blue: 0, red: 0 },
              isUsingBonusTime: data.isUsingBonusTime || { blue: false, red: false },
              teamNames: {
                blue: data.teamNames?.blue || state.teamNames.blue || 'Blue',
                red: data.teamNames?.red || state.teamNames.red || 'Red'
              },
              // Aggiungi esplicitamente i campi del coinflip per assicurarti che vengano sincronizzati
              coinFlipInProgress: data.coinFlipInProgress || false,
              coinFlipResult: data.coinFlipResult || null,
              startingTeamChoice: data.startingTeamChoice || null
            }
          });
  
          // Gestisci separatamente lo stato di pausa
          if (data.isPaused !== undefined) {
            dispatch({
              type: ACTIONS.SET_PAUSE_STATE,
              payload: data.isPaused
            });
          }
          
          // Gestisci separatamente lo stato del coinflip
          if (data.coinFlipInProgress !== undefined || data.coinFlipResult !== undefined || data.startingTeamChoice !== undefined) {
            dispatch({
              type: ACTIONS.SET_COIN_FLIP_STATUS,
              payload: {
                inProgress: data.coinFlipInProgress || false,
                result: data.coinFlipResult || null,
                startingTeamChoice: data.startingTeamChoice || null
              }
            });
          }
          
          if (!isInitialized) {
            setIsInitialized(true);
          }
        }
      });
      
      // Imposta ID draft e team
      dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftCode });
      
      // Imposta team se fornito
      if (team) {
        dispatch({ type: ACTIONS.SET_USER_TEAM, payload: team });
      }
      
      console.log(`Joined draft as team: ${team}`);
      return true;
    } catch (error) {
      console.error("Errore durante l'accesso al draft:", error);
      throw error;
    }
  };

  const setCoinFlipStatus = (inProgress, result = null, startingTeamChoice = null) => {
    if (!state.draftId) return;
    
    console.log("setCoinFlipStatus chiamato con:", { inProgress, result, startingTeamChoice });
    
    const updates = { 
      coinFlipInProgress: inProgress, 
      coinFlipResult: result,
      coinFlipTimestamp: Date.now() 
    };
    
    // Aggiungi la scelta del team solo se specificata
    if (startingTeamChoice !== null) {
      updates.startingTeamChoice = startingTeamChoice;
    }
  
    console.log("Aggiornamento Firebase coin flip:", updates);
  
    withRetry(() => update(ref(database, `drafts/${state.draftId}`), updates))
      .then(() => {
        console.log("Firebase aggiornato con successo");
        
        // Dispatch dell'azione
        dispatch({ 
          type: ACTIONS.SET_COIN_FLIP_STATUS, 
          payload: { inProgress, result, startingTeamChoice } 
        });
      })
      .catch(error => console.error("Errore aggiornamento coin flip:", error));
  };
// Avvia il draft
// Rimuovi una delle due implementazioni di startDraft, mantieni solo questa
const startDraft = (startingTeam = null) => {
  if (!state.draftId) {
    console.error("Nessun draft selezionato");
    return;
  }
  
  console.log("startDraft chiamato con startingTeam:", startingTeam);
  
  // Verifica se il draft è già in corso (fase diversa da 'notStarted' o 'completed')
  if (state.currentPhase !== 'notStarted' && state.currentPhase !== 'completed') {
    console.log("Il draft è già in corso, ignorando avvio duplicato");
    return;
  }
  
  // Se non c'è un team specificato e l'impostazione è coinFlip, attiva il coin flip
  if (!startingTeam && state.settings.startingTeam === 'coinFlip' && !state.coinFlipInProgress) {
    // Solo l'admin può avviare il coin flip
    if (state.userTeam === 'admin') {
      console.log("Admin: Attivo coin flip per tutti");
      setCoinFlipStatus(true, null, null);
      return; // Ritorna solo qui, quando attiviamo il coin flip
    }
  }
  
  // Usa la scelta dal coinflip se disponibile e non è stato specificato un team iniziale
  if (!startingTeam && state.startingTeamChoice) {
    startingTeam = state.startingTeamChoice;
    console.log("Usando la scelta dal coinflip:", startingTeam);
  }
  
  // Determina il team iniziale
  let effectiveStartingTeam = startingTeam;
  
  if (!effectiveStartingTeam) {
    switch (state.settings.startingTeam) {
      case 'blue':
        effectiveStartingTeam = 'blue';
        break;
      case 'red':
        effectiveStartingTeam = 'red';
        break;
      case 'coinFlip':
      default:
        effectiveStartingTeam = Math.random() < 0.5 ? 'blue' : 'red';
    }
  }
  
  console.log("Avvio draft con team finale:", effectiveStartingTeam);
  
  // Genera la sequenza e avvia il draft
  const draftSequence = generateDraftSequence({
    numberOfBans: state.settings.numberOfBans,
    teamNames: state.teamNames,
    startingTeam: effectiveStartingTeam
  });

  const initialTimer = draftSequence[0].type === 'ban' 
    ? state.settings.timePerBan 
    : state.settings.timePerPick;

  // Gli aggiornamenti da fare su Firebase
  const firebaseUpdates = {
    currentPhase: 'inProgress',
    currentStepIndex: 0,
    selectedChampions: { blue: [], red: [] },
    bannedChampions: { blue: [], red: [] },
    slotSelections: {},
    isPaused: false,
    draftSequence: draftSequence,
    currentTeam: effectiveStartingTeam,
    currentTimer: initialTimer,
    isMultipleSelectionStep: draftSequence[0].multiSelect || false,
    requiredSelections: draftSequence[0].selectCount || 1,
    coinFlipInProgress: false,
    coinFlipResult: null,
    startingTeamChoice: null // Resetta anche la scelta quando avviamo il draft
  };

  // Aggiorna lo stato locale
  dispatch({
    type: ACTIONS.START_DRAFT,
    payload: {
      draftSequence,
      initialTimer,
      teamBonusTime: {
        blue: state.settings.teamBonusTime || 0,
        red: state.settings.teamBonusTime || 0
      },
      startingTeam: effectiveStartingTeam
    }
  });
  
  // Aggiorna lo stato su Firebase
  const draftRef = ref(database, `drafts/${state.draftId}`);
  withRetry(() => update(draftRef, firebaseUpdates)).catch(error => {
    console.error("Errore nell'avvio del draft su Firebase:", error);
  });
};


// Funzione di pulizia draft vecchi
const cleanupOldDrafts = async () => {
  try {
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    // Riferimenti a drafts e draftHistory
    const draftsRef = ref(database, 'drafts');
    const draftHistoryRef = ref(database, 'draftHistory');

    // Recupera tutti i draft dalla cronologia
    const historySnapshot = await get(draftHistoryRef);

    historySnapshot.forEach(async (childSnapshot) => {
      const draftData = childSnapshot.val();
      const draftId = childSnapshot.key;

      // Controlla se il draft è più vecchio di 24 ore
      if (draftData.createdAt && draftData.createdAt < twentyFourHoursAgo) {
        try {
          // Rimuovi dal nodo drafts
          await remove(ref(database, `drafts/${draftId}`));
          
          // Rimuovi dalla cronologia
          await remove(childSnapshot.ref);

          //console.log(`Draft ${draftId} rimosso dopo 24 ore`);
        } catch (removeError) {
          console.error(`Errore durante la rimozione del draft ${draftId}:`, removeError);
        }
      }
    });
  } catch (error) {
    console.error('Errore durante la pulizia dei draft:', error);
  }
};

// Aggiungi questo al tuo useEffect nel DraftProvider o in un componente di livello superiore
useEffect(() => {
  // Esegui la pulizia quando il componente viene montato
  cleanupOldDrafts();

  // Opzionale: imposta un intervallo per controllare periodicamente
  const cleanupInterval = setInterval(cleanupOldDrafts, 24 * 60 * 60 * 1000);

  // Pulisci l'intervallo quando il componente viene smontato
  return () => clearInterval(cleanupInterval);
}, []);

// Se vuoi una funzione che può essere chiamata manualmente
const manualCleanupDrafts = () => {
  cleanupOldDrafts();
};


  // Resetta il draft
  const resetDraft = async () => {
    if (!state.draftId) {
      console.error("Nessun draft selezionato per il reset");
      return false;
    }
    
    try {
      // Verificare che l'utente sia admin
      if (state.userTeam !== 'admin') {
        console.error("Solo l'admin può resettare il draft");
        return false;
      }
      
      //console.log("Avvio reset draft:", state.draftId);
      
      // Prima recupera i dati attuali per preservare le informazioni critiche
      const draftRef = ref(database, `drafts/${state.draftId}`);
      const snapshot = await withRetry(() => get(draftRef));
      
      if (!snapshot.exists()) {
        console.error("Draft non trovato per il reset");
        return false;
      }
      
      // Estrai dati importanti da preservare
      const currentData = snapshot.val();
      const preservedData = {
        codes: currentData.codes || {}, // Preserva i codici
        teamNames: currentData.teamNames || state.teamNames,
        settings: currentData.settings || state.settings,
        createdAt: currentData.createdAt || Date.now(),
        draftId: state.draftId
      };
      
      // Definisci lo stato iniziale completo per il reset
      const resetState = {
        // Stato base del draft
        currentPhase: 'notStarted',
        currentTeam: 'blue',
        currentTimer: preservedData.settings.timePerPick || 30,
        isPaused: false,
        
        // Reset delle selezioni
        selectedChampion: null,
        selectedChampions: { blue: [], red: [] },
        bannedChampions: { blue: [], red: [] },
        currentSelections: [],
        requiredSelections: 1,
        isMultipleSelectionStep: false,
        slotSelections: {},
        
        // Reset della sequenza
        draftSequence: [],
        currentStepIndex: 0,
        
        // Dati da preservare
        teamNames: preservedData.teamNames,
        settings: preservedData.settings,
        codes: preservedData.codes, // Importante: mantieni i codici
        draftId: preservedData.draftId,
        createdAt: preservedData.createdAt,
        
        // Reinizializza il tempo bonus
        teamBonusTime: {
          blue: preservedData.settings.teamBonusTime || 0,
          red: preservedData.settings.teamBonusTime || 0
        },
        isUsingBonusTime: { blue: false, red: false },
        
        // Reset dello stato di coin flip
        coinFlipInProgress: false,
        coinFlipResult: null,
        
        // Timestamp del reset
        lastResetTimestamp: Date.now()
      };
      
      // Aggiorna Firebase
      await withRetry(() => update(draftRef, resetState));
      
      // Aggiorna lo stato locale
      dispatch({ 
        type: ACTIONS.SET_DRAFT_STATE, 
        payload: resetState 
      });
      
      //console.log(`Draft ${state.draftId} resettato con successo, codici preservati:`, preservedData.codes);
      return true;
    } catch (error) {
      console.error("Errore durante il reset:", error);
      return false;
    }
  };

  // Aggiungi questo metodo nel DraftProvider
  const updateTeamNames = async (blueTeamName, redTeamName) => {
    if (!state.draftId) {
      console.error("Nessun draft selezionato");
      throw new Error("Draft ID non valido");
    }
  
    try {
      // Valida i nomi dei team
      const validatedBlueTeam = (blueTeamName || '').trim() || 'Blue Team';
      const validatedRedTeam = (redTeamName || '').trim() || 'Red Team';
    
      // Prepara l'oggetto con i nuovi nomi
      const newTeamNames = {
        blue: validatedBlueTeam,
        red: validatedRedTeam
      };
  
      // Log dettagliato
      /*console.log('Updating team names in Firebase:', {
        draftId: state.draftId,
        newTeamNames
      });*/
  
      // Dispatch IMMEDIATO dell'azione di aggiornamento locale
      dispatch({
        type: ACTIONS.UPDATE_TEAM_NAMES,
        payload: newTeamNames
      });
  
      // Aggiorna Firebase
      const draftRef = ref(database, `drafts/${state.draftId}`);
      await update(draftRef, { teamNames: newTeamNames });
      
      // Aggiorna anche nella cronologia per la persistenza
      const historyRef = ref(database, `draftHistory/${state.draftId}`);
      await update(historyRef, { teamNames: newTeamNames });
  
      //console.log('Team names successfully updated in Firebase');
      return true;
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei nomi dei team:", error);
      throw error;
    }
  };



  const leaveDraft = async () => {
    if (!state.draftId || !state.userTeam) return;
    
    try {
      // Cancella l'intervallo di aggiornamento della presenza
      if (window.presenceInterval) {
        clearInterval(window.presenceInterval);
        window.presenceInterval = null;
      }
      
      // Cancella esplicitamente la presenza dell'utente
      const presenceRef = ref(database, `drafts/${state.draftId}/presence/${state.userTeam}`);
      await set(presenceRef, null);
      
      // Annulla anche l'onDisconnect setup
      const onDisconnectRef = ref(database, `drafts/${state.draftId}/presence/${state.userTeam}`);
      await onDisconnect(onDisconnectRef).cancel();
      
      //console.log(`Utente ${state.userTeam} ha lasciato esplicitamente il draft ${state.draftId}`);
      return true;
    } catch (error) {
      console.error("Errore durante la disconnessione dal draft:", error);
      return false;
    }
  };

  // Metti in pausa/riprendi il draft
  const togglePause = () => {
    if (!state.draftId || 
        (state.userTeam !== 'blue' && 
         state.userTeam !== 'red' && 
         state.userTeam !== 'admin')) {
      console.warn("Solo i team o l'admin possono mettere in pausa");
      return;
    }
    
    // Dispatch dell'azione per cambiare lo stato di pausa localmente
    dispatch({ type: ACTIONS.TOGGLE_PAUSE });
  
    // Aggiorna lo stato di pausa su Firebase
    const draftRef = ref(database, `drafts/${state.draftId}`);
    
    // Aggiorna lo stato di pausa per tutti i client
    update(draftRef, {
      isPaused: !state.isPaused
    }).catch(error => {
      console.error("Errore durante l'aggiornamento dello stato di pausa:", error);
      // Rollback locale in caso di errore
      dispatch({ type: ACTIONS.TOGGLE_PAUSE });
    });
  };

  // Metodo per reimpostare il timer
const resetCurrentTimer = () => {
  if (
    state.currentPhase !== 'notStarted' && 
    state.currentPhase !== 'completed' &&
    state.draftSequence &&
    state.currentStepIndex < state.draftSequence.length
  ) {
    const currentStep = state.draftSequence[state.currentStepIndex];
    const newTimer = currentStep.type === 'ban' 
      ? state.settings.timePerBan 
      : state.settings.timePerPick;
    
    dispatch({ 
      type: ACTIONS.RESET_TIMER, 
      payload: newTimer 
    });
  }
};

  // Aggiorna il timer
  const updateTimer = () => {
    dispatch({
      type: ACTIONS.UPDATE_TIMER,
      payload: {
        currentTeam: state.currentTeam,
        settings: state.settings
      }
    });
  };

  // Seleziona un campione
  const selectChampion = (champion, team) => {
    // Verifica se l'utente può selezionare per questo team
    if (state.userTeam !== team && state.userTeam !== 'admin') {
      console.warn("Non sei autorizzato a selezionare per questo team");
      return;
    }
    
    dispatch({
      type: ACTIONS.SELECT_CHAMPION,
      payload: { champion, team }
    });
  };

  // Conferma selezione
  const confirmSelection = () => {
    const currentTeam = state.draftSequence[state.currentStepIndex]?.team;
    
    // Verifica se l'utente può confermare per questo team
    if (state.userTeam !== currentTeam && state.userTeam !== 'admin') {
      console.warn("Non sei autorizzato a confermare per questo team");
      return;
    }
    
    // Per selezioni multiple, verifica che ci siano abbastanza selezioni
    if (state.isMultipleSelectionStep && 
        state.currentSelections.length < state.requiredSelections) {
      console.warn(`Devi selezionare ${state.requiredSelections} eroi`);
      alert(`Seleziona ${state.requiredSelections} eroi prima di confermare`);
      return;
    }
    
    dispatch({ type: ACTIONS.CONFIRM_SELECTION });
    
    // Passa al prossimo passaggio
    dispatch({ 
      type: ACTIONS.MOVE_TO_NEXT_STEP,
      payload: {
        timePerBan: state.settings.timePerBan,
        timePerPick: state.settings.timePerPick
      }
    });
  };

  // Verifica se un campione è selezionabile
const isChampionSelectable = (championId, isReusable) => {
  // Verifica che championId sia definito
  if (!championId) return false;
  
  // Controlla sia nell'array che nell'oggetto
  const disabledArray = state.settings?.disabledChampions || [];
  const disabledMap = state.settings?.disabledChampionsMap || {};
  
  if (disabledArray.includes(championId) || disabledMap[championId]) {
    return false;
  }
  
  const disabledChampions = state.settings?.disabledChampions || state.disabledChampions || [];
  if (disabledChampions.includes(championId)) {
    //console.log(`Champion ${championId} is disabled in settings`, disabledChampions);
    return false;
  }


  if (state.settings?.disabledChampions && 
    state.settings.disabledChampions.includes(championId)) {
    return false;
  }

  if (isReusable) return true;
  
  // Controlli di base
  if (!state.selectedChampions || !state.bannedChampions || !state.currentTeam) {
    return true;
  }
  const { selectedChampions, bannedChampions, currentTeam, settings } = state;
  const otherTeam = currentTeam === 'blue' ? 'red' : 'blue';
  
  // Normalizza le liste di campioni selezionati e bannati
  const blueSelected = selectedChampions.blue || [];
  const redSelected = selectedChampions.red || [];
  const blueBanned = bannedChampions.blue || [];
  const redBanned = bannedChampions.red || [];
  
  // Controllo ban
  const isBanned = blueBanned.includes(championId) || redBanned.includes(championId);
  if (isBanned) return false;
  
  // Gestione mirror picks
  if (!settings.mirrorPicks) {
    // Senza mirror picks, un campione può essere selezionato solo una volta in totale
    const isAlreadySelected = 
      blueSelected.includes(championId) || 
      redSelected.includes(championId);
    
    return !isAlreadySelected;
  } else {
    // Con mirror picks, un campione può essere selezionato una volta per team
    const currentTeamSelections = currentTeam === 'blue' ? blueSelected : redSelected;
    return !currentTeamSelections.includes(championId);
  }
};

  // Verifica se un campione è già selezionato nel passaggio corrente
  const isChampionSelectedInCurrentStep = (championId) => {
    if (!state.currentSelections) return false;
    return state.currentSelections.some(c => c && c.id === championId);
  };

  // Aggiorna il nome del team
  const updateTeamName = (team, name) => {
    if (!team || !name) return;
    
    dispatch({
      type: ACTIONS.UPDATE_TEAM_NAME,
      payload: { team, name }
    });
  };
  
  // Aggiorna le impostazioni del draft
  const updateDraftSettings = async (newSettings) => {
    // Convalida le impostazioni
    const validatedSettings = {
      timePerPick: Math.min(Math.max(newSettings.timePerPick || 30, 5), 120),
      timePerBan: Math.min(Math.max(newSettings.timePerBan || 20, 5), 60),
      numberOfBans: newSettings.numberOfBans || 2,
      mirrorPicks: newSettings.mirrorPicks !== undefined 
        ? newSettings.mirrorPicks 
        : false,
      teamBonusTime: Math.min(Math.max(newSettings.teamBonusTime || 0, 0), 300),
      startingTeam: newSettings.startingTeam || 'coinFlip',
      // Normalizza l'array dei campioni disabilitati
      disabledChampions: Array.isArray(newSettings.disabledChampions) 
        ? [...newSettings.disabledChampions] 
        : ['empty']
    };
  
    try {
      // Log per debug
      //console.log('Updating draft settings in Firebase:', validatedSettings);
      //console.log('Disabled champions:', validatedSettings.disabledChampions);
  
      // Aggiorna le impostazioni su Firebase
      const draftRef = ref(database, `drafts/${state.draftId}`);
      
      // Aggiorna sia nelle impostazioni che direttamente nello stato principale
      await withRetry(() => update(draftRef, { 
        settings: validatedSettings,
        disabledChampions: validatedSettings.disabledChampions // Anche fuori da settings
      }));
      
      // Aggiorna anche nella cronologia
      const historyRef = ref(database, `draftHistory/${state.draftId}`);
      await withRetry(() => update(historyRef, { 
        settings: validatedSettings,
        disabledChampions: validatedSettings.disabledChampions
      }));
  
      // Dispatch dell'azione di aggiornamento
      dispatch({
        type: ACTIONS.UPDATE_DRAFT_SETTINGS,
        payload: validatedSettings
      });
      
      // Dispatch specifico per i campioni disabilitati
      dispatch({
        type: ACTIONS.UPDATE_DISABLED_CHAMPIONS,
        payload: validatedSettings.disabledChampions
      });
  
      // Resto del codice...
      return true;
    } catch (error) {
      // Gestione errori...
      throw error;
    }
  };

  const autoSelectChampion = async (availableChampions) => {
    const currentTeam = state.currentTeam;
    const currentTeamBonusTime = state.teamBonusTime[currentTeam];
    const isUsingBonusTime = state.isUsingBonusTime?.[currentTeam] || false;
    const requiredSelections = state.requiredSelections || 1;
    const userTeam = state.userTeam;
    const isAdmin = userTeam === 'admin';
    const isSpectator = !['blue', 'red', 'admin'].includes(userTeam);
    const teamPresence = state.teamPresence || {}; // Stato di presenza del team
  
    // Se si è spettatori, non fare nulla
    if (isSpectator) return;
  
    // Se il team attuale è connesso, l'admin non deve intervenire
    if (isAdmin && teamPresence[currentTeam]) return;
  
    // Verifica se è necessario effettuare l'autoselect
    const shouldAutoSelect = 
      (isUsingBonusTime && currentTeamBonusTime <= 0) || 
      (!isUsingBonusTime && state.currentTimer <= 0 && currentTeamBonusTime <= 0);
  
    if (shouldAutoSelect) {
      // Verifica se l'autoselect è già stato eseguito su Firebase
      const draftRef = ref(database, `drafts/${state.draftId}/autoSelectTriggered`);
      const snapshot = await get(draftRef);
      if (snapshot.exists() && snapshot.val()) {
        console.warn("Autoselect già eseguito, evitando doppia esecuzione");
        return;
      }
      await set(draftRef, true); // Segna l'autoselect come eseguito
  
      // Filtra i campioni disponibili e selezionabili
      const availableSelectableChampions = availableChampions.filter(champion => 
        !state.settings?.disabledChampions?.includes(champion.id) &&
        isChampionSelectable(champion.id, champion.isReusable)
      );
      
      if (availableSelectableChampions.length === 0) {
        console.warn('Nessun campione selezionabile rimanente');
        dispatch({ type: ACTIONS.MOVE_TO_NEXT_STEP, payload: {
          timePerBan: state.settings.timePerBan,
          timePerPick: state.settings.timePerPick
        }});
        return;
      }
  
      // Inizia con i campioni già selezionati nella preview box
      let selectedChampions = [...(state.currentSelections || [])];
      
      // Se abbiamo già più selezioni del necessario, prendiamo solo le prime requiredSelections
      if (selectedChampions.length > requiredSelections) {
        selectedChampions = selectedChampions.slice(0, requiredSelections);
      }
      
      // Aggiungi campioni casuali finché non raggiungiamo il numero richiesto
      while (selectedChampions.length < requiredSelections) {
        // Filtra i campioni non ancora selezionati
        const remainingSelectableChampions = availableSelectableChampions.filter(champion => 
          !selectedChampions.some(selected => selected.id === champion.id)
        );
        
        if (remainingSelectableChampions.length === 0) {
          console.warn('Non ci sono abbastanza campioni selezionabili per completare la selezione multipla');
          break;
        }
        
        // Seleziona un campione casuale tra quelli rimanenti
        const randomIndex = Math.floor(Math.random() * remainingSelectableChampions.length);
        const randomChampion = remainingSelectableChampions[randomIndex];
        
        selectedChampions.push(randomChampion);
      }
      
      // Aggiorna lo stato con tutte le selezioni
      dispatch({
        type: ACTIONS.SELECT_CHAMPION,
        payload: { 
          champion: selectedChampions[selectedChampions.length - 1], // Per compatibilità
          team: currentTeam,
          multipleChampions: selectedChampions // Nuovo campo per selezione multipla
        }
      });
      
      // Aspetta un momento per mostrare le selezioni prima di confermare
      setTimeout(() => {
        dispatch({ type: ACTIONS.CONFIRM_SELECTION });
        dispatch({ type: ACTIONS.MOVE_TO_NEXT_STEP, payload: {
          timePerBan: state.settings.timePerBan,
          timePerPick: state.settings.timePerPick
        }});
        
        // Resetta il flag su Firebase dopo la conferma
        setTimeout(() => set(draftRef, false), 1000);
      }, 200);
    }
  };


  return (
    <DraftContext.Provider
      value={{
        state,
        createDraft,
        joinDraft,
        startDraft,
        resetDraft,
        togglePause,
        updateTimer,
        selectChampion,
        confirmSelection,
        isChampionSelectable,
        isChampionSelectedInCurrentStep,
        generateAccessCodes,
        updateTeamName,
        autoSelectChampion,
        updateDraftSettings,
        updateTeamNames,
        setCoinFlipStatus,
        manualCleanupDrafts,
        leaveDraft,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}

// Custom hook per utilizzare il contesto del draft
export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft deve essere utilizzato all\'interno di un DraftProvider');
  }
  return context;
}