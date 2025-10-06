// API Client Service - Centralized HTTP client configuration and request handling

import { ApiResponse, PaginatedResponse } from '../types';
import { createSecureRequest, tokenStorage } from '../utils/secureStorage';
import { notifyBackendUnreachable } from '../utils/backendWakeupEmitter';

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getBaseOrigin(): string {
    try {
      const url = new URL(this.config.baseUrl);
      const normalizedPath = url.pathname.replace(/\/?api\/?v1\/?$/, '').replace(/\/$/, '');
      return `${url.origin}${normalizedPath}`;
    } catch (error) {
      return this.config.baseUrl.replace(/\/?api\/?v1\/?$/, '').replace(/\/$/, '');
    }
  }

  private buildUrl(endpoint: string, params?: RequestConfig['params']): string {
    if (!params) {
      return `${this.config.baseUrl}${endpoint}`;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const query = searchParams.toString();
    return query ? `${this.config.baseUrl}${endpoint}?${query}` : `${this.config.baseUrl}${endpoint}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {},
    attemptNumber: number = 0
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config.params);
    const timeout = config.timeout || this.config.timeout;
    const maxRetries = 3;
    const isAuthEndpoint = endpoint.includes('/login') || endpoint.includes('/register') || endpoint.includes('/refresh');

    // Handle FormData vs JSON differently
    const isFormData = config.body instanceof FormData;
    const requestHeaders: Record<string, string> = {
      ...this.config.headers,
      ...config.headers,
    };

    // Only set Content-Type for non-FormData requests
    if (!isFormData && config.body) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Remove Content-Type if FormData (let browser set multipart boundary)
    if (isFormData && requestHeaders['Content-Type']) {
      delete requestHeaders['Content-Type'];
    }

    // Create secure request configuration
    const secureConfig = createSecureRequest(url, {
      method: config.method || 'GET',
      headers: requestHeaders,
      body: (config.body && config.method !== 'GET') ?
        (isFormData ? config.body : JSON.stringify(config.body)) :
        undefined
    });

    const requestConfig: RequestInit = secureConfig;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      // Make the request with timeout
      const response = await Promise.race([
        fetch(url, requestConfig),
        timeoutPromise
      ]);

      let data: T | null = null;
      if (response.status !== 204) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }
      }

      // Handle 401 Unauthorized - attempt token refresh
      // PHASE 1.3: Use TokenRefreshManager to prevent race conditions
      if (response.status === 401 && !isAuthEndpoint && attemptNumber === 0) {
        console.log('🔐 Got 401, attempting token refresh...');

        try {
          // Dynamically import to avoid circular dependency
          const { authService } = await import('./authService');
          const { tokenRefreshManager } = await import('./tokenRefreshManager');

          // Check if refresh already in progress
          if (tokenRefreshManager.isRefreshing()) {
            console.log('⏳ Refresh in progress, queuing request...');

            // Queue this request to retry after refresh completes
            return new Promise<T>((resolve, reject) => {
              tokenRefreshManager.queueRequest(async () => {
                try {
                  const result = await this.makeRequest<T>(endpoint, config, attemptNumber + 1);
                  resolve(result as T);
                } catch (error) {
                  reject(error);
                }
              });
            }) as Promise<ApiResponse<T>>;
          }

          // Try to refresh the token
          const newToken = await authService.ensureValidToken();

          if (newToken) {
            console.log('✅ Token refreshed, retrying request...');

            // Retry the request with new token
            return await this.makeRequest<T>(endpoint, config, attemptNumber + 1);
          }
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          // Fall through to return 401 error
        }
      }

      if (!response.ok) {
        // Return error response with server data
        return {
          success: false,
          data,
          error: {
            message: (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`,
            code: response.status.toString(),
            status: response.status,
            details: data ?? undefined
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: data as T,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('Network request failed') ||
                            errorMessage.includes('timeout');

      if (isNetworkError) {
        notifyBackendUnreachable();
      }

      // Retry on network errors (not on auth errors)
      if (isNetworkError && attemptNumber < maxRetries && !isAuthEndpoint) {
        const delay = Math.pow(2, attemptNumber) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`🔄 Network error, retrying in ${delay}ms (attempt ${attemptNumber + 1}/${maxRetries})...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.makeRequest<T>(endpoint, config, attemptNumber + 1);
      }

      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'REQUEST_FAILED'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // GET request
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body });
  }

  // PUT request
  async put<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body });
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  // DELETE request
  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Paginated GET request
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<PaginatedResponse<T>> {
    const paginatedEndpoint = `${endpoint}?page=${page}&limit=${limit}`;
    return this.makeRequest<T[]>(paginatedEndpoint, { ...config, method: 'GET' }) as Promise<PaginatedResponse<T>>;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Add authorization header
  setAuthToken(token: string): void {
    this.config.headers = {
      ...this.config.headers,
      Authorization: `Bearer ${token}`
    };
  }

  // Remove authorization header
  clearAuth(): void {
    const { Authorization, ...headers } = this.config.headers;
    this.config.headers = headers;
  }
}

// Default API client instance
const defaultConfig: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

export const apiClient = new ApiClient(defaultConfig);

const existingToken = tokenStorage.getAccessToken();
if (existingToken) {
  apiClient.setAuthToken(existingToken);
}

// Export the class for creating custom instances
export { ApiClient };
