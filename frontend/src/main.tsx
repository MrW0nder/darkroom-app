import { createRoot } from 'react-dom/client'; // Fix: Use named export from 'react-dom/client'
import App from './App';
import './index.css';

// Correctly initialize the app
createRoot(document.getElementById('root')!).render(<App />);