export interface HistoryState {
  id: string;
  name: string;
  timestamp: number;
  data: any;
}

export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex = -1;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  addState(name: string, data: any): void {
    // Remove any future states if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    const state: HistoryState = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    };

    this.history.push(state);
    this.currentIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  undo(): HistoryState | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.history[this.currentIndex];
  }

  redo(): HistoryState | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.history[this.currentIndex];
  }

  getCurrentState(): HistoryState | null {
    if (this.currentIndex === -1) return null;
    return this.history[this.currentIndex];
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}