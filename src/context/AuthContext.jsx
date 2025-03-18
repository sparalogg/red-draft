import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

// Create the context
const AuthContext = createContext();

// Provider for authentication
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDraftRole, setCurrentDraftRole] = useState(null);

  // Effect to handle authentication state
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  // Login function
  const login = async () => {
    try {
      await authService.loginWithGoogle();
      return true;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      setCurrentDraftRole(null);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  };

  // Function to set the current role in the draft
  const setDraftRole = (role) => {
    setCurrentDraftRole(role);
  };

  // Context value
  const value = {
    user,
    isLoading,
    login,
    logout,
    currentDraftRole,
    setDraftRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the context
export const useAuth = () => useContext(AuthContext);