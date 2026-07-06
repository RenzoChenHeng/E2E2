import axios, { AxiosError } from 'axios';
import type { ApiError, Role, Trip, User } from './types';

const TOKEN_KEY = 'uber_clone_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  },
);

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.error) return data.error;
    if (data) return Object.values(data).filter(Boolean).join(', ');
    return error.message;
  }
  return 'Ocurrio un error inesperado';
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
    return data;
  },
  async register(payload: RegisterPayload) {
    const { data } = await api.post<{ token: string }>('/auth/register', payload);
    return data;
  },
  async me() {
    const { data } = await api.get<User>('/users/me');
    return data;
  },
};

export const tripsApi = {
  async availableDrivers() {
    const { data } = await api.get<User[]>('/drivers/available');
    return data;
  },
  async create(pickupAddress: string, dropoffAddress: string) {
    const { data } = await api.post<Trip>('/trips', { pickupAddress, dropoffAddress });
    return data;
  },
  async passengerTrips() {
    const { data } = await api.get<Trip[]>('/trips');
    return data;
  },
  async pendingTrips() {
    const { data } = await api.get<Trip[]>('/trips/pending');
    return data;
  },
  async driverTrips() {
    const { data } = await api.get<Trip[]>('/trips/my');
    return data;
  },
  async byId(id: number) {
    const { data } = await api.get<Trip>(`/trips/${id}`);
    return data;
  },
  async accept(id: number) {
    const { data } = await api.patch<Trip>(`/trips/${id}/accept`);
    return data;
  },
  async complete(id: number) {
    const { data } = await api.patch<Trip>(`/trips/${id}/complete`);
    return data;
  },
  async rate(id: number, rating: number, comment: string) {
    const { data } = await api.post<Trip>(`/trips/${id}/rate`, { rating, comment });
    return data;
  },
};
