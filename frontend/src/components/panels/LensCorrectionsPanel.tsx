import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Aperture, CheckCircle } from 'lucide-react';

const LENS_PROFILES = [
  'Canon EF 50mm f/1.8',
  'Nikon AF-S 35mm f/1.8G',
  'Sony FE 85mm f/1.4',
  'Generic Wide Angle'
];

export const LensCorrectionsPanel: React.FC = () => {
  const [selectedLens, setSelectedLens] = useState<string>('');
  const [enableDistortion, setEnableDistortion] = useState(true);
  const [enableVignetting, setEnableVignetting] = useState(true);
  const [enableChromaticAberration, setEnableChromaticAberration] = useState(true);
  const [manualDistortion, setManualDistortion] = useState(0);
  const [manualVignetting, setManualVignetting] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleApplyCorrections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lens-corrections/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: '/path/to/image.jpg', // Replace with actual path
          lens_model: selectedLens || null,
          enable_distortion: enableDistortion,
          enable_vignetting: enableVignetting,
          enable_chromatic_aberration: enableChromaticAberration,
          manual_distortion: manualDistortion !== 0 ? manualDistortion / 100 : null,
          manual_vignetting: manualVignetting !== 0 ? manualVignetting / 100 : null
        })
      });
      
      const data = await response.json();
      console.log('Lens corrections applied:', data);
    } catch (error) {
      console.error('Error applying lens corrections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Lens Corrections</h2>
        </div>

        {/* Lens Profile Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Lens Profile</label>
          <Select value={selectedLens} onValueChange={setSelectedLens}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select lens profile..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {LENS_PROFILES.map((lens) => (
                <SelectItem key={lens} value={lens} className="text-white hover:bg-gray-700">
                  {lens}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Auto-detected from EXIF or select manually
          </p>
        </div>

        {/* Correction Options */}
        <Card className="bg-gray-800 border-gray-700 p-4">
          <h3 className="text-sm font-medium text-white mb-3">Enable Corrections</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Geometric Distortion</label>
              <Checkbox
                checked={enableDistortion}
                onCheckedChange={(checked) => setEnableDistortion(checked as boolean)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Vignetting</label>
              <Checkbox
                checked={enableVignetting}
                onCheckedChange={(checked) => setEnableVignetting(checked as boolean)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Chromatic Aberration</label>
              <Checkbox
                checked={enableChromaticAberration}
                onCheckedChange={(checked) => setEnableChromaticAberration(checked as boolean)}
              />
            </div>
          </div>
        </Card>

        {/* Manual Adjustments */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Manual Adjustments</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Distortion</label>
              <span className="text-xs text-white">{manualDistortion}</span>
            </div>
            <Slider
              value={[manualDistortion]}
              onValueChange={(value) => setManualDistortion(value[0])}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Vignetting</label>
              <span className="text-xs text-white">{manualVignetting}</span>
            </div>
            <Slider
              value={[manualVignetting]}
              onValueChange={(value) => setManualVignetting(value[0])}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Apply Button */}
        <Button
          onClick={handleApplyCorrections}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>Processing...</>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Corrections
            </>
          )}
        </Button>

        {/* Info */}
        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400">
            Lens corrections fix optical imperfections from your lens including barrel/pincushion distortion, 
            vignetting (darkening in corners), and chromatic aberration (color fringing).
          </p>
        </div>
      </div>
    </div>
  );
};
