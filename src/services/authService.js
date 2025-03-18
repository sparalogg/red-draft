import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged
  } from 'firebase/auth';
  import { app } from './firebase';
  
  // Inizializza Auth
  const auth = getAuth(app);
  
  // Provider per Google
  const googleProvider = new GoogleAuthProvider();
  
  /**
   * Servizio di autenticazione
   */
  const authService = {
    // Login con Google
    loginWithGoogle: async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (error) {
        console.error('Errore durante il login con Google:', error);
        throw error;
      }
    },
  
    // Logout
    logout: async () => {
      try {
        await signOut(auth);
        return true;
      } catch (error) {
        console.error('Errore durante il logout:', error);
        throw error;
      }
    },
  
    // Ottieni l'utente corrente
    getCurrentUser: () => {
      return auth.currentUser;
    },
  
    // Imposta un listener per i cambiamenti di stato dell'autenticazione
    onAuthStateChange: (callback) => {
      return onAuthStateChanged(auth, callback);
    },
  
    // Controlla se l'utente è loggato
    isLoggedIn: () => {
      return !!auth.currentUser;
    },
  
    // Ottieni ID token per le richieste autenticate
    getIdToken: async () => {
      if (!auth.currentUser) return null;
      try {
        return await auth.currentUser.getIdToken();
      } catch (error) {
        console.error('Errore nell\'ottenimento del token:', error);
        return null;
      }
    }
  };
  
  export default authService;