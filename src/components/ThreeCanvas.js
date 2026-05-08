import React, {
  useRef, useState, useEffect, useMemo,
  useLayoutEffect, Suspense, useCallback
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, TransformControls } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import './ThreeCanvas.css';
import {
  CarIcon, PaletteIcon, DownloadIcon, RefreshIcon, ImageIcon,
  ChevronLeftIcon, ChevronRightIcon, SparkleIcon, CheckIcon,
  LayersIcon, SquareIcon, FlagIcon, RadioIcon, TrashIcon,
  MoveIcon, RotateCWIcon, PlusIcon
} from './Icons';

// ── Constants ───────────────────────────────────────────────────────────────

const CAR_MODELS = [
  { path: '/3d_models/1965_ford_mustang_convertible.glb', label: '1965 Ford Mustang Convertible' },
  { path: '/3d_models/ford_mustang_1965.glb',              label: 'Ford Mustang 1965' },
  { path: '/3d_models/2015_ford_mustang_rtr.glb',          label: '2015 Ford Mustang RTR' },
  { path: '/3d_models/ford_mustang_roush_2019_-_stage_3.glb', label: 'Mustang Roush 2019 Stage 3' },
  { path: '/3d_models/ford_mustang_shelby_2012.glb',       label: 'Ford Mustang Shelby 2012' },
  { path: '/3d_models/2025_ford_mustang_gtd.glb',          label: '2025 Ford Mustang GTD' },
  { path: '/3d_models/1970_chevrolet_camaro_z28.glb',      label: '1970 Chevrolet Camaro Z28' },
  { path: '/3d_models/chevrolet_corvette_c7.glb',          label: 'Chevrolet Corvette C7' },
  { path: '/3d_models/2020_chevrolet_corvette_c8_stingray.glb', label: '2020 Corvette C8 Stingray' },
  { path: '/3d_models/1967%20Chevrolet%20Camaro%20SS.glb', label: '1967 Chevrolet Camaro SS' },
  { path: '/3d_models/1969%20Dodge%20Charger%20RT.glb',   label: '1969 Dodge Charger RT' },
  { path: '/3d_models/tesla_model_3_realistic_graphics.glb', label: 'Tesla Model 3' },
  { path: '/3d_models/DC.glb',                              label: 'DC Concept Car' },
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
  '#0f172a', '#dc2626', '#94a3b8', '#1e293b',
];

const ENV_PRESETS = [
  { value: 'studio',    label: 'Studio' },
  { value: 'sunset',    label: 'Sunset' },
  { value: 'city',      label: 'City' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'forest',    label: 'Forest' },
  { value: 'warehouse', label: 'Warehouse' },
];

const ACCESSORY_TYPES = [
  { id: 'spoiler',    label: 'Rear Spoiler',    pos: [0, 1.55, -1.85] },
  { id: 'gt-wing',    label: 'GT Wing',         pos: [0, 2.05, -1.80] },
  { id: 'side-skirts',label: 'Side Skirts',     pos: [0, 0.18, 0] },
  { id: 'front-lip',  label: 'Front Lip',       pos: [0, 0.08, 1.85] },
  { id: 'roof-rack',  label: 'Roof Rack',       pos: [0, 1.85, 0.1] },
  { id: 'shark-fin',  label: 'Shark Fin Ant.',  pos: [0, 1.82, -0.3] },
];

// ── Error Boundary ──────────────────────────────────────────────────────────

class ModelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ── Fallback geometry car ───────────────────────────────────────────────────

function FallbackCar({ onClick }) {
  return (
    <group onClick={onClick}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.7, 1.8]} />
        <meshStandardMaterial color="#4a90e2" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1, 0.05]} castShadow>
        <boxGeometry args={[2, 0.6, 1.5]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {[[-1.5, 0.3, 0.95], [1.5, 0.3, 0.95], [-1.5, 0.3, -0.95], [1.5, 0.3, -0.95]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 32]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

// ── Camera auto-fit ─────────────────────────────────────────────────────────

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
    let dist = (maxDim / 2) / Math.tan(fov / 2) * 1.8;
    camera.position.set(center.x, center.y + size.y * 0.3, center.z + dist);
    camera.lookAt(center);
    camera.near = dist / 100;
    camera.far  = dist * 100;
    camera.updateProjectionMatrix();
    if (controls) { controls.target.copy(center); controls.update(); }
  }, [modelRef.current]); // eslint-disable-line
  return null;
}

