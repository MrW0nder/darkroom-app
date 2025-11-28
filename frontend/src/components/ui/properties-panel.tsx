import { Label } from "./label";
import { Slider } from "./slider";
import { Button } from "./button";
import { RotateCcw } from "lucide-react";

interface AdjustmentProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

const AdjustmentControl = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange,
  unit = ""
}: AdjustmentProps) => (
  <div>
    <div className="flex justify-between mb-1">
      <Label htmlFor={label.toLowerCase()} className="text-xs">{label}</Label>
      <span className="text-xs text-gray-400">{value}{unit}</span>
    </div>
    <Slider
      id={label.toLowerCase()}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(val: number[]) => onChange(val[0])}
      className="w-full"
    />
  </div>
);

interface PropertiesPanelProps {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  vibrance: number;
  sharpness: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onHueChange: (value: number) => void;
  onVibranceChange: (value: number) => void;
  onSharpnessChange: (value: number) => void;
  onReset?: () => void;
  onApplyPreset?: (preset: string) => void;
}

export default function PropertiesPanel({
  brightness,
  contrast,
  saturation,
  hue,
  vibrance,
  sharpness,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onHueChange,
  onVibranceChange,
  onSharpnessChange,
  onReset,
  onApplyPreset
}: PropertiesPanelProps) {
  const presets = [
    { id: "vintage", name: "Vintage" },
    { id: "blackAndWhite", name: "Black & White" },
    { id: "highContrast", name: "High Contrast" },
    { id: "warm", name: "Warm" },
    { id: "cool", name: "Cool" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Adjustments</h3>
        {onReset && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReset}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset All
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        <AdjustmentControl
          label="Brightness"
          value={brightness}
          min={0}
          max={200}
          step={1}
          onChange={onBrightnessChange}
          unit="%"
        />
        
        <AdjustmentControl
          label="Contrast"
          value={contrast}
          min={0}
          max={200}
          step={1}
          onChange={onContrastChange}
          unit="%"
        />
        
        <AdjustmentControl
          label="Saturation"
          value={saturation}
          min={0}
          max={200}
          step={1}
          onChange={onSaturationChange}
          unit="%"
        />
        
        <AdjustmentControl
          label="Hue"
          value={hue}
          min={-180}
          max={180}
          step={1}
          onChange={onHueChange}
          unit="°"
        />
        
        <AdjustmentControl
          label="Vibrance"
          value={vibrance}
          min={-100}
          max={100}
          step={1}
          onChange={onVibranceChange}
          unit="%"
        />
        
        <AdjustmentControl
          label="Sharpness"
          value={sharpness}
          min={0}
          max={200}
          step={1}
          onChange={onSharpnessChange}
          unit="%"
        />
      </div>
      
      <div className="space-y-3">
        <h3 className="font-medium">Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onApplyPreset?.(preset.id)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}