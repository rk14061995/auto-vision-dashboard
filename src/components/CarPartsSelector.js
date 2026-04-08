import React, { useState } from 'react';
import './CarPartsSelector.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const CarPartsSelector = ({ fabricCanvas, selectedObject, onSelectPart }) => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [isPartSelectionMode, setIsPartSelectionMode] = useState(false);

  // Define car parts with their approximate positions (relative to canvas)
  const carParts = [
    {
      id: 'hood',
      name: 'Hood',
      icon: '🚗',
      defaultPosition: { x: 0.5, y: 0.3, width: 0.3, height: 0.15 },
      color: '#ff0000'
    },
    {
      id: 'roof',
      name: 'Roof',
      icon: '🏠',
      defaultPosition: { x: 0.5, y: 0.25, width: 0.25, height: 0.2 },
      color: '#0000ff'
    },
    {
      id: 'a_pillar_left',
      name: 'A-Pillar (Left)',
      icon: '📍',
      defaultPosition: { x: 0.35, y: 0.35, width: 0.05, height: 0.15 },
      color: '#00ff00'
    },
    {
      id: 'a_pillar_right',
      name: 'A-Pillar (Right)',
      icon: '📍',
      defaultPosition: { x: 0.65, y: 0.35, width: 0.05, height: 0.15 },
      color: '#00ff00'
    },
    {
      id: 'b_pillar_left',
      name: 'B-Pillar (Left)',
      icon: '📍',
      defaultPosition: { x: 0.35, y: 0.5, width: 0.05, height: 0.15 },
      color: '#ffff00'
    },
    {
      id: 'b_pillar_right',
      name: 'B-Pillar (Right)',
      icon: '📍',
      defaultPosition: { x: 0.65, y: 0.5, width: 0.05, height: 0.15 },
      color: '#ffff00'
    },
    {
      id: 'door_left',
      name: 'Door (Left)',
      icon: '🚪',
      defaultPosition: { x: 0.25, y: 0.45, width: 0.15, height: 0.25 },
      color: '#ff00ff'
    },
    {
      id: 'door_right',
      name: 'Door (Right)',
      icon: '🚪',
      defaultPosition: { x: 0.6, y: 0.45, width: 0.15, height: 0.25 },
      color: '#ff00ff'
    },
    {
      id: 'trunk',
      name: 'Trunk',
      icon: '🧳',
      defaultPosition: { x: 0.5, y: 0.75, width: 0.25, height: 0.15 },
      color: '#00ffff'
    },
    {
      id: 'fender_left',
      name: 'Fender (Left)',
      icon: '🛡️',
      defaultPosition: { x: 0.15, y: 0.4, width: 0.1, height: 0.2 },
      color: '#ffa500'
    },
    {
      id: 'fender_right',
      name: 'Fender (Right)',
      icon: '🛡️',
      defaultPosition: { x: 0.75, y: 0.4, width: 0.1, height: 0.2 },
      color: '#ffa500'
    }
  ];

  // Create or update car part overlays on the canvas
  const createCarPartOverlays = () => {
    if (!fabricCanvas) return;

    // Clear existing part overlays
    const existingOverlays = fabricCanvas.getObjects().filter(obj => obj.carPartId);
    existingOverlays.forEach(obj => fabricCanvas.remove(obj));

    if (!isPartSelectionMode) {
      fabricCanvas.renderAll();
      return;
    }

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    carParts.forEach(part => {
      const { x, y, width, height } = part.defaultPosition;
      
      // Create a semi-transparent overlay for each car part
      const overlay = new fabric.Rect({
        left: x * canvasWidth - (width * canvasWidth) / 2,
        top: y * canvasHeight - (height * canvasHeight) / 2,
        width: width * canvasWidth,
        height: height * canvasHeight,
        fill: part.color + '40', // Add transparency
        stroke: part.color,
        strokeWidth: 2,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: 8,
        opacity: 0.6,
        carPartId: part.id, // Custom property to identify car parts
        carPartName: part.name
      });

      fabricCanvas.add(overlay);
    });

    fabricCanvas.renderAll();
  };

  // Toggle part selection mode
  const togglePartSelectionMode = () => {
    setIsPartSelectionMode(!isPartSelectionMode);
    if (!isPartSelectionMode) {
      createCarPartOverlays();
    } else {
      // Clear overlays when exiting part mode
      const existingOverlays = fabricCanvas.getObjects().filter(obj => obj.carPartId);
      existingOverlays.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
      setSelectedPart(null);
    }
  };

  // Handle canvas selection
  React.useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelectionCreated = (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.carPartId && isPartSelectionMode) {
        setSelectedPart(selected);
        onSelectPart(selected);
      }
    };

    const handleSelectionUpdated = (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.carPartId && isPartSelectionMode) {
        setSelectedPart(selected);
        onSelectPart(selected);
      } else if (!selected || !selected.carPartId) {
        setSelectedPart(null);
        onSelectPart(null);
      }
    };

    fabricCanvas.on('selection:created', handleSelectionCreated);
    fabricCanvas.on('selection:updated', handleSelectionUpdated);

    return () => {
      fabricCanvas.off('selection:created', handleSelectionCreated);
      fabricCanvas.off('selection:updated', handleSelectionUpdated);
    };
  }, [fabricCanvas, isPartSelectionMode, onSelectPart]);

  // Update overlays when mode changes
  React.useEffect(() => {
    createCarPartOverlays();
  }, [isPartSelectionMode]);

  return (
    <div className="car-parts-selector">
      <div className="selector-header">
        <h3 className="selector-title">Car Parts</h3>
        <button
          className={`mode-toggle ${isPartSelectionMode ? 'active' : ''}`}
          onClick={togglePartSelectionMode}
        >
          {isPartSelectionMode ? '🔧 Edit Mode' : '👁️ View Mode'}
        </button>
      </div>

      {isPartSelectionMode && (
        <div className="parts-list">
          <p className="parts-instruction">
            Click on any highlighted part to select it, then use color controls to paint
          </p>
          <div className="parts-grid">
            {carParts.map(part => (
              <div
                key={part.id}
                className={`part-item ${selectedPart?.carPartId === part.id ? 'selected' : ''}`}
                onClick={() => {
                  // Find and select the corresponding overlay
                  const overlay = fabricCanvas.getObjects().find(obj => obj.carPartId === part.id);
                  if (overlay) {
                    fabricCanvas.setActiveObject(overlay);
                    fabricCanvas.renderAll();
                    setSelectedPart(overlay);
                    onSelectPart(overlay);
                  }
                }}
              >
                <div className="part-icon">{part.icon}</div>
                <span className="part-name">{part.name}</span>
                <div 
                  className="part-color-indicator"
                  style={{ backgroundColor: part.color }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPart && isPartSelectionMode && (
        <div className="selected-part-info">
          <p className="selected-part-name">
            Selected: {selectedPart.carPartName}
          </p>
          <p className="selected-part-tip">
            Use the color controls in the toolbar to paint this part
          </p>
        </div>
      )}
    </div>
  );
};

export default CarPartsSelector;
