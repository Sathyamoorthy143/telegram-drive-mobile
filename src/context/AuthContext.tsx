import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { telegramService } from '../services/telegram';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCredentials: boolean;
}

interface AuthContextType extends AuthState {
  setAuthenticated: (value: boolean) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  hasCredentials: false,
  setAuthenticated: () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    hasCredentials: false,
  });

  const checkAuth = async () => {
    try {
      const creds = await telegramService.loadCredentials();
      if (creds) {
        setState(s => ({ ...s, hasCredentials: true }));
        await telegramService.initialize(parseInt(creds.apiId), creds.apiHash);
        const authed = await telegramService.isAuthorized();
        setState({ isLoading: false, isAuthenticated: authed, hasCredentials: true });
      } else {
        setState({ isLoading: false, isAuthenticated: false, hasCredentials: false });
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const setAuthenticated = (value: boolean) => {
    setState(s => ({ ...s, isAuthenticated: value }));
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuthenticated, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
