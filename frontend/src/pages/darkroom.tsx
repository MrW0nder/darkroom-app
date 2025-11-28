"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Download, Upload } from "lucide-react";
import Canvas from "../components/ui/canvas"; // Import your Canvas component

const DarkroomApp: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [hue, setHue] = useState<number>(0);
  const [vibrance, setVibrance] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(100);
  const [fileName, setFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receive canvas reference from Canvas component (advanced effects/saving)
  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    // You can store or trigger effects here if needed!
    // For now, no-op.
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setVibrance(0);
    setSharpness(100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Darkroom
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
              {image && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Preview</h3>
                    <Button onClick={resetFilters}>
                      Reset Filters
                    </Button>
                  </div>
                  <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    <img
                      src={image}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Canvas + Editing Tools */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Edit Image (Canvas)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Real Canvas - Replace this in future with advanced editor */}
              <Canvas
                imageUrl={image}
                brightness={brightness}
                contrast={contrast}
                saturation={saturation}
                hue={hue}
                vibrance={vibrance}
                sharpness={sharpness}
                onCanvasReady={handleCanvasReady}
              />
              <div className="space-y-6 mt-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="brightness">Brightness</Label>
                    <span className="text-sm text-gray-400">{brightness}%</span>
                  </div>
                  <Slider
                    id="brightness"
                    min={0}
                    max={200}
                    step={1}
                    value={[brightness]}
                    onValueChange={(value: number[]) => setBrightness(value[0])}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="contrast">Contrast</Label>
                    <span className="text-sm text-gray-400">{contrast}%</span>
                  </div>
                  <Slider
                    id="contrast"
                    min={0}
                    max={200}
                    step={1}
                    value={[contrast]}
                    onValueChange={(value: number[]) => setContrast(value[0])}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="saturation">Saturation</Label>
                    <span className="text-sm text-gray-400">{saturation}%</span>
                  </div>
                  <Slider
                    id="saturation"
                    min={0}
                    max={200}
                    step={1}
                    value={[saturation]}
                    onValueChange={(value: number[]) => setSaturation(value[0])}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="hue">Hue</Label>
                    <span className="text-sm text-gray-400">{hue}°</span>
                  </div>
                  <Slider
                    id="hue"
                    min={-180}
                    max={180}
                    step={1}
                    value={[hue]}
                    onValueChange={(value: number[]) => setHue(value[0])}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="vibrance">Vibrance</Label>
                    <span className="text-sm text-gray-400">{vibrance}</span>
                  </div>
                  <Slider
                    id="vibrance"
                    min={-100}
                    max={100}
                    step={1}
                    value={[vibrance]}
                    onValueChange={(value: number[]) => setVibrance(value[0])}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="sharpness">Sharpness</Label>
                    <span className="text-sm text-gray-400">{sharpness}</span>
                  </div>
                  <Slider
                    id="sharpness"
                    min={0}
                    max={200}
                    step={1}
                    value={[sharpness]}
                    onValueChange={(value: number[]) => setSharpness(value[0])}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={!image}
                  // TODO: Wire to canvas saving logic soon!
                  onClick={() => alert("Canvas saving coming soon!")}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Save Edited Image
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DarkroomApp;