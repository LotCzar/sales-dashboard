import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js'; // 👈 make sure this line exists

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> {/* 👈 make sure this matches */}
  </React.StrictMode>
);