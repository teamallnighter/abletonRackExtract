// API service for communicating with Flask backend
import type { RackDocument, AnalyzeResponse } from '../types/rack';
import { AuthService } from './auth';

const API_BASE = '/api';

export class ApiService {
  static async analyzeRack(
    file: File,
    description?: string,
    producerName?: string
  ): Promise<AnalyzeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (producerName) formData.append('producer_name', producerName);

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        ...AuthService.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async getRack(rackId: string): Promise<{ success: boolean; rack: RackDocument }> {
    const response = await fetch(`${API_BASE}/racks/${rackId}/enhanced`, {
      headers: {
        ...AuthService.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rack: ${response.statusText}`);
    }

    return response.json();
  }

  static async getRecentRacks(limit = 10): Promise<{ success: boolean; racks: RackDocument[]; count: number }> {
    const response = await fetch(`${API_BASE}/racks?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch racks: ${response.statusText}`);
    }

    return response.json();
  }

  static async searchRacks(query: string): Promise<{ success: boolean; racks: RackDocument[]; query: string; count: number }> {
    const response = await fetch(`${API_BASE}/racks/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async downloadFile(fileType: 'xml' | 'json', filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/download/${fileType}/${filename}`);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  static async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}