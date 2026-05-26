import React, { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

interface OpenSeadragonViewerProps {
  imageUrl: string;
  width: number;
  height: number;
  recenterNonce?: number;
  resetZoomNonce?: number;
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    highlights: number;
    shadows: number;
    sharpness: number;
  };
}

const OpenSeadragonViewer: React.FC<OpenSeadragonViewerProps> = ({
  imageUrl,
  width,
  height,
  recenterNonce,
  resetZoomNonce,
  adjustments
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdViewerRef = useRef<any>(null);
  const initialViewportRef = useRef<any>(null);

  // Apply adjustments using CSS filters (simplified approach)
  useEffect(() => {
    if (!osdViewerRef.current || !adjustments) return;

    // Find the actual image canvas element within OpenSeadragon
    const viewerElement = osdViewerRef.current.element;
    if (!viewerElement) return;

    const canvas = viewerElement.querySelector('canvas');
    if (!canvas) return;

    // Convert adjustments to CSS filter values
    const brightness = 100 + (adjustments.brightness * 2); // -50 to +50 becomes 0% to 200%
    const contrast = 100 + (adjustments.contrast * 2); // -50 to +50 becomes 0% to 200%
    const saturation = 100 + (adjustments.saturation * 2); // -50 to +50 becomes 0% to 200%
    
    // Enhanced exposure effect
    const exposureEffect = Math.pow(2, adjustments.exposure / 25); // Convert to stops
    const exposureBrightness = 100 * exposureEffect;
    
    // Simulate highlights and shadows with brightness and contrast adjustments
    let highlightEffect = 1;
    let shadowEffect = 1;
    
    // Highlights affect the overall brightness when positive, reduce when negative
    if (adjustments.highlights !== 0) {
      highlightEffect = 1 + (adjustments.highlights / 50); // More subtle effect
    }
    
    // Shadows affect the darker areas - simulate with brightness
    if (adjustments.shadows !== 0) {
      shadowEffect = 1 + (adjustments.shadows / 50); // More subtle effect
    }
    
    // Combine all brightness effects
    const finalBrightness = Math.max(10, brightness * highlightEffect * shadowEffect + (exposureBrightness - 100));
    
    // Highlights also affect contrast
    const finalContrast = Math.max(10, contrast + (Math.abs(adjustments.highlights) * 0.5));
    
    // Handle sharpness
    let sharpnessFilter = '';
    if (adjustments.sharpness !== 1.0) {
      if (adjustments.sharpness > 1.0) {
        // Increase sharpness with contrast and slight filter
        const sharpnessAmount = (adjustments.sharpness - 1.0) * 20;
        sharpnessFilter = `contrast(${100 + sharpnessAmount}%)`;
      } else if (adjustments.sharpness < 1.0) {
        // Decrease sharpness with blur
        const blurAmount = (1.0 - adjustments.sharpness) * 1.5;
        sharpnessFilter = `blur(${blurAmount}px)`;
      }
    }

    // Create comprehensive filter string
    const filterParts = [
      `brightness(${Math.round(finalBrightness)}%)`,
      `contrast(${Math.round(finalContrast)}%)`,
      `saturate(${Math.round(saturation)}%)`
    ];

    if (sharpnessFilter) {
      filterParts.push(sharpnessFilter);
    }

    const filterString = filterParts.join(' ');

    // Apply filter to the canvas
    canvas.style.filter = filterString;
    canvas.style.transition = 'filter 0.1s ease-out';
    
  }, [adjustments]);

  // Handle recenter requests
  useEffect(() => {
    if (recenterNonce && osdViewerRef.current) {
      // Reset zoom to fit the entire image and center it
      osdViewerRef.current.viewport.goHome(true);
    }
  }, [recenterNonce]);

  // Handle reset to original zoom requests
  useEffect(() => {
    if (resetZoomNonce && osdViewerRef.current && initialViewportRef.current) {
      const viewport = osdViewerRef.current.viewport;
      viewport.fitBounds(initialViewportRef.current.bounds, true);
    }
  }, [resetZoomNonce]);

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    if (!viewerRef.current || !imageUrl) return;

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      tileSources: {
        type: 'image',
        url: imageUrl,
        crossOriginPolicy: 'Anonymous',
        ajaxWithCredentials: false,
      } as any,
      prefixUrl: '/openseadragon-images/',
      animationTime: 0.5,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 2,
      minZoomLevel: 0.1,
      maxZoomLevel: 10,
      zoomInButton: null,
      zoomOutButton: null,
      homeButton: null,
      fullPageButton: null,
      nextButton: null,
      previousButton: null,
      rotateLeftButton: null,
      rotateRightButton: null,
      flipButton: null,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      navigatorSizeRatio: 0.15,
      navigatorMaintainSizeRatio: true,
      navigatorBackground: '#1f2937',
      navigatorBorderColor: '#374151',
      navigatorDisplayRegionColor: '#3b82f6',
      navigatorOpacity: 0.9,
      navigatorAutoResize: true,
      loadTilesWithAjax: true,
      crossOriginPolicy: 'Anonymous',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Store viewer reference for recenter functionality
    osdViewerRef.current = viewer;

    // Add error handling for image loading
    viewer.addHandler('open-failed', function(event) {
      console.error('OpenSeadragon failed to open image:', event);
    });

    viewer.addHandler('tile-load-failed', function(event) {
      console.error('OpenSeadragon tile load failed:', event);
    });

    // Ensure navigator updates properly and add hover effects
    viewer.addHandler('open', function() {
      setTimeout(() => {
        // Store the initial "fit to screen" viewport state
        if (viewer.viewport) {
          initialViewportRef.current = {
            bounds: viewer.viewport.getBounds(),
            zoom: viewer.viewport.getZoom(),
            center: viewer.viewport.getCenter()
          };
        }

        if (viewer.navigator && viewer.navigator.element) {
          const navigatorEl = viewer.navigator.element;
          
          navigatorEl.style.border = '1px solid #374151';
          navigatorEl.style.borderRadius = '4px';
          navigatorEl.style.transition = 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out';
          navigatorEl.style.transformOrigin = 'bottom right';
          navigatorEl.style.cursor = 'pointer';
          navigatorEl.style.zIndex = '1000';
          
          navigatorEl.addEventListener('mouseenter', function() {
            navigatorEl.style.transform = 'scale(1.5)';
            navigatorEl.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.5)';
            navigatorEl.style.borderColor = '#3b82f6';
          });
          
          navigatorEl.addEventListener('mouseleave', function() {
            navigatorEl.style.transform = 'scale(1)';
            navigatorEl.style.boxShadow = 'none';
            navigatorEl.style.borderColor = '#374151';
          });
        }
      }, 100);
    });

    return () => {
      if (osdViewerRef.current) {
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
    };
  }, [imageUrl, width, height]);

  return (
    <div 
      ref={viewerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minWidth: width,
        minHeight: height
      }} 
    />
  );
};

export default OpenSeadragonViewer;
