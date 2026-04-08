import React, { useState } from 'react';
import './Toolbar.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const Toolbar = ({
  selectedObject,
  onDeleteSelected,
  onRotateLeft,
  onRotateRight,
  onRotateZLeft,
  onRotateZRight,
  onZoomIn,
  onZoomOut,
  onResetCanvas,
  canvasZoom,
  fabricCanvas,
  selectedCarPart
}) => {
  const [fillColor, setFillColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('#000000');

  // Update color values when object is selected
  React.useEffect(() => {
    if (selectedCarPart && selectedCarPart.carPartId) {
      // If a car part is selected, use its color
      setFillColor(selectedCarPart.fill || '#000000');
      setStrokeColor(selectedCarPart.stroke || '#000000');
    } else if (selectedObject) {
      // Get fill color - for text it's 'fill', for images it might be different
      if (selectedObject.type === 'text') {
        setFillColor(selectedObject.fill || '#000000');
      } else if (selectedObject.type === 'image') {
        // For images, we can apply a tint or filter
        setFillColor('#000000');
      } else {
        // For other objects (shapes, etc.)
        setFillColor(selectedObject.fill || '#000000');
      }
      
      // Get stroke color
      setStrokeColor(selectedObject.stroke || '#000000');
    }
  }, [selectedObject, selectedCarPart]);

  // Handle fill color change
  const handleFillColorChange = (color) => {
    setFillColor(color);
    if (selectedCarPart && selectedCarPart.carPartId && fabricCanvas) {
      // Apply color to car part
      selectedCarPart.set('fill', color + '80'); // Add transparency
      selectedCarPart.set('stroke', color);
      fabricCanvas.renderAll();

      window.dispatchEvent(
        new CustomEvent('carPartColorChanged', {
          detail: {
            carPartId: selectedCarPart.carPartId,
            type: 'fill',
            color
          }
        })
      );
    } else if (selectedObject && fabricCanvas) {
      if (selectedObject.type === 'text') {
        selectedObject.set('fill', color);
        selectedObject.set('stroke', color); // Also update stroke for text
      } else if (selectedObject.type === 'image') {
        // Apply color tint to image using filter
        selectedObject.applyFilters([
          new fabric.Image.ColorFilter({
            color: color,
            alpha: 0.5
          })
        ]);
      } else {
        selectedObject.set('fill', color);
      }
      fabricCanvas.renderAll();

      if (selectedObject && selectedObject.carPartId) {
        window.dispatchEvent(
          new CustomEvent('carPartColorChanged', {
            detail: {
              carPartId: selectedObject.carPartId,
              type: 'fill',
              color
            }
          })
        );
      }
    }
  };

  // Handle stroke color change
  const handleStrokeColorChange = (color) => {
    setStrokeColor(color);
    if (selectedCarPart && selectedCarPart.carPartId && fabricCanvas) {
      // Apply stroke color to car part
      selectedCarPart.set('stroke', color);
      selectedCarPart.set('strokeWidth', 3);
      fabricCanvas.renderAll();

      window.dispatchEvent(
        new CustomEvent('carPartColorChanged', {
          detail: {
            carPartId: selectedCarPart.carPartId,
            type: 'stroke',
            color
          }
        })
      );
    } else if (selectedObject && fabricCanvas) {
      selectedObject.set('stroke', color);
      selectedObject.set('strokeWidth', selectedObject.strokeWidth || 2);
      fabricCanvas.renderAll();

      if (selectedObject && selectedObject.carPartId) {
        window.dispatchEvent(
          new CustomEvent('carPartColorChanged', {
            detail: {
              carPartId: selectedObject.carPartId,
              type: 'stroke',
              color
            }
          })
        );
      }
    }
  };
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Object Controls</h4>
        <div className="toolbar-controls">
          <button
            className="btn-icon"
            onClick={onDeleteSelected}
            disabled={!selectedObject}
            title="Delete Selected (Delete)"
          >
            🗑️
          </button>
          <button
            className="btn-icon"
            onClick={onRotateLeft}
            disabled={!selectedObject}
            title="Rotate Left (L)"
          >
            ↺
          </button>
          <button
            className="btn-icon"
            onClick={onRotateRight}
            disabled={!selectedObject}
            title="Rotate Right (R)"
          >
            ↻
          </button>
          <div className="toolbar-divider"></div>
          <button
            className="btn-icon"
            onClick={onRotateZLeft}
            disabled={!selectedObject}
            title="3D Rotate Left (Skew X)"
          >
            ↙️
          </button>
          <button
            className="btn-icon"
            onClick={onRotateZRight}
            disabled={!selectedObject}
            title="3D Rotate Right (Skew Y)"
          >
            ↘️
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Canvas Controls</h4>
        <div className="toolbar-controls">
          <button
            className="btn-icon"
            onClick={onZoomIn}
            title="Zoom In (+)"
          >
            🔍+
          </button>
          <button
            className="btn-icon"
            onClick={onZoomOut}
            title="Zoom Out (-)"
          >
            🔍-
          </button>
          <button
            className="btn-icon"
            onClick={onResetCanvas}
            title="Reset View (0)"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Zoom Level</h4>
        <div className="zoom-display">
          <span className="zoom-percentage">{Math.round(canvasZoom * 100)}%</span>
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Color Controls</h4>
        <div className="color-controls">
          <div className="color-control-group">
            <label className="color-label">Fill:</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => handleFillColorChange(e.target.value)}
                className="color-picker-input"
                disabled={!selectedObject}
              />
              <span className="color-value">{fillColor}</span>
            </div>
          </div>
          
          <div className="color-control-group">
            <label className="color-label">Border:</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                className="color-picker-input"
                disabled={!selectedObject}
              />
              <span className="color-value">{strokeColor}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Selection Info</h4>
        <div className="selection-info">
          {selectedCarPart && selectedCarPart.carPartId ? (
            <div className="selection-details">
              <span className="selection-type">
                🚗 Car Part
              </span>
              <span className="selection-size">
                {selectedCarPart.carPartName}
              </span>
            </div>
          ) : selectedObject ? (
            <div className="selection-details">
              <span className="selection-type">
                {selectedObject.type === 'image' ? '🖼️ Image' : 
                 selectedObject.type === 'text' ? '📝 Text' : '📦 Object'}
              </span>
              {selectedObject.type === 'image' && (
                <span className="selection-size">
                  {Math.round(selectedObject.width * selectedObject.scaleX)} × 
                  {Math.round(selectedObject.height * selectedObject.scaleY)}px
                </span>
              )}
              {selectedObject.type === 'text' && (
                <span className="selection-size">
                  {selectedObject.fontSize}px {selectedObject.fontFamily}
                </span>
              )}
            </div>
          ) : (
            <span className="no-selection">No object selected</span>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Quick Tips</h4>
        <div className="tips">
          <div className="tip">• Click to select objects</div>
          <div className="tip">• Drag to move</div>
          <div className="tip">• Use corners to resize</div>
          <div className="tip">• Use rotation handle to rotate</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
