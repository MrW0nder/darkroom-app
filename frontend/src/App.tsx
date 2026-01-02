import React, { useEffect, useState } from 'react';
import { listLayers, importImage, deleteLayer } from './api';

export default function App() {
    const [layers, setLayers] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Fetch layers on mount
    useEffect(() => {
        async function fetchLayers() {
            try {
                const layersData = await listLayers();
                console.log('Fetched Layers:', layersData); // Debug log for fetched layers
                setLayers(layersData);
            } catch (error) {
                console.error('Error fetching layers:', error);
            }
        }
        fetchLayers();
    }, []);

    // Handle file upload selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    // Handle file upload submission
    const handleFileUpload = async () => {
        if (selectedFile) {
            try {
                const result = await importImage(selectedFile);
                console.log('Image uploaded successfully:', result);
                setLayers((prevLayers) => [...prevLayers, result]); // Add the new layer to the list
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
    };

    // Handle layer deletion
    const handleDeleteLayer = async (layerId: number) => {
        try {
            await deleteLayer(layerId);
            setLayers((prevLayers) => prevLayers.filter((layer) => layer.id !== layerId));
        } catch (error) {
            console.error('Error deleting layer:', error);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Darkroom - Layer Manager</h1>

            <div>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleFileUpload} disabled={!selectedFile}>
                    Upload Image
                </button>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h2>Layers List</h2>
                {layers.length > 0 ? (
                    <ul>
                        {layers
                            .filter((layer) => layer.type === 'image' && layer.content) // Exclude invalid layers
                            .map((layer) => (
                                <li key={layer.id} style={{ marginBottom: '20px' }}>
                                    {layer.type}: {layer.content || 'No content'}
                                    <br />
                                    <img
                                        src={layer.content} // Display proper image file path
                                        alt={`Layer Preview`}
                                        style={{ width: 100, marginTop: 10 }}
                                    />
                                    <button
                                        onClick={() => handleDeleteLayer(layer.id)}
                                        style={{
                                            marginLeft: '10px',
                                            color: 'white',
                                            backgroundColor: 'red',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                    </ul>
                ) : (
                    <p>No layers available.</p>
                )}
            </div>
        </div>
    );
}