// ── Screenshot helper ───────────────────────────────────────────────────────

function ScreenshotHelper({ captureRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = (format = 'png') => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL(`image/${format}`, 1.0);
    };
    return () => { captureRef.current = null; };
  }, [gl, scene, camera, captureRef]);
  return null;
}

// ── Car model — parent-group paint fix ─────────────────────────────────────
//
//  GLTF models split visual parts into many sub-meshes under named parent nodes.
//  e.g. clicking the bonnet might hit "Bonnet_mesh_0" whose parent is "Bonnet_Group".
//  We use the PARENT node's name as the group key so all sub-meshes of a
//  visible part are painted together.

function getGroupKey(mesh) {
  const p = mesh.parent;
  // Walk up until we find a named group that is NOT the scene root
  if (p && p.name && !(p instanceof THREE.Scene)) return p.name;
  return mesh.name || mesh.uuid;
}

function CarModel({
  modelUrl, selectedGroupKey, onMeshClick,
  globalColor, partColors, metalness, roughness, wireframe, modelRef
}) {
  const { scene } = useGLTF(modelUrl);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child?.isMesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone();
      }
    });
    return clone;
  }, [scene]);

  // Centre, scale, sit on ground
  useLayoutEffect(() => {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    model.position.set(-center.x, -center.y, -center.z);
    model.scale.setScalar(4 / (Math.max(size.x, size.y, size.z) || 1));
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y += -box2.min.y;
    model.traverse((child) => {
      if (child?.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    if (modelRef) modelRef.current = model;
  }, [model, modelRef]);

  // Snapshot original materials
  const origRef = useRef(null);
  useLayoutEffect(() => {
    if (!model) return;
    const map = new Map();
    model.traverse((child) => {
      if (!child?.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      map.set(child.uuid, mats.map((m) => ({
        color:     m.color ? m.color.clone() : new THREE.Color(1, 1, 1),
        metalness: m.metalness ?? 0.3,
        roughness: m.roughness ?? 0.7,
      })));
    });
    origRef.current = map;
  }, [model]);

  // Apply colours — keyed by parent group so all sub-meshes of a part match
  useEffect(() => {
    if (!model || !origRef.current) return;
    model.traverse((child) => {
      if (!child?.isMesh || !child.material) return;
      const gk = getGroupKey(child);
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const orig = origRef.current.get(child.uuid) ?? [];
      const partColor = partColors?.get(gk);
      const isSelected = gk === selectedGroupKey;

      mats.forEach((mat, i) => {
        mat.wireframe = !!wireframe;
        if (mat.emissive) {
          // Bright amber/gold highlight on selected group
          mat.emissive.set(isSelected ? new THREE.Color(0.35, 0.25, 0) : new THREE.Color(0, 0, 0));
          mat.emissiveIntensity = isSelected ? 1.5 : 0;
        }
        if (partColor) {
          mat.color.set(partColor.color);
          mat.metalness = partColor.metalness;
          mat.roughness = partColor.roughness;
        } else if (globalColor) {
          mat.color.set(globalColor);
          mat.metalness = metalness;
          mat.roughness = roughness;
        } else {
          const o = orig[i];
          if (o) { mat.color.copy(o.color); mat.metalness = o.metalness; mat.roughness = o.roughness; }
        }
        mat.needsUpdate = true;
      });
    });
  }, [model, selectedGroupKey, partColors, globalColor, metalness, roughness, wireframe]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.object?.isMesh) {
      const gk = getGroupKey(e.object);
      const label = e.object.parent?.name || e.object.name || 'Part';
      onMeshClick(gk, label);
    }
  };

  return (
    <group onClick={handleClick}>
      <primitive object={model} />
    </group>
  );
}

// ── 3D Accessory Geometry ───────────────────────────────────────────────────

function Accessory3D({ type, color }) {
  const mat = <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />;

  if (type === 'spoiler') return (
    <group>
      {/* Blade */}
      <mesh position={[0, 0.18, 0]}><boxGeometry args={[2, 0.07, 0.32]} />{mat}</mesh>
      {/* End plates */}
      {[-0.97, 0.97].map((x, i) => (
        <mesh key={i} position={[x, 0.09, 0]}><boxGeometry args={[0.06, 0.27, 0.32]} />{mat}</mesh>
      ))}
      {/* Stands */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, -0.09, 0.05]}><boxGeometry args={[0.07, 0.3, 0.07]} />{mat}</mesh>
      ))}
    </group>
  );

  if (type === 'gt-wing') return (
    <group>
      {/* Main blade (elevated) */}
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[2.9, 0.06, 0.28]} />{mat}</mesh>
      {/* End plates */}
      {[-1.42, 1.42].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0]}><boxGeometry args={[0.06, 0.3, 0.28]} />{mat}</mesh>
      ))}
      {/* Angled struts */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} position={[x, 0.22, 0.04]} rotation={[0.22, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.52, 8]} />{mat}
        </mesh>
      ))}
      {/* Base feet */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} position={[x, -0.04, 0]}><boxGeometry args={[0.3, 0.06, 0.22]} />{mat}</mesh>
      ))}
    </group>
  );

  if (type === 'side-skirts') return (
    <group>
      {/* Both skirts rendered as one piece — user slides it to one side */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[3.6, 0.1, 0.16]} />{mat}</mesh>
      {/* Subtle chamfer strip */}
      <mesh position={[0, -0.04, -0.09]}><boxGeometry args={[3.6, 0.02, 0.02]} />{mat}</mesh>
    </group>
  );

  if (type === 'front-lip') return (
    <group>
      {/* Centre splitter */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[2.2, 0.06, 0.32]} />{mat}</mesh>
      {/* Side winglets */}
      {[-1.0, 1.0].map((x, i) => (
        <mesh key={i} position={[x * 1.15, 0, -0.04]} rotation={[0, i === 0 ? 0.25 : -0.25, 0]}>
          <boxGeometry args={[0.32, 0.06, 0.28]} />{mat}
        </mesh>
      ))}
    </group>
  );

  if (type === 'roof-rack') return (
    <group>
      {/* Side rails */}
      {[-0.38, 0.38].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.9, 8]} />{mat}
        </mesh>
      ))}
      {/* Cross bars */}
      {[-0.55, 0, 0.55].map((z, i) => (
        <mesh key={i} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />{mat}
        </mesh>
      ))}
    </group>
  );

  if (type === 'shark-fin') return (
    <group>
      {/* Base */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.07, 0.04, 0.22]} />{mat}</mesh>
      {/* Fin — three tapering slices */}
      <mesh position={[0, 0.18, 0.04]}><boxGeometry args={[0.06, 0.32, 0.16]} />{mat}</mesh>
      <mesh position={[0, 0.38, 0.06]}><boxGeometry args={[0.05, 0.2, 0.08]} />{mat}</mesh>
      <mesh position={[0, 0.52, 0.08]}><boxGeometry args={[0.04, 0.1, 0.04]} />{mat}</mesh>
    </group>
  );

  return null;
}

