// @ts-nocheck
// API Client for connecting to the separated backend
const API_URL = (process as any).env.NEXT_PUBLIC_API_URL || '/api';
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include' // Include cookies for session management
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // GET request
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.fetch<T>(`${endpoint}${queryString}`, {
      method: 'GET'
    });
  }

  // POST request
  async post<T = any>(endpoint: string, data?: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // PUT request
  async put<T = any>(endpoint: string, data?: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // PATCH request
  async patch<T = any>(endpoint: string, data?: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'DELETE'
    });
  }

  // Upload files
  async upload<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Don't set Content-Type for FormData, let browser set it with boundary

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Upload Error [${endpoint}]:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
// Auth specific methods
export const authApi = {
  async login(phoneNumber: string, password: string) {
    const response = await apiClient.post<{ user: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */; token: string; }>('/auth/login', {
      phoneNumber,
      password
    });

    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }

    return response;
  },

  async register(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
  }) {
    const response = await apiClient.post<{ user: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */; token: string; }>('/auth/register', data);

    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }

    return response;
  },

  async verify() {
    return apiClient.get('/auth/verify');
  },

  async logout() {
    const response = await apiClient.post('/auth/logout');
    apiClient.setToken(null);
    return response;
  }
};

// Auction specific methods
export const auctionApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    brand?: string;
    city?: string;
  }) {
    return apiClient.get('/auctions', params);
  },

  async getById(id: string | number) {
    return apiClient.get(`/auctions/${id}`);
  },

  async create(data: any /* eslint-disable-line *//* auto-fixed */ /* auto-fixed */ /* auto-fixed */ /* eslint-disable-line */) {
    return apiClient.post('/auctions', data);
  },

  async placeBid(auctionId: string | number, amount: number) {
    return apiClient.post(`/auctions/${auctionId}/bid`, { amount });
  },

  async getBids(auctionId: string | number, page = 1, limit = 20) {
    return apiClient.get(`/auctions/${auctionId}/bids`, { page, limit });
  }
};

// User specific methods
export const userApi = {
  async getProfile() {
    return apiClient.get('/users/profile');
  },

  async updateProfile(data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    address: string;
  }>) {
    return apiClient.put('/users/profile', data);
  },

  async getWallets() {
    return apiClient.get('/wallets');
  }
};

// Export default client
export default apiClient;
