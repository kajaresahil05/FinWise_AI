import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export interface UserProfile {
  id: number;
  user_id: number;
  name: string;
  age: number | null;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  investment_amount: number;
  investment_horizon: number | null;
  risk_tolerance: string;
  currency: string;
}

export interface User {
  id: number;
  email: string;
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('finwise_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error("Session verification failed:", error);
          // Token expired or invalid
          localStorage.removeItem('finwise_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('finwise_token', access_token);
      setToken(access_token);
      
      // Fetch full profile info after login
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Login failed. Please check credentials.";
      throw new Error(msg);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { access_token } = response.data;
      localStorage.setItem('finwise_token', access_token);
      setToken(access_token);
      
      // Fetch full profile info after registration
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Registration failed. Please try again.";
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('finwise_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      if (user) {
        setUser({
          ...user,
          profile: response.data.profile,
        });
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to update profile info.";
      throw new Error(msg);
    }
  };

  const refreshUser = async () => {
    try {
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user session info:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
