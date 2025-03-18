import { ref, update, set } from 'firebase/database';
import { database } from '../services/firebase';

class TimerManager {
  constructor(draftContext) {
    // Contesto del draft per accedere allo stato e alle funzioni
    this.draftContext = draftContext;

    // Stato del timer
    this.state = {
      mainTimer: 0,           // Tempo principale corrente
      bonusTimer: 0,           // Tempo bonus corrente
      isMainTimerActive: false, // Stato del timer principale
      isBonusTimerActive: false, // Stato del timer bonus
      currentTeam: null,        // Team corrente
      initialMainTimer: 0,      // Durata iniziale del timer
      startTimestamp: 0,        // Timestamp di inizio del timer
      pausedTimestamp: 0        // Timestamp di pausa
    };

    // Gestione dell'intervallo
    this.intervalId = null;
    this.SYNC_INTERVAL = 1000;  // Intervallo di sincronizzazione
  }

  /**
   * Log di debug dettagliato
   */
  debugLog(...args) {
    console.log('[TimerManager]', ...args);
  }

  /**
   * Calcola il tempo rimanente
   * @returns {number} Secondi rimanenti
   */
  calculateRemainingTime() {
    if (this.state.pausedTimestamp) {
      // Se è in pausa, restituisci il tempo rimanente al momento della pausa
      return this.state.mainTimer;
    }

    const elapsedSeconds = Math.floor((Date.now() - this.state.startTimestamp) / 1000);
    return Math.max(0, this.state.initialMainTimer - elapsedSeconds);
  }

  /**
   * Inizializza il timer per una nuova fase
   * @param {number} mainTimerDuration - Durata del timer principale
   * @param {number} bonusTimerDuration - Durata del tempo bonus
   * @param {string} team - Team corrente
   */
  initializeTimer(mainTimerDuration, bonusTimerDuration, team) {
    this.debugLog(`Inizializzazione timer: 
      Durata principale: ${mainTimerDuration}, 
      Bonus: ${bonusTimerDuration}, 
      Team: ${team}`);

    // Ferma eventuali timer esistenti
    this.stopCountdown();

    // Imposta lo stato del timer
    this.state = {
      mainTimer: mainTimerDuration,
      bonusTimer: bonusTimerDuration,
      isMainTimerActive: true,
      isBonusTimerActive: false,
      currentTeam: team,
      initialMainTimer: mainTimerDuration,
      startTimestamp: Date.now(),
      pausedTimestamp: 0
    };

    // Avvia il countdown
    this.startCountdown();

    // Sincronizza con Firebase
    this.syncTimerWithFirebase(true);
  }

