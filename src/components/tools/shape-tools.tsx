import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Square, Circle, Minus, ArrowRight, Hexagon } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ShapeToolsProps {
  onShapeChange: (settings: any) => void;
}

export function ShapeTools({ onShapeChange }: ShapeToolsProps) {
  const [shapeSettings, setShapeSettings] = useState({
    type: 'rectangle',
    strokeColor: '#000000',
    fillColor: '#ffffff',
    strokeWidth: 2,
    fill: false
  });
  const [showStrokePicker, setShowStrokePicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);

  const updateShapeSetting = (key: string, value: any) => {
    const newSettings = { ...shapeSettings, [key]: value };
    setShapeSettings(newSettings);
    onShapeChange(newSettings);
  };

  const handleShapeSelect = (type: string) => {
    updateShapeSetting('type', type);
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <h3 className="text-sm font-medium">Shape Tools</h3>
      
      <div className="grid grid-cols-3 gap-1">
        <Button
          variant={shapeSettings.type === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShapeSelect('rectangle')}
          title="Rectangle"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant={shapeSettings.type === 'ellipse' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShapeSelect('ellipse')}
          title="Ellipse"
        >
          <Circle className="w-4 h-4" />
        </Button>
        <Button
          variant={shapeSettings.type === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShapeSelect('line')}
          title="Line"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant={shapeSettings.type === 'arrow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShapeSelect('arrow')}
          title="Arrow"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant={shapeSettings.type === 'polygon' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShapeSelect('polygon')}
          title="Polygon"
        >
          <Hexagon className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStrokePicker(!showStrokePicker)}
          style={{ backgroundColor: shapeSettings.strokeColor }}
          className="w-8 h-8 p-0 border border-gray-600"
        >
          <div className="w-4 h-4 bg-current rounded" />
        </Button>
        {showStrokePicker && (
          <ColorPicker
            color={shapeSettings.strokeColor}
            onChange={(color) => updateShapeSetting('strokeColor', color)}
          />
        )}
        <span className="text-xs">Stroke</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFillPicker(!showFillPicker)}
          style={{ backgroundColor: shapeSettings.fillColor }}
          className="w-8 h-8 p-0 border border-gray-600"
        >
          <div className="w-4 h-4 bg-current rounded" />
        </Button>
        {showFillPicker && (
          <ColorPicker
            color={shapeSettings.fillColor}
            onChange={(color) => updateShapeSetting('fillColor', color)}
          />
        )}
        <span className="text-xs">Fill</span>
        <input
          type="checkbox"
          checked={shapeSettings.fill}
          onChange={(e) => updateShapeSetting('fill', e.target.checked)}
          className="ml-2"
        />
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <Label htmlFor="stroke-width" className="text-xs">Stroke: {shapeSettings.strokeWidth}px</Label>
        </div>
        <Slider
          id="stroke-width"
          min={1}
          max={20}
          step={1}
          value={[shapeSettings.strokeWidth]}
          onValueChange={(value) => updateShapeSetting('strokeWidth', value[0])}
        />
      </div>
    </div>
  );
}