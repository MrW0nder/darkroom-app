import React, { useState } from 'react';
import { FileText, Edit2, Trash2, Save, X } from 'lucide-react';

interface MetadataField {
  label: string;
  key: string;
  value: string;
  editable: boolean;
}

export const MetadataPanel: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [metadata, setMetadata] = useState<MetadataField[]>([
    { label: 'File Name', key: 'filename', value: 'IMG_5432.jpg', editable: false },
    { label: 'File Size', key: 'size', value: '4.2 MB', editable: false },
    { label: 'Dimensions', key: 'dimensions', value: '3840 x 2160', editable: false },
    { label: 'Format', key: 'format', value: 'JPEG', editable: false },
    { label: 'Color Space', key: 'colorspace', value: 'sRGB', editable: false },
    { label: 'Title', key: 'title', value: 'Sunset Landscape', editable: true },
    { label: 'Description', key: 'description', value: 'Beautiful sunset over mountains', editable: true },
    { label: 'Keywords', key: 'keywords', value: 'sunset, landscape, nature', editable: true },
    { label: 'Copyright', key: 'copyright', value: '© 2024 Photographer', editable: true },
    { label: 'Camera', key: 'camera', value: 'Canon EOS R5', editable: false },
    { label: 'Lens', key: 'lens', value: 'RF 24-105mm F4L', editable: false },
    { label: 'Focal Length', key: 'focal', value: '50mm', editable: false },
    { label: 'Aperture', key: 'aperture', value: 'f/8', editable: false },
    { label: 'Shutter Speed', key: 'shutter', value: '1/250s', editable: false },
    { label: 'ISO', key: 'iso', value: '400', editable: false },
    { label: 'Date Taken', key: 'date', value: '2024-01-15 18:45:23', editable: false },
    { label: 'GPS Location', key: 'gps', value: '45.5231° N, 122.6765° W', editable: false },
    { label: 'Rating', key: 'rating', value: '4 stars', editable: true },
  ]);

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const handleEdit = (key: string, value: string) => {
    setEditedValues({ ...editedValues, [key]: value });
  };

  const handleSave = () => {
    // Update metadata with edited values
    setMetadata(
      metadata.map((field) =>
        editedValues[field.key]
          ? { ...field, value: editedValues[field.key] }
          : field
      )
    );
    setEditedValues({});
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedValues({});
    setIsEditing(false);
  };

  const handleStripMetadata = () => {
    if (confirm('Remove all metadata? This action cannot be undone.')) {
      // Strip all editable metadata
      setMetadata(
        metadata.map((field) =>
          field.editable ? { ...field, value: '' } : field
        )
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Metadata</h2>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleStripMetadata}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Strip All Metadata
        </button>
      </div>

      {/* Metadata Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* File Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">File Info</h3>
          {metadata.slice(0, 5).map((field) => (
            <MetadataField key={field.key} field={field} isEditing={false} onEdit={handleEdit} />
          ))}
        </div>

        {/* Editable Metadata */}
        <div className="space-y-2 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Description</h3>
          {metadata.slice(5, 9).map((field) => (
            <MetadataField
              key={field.key}
              field={field}
              isEditing={isEditing}
              onEdit={handleEdit}
              editedValue={editedValues[field.key]}
            />
          ))}
        </div>

        {/* Camera Settings */}
        <div className="space-y-2 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Camera Settings</h3>
          {metadata.slice(9, 16).map((field) => (
            <MetadataField key={field.key} field={field} isEditing={false} onEdit={handleEdit} />
          ))}
        </div>

        {/* Rating */}
        <div className="space-y-2 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Rating</h3>
          {metadata.slice(16).map((field) => (
            <MetadataField
              key={field.key}
              field={field}
              isEditing={isEditing}
              onEdit={handleEdit}
              editedValue={editedValues[field.key]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface MetadataFieldProps {
  field: MetadataField;
  isEditing: boolean;
  onEdit: (key: string, value: string) => void;
  editedValue?: string;
}

const MetadataField: React.FC<MetadataFieldProps> = ({
  field,
  isEditing,
  onEdit,
  editedValue,
}) => {
  const canEdit = isEditing && field.editable;
  const displayValue = editedValue !== undefined ? editedValue : field.value;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{field.label}</label>
      {canEdit ? (
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onEdit(field.key, e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
        />
      ) : (
        <div className="px-2 py-1 text-sm text-gray-200">{displayValue || '-'}</div>
      )}
    </div>
  );
};