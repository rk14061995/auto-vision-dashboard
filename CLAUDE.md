# AutoVision Pro — Dashboard (`auto-vision-dashboard`)

React 18 + Fabric.js 5 canvas editor for AutoVision Pro. Users upload a car image, select body panels with Smart Select or AI detection, paint colors, apply AI-generated color themes, and remove backgrounds. All AI features call the `auto-vision-web` API (never directly to Anthropic/remove.bg — API keys stay server-side).

Companion app: `auto-vision-web` (Next.js, port 3000 in dev).

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 |
| Canvas | Fabric.js 5 (2D) |
| 3D viewer | Three.js |
| HTTP | fetch (native) |
| Styling | Component-scoped CSS files |
| Node requirement | 20+ (use `nvm use 20`) |

---

## Running the project

```bash
# From the dashboard directory
nvm use 20
REACT_APP_API_BASE_URL=http://localhost:3000 npm start
# → http://localhost:3001
```

Production env var:
```bash
REACT_APP_API_BASE_URL=https://auto-vision-pro.com
```

No other env vars. All API keys live exclusively in `auto-vision-web`.

---

## Project structure

```
src/
  App.js                  ← root: project loading, canvas init, auto-save, AISidebar wiring
  App.css

  components/
    Canvas.js / .css         ← Fabric.js canvas setup, image loading, zoom/pan
    Sidebar.js / .css        ← left sidebar: color, accessories, stickers, text, draw tools
    AISidebar.js / .css      ← right AI sidebar: Smart Select + parts list + category colors
    Toolbar.js / .css        ← top toolbar: undo, redo, export, project name

    MagicWandSelector.js     ← Smart Select — flood-fill region selector (client-side)
    AIColorTheme.js / .css   ← Hero: AI color palette generator (calls /api/ai/color-theme)
    LLMCarDetector.js / .css ← Claude Vision car part detector (calls /api/ai/detect-parts)
    BackgroundRemover.js     ← Background removal (calls /api/ai/remove-background)
    AICarDetector.js         ← Edge-detection part detector (client-side, free)

    ThreeCanvas.js / .css    ← 3D model viewer (Three.js)
    CarPartsSelector.js      ← Legacy manual part selector (commented out in Sidebar.js)
    Icons.js                 ← SVG icon components
    ProjectLimitModal.js     ← Modal shown when user hits project limit
    AdSection.js / CornerAd.js ← Ad placements
```

---

## Authentication pattern (dashboard → web API)

The dashboard cannot use NextAuth cookies (cross-origin). All API calls use a `Bearer <email>` token:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

fetch(`${API_BASE_URL}/api/ai/detect-parts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userEmail}`,
  },
  body: JSON.stringify({ imageBase64, carMake, carModel }),
});
```

The web API routes accept `Bearer <email>` as a session fallback when no NextAuth cookie is present.

---

## Canvas auto-save and restore (`App.js`)

### Auto-save

Triggered by Fabric.js events `object:added`, `object:modified`, `object:removed`. Debounced 3 seconds.

```javascript
// Serialized custom properties preserved in JSON
const CUSTOM_PROPS = ['carPartId', 'carPartName', 'aiDetected', 'llmDetected',
                      'customType', 'confidence', 'isSmallPart'];

