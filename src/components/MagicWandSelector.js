import React, { useEffect, useRef, useState } from 'react';
import './MagicWandSelector.css';

const { fabric } = require('fabric');

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Perceptual weighted RGB distance (Rec. 601 luma coefficients)
const colorDistance = (r1, g1, b1, r2, g2, b2) => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
};

const rdpSimplify = (points, epsilon) => {
  if (!points || points.length < 3) return points;

  const sqr = (x) => x * x;
  const distToSegmentSq = (p, v, w) => {
    const l2 = sqr(w.x - v.x) + sqr(w.y - v.y);
    if (l2 === 0) return sqr(p.x - v.x) + sqr(p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return sqr(p.x - proj.x) + sqr(p.y - proj.y);
  };

  const epsilonSq = epsilon * epsilon;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDistSq = 0;
    let index = -1;

    for (let i = start + 1; i < end; i++) {
      const d = distToSegmentSq(points[i], points[start], points[end]);
      if (d > maxDistSq) {
        maxDistSq = d;
        index = i;
      }
    }

    if (maxDistSq > epsilonSq && index !== -1) {
      keep[index] = true;
      stack.push([start, index]);
      stack.push([index, end]);
    }
  }

  return points.filter((_, idx) => keep[idx]);
};

const getBackgroundImageTransform = (canvas) => {
  const img = canvas.backgroundImage;
  if (!img) return null;

  const scaleX = img.scaleX || 1;
  const scaleY = img.scaleY || 1;
  const left = img.left || 0;
  const top = img.top || 0;

  const imgCanvasW = img.width * scaleX;
  const imgCanvasH = img.height * scaleY;
  const imgLeft = left - imgCanvasW / 2;
  const imgTop = top - imgCanvasH / 2;

  return { img, scaleX, scaleY, imgLeft, imgTop, imgCanvasW, imgCanvasH };
};

const buildImageData = (htmlImageEl) => {
  const temp = document.createElement('canvas');
  const ctx = temp.getContext('2d', { willReadFrequently: true });
  temp.width = htmlImageEl.naturalWidth || htmlImageEl.width;
  temp.height = htmlImageEl.naturalHeight || htmlImageEl.height;
  ctx.drawImage(htmlImageEl, 0, 0);
  const imageData = ctx.getImageData(0, 0, temp.width, temp.height);
  return { imageData, width: temp.width, height: temp.height };
};

const findTopLeftBoundary = (mask, w, h) => {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      const left = x > 0 ? mask[idx - 1] : false;
      const up = y > 0 ? mask[idx - w] : false;
      const right = x < w - 1 ? mask[idx + 1] : false;
      const down = y < h - 1 ? mask[idx + w] : false;
      if (!left || !up || !right || !down) return { x, y };
    }
  }
  return null;
};

