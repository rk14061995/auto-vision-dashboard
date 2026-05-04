import React, { useRef, useState, useEffect, useMemo, useLayoutEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import './ThreeCanvas.css';

const CAR_MODELS = [
  { path: '/3d_models/1965_ford_mustang_convertible.glb', label: '1965 Mustang Convertible' },
  { path: '/3d_models/2015_ford_mustang_rtr.glb',          label: '2015 Mustang RTR' },
  { path: '/3d_models/2025_ford_mustang_gtd.glb',          label: '2025 Mustang GTD' },
  { path: '/3d_models/ford_mustang_1965.glb',              label: 'Ford Mustang 1965' },
  { path: '/3d_models/ford_mustang_roush_2019_-_stage_3.glb', label: 'Mustang Roush Stage 3' },
  { path: '/3d_models/ford_mustang_shelby_2012.glb',       label: 'Mustang Shelby 2012' },
  { path: '/3d_models/tesla_model_3_realistic_graphics.glb', label: 'Tesla Model 3' },
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
  '#1e293b', '#dc2626', '#0f172a', '#94a3b8',
];

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.error('3D model error:', e); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function FallbackCar({ onClick }) {
  return (
    <group onClick={onClick} position={[0, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.7, 1.8]} />
        <meshStandardMaterial color="#4a90e2" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.1, 0.05]} castShadow>
        <boxGeometry args={[2, 0.6, 1.5]} />
        <meshStandardMaterial color="#2563eb" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {[[-1.5, 0.3, 0.95], [1.5, 0.3, 0.95], [-1.5, 0.3, -0.95], [1.5, 0.3, -0.95]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 32]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

// Adjusts camera after model loads to neatly frame it
function CameraFitter({ modelRef }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!modelRef.current) return;
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let dist = (maxDim / 2) / Math.tan(fov / 2);
    dist *= 1.8; // padding

    // Position camera in front and slightly above the model center
    camera.position.set(center.x, center.y + size.y * 0.3, center.z + dist);
    camera.lookAt(center);
    camera.near = dist / 100;
    camera.far  = dist * 100;
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [modelRef.current]); // eslint-disable-line
  return null;
}

