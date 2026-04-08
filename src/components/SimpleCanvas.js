import React from 'react';
import './SimpleCanvas.css';

const SimpleCanvas = () => {
  return (
    <div className="simple-canvas">
      <div className="canvas-placeholder">
        <h3>Canvas Area</h3>
        <p>Upload an image to get started</p>
        <div className="demo-box">
          This is where the canvas will appear
        </div>
      </div>
    </div>
  );
};

export default SimpleCanvas;