// ── GLTF accessory loader (used when catalog accessory has a model3dUrl) ─────

function GltfAccessory({ url, color }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    const col = new THREE.Color(color);
    c.traverse((child) => {
      if (child?.isMesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => { const n = m.clone(); n.color.set(col); return n; })
          : (() => { const n = child.material.clone(); n.color.set(col); return n; })();
        child.castShadow = true;
      }
    });
    // Normalize size to ~1 unit
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    c.scale.setScalar(1.0 / (Math.max(size.x, size.y, size.z) || 1));
    return c;
  }, [scene, color]);
  return <primitive object={clone} />;
}

// ── Single placed accessory with optional TransformControls ────────────────

function AccGroup({ acc, isSelected, transformMode, orbitRef, onSelect, color }) {
  const groupRef = useRef();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (groupRef.current) {
      const [x, y, z] = acc.defaultPosition;
      groupRef.current.position.set(x, y, z);
      setReady(true);
    }
  }, []); // eslint-disable-line

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onSelect(acc.id); }}
      >
        {acc.model3dUrl ? (
          <Suspense fallback={
            <mesh><boxGeometry args={[0.5, 0.2, 0.5]} /><meshStandardMaterial color="#94a3b8" wireframe /></mesh>
          }>
            <GltfAccessory url={acc.model3dUrl} color={color || '#1e293b'} />
          </Suspense>
        ) : (
          <Accessory3D type={acc.type} color={color || '#1e293b'} />
        )}
        {/* Selection outline box */}
        {isSelected && (
          <mesh>
            <boxGeometry args={[3.2, 0.9, 0.55]} />
            <meshBasicMaterial color="#fbbf24" wireframe opacity={0.5} transparent />
          </mesh>
        )}
      </group>

      {/* TransformControls attaches AFTER the group is mounted */}
      {isSelected && ready && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          size={0.7}
          onMouseDown={() => { if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => { if (orbitRef.current) orbitRef.current.enabled = true; }}
        />
      )}
    </>
  );
}

