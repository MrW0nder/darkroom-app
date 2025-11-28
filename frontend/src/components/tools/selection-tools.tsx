import { useState } from 'react';
import { Button } from '../../components/ui/button'; // <-- Fixed path!
import { Square, Circle, Scissors } from 'lucide-react';

interface SelectionToolsProps {
  onSelectionChange: (type: string) => void;
}

export function SelectionTools({ onSelectionChange }: SelectionToolsProps) {
  const [activeTool, setActiveTool] = useState<string>('none');

  const handleToolSelect = (tool: string) => {
    const newTool = activeTool === tool ? 'none' : tool;
    setActiveTool(newTool);
    onSelectionChange(newTool);
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <h3 className="text-sm font-medium">Selection Tools</h3>
      <div className="flex gap-1">
        <Button
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('rectangle')}
          title="Rectangle Selection"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'ellipse' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('ellipse')}
          title="Ellipse Selection"
        >
          <Circle className="w-4 h-4" />
        </Button>
        <Button
          variant={activeTool === 'lasso' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('lasso')}
          title="Lasso Selection"
        >
          <Scissors className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}