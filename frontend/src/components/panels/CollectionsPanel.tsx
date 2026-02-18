import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Folder, Star, Tag, Flag, Plus, Trash2, Settings } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Collection {
  id: string;
  name: string;
  description?: string;
  type: 'regular' | 'smart';
  count?: number;
}

const COLOR_LABELS = [
  { value: 'red', color: 'bg-red-500', label: 'Red' },
  { value: 'yellow', color: 'bg-yellow-500', label: 'Yellow' },
  { value: 'green', color: 'bg-green-500', label: 'Green' },
  { value: 'blue', color: 'bg-blue-500', label: 'Blue' },
  { value: 'purple', color: 'bg-purple-500', label: 'Purple' }
];

export const CollectionsPanel: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionType, setCollectionType] = useState<'regular' | 'smart'>('regular');
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Image metadata state
  const [selectedImageId] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [colorLabel, setColorLabel] = useState<string>('');
  const [flag, setFlag] = useState<string>('none');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/collections/collections`);
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/collections/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName,
          type: collectionType,
          criteria: collectionType === 'smart' ? {} : null
        })
      });

      const data = await response.json();
      setCollections([...collections, data.collection]);
      setNewCollectionName('');
      setShowNewDialog(false);
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/collections/collections/${id}`, {
        method: 'DELETE'
      });
      setCollections(collections.filter(c => c.id !== id));
      if (selectedCollection === id) {
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const updateImageMetadata = async () => {
    try {
      await fetch(`${API_URL}/api/collections/images/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedImageId,
          file_path: `/path/to/image_${selectedImageId}.jpg`,
          rating,
          color_label: colorLabel || null,
          flag: flag !== 'none' ? flag : null,
          keywords
        })
      });
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Collections & Metadata</h2>
        </div>

        <Tabs defaultValue="collections" className="w-full">
          <TabsList className="w-full bg-gray-800 grid grid-cols-2">
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Collections Tab */}
          <TabsContent value="collections" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowNewDialog(!showNewDialog)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Collection
              </Button>
            </div>

            {showNewDialog && (
              <Card className="bg-gray-800 border-gray-700 p-4 space-y-3">
                <Input
                  placeholder="Collection name..."
                  value={newCollectionName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollectionName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Select value={collectionType} onValueChange={(value: any) => setCollectionType(value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="regular" className="text-white">Regular Collection</SelectItem>
                    <SelectItem value="smart" className="text-white">Smart Collection</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={createCollection} className="flex-1 bg-green-600 hover:bg-green-700">
                    Create
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNewDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {collections.map((collection) => (
                <Card
                  key={collection.id}
                  className={`bg-gray-800 border-gray-700 p-3 cursor-pointer hover:bg-gray-750 ${
                    selectedCollection === collection.id ? 'ring-2 ring-yellow-500' : ''
                  }`}
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white">{collection.name}</span>
                      {collection.type === 'smart' && (
                        <Settings className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        deleteCollection(collection.id);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {collection.count !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">{collection.count} images</p>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="mt-4 space-y-4">
            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                      }`}
                    />
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Labels */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Color Label</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_LABELS.map((label) => (
                  <Button
                    key={label.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setColorLabel(colorLabel === label.value ? '' : label.value)}
                    className={`w-8 h-8 rounded-full ${label.color} ${
                      colorLabel === label.value ? 'ring-2 ring-white' : 'opacity-50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Flag */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Flag</label>
              <div className="flex gap-2">
                <Button
                  variant={flag === 'pick' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFlag(flag === 'pick' ? 'none' : 'pick')}
                  className="flex-1"
                >
                  <Flag className="w-4 h-4 mr-2 text-green-400" />
                  Pick
                </Button>
                <Button
                  variant={flag === 'reject' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFlag(flag === 'reject' ? 'none' : 'reject')}
                  className="flex-1"
                >
                  <Flag className="w-4 h-4 mr-2 text-red-400" />
                  Reject
                </Button>
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Keywords</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword..."
                  value={newKeyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKeyword(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addKeyword()}
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                />
                <Button onClick={addKeyword} size="sm">
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-800 text-xs text-white rounded-full flex items-center gap-1"
                  >
                    {keyword}
                    <button
                      onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={updateImageMetadata}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Save Metadata
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};