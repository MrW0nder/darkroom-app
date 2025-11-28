import { apiClient } from "@/services/ai/api-client";

export class AIService {
  // Upload image and get ID
  static async uploadImage(file: File): Promise<string> {
    try {
      const response = await apiClient.uploadImage(file);
      return response.imageId;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw new Error("Failed to upload image for processing");
    }
  }

  // Apply AI enhancement
  static async enhanceImage(imageId: string): Promise<string> {
    try {
      const response = await apiClient.enhanceImage(imageId);
      return response.processedImage;
    } catch (error) {
      console.error("AI enhancement failed:", error);
      throw new Error("Failed to enhance image");
    }
  }

  // Apply preset filters
  static async applyPreset(imageId: string, preset: string): Promise<string> {
    try {
      const response = await apiClient.applyPreset(imageId, preset);
      return response.processedImage;
    } catch (error) {
      console.error("Preset application failed:", error);
      throw new Error(`Failed to apply ${preset} preset`);
    }
  }

  // Remove background
  static async removeBackground(imageId: string): Promise<string> {
    try {
      const response = await apiClient.removeBackground(imageId);
      return response.processedImage;
    } catch (error) {
      console.error("Background removal failed:", error);
      throw new Error("Failed to remove background");
    }
  }

  // Upscale image
  static async upscaleImage(imageId: string, scale: number): Promise<string> {
    try {
      const response = await apiClient.upscaleImage(imageId, scale);
      return response.processedImage;
    } catch (error) {
      console.error("Image upscaling failed:", error);
      throw new Error("Failed to upscale image");
    }
  }
}