import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Zap } from 'lucide-react';

type SharpenMode = 'capture' | 'creative' | 'output';

export const AdvancedSharpeningPanel: React.FC = () => {
  const [mode, setMode] = useState<SharpenMode>('capture');
  const [amount, setAmount] = useState(50);
  const [radius, setRadius] = useState(1.0);
  const [detail, setDetail] = useState(25);
  const [masking, setMasking] = useState(0);
  
  const [luminance, setLuminance] = useState(50);
  const [color, setColor] = useState(25);
  const [noiseDetail, setNoiseDetail] = useState(50);
  const [contrast, setContrast] = useState(0);
  const [smoothness, setSmoothness] = useState(50);
  
  const [loading, setLoading] = useState(false);

  const handleApplySharpening = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/advanced-sharpening/sharpen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: '/path/to/image.jpg',
          mode,
          amount,
          radius,
          detail,
          masking
        })
      });
      
      const data = await response.json();
      console.log('Sharpening applied:', data);
    } catch (error) {
      console.error('Error applying sharpening:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyNoiseReduction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/advanced-sharpening/denoise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: '/path/to/image.jpg',
          luminance,
          color,
          detail: noiseDetail,
          contrast,
          smoothness
        })
      });
      
      const data = await response.json();
      console.log('Noise reduction applied:', data);
    } catch (error) {
      console.error('Error applying noise reduction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Sharpening & Noise Reduction</h2>
        </div>

        <Tabs defaultValue="sharpening" className="w-full">
          <TabsList className="w-full bg-gray-800 grid grid-cols-2">
            <TabsTrigger value="sharpening">Sharpening</TabsTrigger>
            <TabsTrigger value="noise">Noise Reduction</TabsTrigger>
          </TabsList>

          {/* Sharpening Tab */}
          <TabsContent value="sharpening" className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Sharpening Mode</label>
              <Select value={mode} onValueChange={(value: string) => setMode(value as SharpenMode)}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="capture" className="text-white">
                    Capture (RAW/Input)
                  </SelectItem>
                  <SelectItem value="creative" className="text-white">
                    Creative (Artistic)
                  </SelectItem>
                  <SelectItem value="output" className="text-white">
                    Output (Export)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {mode === 'capture' && 'Corrects lens/sensor blur from RAW files'}
                {mode === 'creative' && 'Aggressive sharpening for artistic effects'}
                {mode === 'output' && 'Final sharpening for print/screen'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Amount</label>
                  <span className="text-xs text-white">{amount}</span>
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={(value: number[]) => setAmount(value[0])}
                  min={0}
                  max={150}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Radius</label>
                  <span className="text-xs text-white">{radius.toFixed(1)}</span>
                </div>
                <Slider
                  value={[radius * 10]}
                  onValueChange={(value: number[]) => setRadius(value[0] / 10)}
                  min={1}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Detail</label>
                  <span className="text-xs text-white">{detail}</span>
                </div>
                <Slider
                  value={[detail]}
                  onValueChange={(value: number[]) => setDetail(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Masking</label>
                  <span className="text-xs text-white">{masking}</span>
                </div>
                <Slider
                  value={[masking]}
                  onValueChange={(value: number[]) => setMasking(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-gray-500">Higher values = sharpen edges only</p>
              </div>
            </div>

            <Button
              onClick={handleApplySharpening}
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? 'Processing...' : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Apply Sharpening
                </>
              )}
            </Button>
          </TabsContent>

          {/* Noise Reduction Tab */}
          <TabsContent value="noise" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Luminance</label>
                  <span className="text-xs text-white">{luminance}</span>
                </div>
                <Slider
                  value={[luminance]}
                  onValueChange={(value: number[]) => setLuminance(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-gray-500">Reduce grainy noise in brightness</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Color</label>
                  <span className="text-xs text-white">{color}</span>
                </div>
                <Slider
                  value={[color]}
                  onValueChange={(value: number[]) => setColor(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-gray-500">Reduce color speckles</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Detail</label>
                  <span className="text-xs text-white">{noiseDetail}</span>
                </div>
                <Slider
                  value={[noiseDetail]}
                  onValueChange={(value: number[]) => setNoiseDetail(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-gray-500">Preserve fine details</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Contrast</label>
                  <span className="text-xs text-white">{contrast > 0 ? '+' : ''}{contrast}</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={(value: number[]) => setContrast(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-gray-500">Restore contrast lost in denoising</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Smoothness</label>
                  <span className="text-xs text-white">{smoothness}</span>
                </div>
                <Slider
                  value={[smoothness]}
                  onValueChange={(value: number[]) => setSmoothness(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <Button
              onClick={handleApplyNoiseReduction}
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? 'Processing...' : 'Apply Noise Reduction'}
            </Button>
          </TabsContent>
        </Tabs>

        <Card className="bg-gray-800 border-gray-700 p-3">
          <p className="text-xs text-gray-400">
            <strong className="text-white">Sharpening</strong> enhances edges and details. Use capture sharpening for RAW files, 
            creative for artistic effects, and output sharpening just before export.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            <strong className="text-white">Noise Reduction</strong> removes grain from high-ISO or low-light photos while 
            preserving important details.
          </p>
        </Card>
      </div>
    </div>
  );
};