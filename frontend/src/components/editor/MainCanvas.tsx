import React from 'react';
import OpenSeadragonViewer from './OpenSeadragonViewer';

const MainCanvas = () => {
  const imageUrl = 'https://openseadragon.github.io/example-images/duomo/duomo.dzi';
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}>
      <OpenSeadragonViewer imageUrl={imageUrl} width={800} height={600} />
    </div>
  );
};

export default MainCanvas;
