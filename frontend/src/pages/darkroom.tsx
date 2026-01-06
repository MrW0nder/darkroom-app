"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Upload } from "lucide-react";
import Canvas from "../components/ui/canvas";

const DarkroomApp: React.FC = () => {
  const [image, setImage] = useState<string | null>(null); // State for image preview
  const [layers, setLayers] = useState<any[]>([]); // State for layers fetched from the backend
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [hue, setHue] = useState<number>(0);
  const [vibrance, setVibrance] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(100);
  const [errorMessage, setErrorMessage] = useState<string>(""); // State for error messages

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch layers from the backend
  const fetchLayers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/layers"); // Replace URL with your layer API endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch layers.");
      }
      const data = await response.json();
      console.log("Fetched Layers:", data);
      setLayers(data); // Update layers in state
    } catch (error) {
      console.error("Error fetching layers:", error);
      setErrorMessage("Failed to fetch layers. Please try again later.");
    }
  };

  // On component mount, fetch the layers
  useEffect(() => {
    fetchLayers();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(""); // Reset previous errors
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file type
    if (!file.type.match("image.*")) {
      setErrorMessage("Please upload a valid image file (JPG, PNG, WEBP).");
      return;
    }

    // Validate file size (limit: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds the 5MB limit. Please upload a smaller image.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload the image file to the backend
      const response = await fetch("http://127.0.0.1:8000/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image.");
      }

      const uploadedImage = await response.json();
      setImage(uploadedImage.filepath); // Display the uploaded image preview
      console.log("Image uploaded successfully:", uploadedImage);

      // Re-fetch layers to update dynamically
      await fetchLayers();
    } catch (error) {
      console.error("Error uploading image:", error);
      setErrorMessage("Failed to upload image. Please try again.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the input field
      }
    }
  };

  // Function to reset all filters to default values
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setVibrance(0);
    setSharpness(100);
  };

  // Simple placeholder for the canvas ready function
  const handleCanvasReady = (_canvas: HTMLCanvasElement) => {
    console.log("Canvas is ready!"); // Placeholder logic for the future
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Darkroom - Layer Manager
          </h1>
          <p className="mt-2 text-gray-400">Edit your images with ease</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="w-12 h-12 text-gray-500" />
                  <div>
                    <p className="font-medium">Click to upload an image</p>
                    <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                </div>
                <Input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            </CardContent>
          </Card>

          {/* Layers List */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Layers List</CardTitle>
            </CardHeader>
            <CardContent>
              {layers.length === 0 && <p>No layers found. Upload an image to get started.</p>}
              {layers.map((layer) => (
                <div key={layer.id} className="space-y-2">
                  <p className="text-gray-400">image: {layer.filepath}</p>
                  <Button variant="secondary">Layer Preview</Button>
                  <Button variant="secondary" color="red">
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Image Preview and Filters */}
        {image && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4">Image Preview</h2>
            <div className="space-y-6">
              <Canvas
                imageUrl={image}
                brightness={brightness}
                contrast={contrast}
                saturation={saturation}
                hue={hue}
                vibrance={vibrance}
                sharpness={sharpness}
                onCanvasReady={handleCanvasReady} // Now defined
              />
              {[ // Render dynamic sliders
                { id: "brightness", value: brightness, min: 0, max: 200, setter: setBrightness, label: "Brightness" },
                { id: "contrast", value: contrast, min: 0, max: 200, setter: setContrast, label: "Contrast" },
                { id: "saturation", value: saturation, min: 0, max: 200, setter: setSaturation, label: "Saturation" },
                { id: "hue", value: hue, min: -180, max: 180, setter: setHue, label: "Hue" },
                { id: "vibrance", value: vibrance, min: -100, max: 100, setter: setVibrance, label: "Vibrance" },
                { id: "sharpness", value: sharpness, min: 0, max: 200, setter: setSharpness, label: "Sharpness" },
              ].map((slider) => (
                <div key={slider.id}>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor={slider.id}>{slider.label}</Label>
                  </div>
                  <input
                    type="range"
                    id={slider.id}
                    min={slider.min}
                    max={slider.max}
                    value={slider.value}
                    onChange={(e) => slider.setter(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
              <Button onClick={resetFilters}>Reset Filters</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DarkroomApp;