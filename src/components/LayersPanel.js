import React, { useState, useEffect, useCallback } from 'react';
import './LayersPanel.css';
import {
  EyeIcon, EyeOffIcon, ChevronUpIcon, ChevronDownIcon, XIcon,
  ImageIcon, TypeIcon, SquareIcon, PencilIcon
} from './Icons';

const getTypeIcon = (type) => {
  if (!type) return <SquareIcon size={12} />;
  const t = type.toLowerCase();
  if (t === 'image') return <ImageIcon size={12} />;
  if (t === 'text' || t === 'i-text') return <TypeIcon size={12} />;
  if (t === 'path' || t === 'group') return <PencilIcon size={12} />;
  return <SquareIcon size={12} />;
};

const LayersPanel = ({ fabricCanvas }) => {
  const [layers, setLayers] = useState([]);

  const refreshLayers = useCallback(() => {
    if (!fabricCanvas || fabricCanvas.isDisposed) return;
    const objs = fabricCanvas.getObjects();
    // Top of stack = index objs.length-1 → show first in list
    const reversed = [...objs].reverse();
    setLayers(reversed.map((obj, i) => ({
      id: obj.__uid || (obj.__uid = `layer_${Date.now()}_${i}`),
      obj,
      name: obj.carPartName || obj.type || 'Layer',
      type: obj.type,
      visible: obj.visible !== false,
    })));
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;
    refreshLayers();
    fabricCanvas.on('object:added', refreshLayers);
    fabricCanvas.on('object:modified', refreshLayers);
    fabricCanvas.on('object:removed', refreshLayers);
    return () => {
      fabricCanvas.off('object:added', refreshLayers);
      fabricCanvas.off('object:modified', refreshLayers);
      fabricCanvas.off('object:removed', refreshLayers);
    };
  }, [fabricCanvas, refreshLayers]);

  const toggleVisibility = (obj) => {
    obj.set('visible', !obj.visible);
    fabricCanvas.requestRenderAll();
    refreshLayers();
  };

  const selectLayer = (obj) => {
    if (!fabricCanvas) return;
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.requestRenderAll();
  };

  const moveUp = (obj) => {
    if (!fabricCanvas) return;
    fabricCanvas.bringForward(obj);
    fabricCanvas.requestRenderAll();
    refreshLayers();
  };

  const moveDown = (obj) => {
    if (!fabricCanvas) return;
    fabricCanvas.sendBackwards(obj);
    fabricCanvas.requestRenderAll();
    refreshLayers();
  };

  const deleteLayer = (obj) => {
    if (!fabricCanvas) return;
    fabricCanvas.remove(obj);
    fabricCanvas.requestRenderAll();
  };

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <span className="layers-title">Layers</span>
        <span className="layers-hint">[/] to reorder</span>
      </div>

      {layers.length === 0 ? (
        <p className="layers-empty">No objects on canvas yet.</p>
      ) : (
        <ul className="layers-list">
          {layers.map((layer) => (
            <li
              key={layer.id}
              className={`layer-item ${layer.obj === fabricCanvas?.getActiveObject() ? 'active' : ''}`}
              onClick={() => selectLayer(layer.obj)}
            >
              <span className="layer-type-icon">{getTypeIcon(layer.type)}</span>
              <span className="layer-name">{layer.name}</span>
              <div className="layer-actions">
                <button
                  className="layer-btn"
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.obj); }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <EyeIcon size={12} /> : <EyeOffIcon size={12} />}
                </button>
                <button
                  className="layer-btn"
                  onClick={(e) => { e.stopPropagation(); moveUp(layer.obj); }}
                  title="Move up"
                >
                  <ChevronUpIcon size={12} />
                </button>
                <button
                  className="layer-btn"
                  onClick={(e) => { e.stopPropagation(); moveDown(layer.obj); }}
                  title="Move down"
                >
                  <ChevronDownIcon size={12} />
                </button>
                <button
                  className="layer-btn layer-btn-delete"
                  onClick={(e) => { e.stopPropagation(); deleteLayer(layer.obj); }}
                  title="Delete layer"
                >
                  <XIcon size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LayersPanel;
