import { apiRequest } from './queryClient';
import { getAuthHeaders } from './auth';

// Auth API
export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    return response.json();
  },
  
  logout: async () => {
    const headers = getAuthHeaders();
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return response.json();
  },
  
  me: async () => {
    const response = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },
};

// Products API
export const productsApi = {
  getProducts: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    familia?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString());
    });
    
    const response = await fetch(`/api/products?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },
  
  getProduct: async (id: string) => {
    const response = await fetch(`/api/products/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },
  
  createProduct: async (product: any) => {
    const response = await apiRequest('POST', '/api/products', product);
    return response.json();
  },
  
  updateProduct: async (id: string, product: any) => {
    const response = await apiRequest('PUT', `/api/products/${id}`, product);
    return response.json();
  },
  
  deleteProduct: async (id: string) => {
    const response = await apiRequest('DELETE', `/api/products/${id}`);
    return response.json();
  },
  
  bulkPriceUpdate: async (data: {
    percentage: number;
    field: string;
    familia?: string;
  }) => {
    const response = await apiRequest('POST', '/api/products/bulk-price-update', data);
    return response.json();
  },
};

// Upload API
export const uploadApi = {
  uploadFile: async (file: File, productId?: string, uploadType?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (productId) formData.append('productId', productId);
    if (uploadType) formData.append('uploadType', uploadType);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) throw new Error('Failed to upload file');
    return response.json();
  },
};

// Stats API
export const statsApi = {
  getStats: async () => {
    const response = await fetch('/api/stats', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
  
  getFamilies: async () => {
    const response = await fetch('/api/families', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch families');
    return response.json();
  },
};