function CarModel({ modelUrl, onPartClick, selectedPart, bodyColor, metalness, roughness, modelRef }) {
  const groupRef = useRef();
  const { scene, animations } = useGLTF(modelUrl);

  // Deep-clone scene AND materials — never mutate the GLTF loader cache
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child?.isMesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else if (child.material) {
          child.material = child.material.clone();
        }
      }
    });
    return clone;
  }, [scene]);

  const { actions } = useAnimations(animations, model);

  // ── Center + scale + sit on ground ───────────────────────────────────
  useLayoutEffect(() => {
    if (!model) return;

    // 1. Compute original bounds
    const box = new THREE.Box3().setFromObject(model);
    const size  = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 2. Translate so bounding-box center is at world origin
    model.position.set(-center.x, -center.y, -center.z);

    // 3. Scale so the longest axis = 4 world units
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 4 / maxDim;
    model.scale.setScalar(s);

    // 4. Re-compute box AFTER transforms to find the new floor position
    const box2 = new THREE.Box3().setFromObject(model);
    // Lift so the bottom of the model sits exactly at y = 0
    model.position.y += -box2.min.y;

    // 5. Enable shadows
    model.traverse((child) => {
      if (child?.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });

    // Expose to CameraFitter
    if (modelRef) modelRef.current = model;
  }, [model, modelRef]);

  // ── Store original material properties ───────────────────────────────
  const origRef = useRef(null);
  useLayoutEffect(() => {
    if (!model) return;
    const map = new Map();
    model.traverse((child) => {
      if (!child?.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      map.set(child.uuid, mats.map((m) => ({
        color:     m.color     ? m.color.clone()   : new THREE.Color(1, 1, 1),
        metalness: m.metalness ?? 0.3,
        roughness: m.roughness ?? 0.7,
      })));
    });
    origRef.current = map;
  }, [model]);

  // ── Apply / restore body color ────────────────────────────────────────
  useEffect(() => {
    if (!model || !origRef.current) return;
    model.traverse((child) => {
      if (!child?.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const orig = origRef.current.get(child.uuid) ?? [];
      mats.forEach((mat, i) => {
        if (bodyColor) {
          mat.color.set(new THREE.Color(bodyColor));
          mat.metalness  = metalness;
          mat.roughness  = roughness;
        } else {
          const o = orig[i];
          if (o) {
            mat.color.copy(o.color);
            mat.metalness = o.metalness;
            mat.roughness = o.roughness;
          }
        }
        mat.needsUpdate = true;
      });
    });
  }, [model, bodyColor, metalness, roughness]);

  // Play first animation if present
  useEffect(() => {
    if (actions) {
      const first = Object.values(actions)[0];
      if (first) first.play();
    }
  }, [actions]);

  const handleClick = (e) => {
    e.stopPropagation();
    onPartClick(selectedPart === 'car-body' ? null : 'car-body');
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      <primitive object={model} />
    </group>
  );
}

function Scene({ modelUrl, onPartClick, selectedPart, bodyColor, metalness, roughness }) {
  const modelRef = useRef(null);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 8, 5]}   intensity={1.6} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 4, -3]}  intensity={0.7} />
      <directionalLight position={[0, -2, 6]}   intensity={0.3} />
      <hemisphereLight skyColor="#dbeafe" groundColor="#374151" intensity={0.6} />

      {/* Environment (studio HDR for nice reflections) */}
      <Environment preset="studio" />

      {/* OrbitControls — target matches car center (approx y≈1 after lift) */}
      <OrbitControls
        target={[0, 1, 0]}
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={30}
        enableDamping
        dampingFactor={0.07}
      />

      {/* Auto-fit camera once model loads */}
      <CameraFitter modelRef={modelRef} />

      {/* Floor plane — sits at y=0 to match model bottom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#d1d9e0" roughness={0.85} metalness={0} />
      </mesh>

      {/* Grid */}
      <Grid
        args={[40, 40]}
        position={[0, 0, 0]}
        cellSize={0.8}
        cellThickness={0.3}
        cellColor="#a0aab4"
        sectionSize={4}
        sectionThickness={0.6}
        sectionColor="#7a8894"
        fadeDistance={28}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Car model */}
      <ModelErrorBoundary fallback={<FallbackCar onClick={() => onPartClick('car-body')} />}>
        <CarModel
          modelUrl={modelUrl}
          onPartClick={onPartClick}
          selectedPart={selectedPart}
          bodyColor={bodyColor}
          metalness={metalness}
          roughness={roughness}
          modelRef={modelRef}
        />
      </ModelErrorBoundary>
    </>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="three-canvas-loading">
        <div className="loading-spinner" />
        <p>Loading 3D Model...</p>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const ThreeCanvas = ({ onSelection, onClearSelection }) => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [modelIndex, setModelIndex]     = useState(0);

  // '' = no color override (original GLTF materials shown as-is)
  const [bodyColor,    setBodyColor]    = useState('');
  const [pickerColor,  setPickerColor]  = useState('#3b82f6');
  const [metalness,    setMetalness]    = useState(0.6);
  const [roughness,    setRoughness]    = useState(0.35);
  const [showPanel,    setShowPanel]    = useState(true);
  const [colorEnabled, setColorEnabled] = useState(false);

  const modelUrl = CAR_MODELS[modelIndex].path;

  const handleColorEnabled = (on) => {
    setColorEnabled(on);
    setBodyColor(on ? pickerColor : '');
  };
  const handlePickerChange = (c) => {
    setPickerColor(c);
    if (colorEnabled) setBodyColor(c);
  };
  const handlePreset = (c) => {
    setPickerColor(c);
    setColorEnabled(true);
    setBodyColor(c);
  };

  const handlePartClick = (id) => {
    if (!id) { setSelectedPart(null); onClearSelection(); return; }
    if (selectedPart === id) { setSelectedPart(null); onClearSelection(); }
    else { setSelectedPart(id); onSelection({ id, name: 'Car Body', type: '3d-part' }); }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPart) {
        setSelectedPart(null); onClearSelection();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPart, onClearSelection]);

  return (
    <div className="three-canvas-wrapper">
      {/* ── Control Panel ── */}
      <div className={`three-control-panel ${showPanel ? 'open' : ''}`}>
        <button className="panel-toggle-btn" onClick={() => setShowPanel((v) => !v)}>
          {showPanel ? '◀ Hide' : '▶ 3D Controls'}
        </button>

        {showPanel && (
          <div className="panel-content">
            {/* Model selector */}
            <div className="panel-group">
              <label className="panel-label">🚗 Model</label>
              <select
                className="panel-select"
                value={modelIndex}
                onChange={(e) => setModelIndex(parseInt(e.target.value))}
              >
                {CAR_MODELS.map((m, i) => (
                  <option key={i} value={i}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Body color */}
            <div className="panel-group">
              <div className="panel-label-row">
                <label className="panel-label">🎨 Body Color</label>
                <label className="panel-toggle-label">
                  <input type="checkbox" checked={colorEnabled}
                    onChange={(e) => handleColorEnabled(e.target.checked)} />
                  <span>Apply</span>
                </label>
              </div>
              <div className="color-presets">
                {PRESET_COLORS.map((c) => (
                  <button key={c}
                    className={`color-preset-btn ${pickerColor === c && colorEnabled ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => handlePreset(c)} title={c} />
                ))}
              </div>
              <div className="custom-color-row">
                <input type="color" value={pickerColor}
                  onChange={(e) => handlePickerChange(e.target.value)}
                  className="custom-color-input" />
                <span className="custom-color-label">
                  {colorEnabled ? pickerColor : 'Original'}
                </span>
                {colorEnabled && (
                  <button className="reset-color-btn"
                    onClick={() => { setColorEnabled(false); setBodyColor(''); }}>
                    ↩ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Material sliders */}
            {colorEnabled && (
              <>
                <div className="panel-group">
                  <label className="panel-label">✨ Metalness {Math.round(metalness * 100)}%</label>
                  <input type="range" min="0" max="100"
                    value={Math.round(metalness * 100)}
                    onChange={(e) => setMetalness(parseInt(e.target.value) / 100)}
                    className="panel-slider" />
                </div>
                <div className="panel-group">
                  <label className="panel-label">🪣 Roughness {Math.round(roughness * 100)}%</label>
                  <input type="range" min="0" max="100"
                    value={Math.round(roughness * 100)}
                    onChange={(e) => setRoughness(parseInt(e.target.value) / 100)}
                    className="panel-slider" />
                </div>
              </>
            )}

            <p className="panel-hint">
              {colorEnabled
                ? 'Color applied. Use Reset to restore original.'
                : 'Enable "Apply" to repaint the car body.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Three.js Canvas ── */}
      <Canvas
        shadows
        camera={{ position: [0, 3, 10], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        className="three-canvas"
      >
        <Suspense fallback={<Loader />}>
          <Scene
            key={modelUrl}          /* remount scene on model change */
            modelUrl={modelUrl}
            onPartClick={handlePartClick}
            selectedPart={selectedPart}
            bodyColor={bodyColor}
            metalness={metalness}
            roughness={roughness}
          />
        </Suspense>
      </Canvas>

      {/* Controls hint */}
      <div className="three-canvas-controls">
        <div className="controls-hint">
          <span className="control-item">🔄 Drag: Rotate</span>
          <span className="control-item">🔍 Scroll: Zoom</span>
          <span className="control-item">✋ Middle: Pan</span>
        </div>
      </div>
    </div>
  );
};

export default ThreeCanvas;
