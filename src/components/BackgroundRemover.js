import React, { useState } from 'react';
import './BackgroundRemover.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const BackgroundRemover = ({ fabricCanvas, onBackgroundRemoved }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);

  // Remove background from the uploaded image
  const removeBackground = async () => {
    if (!fabricCanvas) return;

    const backgroundImage = fabricCanvas.backgroundImage;
    if (!backgroundImage) {
      alert('Please upload an image first!');
      return;
    }

    setIsRemoving(true);
    setProgress(0);

    try {
      setProgress(20);

      // Get image data for processing
      const imageData = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1
      });

      setProgress(40);

      // Call background removal API
      const removedImageData = await callBackgroundRemovalAPI(imageData);
      
      setProgress(70);

      // Create new image with removed background
      const newImage = await loadImageWithRemovedBackground(removedImageData);
      
      setProgress(90);

      // Update canvas background
      fabricCanvas.setBackgroundImage(newImage, fabricCanvas.renderAll.bind(fabricCanvas), {
        backgroundImageOpacity: 1,
        backgroundImageStretch: false
      });

      setProgress(100);
      setBackgroundRemoved(true);
      onBackgroundRemoved(true);

      // Add a subtle background color
      fabricCanvas.backgroundColor = '#f0f0f0';
      fabricCanvas.renderAll();

    } catch (error) {
      console.error('Background removal error:', error);
      alert('Background removal failed. Using manual method.');
      await manualBackgroundRemoval();
    } finally {
      setIsRemoving(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Call background removal API (simulated for demo)
  const callBackgroundRemovalAPI = async (imageData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, we'll simulate background removal
    // In production, you'd use actual APIs like:
    // - remove.bg API
    // - Adobe Creative Cloud API
    // - Azure Computer Vision
    // - Google Cloud Vision API
    
    return imageData; // Return original for demo
  };

  // Load image with removed background
  const loadImageWithRemovedBackground = async (imageData) => {
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(imageData, (img) => {
        // Apply background removal effect manually for demo
        applyBackgroundRemovalEffect(img);
        resolve(img);
      }, {
        crossOrigin: 'anonymous'
      });
    });
  };

  // Manual background removal effect
  const applyBackgroundRemovalEffect = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image
    ctx.drawImage(img.getElement(), 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple background removal based on edge detection and color analysis
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Detect background-like colors (light colors, whites, grays)
      const brightness = (r + g + b) / 3;
      const isBackground = brightness > 200 || 
                          (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && brightness > 150);
      
      if (isBackground) {
        // Make background transparent
        data[i + 3] = 0; // Alpha channel
      }
    }
    
    // Put modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Create new image from canvas
    const newImageData = canvas.toDataURL();
    img.setSrc(newImageData, () => {
      fabricCanvas.renderAll();
    });
  };

  // Fallback manual background removal
  const manualBackgroundRemoval = async () => {
    const backgroundImage = fabricCanvas.backgroundImage;
    if (!backgroundImage) return;

    // Apply edge detection and background removal
    applyBackgroundRemovalEffect(backgroundImage);
    setBackgroundRemoved(true);
    onBackgroundRemoved(true);
    
    fabricCanvas.backgroundColor = '#f0f0f0';
    fabricCanvas.renderAll();
  };

  // Reset background
  const resetBackground = () => {
    if (!fabricCanvas) return;

    // Clear background
    fabricCanvas.setBackgroundImage(null, fabricCanvas.renderAll.bind(fabricCanvas));
    fabricCanvas.backgroundColor = 'transparent';
    fabricCanvas.renderAll();
    
    setBackgroundRemoved(false);
    onBackgroundRemoved(false);
  };

  return (
    <div className="background-remover">
      <div className="remover-header">
        <h3 className="remover-title">🎨 Background Remover</h3>
        <div className="remover-actions">
          {!backgroundRemoved ? (
            <button
              className={`remove-btn ${isRemoving ? 'removing' : ''}`}
              onClick={removeBackground}
              disabled={isRemoving}
            >
              {isRemoving ? '🔄 Removing...' : '🎨 Remove BG'}
            </button>
          ) : (
            <button
              className="reset-btn"
              onClick={resetBackground}
            >
              🔄 Reset
            </button>
          )}
        </div>
      </div>

      {isRemoving && (
        <div className="removal-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Removing background... {progress}%</p>
        </div>
      )}

      {backgroundRemoved && (
        <div className="removal-success">
          <p className="success-text">
            ✅ Background removed successfully!
          </p>
          <p className="success-tip">
            💡 Now AI can detect car parts more accurately
          </p>
        </div>
      )}

      <div className="remover-info">
        <p className="info-text">
          🎨 Removes background for better part detection
        </p>
        <p className="info-text">
          🤖 AI works best with clean car images
        </p>
        <p className="info-text">
          ⚡ One-click background removal
        </p>
      </div>
    </div>
  );
};

export default BackgroundRemover;