  /**
   * Avvia il countdown del timer
   */
  startCountdown() {
    this.debugLog(`Avvio countdown. Timer: ${this.state.mainTimer}`);

    // Ferma eventuali intervalli esistenti
    this.stopCountdown();

    // Avvia nuovo intervallo
    this.intervalId = setInterval(() => {
      // Calcola il tempo rimanente
      const remainingTime = this.calculateRemainingTime();

      // Aggiorna lo stato del timer
      this.state.mainTimer = remainingTime;

      // Controllo scadenza timer principale
      if (remainingTime <= 0 && this.state.isMainTimerActive) {
        this.handleMainTimerExpiration();
        return;
      }

      // Sincronizza periodicamente
      this.syncTimerWithFirebase();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Ferma il countdown
   */
  stopCountdown() {
    this.debugLog('Countdown fermato');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Gestisce la scadenza del timer principale
   */
  handleMainTimerExpiration() {
    this.debugLog('Timer principale scaduto');

    // Disattiva il timer principale
    this.state.isMainTimerActive = false;
    
    // Attiva il tempo bonus
    this.state.isBonusTimerActive = true;
    this.state.mainTimer = this.state.bonusTimer;
    this.state.startTimestamp = Date.now();

    // Notifica l'inizio del tempo bonus
    this.draftContext.notifyBonusTimeStarted(this.state.currentTeam);

    // Sincronizza immediatamente
    this.syncTimerWithFirebase(true);
  }

  /**
   * Gestisce la scadenza del tempo bonus
   */
  handleBonusTimerExpiration() {
    this.debugLog('Bonus time scaduto');

    // Disattiva il tempo bonus
    this.state.isBonusTimerActive = false;

    // Avvia selezione automatica
    this.draftContext.autoSelectChampion();

    // Sincronizza
    this.syncTimerWithFirebase(true);
  }

  /**
   * Gestisce il Lock della selezione
   * @param {number} nextTimerDuration - Durata del prossimo timer
   * @param {number} bonusTimerDuration - Durata del tempo bonus
   * @param {string} nextTeam - Prossimo team
   */
  handleLockSelection(nextTimerDuration, bonusTimerDuration, nextTeam) {
    this.debugLog(`Lock Selezione: 
      Prossimo timer: ${nextTimerDuration}, 
      Bonus: ${bonusTimerDuration}, 
      Team: ${nextTeam}`);

    // Ferma il countdown corrente
    this.stopCountdown();

    // Imposta il nuovo stato del timer
    this.state = {
      mainTimer: nextTimerDuration,
      bonusTimer: bonusTimerDuration,
      isMainTimerActive: true,
      isBonusTimerActive: false,
      currentTeam: nextTeam,
      initialMainTimer: nextTimerDuration,
      startTimestamp: Date.now(),
      pausedTimestamp: 0
    };

    // Riavvia il countdown
    this.startCountdown();
    
    // Sincronizza con Firebase
    this.syncTimerWithFirebase(true);
  }

  /**
   * Sincronizza lo stato del timer con Firebase
   * @param {boolean} force - Forza la sincronizzazione
   */
  syncTimerWithFirebase(force = false) {
    const { draftId } = this.draftContext.state;
    
    if (!draftId) return;

    const draftRef = ref(database, `drafts/${draftId}`);
    
    const updateData = {
      currentTimer: this.state.mainTimer,
      bonusTimer: this.state.bonusTimer,
      isMainTimerActive: this.state.isMainTimerActive,
      isBonusTimerActive: this.state.isBonusTimerActive,
      currentTeam: this.state.currentTeam
    };

    // Usa set per aggiornamenti forzati, altrimenti update
    const syncMethod = force ? set : update;

    syncMethod(draftRef, updateData).catch(error => {
      console.error('Errore durante la sincronizzazione del timer:', error);
    });
  }

  /**
   * Resetta completamente il timer
   */
  resetTimer() {
    this.debugLog('Reset completo del timer');
  
    // Ferma il countdown
    this.stopCountdown();
  
    // Resetta completamente lo stato
    this.state = {
      mainTimer: 0,
      bonusTimer: 0,
      isMainTimerActive: false,
      isBonusTimerActive: false,
      currentTeam: null,
      initialMainTimer: 0,
      startTimestamp: 0,
      pausedTimestamp: 0
    };
  
    // Sincronizza con Firebase
    const { draftId } = this.draftContext.state;
    if (draftId) {
      const draftRef = ref(database, `drafts/${draftId}`);
      set(draftRef, {
        currentTimer: 0,
        bonusTimer: 0,
        isMainTimerActive: false,
        isBonusTimerActive: false,
        currentStepIndex: 0,
        currentPhase: 'notStarted',
        currentTeam: null,
        draftSequence: [],
        slotSelections: {},
        selectedChampions: { blue: [], red: [] },
        bannedChampions: { blue: [], red: [] }
      }).catch(error => {
        console.error('Errore durante il reset del timer:', error);
      });
    }
  }

  /**
   * Mette in pausa il timer
   */
  pauseTimer() {
    this.debugLog('Timer messo in pausa');
    
    // Calcola il tempo rimanente
    const remainingTime = this.calculateRemainingTime();

    // Aggiorna lo stato per la pausa
    this.state.mainTimer = remainingTime;
    this.state.pausedTimestamp = Date.now();
    
    // Ferma il countdown
    this.stopCountdown();
    
    // Sincronizza con Firebase
    const { draftId } = this.draftContext.state;
    if (draftId) {
      const draftRef = ref(database, `drafts/${draftId}`);
      update(draftRef, {
        isPaused: true,
        pausedTimerState: this.state
      }).catch(error => {
        console.error('Errore durante la pausa del timer:', error);
      });
    }
  }

  /**
   * Riprende il timer dalla pausa
   */
  resumeTimer() {
    this.debugLog('Ripresa del timer');
    
    // Aggiorna il timestamp di inizio
    this.state.startTimestamp = Date.now() - 
      ((this.state.initialMainTimer - this.state.mainTimer) * 1000);
    
    // Rimuovi lo stato di pausa
    this.state.pausedTimestamp = 0;
    
    // Riavvia il countdown
    this.startCountdown();
    
    // Sincronizza con Firebase
    const { draftId } = this.draftContext.state;
    if (draftId) {
      const draftRef = ref(database, `drafts/${draftId}`);
      update(draftRef, {
        isPaused: false
      }).catch(error => {
        console.error('Errore durante la ripresa del timer:', error);
      });
    }
  }
}

export default TimerManager;