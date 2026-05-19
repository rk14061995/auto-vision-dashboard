import React, { useState } from 'react';
import './AIColorTheme.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const STYLE_PRESETS = [
  { label: 'Stealth Black', prompt: 'matte black stealth with dark chrome accents, aggressive and minimalist' },
  { label: 'Miami Sunset', prompt: 'vibrant miami vice sunset gradient, pink magenta and electric purple, retro 80s style' },
  { label: 'Arctic Ice', prompt: 'icy pearl white with frosty blue accents, clean and luxurious, winter aesthetic' },
  { label: 'Red Racer', prompt: 'aggressive racing red with carbon black accents, high-performance track car look' },
  { label: 'Midnight Gold', prompt: 'deep midnight navy with brushed gold accents, premium luxury aesthetic' },
  { label: 'Forest Rally', prompt: 'rally green with white and yellow accent stripes, off-road adventure spirit' },
  { label: 'Cyber Neon', prompt: 'dark matte black base with electric neon green or blue cyberpunk accent trim' },
  { label: 'Rose Gold', prompt: 'elegant rose gold satin with champagne accents, modern luxury feminine aesthetic' },
];

const AIColorTheme = ({ fabricCanvas, partsList, userEmail, carMake, carModel }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const partNames = partsList && partsList.length > 0
    ? partsList.map(p => p.name)
    : [];

  const generate = async (customPrompt) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setError('');
    setTheme(null);
    setApplied(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/color-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { Authorization: `Bearer ${userEmail}` } : {}),
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          carMake: carMake || '',
          carModel: carModel || '',
          parts: partNames,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Not enough AI credits (need ${data.creditsNeeded}, have ${data.balance}).`);
        } else {
          setError(data.error || 'Generation failed');
        }
        return;
      }

      setTheme(data.theme);
    } catch (e) {
      setError('Failed to connect to AI service.');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = () => {
    if (!fabricCanvas || !theme?.colors) return;

    const objects = fabricCanvas.getObjects();
    let appliedCount = 0;

    objects.forEach((obj) => {
      if (!obj.carPartName) return;
      const color = theme.colors[obj.carPartName];
      if (!color) return;

      obj.set('fill', color + '80'); // semi-transparent overlay
      obj.set('stroke', color);
      obj.set('strokeWidth', obj.strokeWidth || 2);
      appliedCount++;
    });

    fabricCanvas.requestRenderAll();
    setApplied(true);

    // Also update category colors by dispatching events for each part
    objects.forEach((obj) => {
      if (!obj.carPartName || !obj.carPartId) return;
      const color = theme.colors[obj.carPartName];
      if (!color) return;
      window.dispatchEvent(new CustomEvent('carPartColorChanged', {
        detail: { carPartId: obj.carPartId, color, type: 'fill' },
      }));
    });
  };

  return (
    <div className="ai-color-theme">
      <div className="act-header">
        <div className="act-title">AI Style Palette</div>
        <div className="act-badge">HERO</div>
      </div>

      <p className="act-desc">
        Describe a style — AI generates a full color scheme for all your car parts instantly.
      </p>

      {/* Style presets */}
      <div className="act-presets">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            className="act-preset-chip"
            onClick={() => {
              setPrompt(preset.prompt);
              generate(preset.prompt);
            }}
            disabled={loading}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div className="act-input-row">
        <input
          className="act-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. matte black with gold accents…"
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          disabled={loading}
        />
        <button
          className="act-generate-btn"
          onClick={() => generate()}
          disabled={loading || !prompt.trim()}
        >
          {loading ? <span className="act-spinner" /> : 'Generate'}
        </button>
      </div>

      {error && <div className="act-error">{error}</div>}

      {theme && (
        <div className="act-result">
          <div className="act-result-header">
            <div>
              <div className="act-theme-name">{theme.themeName}</div>
              <div className="act-theme-desc">{theme.description}</div>
            </div>
            {theme.mood && <span className="act-mood-badge">{theme.mood}</span>}
          </div>

          {theme.colors && (
            <div className="act-swatches">
              {Object.entries(theme.colors).map(([part, color]) => (
                <div key={part} className="act-swatch-row" title={`${part}: ${color}`}>
                  <div className="act-swatch" style={{ background: color }} />
                  <span className="act-swatch-name">{part}</span>
                  <span className="act-swatch-hex">{color}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className={`act-apply-btn ${applied ? 'applied' : ''}`}
            onClick={applyTheme}
            disabled={applied}
          >
            {applied ? 'Applied to Canvas' : 'Apply to Canvas'}
          </button>
          {applied && (
            <button
              className="act-reapply-btn"
              onClick={() => { setApplied(false); setTheme(null); }}
            >
              Generate Another
            </button>
          )}
        </div>
      )}

      {partNames.length === 0 && !theme && (
        <div className="act-hint">
          Tip: Select car parts first using Smart Select or AI Detect, then generate a theme to apply colors to all parts at once.
        </div>
      )}
    </div>
  );
};

export default AIColorTheme;
