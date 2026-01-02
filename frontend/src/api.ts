import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // Backend API base URL
    timeout: 5000, // Request timeout in milliseconds
});

// Fetch the list of layers
export const listLayers = async () => {
    const response = await api.get('/layers');
    return response.data;
};

// Upload an image
export const importImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// Delete a layer
export const deleteLayer = async (layerId: number) => {
    const response = await api.delete(`/layers/${layerId}`);
    return response.data;
};