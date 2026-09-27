import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AppErrorBoundary from './family-tree/components/AppErrorBoundary.jsx';
import './family-tree/familyTree.css';
import { initInstallPrompt, registerServiceWorker } from './family-tree/pwa/installPrompt.js';

initInstallPrompt();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
