import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import ColorPicker from '../../components/ui/color-picker';
import { Slider } from '../../components/ui/slider';

interface TextToolProps {
  onTextChange: (settings: {
    content: string;
    fontSize: number;
    color: string;
    fontFamily: string;
  }) => void;
}

export function TextTool({ onTextChange }: TextToolProps) {
  const [textSettings, setTextSettings] = useState({
    content: 'Sample Text',
    fontSize: 24,
    color: '#000000',
    fontFamily: 'Arial'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const updateTextSetting = (key: string, value: string | number) => {
    const newSettings = { ...textSettings, [key]: value };
    setTextSettings(newSettings);
    onTextChange(newSettings);
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <h3 className="text-sm font-medium">Text Tool</h3>
      
      <div>
        <Label htmlFor="text-content" className="text-xs">Content</Label>
        <Input
          id="text-content"
          value={textSettings.content}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTextSetting('content', e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{ backgroundColor: textSettings.color }}
          className="w-8 h-8 p-0 border border-gray-600"
        >
          <div className="w-4 h-4 bg-current rounded" />
        </Button>
        {showColorPicker && (
          <ColorPicker
            selectedColor={textSettings.color}
            onColorChange={(color: string) => updateTextSetting('color', color)}
          />
        )}
        <span className="text-xs">Color</span>
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <Label htmlFor="font-size" className="text-xs">Size: {textSettings.fontSize}px</Label>
        </div>
        <Slider
          id="font-size"
          min={8}
          max={72}
          step={1}
          value={[textSettings.fontSize]}
          onValueChange={(value: number[]) => updateTextSetting('fontSize', value[0])}
        />
      </div>
      
      <div>
        <Label htmlFor="font-family" className="text-xs">Font</Label>
        <select
          id="font-family"
          value={textSettings.fontFamily}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateTextSetting('fontFamily', e.target.value)}
          className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="Arial">Arial</option>
          <option value="Verdana">Verdana</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>
    </div>
  );
}