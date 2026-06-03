import React, { useState, useEffect, useCallback } from 'react';
import './BrandKit.css';
import { LockIcon, PlusIcon, XIcon } from './Icons';

const MAX_COLORS = 12;
const MAX_FONTS = 3;

const COLORS_KEY = (email) => `avp_brandkit_colors_${email || 'local'}`;
const FONTS_KEY = (email) => `avp_brandkit_fonts_${email || 'local'}`;

const isPlanGated = (planType) =>
  planType !== 'studio' && planType !== 'enterprise';

const fontOptions = [
  'Arial', 'Arial Black', 'Times New Roman', 'Georgia', 'Verdana',
  'Impact', 'Trebuchet MS', 'Courier New', 'Palatino', 'Comic Sans MS'
];

const BrandKit = ({ fabricCanvas, selectedObject, planType, userEmail }) => {
  const gated = isPlanGated(planType);

  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState('#3b82f6');

  const [fonts, setFonts] = useState([]);
  const [newFont, setNewFont] = useState('Impact');
  const [newFontName, setNewFontName] = useState('');

  // Load from localStorage
  useEffect(() => {
    try {
      const storedColors = localStorage.getItem(COLORS_KEY(userEmail));
      if (storedColors) setColors(JSON.parse(storedColors));
      const storedFonts = localStorage.getItem(FONTS_KEY(userEmail));
      if (storedFonts) setFonts(JSON.parse(storedFonts));
    } catch (e) {
      // ignore
    }
  }, [userEmail]);

  const saveColors = useCallback((list) => {
    try { localStorage.setItem(COLORS_KEY(userEmail), JSON.stringify(list)); } catch (e) { /* ignore */ }
  }, [userEmail]);

  const saveFonts = useCallback((list) => {
    try { localStorage.setItem(FONTS_KEY(userEmail), JSON.stringify(list)); } catch (e) { /* ignore */ }
  }, [userEmail]);

  const addColor = () => {
    if (gated || colors.length >= MAX_COLORS) return;
    const updated = [...colors, newColor];
    setColors(updated);
    saveColors(updated);
  };

  const removeColor = (idx) => {
    if (gated) return;
    const updated = colors.filter((_, i) => i !== idx);
    setColors(updated);
    saveColors(updated);
  };

  const applyColor = (color) => {
    if (gated || !fabricCanvas || !selectedObject) return;
    selectedObject.set('fill', color);
    fabricCanvas.requestRenderAll();
  };

  const addFont = () => {
    if (gated || fonts.length >= MAX_FONTS || !newFontName.trim()) return;
    const entry = { name: newFontName.trim(), fontFamily: newFont };
    const updated = [...fonts, entry];
    setFonts(updated);
    saveFonts(updated);
    setNewFontName('');
  };

  const removeFont = (idx) => {
    if (gated) return;
    const updated = fonts.filter((_, i) => i !== idx);
    setFonts(updated);
    saveFonts(updated);
  };

  const applyFont = (fontFamily) => {
    if (gated || !fabricCanvas || !selectedObject) return;
    if (selectedObject.type === 'text' || selectedObject.type === 'i-text') {
      selectedObject.set('fontFamily', fontFamily);
      fabricCanvas.requestRenderAll();
    }
  };

  return (
    <div className="brand-kit">
      {gated && (
        <div className="bk-gate-overlay">
          <LockIcon size={22} />
          <span className="bk-gate-title">Studio+ Feature</span>
          <span className="bk-gate-sub">Upgrade to Studio or Enterprise to use Brand Kit</span>
        </div>
      )}

      {/* Color Palette */}
      <div className="bk-section">
        <div className="bk-section-title">Brand Colors</div>
        <div className="bk-swatches">
          {colors.map((color, idx) => (
            <div
              key={idx}
              className="bk-swatch"
              style={{ background: color }}
              onClick={() => applyColor(color)}
              title={`Apply ${color}`}
            >
              <button
                className="bk-swatch-remove"
                onClick={(e) => { e.stopPropagation(); removeColor(idx); }}
                title="Remove color"
              >
                <XIcon size={8} />
              </button>
            </div>
          ))}
          {colors.length < MAX_COLORS && (
            <div className="bk-swatch bk-swatch-add" title="Placeholder" style={{ background: 'transparent' }} />
          )}
        </div>
        <div className="bk-add-row">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="bk-color-picker"
            disabled={gated || colors.length >= MAX_COLORS}
          />
          <span className="bk-color-val">{newColor}</span>
          <button
            className="bk-add-btn"
            onClick={addColor}
            disabled={gated || colors.length >= MAX_COLORS}
            title="Add color to brand palette"
          >
            <PlusIcon size={13} /> Add
          </button>
        </div>
      </div>

      {/* Font Presets */}
      <div className="bk-section">
        <div className="bk-section-title">Font Presets <span className="bk-slots">{fonts.length}/{MAX_FONTS}</span></div>
        {fonts.length > 0 && (
          <ul className="bk-font-list">
            {fonts.map((f, idx) => (
              <li key={idx} className="bk-font-item">
                <button
                  className="bk-font-apply"
                  onClick={() => applyFont(f.fontFamily)}
                  style={{ fontFamily: f.fontFamily }}
                  title={`Apply ${f.fontFamily} to selected text`}
                >
                  {f.name}
                </button>
                <button
                  className="bk-font-remove"
                  onClick={() => removeFont(idx)}
                  title="Remove preset"
                >
                  <XIcon size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {fonts.length < MAX_FONTS && (
          <div className="bk-font-add">
            <select
              value={newFont}
              onChange={(e) => setNewFont(e.target.value)}
              className="bk-font-select"
              disabled={gated}
            >
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <input
              type="text"
              value={newFontName}
              onChange={(e) => setNewFontName(e.target.value)}
              placeholder="Preset name"
              className="bk-font-name-input"
              disabled={gated}
              maxLength={20}
            />
            <button
              className="bk-add-btn"
              onClick={addFont}
              disabled={gated || !newFontName.trim() || fonts.length >= MAX_FONTS}
              title="Save font preset"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandKit;
