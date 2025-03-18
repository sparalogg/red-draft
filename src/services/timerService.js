// timerService.js
class TimerService {
    constructor() {
      this.timers = new Map();
      this.callbacks = new Map();
    }
  
    // Avvia un timer con un ID specifico
    startTimer(timerId, durationInSeconds, callback) {
      // Elimina il timer esistente se presente
      this.stopTimer(timerId);
      
      const expiryTime = Date.now() + (durationInSeconds * 1000);
      let remaining = durationInSeconds;
      
      // Crea un nuovo intervallo
      const intervalId = setInterval(() => {
        const now = Date.now();
        remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
        
        // Chiama il callback con il tempo rimanente
        if (callback) callback(remaining);
        
        // Ferma il timer quando raggiunge 0
        if (remaining <= 0) {
          this.stopTimer(timerId);
        }
      }, 1000);
      
      // Salva l'ID dell'intervallo e il callback
      this.timers.set(timerId, intervalId);
      this.callbacks.set(timerId, callback);
      
      return expiryTime;
    }
  
    // Ferma un timer specifico
    stopTimer(timerId) {
      if (this.timers.has(timerId)) {
        clearInterval(this.timers.get(timerId));
        this.timers.delete(timerId);
        this.callbacks.delete(timerId);
      }
    }
  
    // Pausa un timer
    pauseTimer(timerId) {
      this.stopTimer(timerId);
    }
  
    // Verifica il tempo rimanente manualmente
    getRemainingTime(expiryTime) {
      if (!expiryTime) return 0;
      return Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
    }
  }
  
  // Esporta un'istanza singleton
  export const timerService = new TimerService();