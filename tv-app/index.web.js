import { createRoot } from 'react-dom/client';
import './global.css';
import App from './App';

// React 19 rendering API
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