// ── Scene ───────────────────────────────────────────────────────────────────

function Scene({
  modelUrl, selectedGroupKey, onMeshClick,
  globalColor, partColors, metalness, roughness, wireframe, envPreset,
  captureRef, orbitRef,
  accessories, selectedAccessoryId, transformMode, onAccessorySelect,
  accessoryColors,
}) {
  const modelRef = useRef(null);

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 8, 5]} intensity={1.6} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5} shadow-camera-far={100}
        shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 4, -3]} intensity={0.7} />
      <directionalLight position={[0, -2, 6]} intensity={0.3} />
      <hemisphereLight skyColor="#dbeafe" groundColor="#374151" intensity={0.6} />

      <Environment preset={envPreset} />

      <OrbitControls
        ref={orbitRef}
        target={[0, 1, 0]} enablePan enableZoom enableRotate
        minDistance={2} maxDistance={30} enableDamping dampingFactor={0.07}
      />

      <CameraFitter modelRef={modelRef} />
      <ScreenshotHelper captureRef={captureRef} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#d1d9e0" roughness={0.85} metalness={0} />
      </mesh>
      <Grid args={[40, 40]} position={[0, 0, 0]}
        cellSize={0.8} cellThickness={0.3} cellColor="#a0aab4"
        sectionSize={4} sectionThickness={0.6} sectionColor="#7a8894"
        fadeDistance={28} fadeStrength={1} followCamera={false} infiniteGrid
      />

      {/* Car */}
      <ModelErrorBoundary fallback={<FallbackCar onClick={() => onMeshClick('body', 'Car Body')} />}>
        <CarModel
          modelUrl={modelUrl}
          selectedGroupKey={selectedGroupKey}
          onMeshClick={onMeshClick}
          globalColor={globalColor}
          partColors={partColors}
          metalness={metalness}
          roughness={roughness}
          wireframe={wireframe}
          modelRef={modelRef}
        />
      </ModelErrorBoundary>

      {/* Accessories */}
      {accessories.map((acc) => (
        <AccGroup
          key={acc.id}
          acc={acc}
          isSelected={acc.id === selectedAccessoryId}
          transformMode={transformMode}
          orbitRef={orbitRef}
          onSelect={onAccessorySelect}
          color={accessoryColors[acc.id] || '#1e293b'}
        />
      ))}
    </>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="three-canvas-loading">
        <div className="loading-spinner" />
        <p>Loading 3D Model…</p>
      </div>
    </Html>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

