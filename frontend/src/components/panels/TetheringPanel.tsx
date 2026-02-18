import React, { useState, useEffect } from 'react';
import { Camera, Play, Square, Settings as SettingsIcon, Wifi } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface CameraDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  connection_type: string;
  battery_level?: number;
  storage_available?: number;
  is_connected: boolean;
}

interface CameraSettings {
  iso: number;
  aperture: string;
  shutter_speed: string;
  white_balance: string;
  image_format: string;
  quality: string;
}

export const TetheringPanel: React.FC = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [connectedCamera, setConnectedCamera] = useState<CameraDevice | null>(null);
  const [settings, setSettings] = useState<CameraSettings | null>(null);
  const [liveViewActive, setLiveViewActive] = useState(false);

  useEffect(() => {
    fetchAvailableCameras();
    fetchConnectedCameras();
  }, []);

  useEffect(() => {
    if (connectedCamera) {
      fetchCameraSettings();
    }
  }, [connectedCamera]);

  const fetchAvailableCameras = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tethering/cameras/available`);
      const data = await response.json();
      setCameras(data.cameras || []);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };

  const fetchConnectedCameras = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tethering/cameras/connected`);
      const data = await response.json();
      if (data.cameras && data.cameras.length > 0) {
        setConnectedCamera(data.cameras[0]);
      }
    } catch (error) {
      console.error('Error fetching connected cameras:', error);
    }
  };

  const fetchCameraSettings = async () => {
    if (!connectedCamera) return;
    try {
      const response = await fetch(`${API_URL}/api/tethering/cameras/${connectedCamera.id}/settings`);
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching camera settings:', error);
    }
  };

  const handleConnect = async (cameraId: string) => {
    try {
      await fetch(`${API_URL}/api/tethering/cameras/${cameraId}/connect`, {
        method: 'POST'
      });
      fetchConnectedCameras();
    } catch (error) {
      console.error('Error connecting camera:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedCamera) return;
    try {
      await fetch(`${API_URL}/api/tethering/cameras/${connectedCamera.id}/disconnect`, {
        method: 'POST'
      });
      setConnectedCamera(null);
      setSettings(null);
      setLiveViewActive(false);
    } catch (error) {
      console.error('Error disconnecting camera:', error);
    }
  };

  const handleCapture = async () => {
    if (!connectedCamera) return;
    try {
      await fetch(`${API_URL}/api/tethering/cameras/${connectedCamera.id}/capture`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleToggleLiveView = async () => {
    if (!connectedCamera) return;
    try {
      const endpoint = liveViewActive ? 'stop' : 'start';
      await fetch(`${API_URL}/api/tethering/cameras/${connectedCamera.id}/liveview/${endpoint}`, {
        method: 'POST'
      });
      setLiveViewActive(!liveViewActive);
    } catch (error) {
      console.error('Error toggling live view:', error);
    }
  };

  return (
    <div className="tethering-panel bg-gray-900 text-white p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Camera className="w-6 h-6" />
        Tethered Shooting
      </h2>

      {!connectedCamera ? (
        /* Camera Selection */
        <div className="space-y-3">
          <h3 className="font-semibold">Available Cameras</h3>
          {cameras.map(camera => (
            <div key={camera.id} className="bg-gray-800 p-3 rounded border border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{camera.name}</p>
                  <p className="text-sm text-gray-400">{camera.manufacturer} {camera.model}</p>
                  <p className="text-xs text-gray-500">{camera.connection_type}</p>
                </div>
                <button
                  onClick={() => handleConnect(camera.id)}
                  className="px-4 py-2 bg-blue-600 rounded flex items-center gap-2"
                >
                  <Wifi className="w-4 h-4" />
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Connected Camera Controls */
        <div className="flex-1 flex flex-col">
          {/* Camera Info */}
          <div className="bg-gray-800 p-3 rounded mb-4 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-medium">{connectedCamera.name}</p>
                <p className="text-sm text-gray-400">{connectedCamera.manufacturer}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 bg-red-600 rounded text-sm"
              >
                Disconnect
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {connectedCamera.battery_level && (
                <div>Battery: {connectedCamera.battery_level}%</div>
              )}
              {connectedCamera.storage_available && (
                <div>Storage: {(connectedCamera.storage_available / 1024).toFixed(1)} GB</div>
              )}
            </div>
          </div>

          {/* Live View */}
          <div className="flex-1 bg-black rounded mb-4 flex items-center justify-center">
            {liveViewActive ? (
              <div className="text-gray-500">Live View Active</div>
            ) : (
              <div className="text-gray-600">Live View Inactive</div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={handleToggleLiveView}
                className="flex-1 py-3 bg-gray-700 rounded flex items-center justify-center gap-2"
              >
                {liveViewActive ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {liveViewActive ? 'Stop' : 'Start'} Live View
              </button>
              <button
                onClick={handleCapture}
                className="flex-1 py-3 bg-blue-600 rounded flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
            </div>

            {/* Camera Settings */}
            {settings && (
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Camera Settings
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-gray-400">ISO</label>
                    <p>{settings.iso}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Aperture</label>
                    <p>{settings.aperture}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Shutter Speed</label>
                    <p>{settings.shutter_speed}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">White Balance</label>
                    <p>{settings.white_balance}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Format</label>
                    <p>{settings.image_format}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Quality</label>
                    <p>{settings.quality}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};