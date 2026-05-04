import React, { useState } from 'react';
import './Toolbar.css';

const Toolbar = ({
  selectedObject,
  selectedCarPart,
  onDeleteSelected,
  onRotateLeft,
  onRotateRight,
  onRotateZLeft,
  onRotateZRight,
  onFlipH,
  onFlipV,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetCanvas,
  canvasZoom,
  fabricCanvas,
  canvasMode
}) => {
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [strokeColor, setStrokeColor] = useState('#1e293b');
  const [opacity, setOpacity] = useState(100);

  // Sync toolbar values when selected object changes
  React.useEffect(() => {
    const obj = selectedCarPart?.carPartId ? selectedCarPart : selectedObject;
    if (!obj) return;

    if (obj.type === 'text') {
      setFillColor(obj.fill || '#000000');
    } else {
      setFillColor(obj.fill && obj.fill !== 'transparent' ? obj.fill : '#3b82f6');
    }
    setStrokeColor(obj.stroke || '#1e293b');
    setOpacity(obj.opacity != null ? Math.round(obj.opacity * 100) : 100);
  }, [selectedObject, selectedCarPart]);

  const activeObj = selectedCarPart?.carPartId ? selectedCarPart : selectedObject;

  const applyFill = (color) => {
    setFillColor(color);
    if (!activeObj || !fabricCanvas) return;

    if (activeObj.carPartId) {
      activeObj.set({ fill: color + '60', stroke: color });
      fabricCanvas.renderAll();
      window.dispatchEvent(new CustomEvent('carPartColorChanged', {
        detail: { carPartId: activeObj.carPartId, type: 'fill', color }
      }));
    } else if (activeObj.type === 'text') {
      activeObj.set({ fill: color });
      fabricCanvas.renderAll();
    } else if (activeObj.type === 'image') {
      // Tint via colorMatrix filter
      const { fabric } = require('fabric');
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;
      activeObj.filters = [
        new fabric.Image.filters.ColorMatrix({
          matrix: [
            r, 0, 0, 0, 0,
            0, g, 0, 0, 0,
            0, 0, b, 0, 0,
            0, 0, 0, 0.7, 0
          ]
        })
      ];
      activeObj.applyFilters();
      fabricCanvas.renderAll();
    } else {
      activeObj.set({ fill: color });
      fabricCanvas.renderAll();
    }
  };

  const applyStroke = (color) => {
    setStrokeColor(color);
    if (!activeObj || !fabricCanvas) return;
    activeObj.set({ stroke: color, strokeWidth: activeObj.strokeWidth || 2 });
    fabricCanvas.renderAll();

    if (activeObj.carPartId) {
      window.dispatchEvent(new CustomEvent('carPartColorChanged', {
        detail: { carPartId: activeObj.carPartId, type: 'stroke', color }
      }));
    }
  };

  const applyOpacity = (val) => {
    const pct = parseInt(val);
    setOpacity(pct);
    if (!activeObj || !fabricCanvas) return;
    activeObj.set({ opacity: pct / 100 });
    fabricCanvas.renderAll();
  };

  const isObjSelected = !!activeObj;

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">History</h4>
        <div className="toolbar-controls">
          <button className="btn-icon" onClick={onUndo} title="Undo (Ctrl+Z)">↩</button>
          <button className="btn-icon" onClick={onRedo} title="Redo (Ctrl+Y)">↪</button>
        </div>
      </div>

      {/* Object Transform */}
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Transform</h4>
        <div className="toolbar-controls">
          <button className="btn-icon" onClick={onDeleteSelected} disabled={!isObjSelected} title="Delete (Del)">🗑️</button>
          <button className="btn-icon" onClick={onRotateLeft} disabled={!isObjSelected} title="Rotate Left">↺</button>
          <button className="btn-icon" onClick={onRotateRight} disabled={!isObjSelected} title="Rotate Right">↻</button>
          <div className="toolbar-divider" />
          <button className="btn-icon" onClick={onFlipH} disabled={!isObjSelected} title="Flip Horizontal">↔️</button>
          <button className="btn-icon" onClick={onFlipV} disabled={!isObjSelected} title="Flip Vertical">↕️</button>
          <div className="toolbar-divider" />
          <button className="btn-icon" onClick={onRotateZLeft} disabled={!isObjSelected} title="Skew Left">↙️</button>
          <button className="btn-icon" onClick={onRotateZRight} disabled={!isObjSelected} title="Skew Right">↘️</button>
        </div>
      </div>

      {/* Canvas Zoom */}
      {canvasMode !== '3d' && (
        <div className="toolbar-section">
          <h4 className="toolbar-section-title">Zoom</h4>
          <div className="toolbar-controls">
            <button className="btn-icon" onClick={onZoomOut} title="Zoom Out (-)">➖</button>
            <span className="zoom-percentage">{Math.round(canvasZoom * 100)}%</span>
            <button className="btn-icon" onClick={onZoomIn} title="Zoom In (+)">➕</button>
            <button className="btn-icon" onClick={onResetCanvas} title="Reset View">🔄</button>
          </div>
        </div>
      )}

      {/* Color Controls */}
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Color</h4>
        <div className="color-controls">
          <div className="color-control-group">
            <label className="color-label">Fill</label>
            <div className="color-input-wrapper">
              <input
                type="color" value={fillColor}
                onChange={(e) => applyFill(e.target.value)}
                className="color-picker-input"
                disabled={!isObjSelected}
                title="Fill Color"
              />
              <span className="color-value">{fillColor}</span>
            </div>
          </div>
          <div className="color-control-group">
            <label className="color-label">Border</label>
            <div className="color-input-wrapper">
              <input
                type="color" value={strokeColor}
                onChange={(e) => applyStroke(e.target.value)}
                className="color-picker-input"
                disabled={!isObjSelected}
                title="Border/Stroke Color"
              />
              <span className="color-value">{strokeColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Opacity</h4>
        <div className="opacity-control">
          <input
            type="range" min="0" max="100" value={opacity}
            onChange={(e) => applyOpacity(e.target.value)}
            className="opacity-slider"
            disabled={!isObjSelected}
          />
          <span className="opacity-value">{opacity}%</span>
        </div>
      </div>

      {/* Selection Info */}
      <div className="toolbar-section">
        <h4 className="toolbar-section-title">Selection</h4>
        <div className="selection-info">
          {activeObj?.carPartId ? (
            <div className="selection-details">
              <span className="selection-type">🚗 Car Part</span>
              <span className="selection-size">{activeObj.carPartName}</span>
            </div>
          ) : selectedObject ? (
            <div className="selection-details">
              <span className="selection-type">
                {selectedObject.type === 'image' ? '🖼️ Image' :
                 selectedObject.type === 'text' ? '📝 Text' :
                 selectedObject.type === 'rect' ? '⬜ Rect' :
                 selectedObject.type === 'ellipse' ? '⭕ Ellipse' :
                 selectedObject.type === 'line' ? '➖ Line' :
                 selectedObject.type === 'path' ? '✏️ Path' :
                 selectedObject.type === 'group' ? '📦 Group' : '📦 Object'}
              </span>
              {selectedObject.type === 'text' && (
                <span className="selection-size">{selectedObject.fontSize}px {selectedObject.fontFamily}</span>
              )}
              {selectedObject.type === 'image' && (
                <span className="selection-size">
                  {Math.round(selectedObject.width * selectedObject.scaleX)} × {Math.round(selectedObject.height * selectedObject.scaleY)}px
                </span>
              )}
            </div>
          ) : (
            <span className="no-selection">Nothing selected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
