export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: 'image' | 'text' | 'shape';
  data: any; // Layer-specific data
}

export class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId: string | null = null;

  createLayer(
    name: string,
    type: Layer['type'] = 'image',
    data: any = null
  ): Layer {
    const layer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      visible: true,
      locked: false,
      opacity: 100,
      type,
      data
    };

    this.layers.push(layer);
    this.activeLayerId = layer.id;
    return layer;
  }

  deleteLayer(id: string): boolean {
    const index = this.layers.findIndex(layer => layer.id === id);
    if (index === -1) return false;

    this.layers.splice(index, 1);

    // Update active layer if needed
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers.length > 0 
        ? this.layers[Math.max(0, index - 1)].id 
        : null;
    }

    return true;
  }

  getLayers(): Layer[] {
    return [...this.layers]; // Return a copy
  }

  getActiveLayer(): Layer | null {
    if (!this.activeLayerId) return null;
    return this.layers.find(layer => layer.id === this.activeLayerId) || null;
  }

  setActiveLayer(id: string): boolean {
    const layer = this.layers.find(layer => layer.id === id);
    if (!layer) return false;
    
    this.activeLayerId = id;
    return true;
  }

  updateLayer(id: string, updates: Partial<Layer>): boolean {
    const layer = this.layers.find(layer => layer.id === id);
    if (!layer) return false;
    
    Object.assign(layer, updates);
    return true;
  }

  toggleLayerVisibility(id: string): boolean {
    const layer = this.layers.find(layer => layer.id === id);
    if (!layer) return false;
    
    layer.visible = !layer.visible;
    return true;
  }

  toggleLayerLock(id: string): boolean {
    const layer = this.layers.find(layer => layer.id === id);
    if (!layer) return false;
    
    layer.locked = !layer.locked;
    return true;
  }

  moveLayerUp(id: string): boolean {
    const index = this.layers.findIndex(layer => layer.id === id);
    if (index === -1 || index === 0) return false;

    // Swap with previous layer
    [this.layers[index], this.layers[index - 1]] = 
      [this.layers[index - 1], this.layers[index]];
    
    return true;
  }

  moveLayerDown(id: string): boolean {
    const index = this.layers.findIndex(layer => layer.id === id);
    if (index === -1 || index === this.layers.length - 1) return false;

    // Swap with next layer
    [this.layers[index], this.layers[index + 1]] = 
      [this.layers[index + 1], this.layers[index]];
    
    return true;
  }
}