'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getAccessToken, setAccessToken, clearAuth, isAuthenticated } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  githubId: number | null;
  googleId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGithub: () => void;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!isAuthenticated()) {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!refreshResponse.ok) {
          return null;
        }

        const refreshBody = (await refreshResponse.json()) as {
          data?: { accessToken?: string };
        };

        const refreshedToken = refreshBody.data?.accessToken;
        if (!refreshedToken) {
          return null;
        }

        setAccessToken(refreshedToken);
      }

      try {
        const response = await apiClient<{ data: User }>('/api/v1/auth/me');
        return response.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginWithGithub = () => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/github`;
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await apiClient('/api/v1/auth/logout', { method: 'POST' });
      }
    } finally {
      clearAuth();
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    loginWithGithub,
    loginWithGoogle,
    logout,
  };
}
