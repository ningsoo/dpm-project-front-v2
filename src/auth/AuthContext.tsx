'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMockUser, isMockLoggedIn, clearMockLogin, MockUser } from './mock/mockAuth';

interface AuthContextType {
  isLoggedIn: boolean;
  user: MockUser | null;
  logout: () => void;
  refreshFromStorage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<MockUser | null>(null);

  const refreshFromStorage = () => {
    if (typeof window === 'undefined') return;

    const loggedIn = isMockLoggedIn();
    const mockUser = getMockUser();

    setIsLoggedIn(loggedIn);
    setUser(loggedIn ? mockUser : null);
  };

  useEffect(() => {
    refreshFromStorage();
  }, []);

  const logout = () => {
    if (typeof window === 'undefined') return;

    clearMockLogin();
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, logout, refreshFromStorage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
