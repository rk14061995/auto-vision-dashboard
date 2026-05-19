import React, { useEffect, useMemo, useState } from 'react';
import './AISidebar.css';
import BackgroundRemover from './BackgroundRemover';
import LLMCarDetector from './LLMCarDetector';
import AICarDetector from './AICarDetector';
import MagicWandSelector from './MagicWandSelector';
import AIColorTheme from './AIColorTheme';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from './Icons';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const AISidebar = ({ fabricCanvas, selectedObject, onSelectCarPart, userEmail, carMake, carModel }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiDetectedParts, setAiDetectedParts] = useState([]);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [partsList, setPartsList] = useState([]);
  const [defaultCategory, setDefaultCategory] = useState('Uncategorized');
  const [categoryColors, setCategoryColors] = useState({});
  const [applyToCategory, setApplyToCategory] = useState(true);

  const categories = useMemo(
    () => [
      'Uncategorized',
      'Doors',
      'Hood',
      'Roof',
      'Trunk',
      'Bumper',
      'Lights',
      'Mirrors',
      'Windows',
      'Trim',
      'Other'
    ],
    []
  );

  const upsertPart = (obj, categoryOverride) => {
    if (!obj) return;
    if (!obj.carPartId) return;

    const id = obj.carPartId;
    const name = obj.carPartName || 'Selected Part';

    setPartsList((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) {
        return prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name,
                category: categoryOverride || p.category,
                obj
              }
            : p
        );
      }

      return [
        ...prev,
        {
          id,
          name,
          category: categoryOverride || defaultCategory,
          obj
        }
      ];
    });
  };

  const applyColorToCategory = (category, color, type) => {
    if (!fabricCanvas) return;
    if (!category) return;

    setCategoryColors((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [type]: color
      }
    }));

    const objects = fabricCanvas.getObjects();
    objects.forEach((o) => {
      if (!o || !o.carPartId) return;
      const p = partsList.find((x) => x.id === o.carPartId);
      if (!p) return;
      if (p.category !== category) return;

      if (type === 'fill') {
        o.set('fill', `${color}80`);
        o.set('stroke', color);
      } else if (type === 'stroke') {
        o.set('stroke', color);
        o.set('strokeWidth', o.strokeWidth || 2);
      }
    });
    fabricCanvas.requestRenderAll();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const removePart = (id) => {
    setPartsList((prev) => prev.filter((p) => p.id !== id));
    if (!fabricCanvas) return;
    const toRemove = fabricCanvas
      .getObjects()
      .find((o) => o && o.carPartId === id);
    if (toRemove) {
      fabricCanvas.remove(toRemove);
      fabricCanvas.requestRenderAll();
    }
  };

  const selectPart = (id) => {
    if (!fabricCanvas) return;
    const obj = fabricCanvas
      .getObjects()
      .find((o) => o && o.carPartId === id);
    if (!obj) return;

    fabricCanvas.setActiveObject(obj);
    fabricCanvas.requestRenderAll();
  };

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectAdded = (e) => {
      const obj = e?.target;
      if (!obj) return;

      // Auto-add Smart Select and AI-detected parts
      if (obj.aiDetected && obj.carPartId) {
        upsertPart(obj);
      }
    };

    const handleSelection = (e) => {
      const obj = e?.selected?.[0] || e?.target;
      if (!obj) return;
      if (obj.carPartId) {
        upsertPart(obj);
      }
    };

    fabricCanvas.on('object:added', handleObjectAdded);
    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);

    return () => {
      fabricCanvas.off('object:added', handleObjectAdded);
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
    };
  }, [fabricCanvas, defaultCategory]);

  useEffect(() => {
    const handler = (e) => {
      if (!applyToCategory) return;
      const detail = e?.detail;
      if (!detail?.carPartId || !detail?.color || !detail?.type) return;

      const part = partsList.find((p) => p.id === detail.carPartId);
      if (!part) return;
      if (!part.category) return;

      applyColorToCategory(part.category, detail.color, detail.type);
    };

    window.addEventListener('carPartColorChanged', handler);
    return () => window.removeEventListener('carPartColorChanged', handler);
  }, [applyToCategory, partsList, fabricCanvas]);

  const addCurrentSelectionToList = () => {
    if (!fabricCanvas) return;
    const obj = fabricCanvas.getActiveObject();
    if (!obj || !obj.carPartId) return;
    upsertPart(obj, defaultCategory);
  };

  return (
    <div className={`ai-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* AI Sidebar Header */}
      <div className="ai-sidebar-header">
        <h3 className="ai-sidebar-title">AI</h3>
        <button
          className="ai-sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Smart Select (Magic Wand) */}
          <MagicWandSelector fabricCanvas={fabricCanvas} />

          {/* Selected Parts List */}
          <div className="ai-parts-panel">
            <div className="ai-parts-header">
              <div className="ai-parts-title">Selected Parts</div>
              <button
                className="ai-parts-add-btn"
                onClick={addCurrentSelectionToList}
                disabled={!fabricCanvas || !fabricCanvas.getActiveObject || !fabricCanvas.getActiveObject()}
              >
                Add Selected
              </button>
            </div>

            <div className="ai-parts-toolbar">
              <label className="ai-parts-label">Default category</label>
              <select
                className="ai-parts-select"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label className="ai-parts-label">Paint behavior</label>
              <div className="ai-parts-toggle-row">
                <input
                  id="apply-to-category"
                  type="checkbox"
                  checked={applyToCategory}
                  onChange={(e) => setApplyToCategory(e.target.checked)}
                />
                <label htmlFor="apply-to-category" className="ai-parts-toggle-label">
                  Apply picked color to the whole category
                </label>
              </div>
            </div>

            <div className="ai-category-colors">
              <div className="ai-category-colors-title">Category Colors</div>
              {categories
                .filter((c) => c !== 'Uncategorized')
                .map((c) => {
                  const fill = categoryColors?.[c]?.fill || '#3b82f6';
                  return (
                    <div key={c} className="ai-category-color-row">
                      <div className="ai-category-color-name">{c}</div>
                      <input
                        className="ai-category-color-input"
                        type="color"
                        value={fill}
                        onChange={(e) => applyColorToCategory(c, e.target.value, 'fill')}
                        title="Set category fill (applies to all parts in this category)"
                      />
                      <button
                        className="ai-category-color-copy"
                        onClick={() => copyToClipboard(fill)}
                        title="Copy hex code"
                      >
                        Copy
                      </button>
                    </div>
                  );
                })}
            </div>

            {partsList.length === 0 ? (
              <div className="ai-parts-empty">
                Select a region, then it will appear here. Click an item to re-select and paint.
              </div>
            ) : (
              <div className="ai-parts-list">
                {partsList.map((p) => (
                  <div
                    key={p.id}
                    className={`ai-part-item ${selectedObject?.carPartId === p.id ? 'active' : ''}`}
                  >
                    <button
                      className="ai-part-main"
                      onClick={() => selectPart(p.id)}
                      title="Click to select this part on canvas"
                    >
                      <div className="ai-part-name">{p.name}</div>
                      <div className="ai-part-id">{p.category}</div>
                    </button>

                    <select
                      className="ai-part-category"
                      value={p.category}
                      onChange={(e) => {
                        setPartsList((prev) =>
                          prev.map((x) =>
                            x.id === p.id ? { ...x, category: e.target.value } : x
                          )
                        );
                      }}
                      title="Assign this part to a group (Doors, Hood, etc.)"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <button
                      className="ai-part-remove"
                      onClick={() => removePart(p.id)}
                      title="Remove from list and canvas"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Style Palette — Hero Feature */}
          {/* <AIColorTheme
            fabricCanvas={fabricCanvas}
            partsList={partsList}
            userEmail={userEmail}
            carMake={carMake}
            carModel={carModel}
          /> */}

          {/* Claude AI Part Detector */}
          {/* <LLMCarDetector
            fabricCanvas={fabricCanvas}
            onPartsDetected={setAiDetectedParts}
            userEmail={userEmail}
            carMake={carMake}
            carModel={carModel}
          /> */}

          {/* Edge-Detection Part Detector (client-side, free) */}
          {/* <AICarDetector
            fabricCanvas={fabricCanvas}
            onPartsDetected={setAiDetectedParts}
          /> */}

          {/* Background Remover */}
          {/* <BackgroundRemover
            fabricCanvas={fabricCanvas}
            onBackgroundRemoved={setBackgroundRemoved}
            userEmail={userEmail}
          /> */}
        </>
      )}
    </div>
  );
};

export default AISidebar;
