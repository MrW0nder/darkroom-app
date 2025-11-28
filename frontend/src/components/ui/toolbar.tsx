import * as React from 'react';
import { Button } from './button';
import { Move, Crop, Square, Circle, Type, Brush, Eraser, Droplet } from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

const tools = [
  { id: 'move', name: 'Move', icon: Move },
  { id: 'crop', name: 'Crop', icon: Crop },
  { id: 'rectangle', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'brush', name: 'Brush', icon: Brush },
  { id: 'eraser', name: 'Eraser', icon: Eraser },
  { id: 'color-picker', name: 'Color Picker', icon: Droplet },
];

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
}: ToolbarProps) => {
  return (
    <div className="flex flex-col items-center p-2 bg-gray-800 border-r border-gray-700">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'default' : 'ghost'}
            size="icon"
            className="my-1"
            onClick={() => onToolSelect(tool.id)}
            title={tool.name}
          >
            <Icon className="w-5 h-5" />
          </Button>
        );
      })}
    </div>
  );
};

export default Toolbar;