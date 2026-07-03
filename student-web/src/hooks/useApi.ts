import axios, { type AxiosInstance } from 'axios';
import { useEffect, useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let apiClient: AxiosInstance | null = null;

function getApiClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh on 401
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }
  return apiClient;
}

export function useApi() {
  const client = getApiClient();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await client.post('/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        return { success: true, user };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.data?.message || 'Login failed',
        };
      }
    },
    [client]
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const response = await client.post('/auth/register', {
          email,
          password,
          fullName,
        });
        const { token, user } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        return { success: true, user };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.data?.message || 'Registration failed',
        };
      }
    },
    [client]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  const getUser = useCallback(async () => {
    try {
      const response = await client.get('/profile');
      return { success: true, user: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user',
      };
    }
  }, [client]);

  const getCourses = useCallback(async () => {
    try {
      const response = await client.get('/courses');
      return { success: true, courses: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch courses',
      };
    }
  }, [client]);

  const getTimetable = useCallback(async () => {
    try {
      const response = await client.get('/timetable');
      return { success: true, timetable: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch timetable',
      };
    }
  }, [client]);

  const getFiles = useCallback(async (courseId?: string) => {
    try {
      const url = courseId ? `/files?courseId=${courseId}` : '/files';
      const response = await client.get(url);
      return { success: true, files: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch files',
      };
    }
  }, [client]);

  const getAnnouncements = useCallback(async () => {
    try {
      const response = await client.get('/announcements');
      return { success: true, announcements: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch announcements',
      };
    }
  }, [client]);

  const getAssignments = useCallback(async () => {
    try {
      const response = await client.get('/assignments');
      return { success: true, assignments: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch assignments',
      };
    }
  }, [client]);

  const getExams = useCallback(async () => {
    try {
      const response = await client.get('/exams');
      return { success: true, exams: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch exams',
      };
    }
  }, [client]);

  const getEvents = useCallback(async () => {
    try {
      const response = await client.get('/events');
      return { success: true, events: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch events',
      };
    }
  }, [client]);

  const getClubs = useCallback(async () => {
    try {
      const response = await client.get('/clubs');
      return { success: true, clubs: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch clubs',
      };
    }
  }, [client]);

  const getOpportunities = useCallback(async () => {
    try {
      const response = await client.get('/opportunities');
      return { success: true, opportunities: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch opportunities',
      };
    }
  }, [client]);

  const getCommunityPosts = useCallback(async () => {
    try {
      const response = await client.get('/community');
      return { success: true, posts: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch community posts',
      };
    }
  }, [client]);

  const getSubscriptionPlans = useCallback(async () => {
    try {
      const response = await client.get('/subscriptions/plans');
      return { success: true, plans: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch subscription plans',
      };
    }
  }, [client]);

  const getNotifications = useCallback(async () => {
    try {
      const response = await client.get('/notifications');
      return { success: true, notifications: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch notifications',
      };
    }
  }, [client]);

  return {
    client,
    login,
    register,
    logout,
    getUser,
    getCourses,
    getTimetable,
    getFiles,
    getAnnouncements,
    getAssignments,
    getExams,
    getEvents,
    getClubs,
    getOpportunities,
    getCommunityPosts,
    getSubscriptionPlans,
    getNotifications,
  };
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  return { user, isAuthenticated, loading };
}
