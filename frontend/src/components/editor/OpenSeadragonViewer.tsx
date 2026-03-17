import React, { useRef, useEffect } from 'react';
import OpenSeadragon from 'openseadragon';

const OpenSeadragonViewer = ({ imageUrl, width = 800, height = 600 }) => {
  const viewerRef = useRef(null);
  const osdInstance = useRef(null);

  useEffect(() => {
    if (viewerRef.current && imageUrl) {
      if (osdInstance.current) {
        osdInstance.current.destroy();
      }
      osdInstance.current = OpenSeadragon({
        element: viewerRef.current,
        tileSources: {
          type: 'image',
          url: imageUrl
        },
        showNavigator: true,
        minZoomLevel: 0.05,
        maxZoomLevel: 10,
        visibilityRatio: 1,
        constrainDuringPan: true,
        panHorizontal: true,
        panVertical: true,
        zoomPerScroll: 1.05,
        gestureSettingsMouse: {
          scrollToZoom: true,
          clickToZoom: false,
          dblClickToZoom: true,
          dragToPan: true,
        },
      });
      // Fit image to editor area on load
      osdInstance.current.addHandler('open', function() {
        osdInstance.current.viewport.goHome();
      });
    }
    return () => {
      if (osdInstance.current) {
        osdInstance.current.destroy();
        osdInstance.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div
      ref={viewerRef}
      style={{ width, height, background: '#222' }}
    />
  );
};

export default OpenSeadragonViewer;
