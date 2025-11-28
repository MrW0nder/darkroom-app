import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerVisibilityToggle: (id: string) => void;
  onLayerLockToggle: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onAddLayer,
  onDeleteLayer
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700 w-64">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-sm">Layers</CardTitle>
        <Button variant="ghost" size="icon" onClick={onAddLayer}>
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {layers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No layers yet
            </div>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center p-2 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 ${
                  activeLayerId === layer.id ? 'bg-gray-700' : ''
                }`}
                onClick={() => onLayerSelect(layer.id)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerVisibilityToggle(layer.id);
                  }}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{layer.name}</div>
                  <div className="text-xs text-gray-400">
                    Opacity: {layer.opacity}%
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerLockToggle(layer.id);
                  }}
                >
                  {layer.locked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LayersPanel;