const ThreeCanvas = ({ onSelection, onClearSelection, carCatalog }) => {
  // ── Panel
  const [showPanel,   setShowPanel]   = useState(true);
  const [panelTab,    setPanelTab]    = useState('paint'); // 'paint' | 'accessories'

  // ── Model list — catalog model injected at front when available
  const allModels = useMemo(() => {
    if (carCatalog?.model3dUrl) {
      const catalogEntry = {
        path: carCatalog.model3dUrl,
        label: `${carCatalog.make} ${carCatalog.model}${carCatalog.year ? ` (${carCatalog.year})` : ''}`,
        isCatalog: true,
      };
      return [catalogEntry, ...CAR_MODELS];
    }
    return CAR_MODELS;
  }, [carCatalog]);

  const [modelIndex,  setModelIndex]  = useState(0);
  const modelUrl = allModels[modelIndex]?.path || CAR_MODELS[0].path;

  // Auto-select catalog model when carCatalog arrives
  useEffect(() => {
    if (carCatalog?.model3dUrl) setModelIndex(0);
  }, [carCatalog?.model3dUrl]); // eslint-disable-line

  // ── Paint
  const [paintTarget,      setPaintTarget]      = useState('all');
  const [paintTargetLabel, setPaintTargetLabel] = useState('All Parts');
  const [partColors,       setPartColors]       = useState(new Map());
  const [globalColor,      setGlobalColor]      = useState('');
  const [pickerColor,      setPickerColor]      = useState('#ef4444');
  const [metalness,        setMetalness]        = useState(0.6);
  const [roughness,        setRoughness]        = useState(0.35);
  const [colorApplied,     setColorApplied]     = useState(false);

  // ── Scene
  const [envPreset,   setEnvPreset]   = useState('studio');
  const [wireframe,   setWireframe]   = useState(false);

  // ── Accessories — merge catalog accessories with built-ins
  const catalogAcc3d = useMemo(() => {
    if (!carCatalog?.accessories) return [];
    return carCatalog.accessories
      .filter((a) => a.isActive !== false && (a.accessoryType === '3d' || a.accessoryType === 'both'))
      .map((a) => ({
        id: `catalog-${a._id}`,
        type: 'catalog',
        model3dUrl: a.model3dUrl || '',
        label: a.name,
        pos: a.defaultPosition3d || [0, 1.5, -1.8],
      }));
  }, [carCatalog]);

  const availableAccessoryTypes = useMemo(() => {
    const catalogItems = catalogAcc3d.map((a) => ({
      id: a.id, label: a.label, pos: a.pos, model3dUrl: a.model3dUrl, isCatalog: true,
    }));
    return [...catalogItems, ...ACCESSORY_TYPES.map((a) => ({ ...a, isCatalog: false }))];
  }, [catalogAcc3d]);

  const [accessories,         setAccessories]         = useState([]);
  const [selectedAccessoryId, setSelectedAccessoryId] = useState(null);
  const [transformMode,       setTransformMode]       = useState('translate');
  const [accessoryColors,     setAccessoryColors]     = useState({});
  const [accPickerColor,      setAccPickerColor]      = useState('#1e293b');

  const captureRef = useRef(null);
  const orbitRef   = useRef(null);

  // Reset paint when model changes
  useEffect(() => {
    setPartColors(new Map());
    setGlobalColor('');
    setColorApplied(false);
    setPaintTarget('all');
    setPaintTargetLabel('All Parts');
  }, [modelIndex]);

  // ── Mesh click (paint tab) ─────────────────────────────────────────────

  const handleMeshClick = useCallback((gk, label) => {
    // Clicking in accessories tab selects accessory, not car part
    if (selectedAccessoryId) { setSelectedAccessoryId(null); onClearSelection(); return; }

    if (paintTarget === gk) {
      setPaintTarget('all');
      setPaintTargetLabel('All Parts');
      onClearSelection();
    } else {
      setPaintTarget(gk);
      setPaintTargetLabel(label);
      onSelection({ id: gk, name: label, type: '3d-part' });
    }
  }, [paintTarget, selectedAccessoryId, onSelection, onClearSelection]);

  // ── Apply colour ───────────────────────────────────────────────────────

  const applyColor = useCallback((color) => {
    setPickerColor(color);
    if (paintTarget === 'all') {
      setGlobalColor(color);
      setColorApplied(true);
    } else {
      setPartColors((prev) => {
        const next = new Map(prev);
        next.set(paintTarget, { color, metalness, roughness });
        return next;
      });
      setColorApplied(true);
    }
  }, [paintTarget, metalness, roughness]);

  const syncMaterial = useCallback((m, r) => {
    if (paintTarget !== 'all' && partColors.has(paintTarget)) {
      setPartColors((prev) => {
        const next = new Map(prev);
        const ex = next.get(paintTarget);
        next.set(paintTarget, { ...ex, metalness: m, roughness: r });
        return next;
      });
    }
  }, [paintTarget, partColors]);

  const handleMetal  = (v) => { const n = v / 100; setMetalness(n); syncMaterial(n, roughness); };
  const handleRough  = (v) => { const n = v / 100; setRoughness(n); syncMaterial(metalness, n); };

  const resetTarget = () => {
    if (paintTarget === 'all') { setGlobalColor(''); setColorApplied(false); }
    else {
      setPartColors((prev) => { const n = new Map(prev); n.delete(paintTarget); return n; });
      if (partColors.size <= 1) setColorApplied(false);
    }
  };

  const resetAll = () => {
    setGlobalColor(''); setPartColors(new Map());
    setColorApplied(false); setPaintTarget('all'); setPaintTargetLabel('All Parts');
    onClearSelection();
  };

  // ── Accessories ────────────────────────────────────────────────────────

  const addAccessory = (typeOrId) => {
    const def = availableAccessoryTypes.find((a) => a.id === typeOrId);
    if (!def) return;
    const id = `acc-${Date.now()}`;
    setAccessories((prev) => [
      ...prev,
      {
        id,
        type: def.isCatalog ? 'catalog' : def.id,
        defaultPosition: def.pos,
        label: def.label,
        model3dUrl: def.model3dUrl || '',
      },
    ]);
    setSelectedAccessoryId(id);
    setPanelTab('accessories');
  };

  const removeAccessory = (id) => {
    setAccessories((prev) => prev.filter((a) => a.id !== id));
    if (selectedAccessoryId === id) { setSelectedAccessoryId(null); onClearSelection(); }
    setAccessoryColors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleAccessorySelect = useCallback((id) => {
    if (selectedAccessoryId === id) {
      setSelectedAccessoryId(null); onClearSelection();
    } else {
      setSelectedAccessoryId(id);
      setPaintTarget('all'); setPaintTargetLabel('All Parts');
      const acc = accessories.find((a) => a.id === id);
      onSelection({ id, name: acc?.label || 'Accessory', type: '3d-accessory' });
    }
  }, [selectedAccessoryId, accessories, onSelection, onClearSelection]);

  const applyAccColor = (color) => {
    setAccPickerColor(color);
    if (selectedAccessoryId) {
      setAccessoryColors((prev) => ({ ...prev, [selectedAccessoryId]: color }));
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────

  const handleExport = (format = 'png') => {
    if (!captureRef.current) return;
    const data = captureRef.current(format);
    const link = document.createElement('a');
    link.download = `autovision-3d.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = data;
    link.click();
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') {
        setPaintTarget('all'); setPaintTargetLabel('All Parts');
        setSelectedAccessoryId(null); onClearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAccessoryId) removeAccessory(selectedAccessoryId);
      }
      if (e.key === 'g' || e.key === 'G') setTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate');
      if (e.key === 's' || e.key === 'S') setTransformMode('scale');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedAccessoryId, onClearSelection]); // eslint-disable-line

  const isPartPainted = paintTarget !== 'all' ? partColors.has(paintTarget) : !!globalColor;
  const selectedAcc   = accessories.find((a) => a.id === selectedAccessoryId);

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="three-canvas-wrapper">

      {/* ── Control Panel ── */}
      <div className={`three-control-panel ${showPanel ? 'open' : ''}`}>
        <button className="panel-toggle-btn" onClick={() => setShowPanel((v) => !v)}>
          {showPanel
            ? <><ChevronRightIcon size={12} /> Hide</>
            : <><ChevronLeftIcon  size={12} /> 3D Controls</>}
        </button>

        {showPanel && (
          <div className="panel-content">

            {/* Model selector */}
            <div className="panel-group">
              <label className="panel-label"><CarIcon size={11} /> Model</label>
              <select className="panel-select" value={modelIndex}
                onChange={(e) => setModelIndex(parseInt(e.target.value))}>
                {allModels.map((m, i) => (
                  <option key={i} value={i}>
                    {m.isCatalog ? `★ ${m.label}` : m.label}
                  </option>
                ))}
              </select>
              {allModels[modelIndex]?.isCatalog && (
                <p className="panel-hint" style={{ color: '#22c55e', marginTop: 4 }}>
                  Showing catalog model for this car
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="panel-tabs">
              <button className={`panel-tab ${panelTab === 'paint' ? 'active' : ''}`}
                onClick={() => setPanelTab('paint')}>
                <PaletteIcon size={12} /> Paint
              </button>
              <button className={`panel-tab ${panelTab === 'accessories' ? 'active' : ''}`}
                onClick={() => setPanelTab('accessories')}>
                <FlagIcon size={12} /> Accessories
                {accessories.length > 0 && <span className="tab-badge">{accessories.length}</span>}
              </button>
            </div>

            {/* ── PAINT TAB ── */}
            {panelTab === 'paint' && (
              <>
                {/* Paint target */}
                <div className="panel-group">
                  <div className="panel-label-row">
                    <label className="panel-label"><PaletteIcon size={11} /> Paint Target</label>
                    {paintTarget !== 'all' && (
                      <button className="paint-target-clear" onClick={() => {
                        setPaintTarget('all'); setPaintTargetLabel('All Parts'); onClearSelection();
                      }}>All Parts</button>
                    )}
                  </div>
                  <div className={`paint-target-badge ${paintTarget !== 'all' ? 'part' : ''}`}>
                    {paintTarget !== 'all'
                      ? <><LayersIcon size={11} /> {paintTargetLabel}</>
                      : <><CarIcon    size={11} /> All Parts — click a part to select it</>}
                  </div>
                </div>

                {/* Colour swatches */}
                <div className="panel-group">
                  <label className="panel-label">Quick Colors</label>
                  <div className="color-presets">
                    {PRESET_COLORS.map((c) => (
                      <button key={c}
                        className={`color-preset-btn ${pickerColor === c && colorApplied ? 'selected' : ''}`}
                        style={{ background: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none' }}
                        onClick={() => applyColor(c)} title={c} />
                    ))}
                  </div>
                  <div className="custom-color-row">
                    <input type="color" value={pickerColor}
                      onChange={(e) => applyColor(e.target.value)}
                      className="custom-color-input" />
                    <span className="custom-color-label">
                      {colorApplied ? pickerColor : 'Original'}
                    </span>
                    {isPartPainted && (
                      <button className="reset-color-btn" onClick={resetTarget}>
                        <RefreshIcon size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Material */}
                {colorApplied && (
                  <>
                    <div className="panel-group">
                      <label className="panel-label">
                        <SparkleIcon size={11} /> Metalness {Math.round(metalness * 100)}%
                      </label>
                      <input type="range" min="0" max="100" value={Math.round(metalness * 100)}
                        onChange={(e) => handleMetal(parseInt(e.target.value))}
                        className="panel-slider" />
                    </div>
                    <div className="panel-group">
                      <label className="panel-label">
                        <SquareIcon size={11} /> Roughness {Math.round(roughness * 100)}%
                      </label>
                      <input type="range" min="0" max="100" value={Math.round(roughness * 100)}
                        onChange={(e) => handleRough(parseInt(e.target.value))}
                        className="panel-slider" />
                    </div>
                  </>
                )}

                {/* Painted summary */}
                {(partColors.size > 0 || globalColor) && (
                  <div className="painted-parts-row">
                    <CheckIcon size={11} />
                    <span>{partColors.size > 0 ? `${partColors.size} part(s) painted` : 'Full car painted'}</span>
                    <button className="reset-all-btn" onClick={resetAll}>Reset All</button>
                  </div>
                )}
              </>
            )}

            {/* ── ACCESSORIES TAB ── */}
            {panelTab === 'accessories' && (
              <>
                {/* Add buttons */}
                <div className="panel-group">
                  <label className="panel-label"><PlusIcon size={11} /> Add to Car</label>
                  <div className="acc-add-grid">
                    {availableAccessoryTypes.map((a) => (
                      <button key={a.id} className="acc-add-btn" onClick={() => addAccessory(a.id)}>
                        <PlusIcon size={11} />
                        {a.isCatalog ? <><span style={{ color: '#22c55e', fontSize: 9 }}>★</span> {a.label}</> : a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placed accessories */}
                {accessories.length > 0 && (
                  <div className="panel-group">
                    <label className="panel-label"><LayersIcon size={11} /> Placed ({accessories.length})</label>
                    <div className="acc-list">
                      {accessories.map((acc) => (
                        <div key={acc.id}
                          className={`acc-list-item ${acc.id === selectedAccessoryId ? 'active' : ''}`}
                          onClick={() => handleAccessorySelect(acc.id)}
                        >
                          <span className="acc-list-label">{acc.label}</span>
                          <button className="acc-delete-btn" onClick={(e) => {
                            e.stopPropagation(); removeAccessory(acc.id);
                          }}>
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected accessory controls */}
                {selectedAcc && (
                  <>
                    <div className="panel-group">
                      <label className="panel-label">Transform: {selectedAcc.label}</label>
                      <div className="transform-mode-row">
                        <button className={`mode-pill ${transformMode === 'translate' ? 'active' : ''}`}
                          onClick={() => setTransformMode('translate')}>
                          <MoveIcon size={12} /> Move (G)
                        </button>
                        <button className={`mode-pill ${transformMode === 'rotate' ? 'active' : ''}`}
                          onClick={() => setTransformMode('rotate')}>
                          <RotateCWIcon size={12} /> Rotate (R)
                        </button>
                        <button className={`mode-pill ${transformMode === 'scale' ? 'active' : ''}`}
                          onClick={() => setTransformMode('scale')}>
                          <SquareIcon size={12} /> Scale (S)
                        </button>
                      </div>
                    </div>

                    <div className="panel-group">
                      <label className="panel-label"><PaletteIcon size={11} /> Accessory Color</label>
                      <div className="color-presets">
                        {PRESET_COLORS.map((c) => (
                          <button key={c}
                            className={`color-preset-btn ${accPickerColor === c ? 'selected' : ''}`}
                            style={{ background: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none' }}
                            onClick={() => applyAccColor(c)} title={c} />
                        ))}
                      </div>
                      <div className="custom-color-row">
                        <input type="color" value={accPickerColor}
                          onChange={(e) => applyAccColor(e.target.value)}
                          className="custom-color-input" />
                        <span className="custom-color-label">{accPickerColor}</span>
                      </div>
                    </div>
                  </>
                )}

                {accessories.length === 0 && (
                  <p className="panel-hint">Add accessories above — they appear on the car and can be repositioned.</p>
                )}
              </>
            )}

            {/* Environment (always visible) */}
            <div className="panel-group">
              <label className="panel-label">Environment</label>
              <select className="panel-select" value={envPreset}
                onChange={(e) => setEnvPreset(e.target.value)}>
                {ENV_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Wireframe */}
            <div className="panel-group">
              <label className="panel-toggle-label" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={wireframe}
                  onChange={(e) => setWireframe(e.target.checked)} />
                <span>Wireframe Mode</span>
              </label>
            </div>

            {/* Export */}
            <div className="panel-group">
              <label className="panel-label"><DownloadIcon size={11} /> Export</label>
              <div className="export-row">
                <button className="panel-export-btn" onClick={() => handleExport('png')}>
                  <DownloadIcon size={13} /> PNG
                </button>
                <button className="panel-export-btn secondary" onClick={() => handleExport('jpeg')}>
                  <ImageIcon size={13} /> JPG
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Three.js Canvas ── */}
      <Canvas
        shadows
        camera={{ position: [0, 3, 10], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true, alpha: false, powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0,
          preserveDrawingBuffer: true,
        }}
        className="three-canvas"
      >
        <Suspense fallback={<Loader />}>
          <Scene
            key={modelUrl}
            modelUrl={modelUrl}
            selectedGroupKey={paintTarget !== 'all' ? paintTarget : null}
            onMeshClick={handleMeshClick}
            globalColor={globalColor}
            partColors={partColors}
            metalness={metalness}
            roughness={roughness}
            wireframe={wireframe}
            envPreset={envPreset}
            captureRef={captureRef}
            orbitRef={orbitRef}
            accessories={accessories}
            selectedAccessoryId={selectedAccessoryId}
            transformMode={transformMode}
            onAccessorySelect={handleAccessorySelect}
            accessoryColors={accessoryColors}
          />
        </Suspense>
      </Canvas>

      {/* ── Controls hint ── */}
      <div className="three-canvas-controls">
        <div className="controls-hint">
          <span className="control-item">Drag — Rotate</span>
          <span className="control-item">Scroll — Zoom</span>
          <span className="control-item">Middle — Pan</span>
          <span className="control-item">Click part — Paint</span>
          {selectedAccessoryId && <span className="control-item control-item-accent">G Move · R Rotate · S Scale · Del Remove</span>}
          <span className="control-item">Esc — Deselect</span>
        </div>
      </div>

    </div>
  );
};

export default ThreeCanvas;