const traceContourMoore = (mask, w, h) => {
  const start = findTopLeftBoundary(mask, w, h);
  if (!start) return [];

  const dirs = [
    { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
    { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  ];

  const isInside = (x, y) => x >= 0 && x < w && y >= 0 && y < h;

  let current = { ...start };
  let backtrackDir = 4;
  const contour = [{ x: current.x, y: current.y }];
  const maxSteps = w * h * 4;
  let steps = 0;

  while (steps++ < maxSteps) {
    let found = false;
    for (let i = 0; i < 8; i++) {
      const dirIndex = (backtrackDir + 1 + i) % 8;
      const nx = current.x + dirs[dirIndex].x;
      const ny = current.y + dirs[dirIndex].y;
      if (!isInside(nx, ny)) continue;
      if (mask[ny * w + nx]) {
        current = { x: nx, y: ny };
        contour.push({ x: current.x, y: current.y });
        backtrackDir = (dirIndex + 4) % 8;
        found = true;
        break;
      }
    }

    if (!found) break;
    if (current.x === start.x && current.y === start.y && contour.length > 10) break;
  }

  return contour;
};

const MagicWandSelector = ({ fabricCanvas }) => {
  const [enabled, setEnabled] = useState(false);
  const [tolerance, setTolerance] = useState(25);
  const [edgeThreshold, setEdgeThreshold] = useState(30);
  const [minPixels, setMinPixels] = useState(250);
  const [simplify, setSimplify] = useState(1.5);
  const [status, setStatus] = useState('');

  const cacheRef = useRef(null);

  // Lock / unlock all AI-detected polygon overlays when the toggle changes.
  // When OFF → parts are locked in place (no accidental drag/resize).
  // When ON  → parts are fully interactive so the user can reposition them.
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach((obj) => {
      if (!obj.aiDetected && !obj.llmDetected) return;
      obj.set({
        lockMovementX: !enabled,
        lockMovementY: !enabled,
        lockScalingX: !enabled,
        lockScalingY: !enabled,
        lockRotation: !enabled,
        hasControls: enabled,
        hasBorders: enabled,
      });
    });
    if (!enabled) fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  }, [enabled, fabricCanvas]);

  // useMemo([fabricCanvas]) won't re-run when backgroundImage is set on the same
  // canvas instance. Track it via a state that re-checks on every canvas render.
  const [hasBackground, setHasBackground] = useState(
    () => Boolean(fabricCanvas?.backgroundImage)
  );

  useEffect(() => {
    if (!fabricCanvas) { setHasBackground(false); return; }
    setHasBackground(Boolean(fabricCanvas.backgroundImage));
    const check = () => setHasBackground(Boolean(fabricCanvas.backgroundImage));
    fabricCanvas.on('after:render', check);
    return () => fabricCanvas.off('after:render', check);
  }, [fabricCanvas]);

  const canUse = hasBackground;

  useEffect(() => {
    if (!fabricCanvas) return;

    const onMouseDown = async (opt) => {
      if (!enabled) return;
      if (!fabricCanvas.backgroundImage) {
        setStatus('Upload an image first');
        return;
      }

      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();

      const pointer = fabricCanvas.getPointer(opt.e);
      const t = getBackgroundImageTransform(fabricCanvas);
      if (!t) return;

      const relX = (pointer.x - t.imgLeft) / t.scaleX;
      const relY = (pointer.y - t.imgTop) / t.scaleY;

      const imgW = t.img.width;
      const imgH = t.img.height;

      const ix = Math.floor(clamp(relX, 0, imgW - 1));
      const iy = Math.floor(clamp(relY, 0, imgH - 1));

      const htmlEl = t.img.getElement();
      if (!htmlEl) {
        setStatus('Image not ready');
        return;
      }

      const cacheKey = `${htmlEl.src || ''}::${htmlEl.naturalWidth || htmlEl.width}x${htmlEl.naturalHeight || htmlEl.height}`;
      if (!cacheRef.current || cacheRef.current.key !== cacheKey) {
        const { imageData, width, height } = buildImageData(htmlEl);
        cacheRef.current = { key: cacheKey, imageData, width, height };
      }

      const { imageData, width, height } = cacheRef.current;
      const data = imageData.data;

      const mapX = Math.floor(ix * (width / imgW));
      const mapY = Math.floor(iy * (height / imgH));

      const seedIdx = (mapY * width + mapX) * 4;
      const sr = data[seedIdx];
      const sg = data[seedIdx + 1];
      const sb = data[seedIdx + 2];
      const sa = data[seedIdx + 3];
      if (sa === 0) {
        setStatus('Clicked transparent pixel');
        return;
      }

      setStatus('Selecting...');

      // Edge-aware flood fill
      const mask = new Uint8Array(width * height);
      const visited = new Uint8Array(width * height);
      const stack = [{ x: mapX, y: mapY }];
      const tol = tolerance;
      const edgeStop = edgeThreshold;

      const idx1 = (x, y) => y * width + x;

      let count = 0;
      while (stack.length) {
        const { x, y } = stack.pop();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const mi = idx1(x, y);
        if (visited[mi]) continue;
        visited[mi] = 1;

        const p = mi * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const a = data[p + 3];
        if (a === 0) continue;

        // Reject if too different from seed color
        if (colorDistance(r, g, b, sr, sg, sb) > tol) continue;

        // Edge stop: check local color gradient against image neighbors.
        // If adjacent pixels show a sharp color jump, we're at a panel edge — stop here.
        let localEdge = 0;
        if (x > 0) {
          const lp = (y * width + (x - 1)) * 4;
          localEdge = Math.max(localEdge, colorDistance(r, g, b, data[lp], data[lp + 1], data[lp + 2]));
        }
        if (y > 0) {
          const tp = ((y - 1) * width + x) * 4;
          localEdge = Math.max(localEdge, colorDistance(r, g, b, data[tp], data[tp + 1], data[tp + 2]));
        }
        if (x < width - 1) {
          const rp = (y * width + (x + 1)) * 4;
          localEdge = Math.max(localEdge, colorDistance(r, g, b, data[rp], data[rp + 1], data[rp + 2]));
        }
        if (y < height - 1) {
          const dp = ((y + 1) * width + x) * 4;
          localEdge = Math.max(localEdge, colorDistance(r, g, b, data[dp], data[dp + 1], data[dp + 2]));
        }
        if (localEdge > edgeStop) continue;

        mask[mi] = 1;
        count++;

        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
      }

      if (count < minPixels) {
        setStatus(`Selection too small (${count} px). Increase tolerance or click again.`);
        return;
      }

      const contour = traceContourMoore(mask, width, height);
      if (!contour.length) {
        setStatus('No contour found');
        return;
      }

      // Use full contour — RDP handles the simplification without prior downsampling
      const simplified = rdpSimplify(contour, simplify);

      const points = simplified.map((pt) => {
        const imgX = (pt.x * imgW) / width;
        const imgY = (pt.y * imgH) / height;
        return {
          x: t.imgLeft + imgX * t.scaleX,
          y: t.imgTop + imgY * t.scaleY,
        };
      });

      const poly = new fabric.Polygon(points, {
        fill: 'rgba(59, 130, 246, 0.25)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        selectable: true,
        evented: true,
        objectCaching: false,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: 8,
        opacity: 0.9,
        aiDetected: true,
        carPartId: `smart_${Date.now()}`,
        carPartName: 'Smart Selected Part',
      });

      fabricCanvas.add(poly);
      fabricCanvas.setActiveObject(poly);
      fabricCanvas.requestRenderAll();

      setStatus(`Selected region: ${count} px`);
    };

    fabricCanvas.on('mouse:down', onMouseDown);
    return () => fabricCanvas.off('mouse:down', onMouseDown);
  }, [fabricCanvas, enabled, tolerance, edgeThreshold, minPixels, simplify]);

  return (
    <div className="magic-wand">
      <div className="magic-wand-header">
        <h3 className="magic-wand-title">Smart Select</h3>
        <button
          className={`magic-wand-toggle ${enabled ? 'on' : 'off'}`}
          onClick={() => setEnabled((v) => !v)}
          disabled={!canUse}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!canUse && (
        <p className="magic-wand-hint">Upload a car image to enable Smart Select.</p>
      )}

      {canUse && (
        <>
          <div className="magic-wand-controls">
            <div className="mw-control">
              <label className="mw-label">Tolerance: {tolerance}</label>
              <input
                type="range"
                min="5"
                max="80"
                value={tolerance}
                onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="mw-control">
              <label className="mw-label">Edge threshold: {edgeThreshold}</label>
              <input
                type="range"
                min="5"
                max="80"
                value={edgeThreshold}
                onChange={(e) => setEdgeThreshold(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="mw-control">
              <label className="mw-label">Min area (px): {minPixels}</label>
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                value={minPixels}
                onChange={(e) => setMinPixels(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="mw-control">
              <label className="mw-label">Contour detail: {simplify.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={simplify}
                onChange={(e) => setSimplify(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <p className="magic-wand-hint">
            Turn ON, then click a panel on the car image. Lower edge threshold = tighter to panel boundaries.
          </p>

          {status && <p className="magic-wand-status">{status}</p>}
        </>
      )}
    </div>
  );
};

export default MagicWandSelector;
