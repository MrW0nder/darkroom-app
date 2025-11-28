import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Palette } from 'lucide-react';
import ColorPicker from '../../components/ui/color-picker';
import { Slider } from '../../components/ui/slider';
import { Label } from '../../components/ui/label';

interface BrushToolProps {
  onBrushChange: (settings: { size: number; opacity: number; color: string }) => void;
}

export function BrushTool({ onBrushChange }: BrushToolProps) {
  const [brushSettings, setBrushSettings] = useState({
    size: 10,
    opacity: 100,
    color: '#000000'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const updateBrushSetting = (key: string, value: string | number) => {
    const newSettings = { ...brushSettings, [key]: value };
    setBrushSettings(newSettings);
    onBrushChange(newSettings);
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <h3 className="text-sm font-medium">Brush Tool</h3>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{ backgroundColor: brushSettings.color }}
          className="w-8 h-8 p-0 border border-gray-600"
        >
          <Palette className="w-4 h-4 text-white" />
        </Button>
        {showColorPicker && (
          <ColorPicker
            selectedColor={brushSettings.color}
            onColorChange={(color: string) => updateBrushSetting('color', color)}
          />
        )}
        <span className="text-xs">Color</span>
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <Label htmlFor="brush-size" className="text-xs">Size: {brushSettings.size}px</Label>
        </div>
        <Slider
          id="brush-size"
          min={1}
          max={100}
          step={1}
          value={[brushSettings.size]}
          onValueChange={(value: number[]) => updateBrushSetting('size', value[0])}
        />
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <Label htmlFor="brush-opacity" className="text-xs">Opacity: {brushSettings.opacity}%</Label>
        </div>
        <Slider
          id="brush-opacity"
          min={1}
          max={100}
          step={1}
          value={[brushSettings.opacity]}
          onValueChange={(value: number[]) => updateBrushSetting('opacity', value[0])}
        />
      </div>
    </div>
  );
}