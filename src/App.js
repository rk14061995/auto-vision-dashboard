import React, { useState, useRef, useCallback } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import AISidebar from './components/AISidebar';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedCarPart, setSelectedCarPart] = useState(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const fileInputRef = useRef(null);

  // Memoize the callback functions to prevent infinite loops
  const handleSelection = useCallback((object) => {
    setSelectedObject(object);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedObject(null);
  }, []);

  // Handle car part selection
  const handleCarPartSelection = useCallback((carPart) => {
    setSelectedCarPart(carPart);
  }, []);

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && fabricCanvas) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          // Scale image to fit canvas
          const canvas = fabricCanvas;
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();
          
          const scaleX = canvasWidth / img.width;
          const scaleY = canvasHeight / img.height;
          const scale = Math.min(scaleX, scaleY);
          
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            selectable: false,
            evented: false,
            excludeFromExport: false
          });
          
          // Clear existing background and set new one
          canvas.clear();
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            backgroundImageOpacity: 1,
            backgroundImageStretch: false
          });
          
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Toolbar actions
  const handleDeleteSelected = () => {
    if (selectedObject && fabricCanvas) {
      fabricCanvas.remove(selectedObject);
      setSelectedObject(null);
    }
  };

  const handleRotateLeft = () => {
    if (selectedObject && fabricCanvas) {
      const angle = selectedObject.angle - 10;
      selectedObject.set('angle', angle);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateRight = () => {
    if (selectedObject && fabricCanvas) {
      const angle = selectedObject.angle + 10;
      selectedObject.set('angle', angle);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateZLeft = () => {
    if (selectedObject && fabricCanvas) {
      const skewX = (selectedObject.skewX || 0) - 5;
      selectedObject.set('skewX', skewX);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateZRight = () => {
    if (selectedObject && fabricCanvas) {
      const skewY = (selectedObject.skewY || 0) + 5;
      selectedObject.set('skewY', skewY);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomIn = () => {
    if (fabricCanvas) {
      const newZoom = Math.min(canvasZoom + 0.1, 2);
      setCanvasZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomOut = () => {
    if (fabricCanvas) {
      const newZoom = Math.max(canvasZoom - 0.1, 0.5);
      setCanvasZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleResetCanvas = () => {
    if (fabricCanvas) {
      setCanvasZoom(1);
      fabricCanvas.setZoom(1);
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      fabricCanvas.renderAll();
    }
  };

  const handleExport = () => {
    if (fabricCanvas) {
      // Reset zoom for export
      const currentZoom = fabricCanvas.getZoom();
      fabricCanvas.setZoom(1);
      fabricCanvas.renderAll();
      
      // Export as PNG
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2 // High quality export
      });
      
      // Download the image
      const link = document.createElement('a');
      link.download = 'customized-car.png';
      link.href = dataURL;
      link.click();
      
      // Restore zoom
      fabricCanvas.setZoom(currentZoom);
      fabricCanvas.renderAll();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Car Customization Tool</h1>
          <div className="header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="form-input"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="btn btn-primary">
              📤 Upload Car Image
            </label>
            <button onClick={handleExport} className="btn btn-success">
              💾 Export Image
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-main">
        {/* Left Sidebar - Custom Tools */}
        <Sidebar 
          fabricCanvas={fabricCanvas}
          selectedObject={selectedObject}
          onSelectCarPart={handleCarPartSelection}
        />

        {/* Canvas Container */}
        <div className="canvas-container">
          <Canvas
            setFabricCanvas={setFabricCanvas}
            onSelection={handleSelection}
            onClearSelection={handleClearSelection}
          />
        </div>

        {/* Right Sidebar - AI Tools */}
        <AISidebar 
          fabricCanvas={fabricCanvas}
          selectedObject={selectedObject}
          onSelectCarPart={handleCarPartSelection}
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        selectedObject={selectedObject}
        selectedCarPart={selectedCarPart}
        onDeleteSelected={handleDeleteSelected}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onRotateZLeft={handleRotateZLeft}
        onRotateZRight={handleRotateZRight}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetCanvas={handleResetCanvas}
        canvasZoom={canvasZoom}
        fabricCanvas={fabricCanvas}
      />
    </div>
  );
}

export default App;
