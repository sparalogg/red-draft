/**
 * Salva il ruolo dell'utente per un determinato draft nel localStorage
 * @param {string} draftId - ID del draft
 * @param {string} role - Ruolo dell'utente ('admin', 'blue', 'red', 'spectator')
 * @param {string} accessCode - Codice di accesso associato al ruolo (opzionale)
 */
export const saveDraftRole = (draftId, role, accessCode = null) => {
    if (!draftId || !role) return;
    
    try {
      // Recupera l'oggetto esistente dei ruoli degli utenti o crea uno nuovo
      const storedRoles = JSON.parse(localStorage.getItem('draftRoles')) || {};
      
      // Aggiorna o crea una nuova voce per questo draft
      storedRoles[draftId] = {
        role,
        accessCode,
        timestamp: Date.now() // Aggiungiamo un timestamp per eventuale pulizia futura
      };
      
      // Salva l'oggetto aggiornato nel localStorage
      localStorage.setItem('draftRoles', JSON.stringify(storedRoles));
      
      //console.log(`Ruolo salvato per draft ${draftId}: ${role}`);
    } catch (error) {
      console.error('Errore durante il salvataggio del ruolo nel localStorage:', error);
    }
  };
  
  /**
   * Recupera il ruolo dell'utente per un determinato draft dal localStorage
   * @param {string} draftId - ID del draft
   * @returns {Object|null} Oggetto con ruolo e codice di accesso o null se non trovato
   */
  export const getDraftRole = (draftId) => {
    if (!draftId) return null;
    
    try {
      const storedRoles = JSON.parse(localStorage.getItem('draftRoles')) || {};
      return storedRoles[draftId] || null;
    } catch (error) {
      console.error('Errore durante il recupero del ruolo dal localStorage:', error);
      return null;
    }
  };
  
  /**
   * Elimina il ruolo salvato per un determinato draft
   * @param {string} draftId - ID del draft 
   */
  export const clearDraftRole = (draftId) => {
    if (!draftId) return;
    
    try {
      const storedRoles = JSON.parse(localStorage.getItem('draftRoles')) || {};
      
      // Se esiste una entry per questo draftId, la rimuoviamo
      if (storedRoles[draftId]) {
        delete storedRoles[draftId];
        localStorage.setItem('draftRoles', JSON.stringify(storedRoles));
        //console.log(`Ruolo eliminato per draft ${draftId}`);
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione del ruolo dal localStorage:', error);
    }
  };
  
  /**
   * Pulisce i ruoli vecchi (più vecchi di expirationDays giorni)
   * @param {number} expirationDays - Numero di giorni dopo cui un ruolo salvato è considerato vecchio
   */
  export const cleanupOldRoles = (expirationDays = 7) => {
    try {
      const storedRoles = JSON.parse(localStorage.getItem('draftRoles')) || {};
      const now = Date.now();
      const expirationTime = expirationDays * 24 * 60 * 60 * 1000; // Converti giorni in millisecondi
      let changed = false;
      
      Object.keys(storedRoles).forEach(draftId => {
        const roleData = storedRoles[draftId];
        if (roleData.timestamp && (now - roleData.timestamp > expirationTime)) {
          delete storedRoles[draftId];
          changed = true;
        }
      });
      
      if (changed) {
        localStorage.setItem('draftRoles', JSON.stringify(storedRoles));
        //console.log('Pulizia dei ruoli vecchi completata');
      }
    } catch (error) {
      console.error('Errore durante la pulizia dei ruoli vecchi:', error);
    }
  };