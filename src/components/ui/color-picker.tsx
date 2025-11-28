import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const presetColors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#00FFFF', '#FF00FF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0', '#800000'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  selectedColor, 
  onColorChange 
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-3">
        <div className="flex flex-wrap gap-2">
          {presetColors.map((color) => (
            <Button
              key={color}
              variant="outline"
              size="icon"
              className="w-6 h-6 rounded-full p-0"
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
            >
              {selectedColor === color && (
                <div className="w-3 h-3 rounded-full bg-white" />
              )}
            </Button>
          ))}
        </div>
        
        <div className="mt-3">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-8 cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorPicker;