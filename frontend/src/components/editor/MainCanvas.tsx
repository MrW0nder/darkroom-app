import React from 'react';
import OpenSeadragonViewer from './OpenSeadragonViewer';

const MainCanvas = () => {
  const imageUrl = '/storage/originals/00c17ed63ba14647aedf6fcf4b8bb76e.JPG';
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}>
      <OpenSeadragonViewer imageUrl={imageUrl} width={800} height={600} />
    </div>
  );
};

export default MainCanvas;
