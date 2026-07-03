import axios, { AxiosInstance } from 'axios';
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

    apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/admin/login';
        }
        return Promise.reject(error);
      }
    );
  }
  return apiClient;
}

export function useAdminApi() {
  const client = getApiClient();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await client.post('/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));
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

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }, []);

  const getDashboardStats = useCallback(async () => {
    try {
      const response = await client.get('/dashboard');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard stats',
      };
    }
  }, [client]);

  const getUniversities = useCallback(async () => {
    try {
      const response = await client.get('/universities');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch universities',
      };
    }
  }, [client]);

  const getUsers = useCallback(async (role?: string) => {
    try {
      const url = role ? `/profile?role=${role}` : '/profile';
      const response = await client.get(url);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch users',
      };
    }
  }, [client]);

  const getCourses = useCallback(async () => {
    try {
      const response = await client.get('/courses');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch courses',
      };
    }
  }, [client]);

  const getFiles = useCallback(async () => {
    try {
      const response = await client.get('/files');
      return { success: true, data: response.data };
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
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch announcements',
      };
    }
  }, [client]);

  const getTimetable = useCallback(async () => {
    try {
      const response = await client.get('/timetable');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch timetable',
      };
    }
  }, [client]);

  const getAssignments = useCallback(async () => {
    try {
      const response = await client.get('/assignments');
      return { success: true, data: response.data };
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
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch exams',
      };
    }
  }, [client]);

  const getCommunity = useCallback(async () => {
    try {
      const response = await client.get('/community');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch community posts',
      };
    }
  }, [client]);

  const getOpportunities = useCallback(async () => {
    try {
      const response = await client.get('/opportunities');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch opportunities',
      };
    }
  }, [client]);

  const getEvents = useCallback(async () => {
    try {
      const response = await client.get('/events');
      return { success: true, data: response.data };
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
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch clubs',
      };
    }
  }, [client]);

  const getSubscriptions = useCallback(async () => {
    try {
      const response = await client.get('/subscriptions');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch subscriptions',
      };
    }
  }, [client]);

  return {
    client,
    login,
    logout,
    getDashboardStats,
    getUniversities,
    getUsers,
    getCourses,
    getFiles,
    getAnnouncements,
    getTimetable,
    getAssignments,
    getExams,
    getCommunity,
    getOpportunities,
    getEvents,
    getClubs,
    getSubscriptions,
  };
}

export function useAdminAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  return { user, isAuthenticated, loading };
}
