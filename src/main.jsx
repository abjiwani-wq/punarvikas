import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Inside the Android wrapper, printing goes through the native bridge.
if (window.AndroidBridge) {
  window.print = () => window.AndroidBridge.print();
  document.documentElement.classList.add('is-android');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