// PUT /api/projects/:projectId
// Body: { canvasData: JSON.stringify(fabricCanvas.toJSON(CUSTOM_PROPS)) }
```

Header shows "Saving…" (pulsing) while the request is in flight, "Saved" for 2 seconds after success.

### Restore

When a project with `canvasData` is loaded:
1. Load the background image first (so Fabric dimensions are correct).
2. Call `fabricCanvas.loadFromJSON(canvasData, callback)`.
3. In the callback, restore the background image (it's excluded from JSON to avoid double-loading).

---

## AI features

All AI features display a credit error message (`creditError` state) when the API returns 402.

### Smart Select (`MagicWandSelector.js`)

Client-side flood-fill region selector. No API call, no credits.

**Algorithm:**
1. On click, maps canvas coordinates → image pixel coordinates.
2. Caches the image's raw pixel data in a ref (rebuilt only when the image changes).
3. Runs an **edge-aware flood fill**:
   - Rejects pixels whose perceptual color distance from the seed exceeds `tolerance`.
   - Also rejects pixels where any 4-neighbor shows a local color jump > `edgeThreshold` — this stops the fill at sharp panel boundaries without requiring the entire region to be within tolerance of the seed.
4. Traces the contour with Moore's neighbor algorithm.
5. Simplifies with Ramer–Douglas–Peucker (full contour, no pre-downsampling).
6. Creates a `fabric.Polygon` overlay.

**Color distance**: Perceptual weighted RGB — `sqrt(0.299·dr² + 0.587·dg² + 0.114·db²)` (Rec. 601 luma coefficients).

**Controls:**
| Slider | Default | Effect |
|---|---|---|
| Tolerance | 25 | Max distance from seed color — increase for gradient panels |
| Edge threshold | 30 | Max local color jump — lower for tighter panel boundaries |
| Min area (px) | 250 | Rejects tiny accidental selections |
| Contour detail | 1.5 | RDP epsilon — lower = more vertices, more precise outline |

### Claude AI Part Detector (`LLMCarDetector.js`)

Sends the full canvas as base64 to `POST /api/ai/detect-parts` (3 credits). Receives bounding boxes as fractions (0–1). Multiplies by canvas dimensions to place `fabric.Rect` overlays on each detected panel. Accepts `userEmail`, `carMake`, `carModel` props.

### Background Remover (`BackgroundRemover.js`)

Sends the background image as base64 to `POST /api/ai/remove-background` (2 credits). On success, replaces the canvas background image with the transparent PNG. On 503 (key not configured), falls back to the local edge-detection algorithm. Accepts `userEmail` prop.

### AI Color Theme (`AIColorTheme.js`) — Hero Feature

The unique selling point: generates a cohesive multi-part color theme from a natural-language style prompt.

**UI:** 8 preset style chips → click to pre-fill the prompt. Free-text input. "Generate" button.

**Flow:**
1. `POST /api/ai/color-theme` with `{ prompt, carMake, carModel, parts }` (2 credits).
2. Displays `themeName`, `description`, `mood` badge, and a color swatch per part.
3. "Apply to Canvas" button iterates `fabricCanvas.getObjects()`, matches each object by `carPartName`, and sets `fill` (color at 50% alpha) and `stroke` (solid color).
4. Also dispatches `carPartColorChanged` custom events so the AI Sidebar's category-color system stays in sync.

### Edge-Detection Detector (`AICarDetector.js`)

Free client-side detector using Sobel edge detection on the canvas image data. No credits, no API call. Lower accuracy than the Claude Vision detector.

---

## AI Sidebar (`AISidebar.js`)

Right panel. Manages the **Selected Parts List** — a registry of named, categorized canvas regions.

**Parts list:** Each entry has `id` (= `carPartId` from the Fabric object), `name`, `category`, `obj` (Fabric object reference). Parts are added automatically when a region with `carPartId` and `aiDetected: true` is added to the canvas, or when the user clicks "Add Selected".

**Category system:** Parts are grouped into: Uncategorized, Doors, Hood, Roof, Trunk, Bumper, Lights, Mirrors, Windows, Trim, Other. Each category can have a fill color — changing it applies to all parts in that category simultaneously.

**Paint behavior toggle:** "Apply picked color to the whole category" checkbox. When enabled, picking a color on any part dispatches `carPartColorChanged` → `AISidebar` applies it to all parts in the same category.

Props: `fabricCanvas`, `selectedObject`, `onSelectCarPart`, `userEmail`, `carMake`, `carModel`.

---

## Conventions

- `API_BASE_URL` is always read from `process.env.REACT_APP_API_BASE_URL` — never hardcoded.
- All AI components show a `creditError` message on 402 — never silently fail.
- Fabric.js is imported as `const { fabric } = require('fabric')` (v5 pattern — not ES import).
- No emojis in UI text.
- No `console.log` in committed code.
- CarPartsSelector is commented out in Sidebar.js — do not re-enable without design review.
- LLMCarDetector, AICarDetector, BackgroundRemover are uncommented and active in AISidebar.js.
