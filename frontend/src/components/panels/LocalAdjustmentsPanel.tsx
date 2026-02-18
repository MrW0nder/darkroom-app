import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Circle, Move, Paintbrush, Sparkles } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

type FilterType = 'radial' | 'gradient' | 'brush';

export const LocalAdjustmentsPanel: React.FC = () => {
  const [filterType, setFilterType] = useState<FilterType>('radial');
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [feather, setFeather] = useState(50);
  const [loading, setLoading] = useState(false);

  // Radial filter state
  const [radialCenter, setRadialCenter] = useState({ x: 0.5, y: 0.5 });
  const [radialRadius, setRadialRadius] = useState({ x: 0.3, y: 0.3 });
  const [radialInvert, setRadialInvert] = useState(false);

  // Gradient filter state
  const [gradientStart, setGradientStart] = useState({ x: 0.2, y: 0.2 });
  const [gradientEnd, setGradientEnd] = useState({ x: 0.8, y: 0.8 });

  const handleApplyFilter = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let body = {};

      if (filterType === 'radial') {
        endpoint = '/api/local-adjustments/radial';
        body = {
          image_path: '/path/to/image.jpg',
          center_x: radialCenter.x,
          center_y: radialCenter.y,
          radius_x: radialRadius.x,
          radius_y: radialRadius.y,
          feather,
          exposure,
          contrast,
          highlights,
          shadows,
          saturation,
          invert: radialInvert
        };
      } else if (filterType === 'gradient') {
        endpoint = '/api/local-adjustments/gradient';
        body = {
          image_path: '/path/to/image.jpg',
          start_x: gradientStart.x,
          start_y: gradientStart.y,
          end_x: gradientEnd.x,
          end_y: gradientEnd.y,
          feather,
          exposure,
          contrast,
          highlights,
          shadows,
          saturation
        };
      } else if (filterType === 'brush') {
        endpoint = '/api/local-adjustments/brush';
        body = {
          image_path: '/path/to/image.jpg',
          brush_strokes: [],
          brush_size: 50,
          feather,
          exposure,
          contrast,
          saturation,
          clarity
        };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      await response.json();
    } catch (error) {
      console.error('Error applying local adjustment:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetAdjustments = () => {
    setExposure(0);
    setContrast(0);
    setHighlights(0);
    setShadows(0);
    setSaturation(0);
    setClarity(0);
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Local Adjustments</h2>
        </div>

        {/* Filter Type Selection */}
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
          <TabsList className="w-full bg-gray-800 grid grid-cols-3">
            <TabsTrigger value="radial" className="data-[state=active]:bg-purple-600">
              <Circle className="w-4 h-4 mr-1" />
              Radial
            </TabsTrigger>
            <TabsTrigger value="gradient" className="data-[state=active]:bg-purple-600">
              <Move className="w-4 h-4 mr-1" />
              Gradient
            </TabsTrigger>
            <TabsTrigger value="brush" className="data-[state=active]:bg-purple-600">
              <Paintbrush className="w-4 h-4 mr-1" />
              Brush
            </TabsTrigger>
          </TabsList>

          <TabsContent value="radial" className="mt-4 space-y-3">
            <Card className="bg-gray-800 border-gray-700 p-3">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Filter Position</h4>
              <p className="text-xs text-gray-500">
                Draw on canvas to position and size radial filter
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="gradient" className="mt-4 space-y-3">
            <Card className="bg-gray-800 border-gray-700 p-3">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Filter Position</h4>
              <p className="text-xs text-gray-500">
                Draw on canvas to set gradient start and end points
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="brush" className="mt-4 space-y-3">
            <Card className="bg-gray-800 border-gray-700 p-3">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Brush Settings</h4>
              <p className="text-xs text-gray-500">
                Paint on canvas to apply adjustments selectively
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feather Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Feather</label>
            <span className="text-xs text-white">{feather}</span>
          </div>
          <Slider
            value={[feather]}
            onValueChange={(value) => setFeather(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Adjustment Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center justify-between">
            Adjustments
            <Button variant="ghost" size="sm" onClick={resetAdjustments} className="text-xs">
              Reset
            </Button>
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Exposure</label>
                <span className="text-xs text-white">{exposure > 0 ? '+' : ''}{exposure}</span>
              </div>
              <Slider
                value={[exposure]}
                onValueChange={(value) => setExposure(value[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Contrast</label>
                <span className="text-xs text-white">{contrast > 0 ? '+' : ''}{contrast}</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Highlights</label>
                <span className="text-xs text-white">{highlights > 0 ? '+' : ''}{highlights}</span>
              </div>
              <Slider
                value={[highlights]}
                onValueChange={(value) => setHighlights(value[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Shadows</label>
                <span className="text-xs text-white">{shadows > 0 ? '+' : ''}{shadows}</span>
              </div>
              <Slider
                value={[shadows]}
                onValueChange={(value) => setShadows(value[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Saturation</label>
                <span className="text-xs text-white">{saturation > 0 ? '+' : ''}{saturation}</span>
              </div>
              <Slider
                value={[saturation]}
                onValueChange={(value) => setSaturation(value[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            {filterType === 'brush' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Clarity</label>
                  <span className="text-xs text-white">{clarity > 0 ? '+' : ''}{clarity}</span>
                </div>
                <Slider
                  value={[clarity]}
                  onValueChange={(value) => setClarity(value[0])}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>
        </div>

        {/* Apply Button */}
        <Button
          onClick={handleApplyFilter}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? 'Applying...' : 'Apply Local Adjustment'}
        </Button>

        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400">
            Local adjustments let you selectively edit specific areas without affecting the entire image.
          </p>
        </div>
      </div>
    </div>
  );
};