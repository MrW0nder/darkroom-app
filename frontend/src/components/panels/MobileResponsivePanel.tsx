import React, { useState } from 'react';

interface DevicePreview {
  type: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export const MobileResponsivePanel: React.FC = () => {
  const [devicePreview, setDevicePreview] = useState<DevicePreview>({
    type: 'desktop',
    width: 1920,
    height: 1080,
    orientation: 'landscape'
  });

  const [touchGestures, setTouchGestures] = useState({
    pinchZoom: true,
    twoFingerPan: true,
    swipeNavigate: true,
    longPressMenu: true,
    doubleTapZoom: true
  });

  const devicePresets = [
    { type: 'mobile', name: 'iPhone 14 Pro', width: 393, height: 852 },
    { type: 'mobile', name: 'Samsung Galaxy S23', width: 360, height: 780 },
    { type: 'tablet', name: 'iPad Pro 11"', width: 834, height: 1194 },
    { type: 'tablet', name: 'iPad Air', width: 820, height: 1180 },
    { type: 'desktop', name: 'Full HD', width: 1920, height: 1080 },
    { type: 'desktop', name: '4K', width: 3840, height: 2160 }
  ];

  return (
    <div className="mobile-responsive-panel">
      <h2>Mobile & Responsive Settings</h2>
      
      <section>
        <h3>Device Preview</h3>
        <div className="device-selector">
          {devicePresets.map((device) => (
            <button
              key={device.name}
              onClick={() => setDevicePreview({
                type: device.type as any,
                width: device.width,
                height: device.height,
                orientation: 'portrait'
              })}
              className={devicePreview.width === device.width ? 'active' : ''}
            >
              {device.name}
            </button>
          ))}
        </div>
        
        <div className="device-info">
          <p>Type: {devicePreview.type}</p>
          <p>Resolution: {devicePreview.width} x {devicePreview.height}</p>
          <p>Orientation: {devicePreview.orientation}</p>
        </div>
      </section>

      <section>
        <h3>Touch Gestures</h3>
        <div className="gesture-settings">
          <label>
            <input
              type="checkbox"
              checked={touchGestures.pinchZoom}
              onChange={(e) => setTouchGestures({...touchGestures, pinchZoom: e.target.checked})}
            />
            Pinch to Zoom
          </label>
          <label>
            <input
              type="checkbox"
              checked={touchGestures.twoFingerPan}
              onChange={(e) => setTouchGestures({...touchGestures, twoFingerPan: e.target.checked})}
            />
            Two-Finger Pan
          </label>
          <label>
            <input
              type="checkbox"
              checked={touchGestures.swipeNavigate}
              onChange={(e) => setTouchGestures({...touchGestures, swipeNavigate: e.target.checked})}
            />
            Swipe to Navigate
          </label>
          <label>
            <input
              type="checkbox"
              checked={touchGestures.longPressMenu}
              onChange={(e) => setTouchGestures({...touchGestures, longPressMenu: e.target.checked})}
            />
            Long Press for Menu
          </label>
          <label>
            <input
              type="checkbox"
              checked={touchGestures.doubleTapZoom}
              onChange={(e) => setTouchGestures({...touchGestures, doubleTapZoom: e.target.checked})}
            />
            Double Tap to Zoom
          </label>
        </div>
      </section>

      <section>
        <h3>Responsive Breakpoints</h3>
        <div className="breakpoints">
          <div>Small (Mobile): &lt; 640px</div>
          <div>Medium (Tablet): 640px - 1024px</div>
          <div>Large (Desktop): 1024px - 1920px</div>
          <div>Extra Large (4K): &gt; 1920px</div>
        </div>
      </section>
    </div>
  );
};
