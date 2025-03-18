import { database } from './firebase';
import { ref, get, query, orderByChild, equalTo, remove, set, update } from 'firebase/database';

// Maximum draft duration in milliseconds (24 hours)
const DRAFT_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DEFAULT_TIMEOUT = 60000; // 15 seconds timeout for Firebase requests

/**
 * Helper function to add timeout to Firebase promises
 * @param {Promise} promise - The original Firebase promise
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Promise with timeout
 */
const withTimeout = (promise, timeoutMs = DEFAULT_TIMEOUT) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firebase request timeout')), timeoutMs)
    )
  ]);
};

/**
 * Service to manage draft history
 */
const draftHistoryService = {
  /**
   * Creates a new draft record in history
   * @param {string} draftId - Draft ID
   * @param {string} creatorId - ID of the user who created the draft
   * @param {object} initialState - Initial draft state
   * @returns {Promise<void>}
   */
  createDraftRecord: async (draftId, creatorId, initialState) => {
    if (!draftId || !creatorId) return;

    try {
      const historyRef = ref(database, `draftHistory/${draftId}`);
      const timestamp = Date.now();
      const expiresAt = timestamp + DRAFT_EXPIRATION;
      
      await withTimeout(set(historyRef, {
        draftId,
        creatorId,
        createdAt: timestamp,
        expiresAt,
        participants: {
          [creatorId]: {
            role: 'admin',
            joinedAt: timestamp
          }
        },
        initialState,
        status: 'active',
        lastUpdated: timestamp
      }));
      
      // Set a job to delete expired draft (handled by Cloud Functions in Firebase)
      await withTimeout(set(ref(database, `draftExpirations/${draftId}`), {
        expiresAt,
        draftId
      }));
    } catch (error) {
      console.error('Error creating draft record:', error);
      throw error;
    }
  },
  
  /**
   * Updates draft participants
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @param {string} role - User role ('blue', 'red', 'admin', 'spectator')
   * @returns {Promise<void>}
   */
  updateParticipant: async (draftId, userId, role) => {
    if (!draftId || !userId) return;
    
    try {
      const participantRef = ref(database, `draftHistory/${draftId}/participants/${userId}`);
      await withTimeout(update(participantRef, {
        role,
        joinedAt: Date.now()
      }));
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  },
  
  /**
   * Updates draft status
   * @param {string} draftId - Draft ID
   * @param {string} status - Draft status ('active', 'completed', 'cancelled')
   * @returns {Promise<void>}
   */
  updateDraftStatus: async (draftId, status) => {
    if (!draftId) return;
    
    try {
      const draftRef = ref(database, `draftHistory/${draftId}`);
      await withTimeout(update(draftRef, {
        status,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Error updating draft status:', error);
      throw error;
    }
  },
  
  /**
   * Gets draft details
   * @param {string} draftId - Draft ID
   * @returns {Promise<object|null>} Draft details or null if it doesn't exist
   */
  getDraftDetails: async (draftId) => {
    if (!draftId) return null;
    
    try {
      const draftRef = ref(database, `draftHistory/${draftId}`);
      const snapshot = await withTimeout(get(draftRef));
      
      if (!snapshot.exists()) return null;
      
      const draftData = snapshot.val();
      
      // Check if the draft has expired
      if (draftData.expiresAt < Date.now()) {
        // Update status to "expired"
        await draftHistoryService.updateDraftStatus(draftId, 'expired');
        draftData.status = 'expired';
      }
      
      return draftData;
    } catch (error) {
      console.error('Error getting draft details:', error);
      return null;
    }
  },
  
  /**
   * Gets all drafts created by a user that haven't expired yet
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of drafts
   */
  getUserDrafts: async (userId) => {
    if (!userId) return [];
    
    try {
      const historyRef = ref(database, 'draftHistory');
      const userDraftsQuery = query(historyRef, orderByChild('creatorId'), equalTo(userId));
      
      const snapshot = await withTimeout(get(userDraftsQuery));
      if (!snapshot.exists()) return [];
      
      const drafts = [];
      const now = Date.now();
      
      // Filter non-expired drafts
      snapshot.forEach((childSnapshot) => {
        const draft = childSnapshot.val();
        if (draft.expiresAt > now) {
          drafts.push(draft);
        }
      });
      
      return drafts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error getting user drafts:', error);
      return [];
    }
  },
  
  /**
   * Gets all drafts in which a user has participated that haven't expired yet
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of drafts
   */
  getUserParticipatedDrafts: async (userId) => {
    if (!userId) return [];
    
    try {
      const historyRef = ref(database, 'draftHistory');
      const snapshot = await withTimeout(get(historyRef));
      
      if (!snapshot.exists()) return [];
      
      const drafts = [];
      const now = Date.now();
      
      // Filter drafts where the user participated and that haven't expired
      snapshot.forEach((childSnapshot) => {
        const draft = childSnapshot.val();
        if (draft.participants && 
            draft.participants[userId] && 
            draft.expiresAt > now) {
          drafts.push(draft);
        }
      });
      
      return drafts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error getting user participated drafts:', error);
      return [];
    }
  },
  
  /**
   * Deletes drafts that expired more than 24 hours ago
   * @returns {Promise<number>} Number of deleted drafts
   */
  cleanupExpiredDrafts: async () => {
    try {
      const now = Date.now();
      const expirationRef = ref(database, 'draftExpirations');
      const snapshot = await withTimeout(get(expirationRef));
      
      if (!snapshot.exists()) return 0;
      
      let count = 0;
      
      // Delete expired drafts
      const deletionPromises = [];
      snapshot.forEach((childSnapshot) => {
        const expiration = childSnapshot.val();
        if (expiration.expiresAt < now) {
          // Delete the draft and its expiration record
          deletionPromises.push(withTimeout(remove(ref(database, `drafts/${expiration.draftId}`))));
          deletionPromises.push(withTimeout(remove(ref(database, `draftHistory/${expiration.draftId}`))));
          deletionPromises.push(withTimeout(remove(ref(database, `draftExpirations/${expiration.draftId}`))));
          count++;
        }
      });
      
      await Promise.all(deletionPromises);
      return count;
    } catch (error) {
      console.error('Error cleaning up expired drafts:', error);
      return 0;
    }
  },
  
  /**
   * Deletes a specific draft
   * @param {string} draftId - Draft ID
   * @param {string} userId - ID of the user requesting deletion
   * @returns {Promise<boolean>} True if deletion was successful
   */
  deleteDraft: async (draftId, userId) => {
    if (!draftId || !userId) return false;
    
    try {
      // Check if the user is the creator or an admin
      const draftRef = ref(database, `draftHistory/${draftId}`);
      const snapshot = await withTimeout(get(draftRef));
      
      if (!snapshot.exists()) return false;
      
      const draft = snapshot.val();
      
      // Only the creator can delete the draft
      if (draft.creatorId !== userId) return false;
      
      // Delete the draft
      await withTimeout(remove(ref(database, `drafts/${draftId}`)));
      await withTimeout(remove(ref(database, `draftHistory/${draftId}`)));
      await withTimeout(remove(ref(database, `draftExpirations/${draftId}`)));
      
      return true;
    } catch (error) {
      console.error('Error deleting draft:', error);
      return false;
    }
  }
};

export default draftHistoryService;