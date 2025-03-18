import { database } from './firebase';
import { ref, get, update } from 'firebase/database';
import authService from './authService';

// Default timeout value in milliseconds
const DEFAULT_TIMEOUT = 60000;

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
 * Service to handle draft roles and access management
 */
const draftRoleService = {
  /**
   * Get user role in a specific draft
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @returns {Promise<string>} User role ('admin', 'blue', 'red', 'spectator')
   */
  getUserRole: async (draftId, userId) => {
    if (!draftId || !userId) return 'spectator';
    
    try {
      // Get draft details
      const draftRef = ref(database, `draftHistory/${draftId}`);
      const snapshot = await withTimeout(get(draftRef));
      
      if (!snapshot.exists()) return 'spectator';
      
      const draft = snapshot.val();
      
      // Check if user is already a participant
      if (draft.participants && draft.participants[userId]) {
        return draft.participants[userId].role;
      }
      
      // Check existing roles
      let adminTaken = false;
      let blueTaken = false;
      let redTaken = false;
      
      if (draft.participants) {
        Object.values(draft.participants).forEach(participant => {
          switch (participant.role) {
            case 'admin':
              adminTaken = true;
              break;
            case 'blue':
              blueTaken = true;
              break;
            case 'red':
              redTaken = true;
              break;
            default:
              break;
          }
        });
      }
      
      // Check if this is the creator
      if (draft.creatorId === userId) {
        return 'admin';
      }
      
      // Check available team captain roles
      if (!blueTaken) {
        return 'blue';
      }
      
      if (!redTaken) {
        return 'red';
      }
      
      // Default to spectator if all important roles are taken
      return 'spectator';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'spectator';
    }
  },
  
  /**
   * Assign role to user in a draft
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @param {string} role - Role to assign ('admin', 'blue', 'red', 'spectator')
   * @returns {Promise<boolean>} Success status
   */
  assignRole: async (draftId, userId, role) => {
    if (!draftId || !userId || !role) return false;
    
    try {
      // Validate role
      if (!['admin', 'blue', 'red', 'spectator'].includes(role)) {
        return false;
      }
      
      // Get current draft data
      const draftRef = ref(database, `draftHistory/${draftId}`);
      const snapshot = await withTimeout(get(draftRef));
      
      if (!snapshot.exists()) return false;
      
      const draft = snapshot.val();
      
      // Only admin can change roles except for initial assignment
      const currentUser = authService.getCurrentUser();
      const isCurrentUserAdmin = draft.participants && 
                               draft.participants[currentUser.uid] && 
                               draft.participants[currentUser.uid].role === 'admin';
      
      // If user already has a role and requester is not admin, prevent change
      if (draft.participants && 
          draft.participants[userId] && 
          !isCurrentUserAdmin && 
          currentUser.uid !== userId) {
        return false;
      }
      
      // Check if role is already taken by someone else
      if (['admin', 'blue', 'red'].includes(role)) {
        let roleTaken = false;
        
        if (draft.participants) {
          Object.entries(draft.participants).forEach(([participantId, participantData]) => {
            if (participantId !== userId && participantData.role === role) {
              roleTaken = true;
            }
          });
        }
        
        if (roleTaken) {
          return false;
        }
      }
      
      // Update the role
      const participantRef = ref(database, `draftHistory/${draftId}/participants/${userId}`);
      await withTimeout(update(participantRef, {
        role,
        joinedAt: Date.now()
      }));
      
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  },
  
  /**
   * Join a draft with appropriate role
   * @param {string} draftId - Draft ID
   * @returns {Promise<string>} Assigned role
   */
  joinDraft: async (draftId) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !draftId) return null;
    
    try {
      // Determine appropriate role
      const role = await draftRoleService.getUserRole(draftId, currentUser.uid);
      
      // Assign the role
      const success = await draftRoleService.assignRole(draftId, currentUser.uid, role);
      
      if (success) {
        return role;
      } else {
        return 'spectator'; // Default fallback
      }
    } catch (error) {
      console.error('Error joining draft:', error);
      return 'spectator';
    }
  },
  
  /**
   * Check if user has permission to modify the draft
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user has permission
   */
  hasPermission: async (draftId, userId) => {
    if (!draftId || !userId) return false;
    
    try {
      const role = await draftRoleService.getUserRole(draftId, userId);
      return ['admin', 'blue', 'red'].includes(role);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }
};

export default draftRoleService;