import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { BASE_URL, API_ENDPOINTS } from '../constants/Api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      const fetchPromise = Promise.all([
        storage.getItem('auth_token'),
        storage.getItem('auth_user'),
      ]);
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (Array.isArray(res)) {
        const [storedToken, storedUser] = res;
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const url = `${BASE_URL}${API_ENDPOINTS.auth.login}`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      } catch (netErr: any) {
        throw new Error(`Cannot reach server at ${BASE_URL}. Ensure backend is running.`);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }
      const { token: authToken, user: authUser } = data;
      await storage.setItem('auth_token', authToken);
      await storage.setItem('auth_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await storage.deleteItem('auth_token');
      await storage.deleteItem('auth_user');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const url = `${BASE_URL}${API_ENDPOINTS.auth.register}`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
      } catch (netErr: any) {
        throw new Error(`Cannot reach server at ${BASE_URL}. Ensure backend is running.`);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      const { token: authToken, user: authUser } = data;
      await storage.setItem('auth_token', authToken);
      await storage.setItem('auth_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updatedFields };
      setUser(updated);
      storage.setItem('auth_user', JSON.stringify(updated)).catch(console.error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
        register,
        updateUser,
      }}
    >
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
