import React from 'react';

interface ImageSelectorProps {
  images: { url: string; name: string }[];
  selectedUrl: string;
  onSelect: (url: string) => void;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ images, selectedUrl, onSelect }) => {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
      {images.map((img) => (
        <div
          key={img.url}
          style={{
            border: img.url === selectedUrl ? '2px solid #4f46e5' : '2px solid transparent',
            borderRadius: 4,
            cursor: 'pointer',
            padding: 2,
            background: '#18181b',
          }}
          onClick={() => onSelect(img.url)}
        >
          <img
            src={img.url}
            alt={img.name}
            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 2 }}
          />
          <div style={{ color: '#a1a1aa', fontSize: 12, textAlign: 'center', marginTop: 2 }}>{img.name}</div>
        </div>
      ))}
    </div>
  );
};

export default ImageSelector;
