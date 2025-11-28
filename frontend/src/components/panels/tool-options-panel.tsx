import { SelectionTools } from '../tools/selection-tools';
import { BrushTool } from '../tools/brush-tool';
import { TextTool } from '../tools/text-tool';
import { ShapeTools } from '../tools/shape-tools';

interface ToolOptionsPanelProps {
  activeTool: string;
  onSelectionChange: (type: string) => void;
  onBrushChange: (settings: any) => void;
  onTextChange: (settings: any) => void;
  onShapeChange: (settings: any) => void;
}

export function ToolOptionsPanel({
  activeTool,
  onSelectionChange,
  onBrushChange,
  onTextChange,
  onShapeChange
}: ToolOptionsPanelProps) {
  const renderToolOptions = () => {
    switch (activeTool) {
      case 'selection':
        return <SelectionTools onSelectionChange={onSelectionChange} />;
      case 'brush':
        return <BrushTool onBrushChange={onBrushChange} />;
      case 'text':
        return <TextTool onTextChange={onTextChange} />;
      case 'shapes':
        return <ShapeTools onShapeChange={onShapeChange} />;
      default:
        return (
          <div className="p-4 text-center text-gray-500">
            Select a tool to see options
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
      {renderToolOptions()}
    </div>
  );
}