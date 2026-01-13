import { createRoot } from 'react-dom/client'; // Fix: Use named export from 'react-dom/client'
import App from './App.js'; // Added .js extension
import './index.css'; // Import for CSS

// Correctly initialize the app
createRoot(document.getElementById('root')!).render(<App />);