import React from 'react';
import './App.css';

function AppDebug() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Car Customization Tool - Debug Mode</h1>
        </div>
      </header>
      <div className="app-main">
        <div style={{ padding: '20px', background: 'white', margin: '20px', borderRadius: '8px' }}>
          <h2>Debug Information</h2>
          <p>If you can see this, React is working correctly.</p>
          <p>The issue is likely with Fabric.js or one of the components.</p>
        </div>
      </div>
    </div>
  );
}

export default AppDebug;
