import { FileUtils } from "@/utils/file-utils";

// Configuration - replace with your actual API endpoint
const API_BASE_URL = "https://your-ai-service-api.com/api";
const API_KEY = process.env.REACT_APP_AI_API_KEY || "your-api-key-here";

interface ApiRequestOptions {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private async request<T>({ endpoint, method = "GET", data, headers = {} }: ApiRequestOptions): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      ...headers
    };

    const config: RequestInit = {
      method,
      headers: defaultHeaders
    };

    if (data) {
      if (data instanceof FormData) {
        // For file uploads, remove Content-Type to let browser set it with boundary
        delete (config.headers as Record<string, string>)["Content-Type"];
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API Error: ${response.status} - ${errorData.message || response.statusText}`
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Upload image for processing
  async uploadImage(file: File): Promise<{ imageId: string }> {
    const formData = new FormData();
    formData.append("image", file);
    
    return this.request<{ imageId: string }>({
      endpoint: "/images/upload",
      method: "POST",
      data: formData
    });
  }

  // Apply AI enhancement
  async enhanceImage(imageId: string): Promise<{ processedImage: string }> {
    return this.request<{ processedImage: string }>({
      endpoint: `/images/${imageId}/enhance`,
      method: "POST",
      data: { enhancementType: "auto" }
    });
  }

  // Apply preset filter
  async applyPreset(imageId: string, preset: string): Promise<{ processedImage: string }> {
    return this.request<{ processedImage: string }>({
      endpoint: `/images/${imageId}/preset`,
      method: "POST",
      data: { preset }
    });
  }

  // Remove background
  async removeBackground(imageId: string): Promise<{ processedImage: string }> {
    return this.request<{ processedImage: string }>({
      endpoint: `/images/${imageId}/remove-background`,
      method: "POST"
    });
  }

  // Upscale image
  async upscaleImage(imageId: string, scale: number): Promise<{ processedImage: string }> {
    return this.request<{ processedImage: string }>({
      endpoint: `/images/${imageId}/upscale`,
      method: "POST",
      data: { scale }
    });
  }
}

export const apiClient = new ApiClient();