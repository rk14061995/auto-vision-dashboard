import React, { useState, useRef } from 'react';
import './Sidebar.css';
import CarPartsSelector from './CarPartsSelector';
import {
  PaletteIcon, FlagIcon, RadioIcon, SparkleIcon, TypeIcon,
  ImageIcon, PencilIcon, PlusIcon, FolderIcon, CheckIcon,
  StopCircleIcon, SquareIcon, CircleIcon, MinusIcon, InfoIcon,
  MoveIcon, KeyboardIcon, ChevronLeftIcon, ChevronRightIcon, CarIcon
} from './Icons';

const { fabric } = require('fabric');

// Built-in SVG accessories – no external URLs needed
const ACCESSORY_SVGS = {
  spoilers: [
    {
      id: 'spoiler1', name: 'Sport Spoiler',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 40" width="140" height="40">
        <rect x="10" y="20" width="120" height="8" rx="4" fill="#1e293b"/>
        <rect x="15" y="10" width="110" height="12" rx="3" fill="#334155"/>
        <rect x="20" y="28" width="8" height="10" rx="2" fill="#1e293b"/>
        <rect x="112" y="28" width="8" height="10" rx="2" fill="#1e293b"/>
      </svg>`
    },
    {
      id: 'spoiler2', name: 'GT Wing',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50">
        <path d="M10 30 Q80 5 150 30" stroke="#dc2626" stroke-width="6" fill="none" stroke-linecap="round"/>
        <rect x="30" y="28" width="6" height="18" rx="2" fill="#dc2626"/>
        <rect x="124" y="28" width="6" height="18" rx="2" fill="#dc2626"/>
      </svg>`
    },
    {
      id: 'spoiler3', name: 'Racing Spoiler',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 45" width="150" height="45">
        <rect x="5" y="15" width="140" height="10" rx="5" fill="#0f172a"/>
        <rect x="5" y="23" width="140" height="4" rx="2" fill="#3b82f6"/>
        <rect x="25" y="25" width="8" height="18" rx="2" fill="#0f172a"/>
        <rect x="117" y="25" width="8" height="18" rx="2" fill="#0f172a"/>
      </svg>`
    },
  ],
  antennas: [
    {
      id: 'antenna1', name: 'Shark Fin',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 70" width="40" height="70">
        <path d="M20 65 L5 20 Q20 2 35 20 Z" fill="#1e293b"/>
        <path d="M20 65 L7 22 Q20 6 33 22 Z" fill="#334155"/>
      </svg>`
    },
    {
      id: 'antenna2', name: 'Short Antenna',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 55" width="20" height="55">
        <rect x="8" y="5" width="4" height="45" rx="2" fill="#1e293b"/>
        <circle cx="10" cy="5" r="4" fill="#374151"/>
        <rect x="5" y="48" width="10" height="6" rx="2" fill="#1e293b"/>
      </svg>`
    },
    {
      id: 'antenna3', name: 'Radio Antenna',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 65" width="24" height="65">
        <rect x="10" y="3" width="4" height="55" rx="2" fill="#64748b"/>
        <rect x="6" y="56" width="12" height="8" rx="3" fill="#334155"/>
        <ellipse cx="12" cy="3" rx="4" ry="2" fill="#94a3b8"/>
      </svg>`
    },
  ],
  stickers: [
    {
      id: 'sticker1', name: 'Flame',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="80" height="90">
        <path d="M40 85 C15 70 10 50 20 35 C25 25 30 30 28 20 C35 30 32 38 38 42 C36 30 42 15 50 10 C48 28 55 32 52 45 C58 35 62 40 60 55 C65 45 70 50 65 65 C58 78 50 85 40 85Z" fill="url(#flameGrad)"/>
        <defs><linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#dc2626"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs>
      </svg>`
    },
    {
      id: 'sticker2', name: 'Racing Stripe',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 30" width="120" height="30">
        <rect width="120" height="30" fill="#dc2626"/>
        <rect y="8" width="120" height="14" fill="white"/>
        <rect y="10" width="120" height="10" fill="#dc2626"/>
      </svg>`
    },
    {
      id: 'sticker3', name: 'Star',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
        <polygon points="40,5 50,30 75,30 55,48 63,74 40,58 17,74 25,48 5,30 30,30" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
      </svg>`
    },
    {
      id: 'sticker4', name: 'Lightning',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="60" height="90">
        <polygon points="35,5 10,50 30,50 25,85 55,38 35,38 45,5" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
      </svg>`
    },
    {
      id: 'sticker5', name: 'Crown',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70" width="90" height="70">
        <polygon points="5,55 5,20 22,38 45,8 68,38 85,20 85,55" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
        <rect x="5" y="55" width="80" height="12" rx="3" fill="#d97706"/>
        <circle cx="45" cy="8" r="6" fill="#fbbf24"/>
        <circle cx="5" cy="20" r="5" fill="#fbbf24"/>
        <circle cx="85" cy="20" r="5" fill="#fbbf24"/>
      </svg>`
    },
  ],
  graphics: [
    {
      id: 'graphic1', name: 'Side Stripe',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" width="160" height="40">
        <rect width="160" height="40" rx="4" fill="none"/>
        <path d="M0 20 L30 5 L160 5 L130 20 L160 35 L30 35 Z" fill="#3b82f6" opacity="0.9"/>
        <path d="M0 20 L30 5 L160 5" stroke="white" stroke-width="2" fill="none"/>
        <path d="M0 20 L30 35 L160 35" stroke="white" stroke-width="2" fill="none"/>
      </svg>`
    },
    {
      id: 'graphic2', name: 'Checkered',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 30" width="120" height="30">
        <rect width="120" height="30" fill="white"/>
        ${Array.from({ length: 8 }, (_, i) =>
          `<rect x="${i * 15}" y="0" width="15" height="15" fill="${i % 2 === 0 ? '#1e293b' : 'white'}"/>
           <rect x="${i * 15 + 7.5}" y="15" width="15" height="15" fill="${i % 2 === 0 ? '#1e293b' : 'white'}"/>`
        ).join('')}
      </svg>`
    },
    {
      id: 'graphic3', name: 'Racing #1',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
        <circle cx="30" cy="30" r="28" fill="#dc2626" stroke="white" stroke-width="3"/>
        <text x="30" y="42" text-anchor="middle" font-family="Arial Black" font-size="32" font-weight="900" fill="white">1</text>
      </svg>`
    },
    {
      id: 'graphic4', name: 'Racing #99',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" width="80" height="60">
        <rect width="80" height="60" rx="8" fill="#1e293b"/>
        <text x="40" y="44" text-anchor="middle" font-family="Arial Black" font-size="32" font-weight="900" fill="#fbbf24">99</text>
      </svg>`
    },
  ]
};

const fontOptions = [
  'Arial', 'Arial Black', 'Times New Roman', 'Georgia', 'Verdana',
  'Impact', 'Trebuchet MS', 'Courier New', 'Palatino', 'Comic Sans MS'
];

const Sidebar = ({ fabricCanvas, selectedObject, onSelectCarPart, carCatalog }) => {
  const [activeCategory, setActiveCategory] = useState('stickers');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // Text state
  const [customText, setCustomText] = useState('');
  const [selectedFont, setSelectedFont] = useState('Impact');
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState('#ff0000');
  const [textBold, setTextBold] = useState(true);
  const [textShadow, setTextShadow] = useState(true);

  // Draw state
  const [drawMode, setDrawMode] = useState(null); // 'pencil' | 'rect' | 'circle' | 'line' | null
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawFill, setDrawFill] = useState('transparent');
  const drawStartRef = useRef(null);
  const drawShapeRef = useRef(null);
  const logoInputRef = useRef(null);

  // Sync text editor when a text object is selected
  React.useEffect(() => {
    if (selectedObject && selectedObject.type === 'text') {
      setCustomText(selectedObject.text);
      setSelectedFont(selectedObject.fontFamily || 'Impact');
      setFontSize(selectedObject.fontSize || 36);
      setTextColor(selectedObject.fill || '#ff0000');
      setIsEditingText(true);
      setActiveCategory('text');
    } else {
      setIsEditingText(false);
    }
  }, [selectedObject]);

  // Drawing tool mode management
  React.useEffect(() => {
    if (!fabricCanvas) return;

    const isDrawing = drawMode === 'pencil';
    fabricCanvas.isDrawingMode = isDrawing;

    if (isDrawing) {
      fabricCanvas.freeDrawingBrush.color = drawColor;
      fabricCanvas.freeDrawingBrush.width = drawWidth;
    }

    // Detach shape drawing listeners
    fabricCanvas.off('mouse:down', handleShapeDown);
    fabricCanvas.off('mouse:move', handleShapeMove);
    fabricCanvas.off('mouse:up', handleShapeUp);

    if (drawMode === 'rect' || drawMode === 'circle' || drawMode === 'line') {
      fabricCanvas.selection = false;
      fabricCanvas.on('mouse:down', handleShapeDown);
      fabricCanvas.on('mouse:move', handleShapeMove);
      fabricCanvas.on('mouse:up', handleShapeUp);
    } else if (!isDrawing) {
      fabricCanvas.selection = true;
    }

    fabricCanvas.requestRenderAll();

    return () => {
      fabricCanvas.off('mouse:down', handleShapeDown);
      fabricCanvas.off('mouse:move', handleShapeMove);
      fabricCanvas.off('mouse:up', handleShapeUp);
    };
  }, [fabricCanvas, drawMode, drawColor, drawWidth, drawFill]);

  const handleShapeDown = (opt) => {
    if (!fabricCanvas) return;
    const pointer = fabricCanvas.getPointer(opt.e);
    drawStartRef.current = { x: pointer.x, y: pointer.y };

    const commonProps = {
      left: pointer.x,
      top: pointer.y,
      stroke: drawColor,
      strokeWidth: drawWidth,
      selectable: true,
      evented: true,
    };

    if (drawMode === 'rect') {
      const rect = new fabric.Rect({
        ...commonProps,
        width: 0,
        height: 0,
        fill: drawFill === 'transparent' ? 'transparent' : drawFill,
      });
      fabricCanvas.add(rect);
      drawShapeRef.current = rect;
    } else if (drawMode === 'circle') {
      const circle = new fabric.Ellipse({
        ...commonProps,
        rx: 0,
        ry: 0,
        fill: drawFill === 'transparent' ? 'transparent' : drawFill,
      });
      fabricCanvas.add(circle);
      drawShapeRef.current = circle;
    } else if (drawMode === 'line') {
      const line = new fabric.Line(
        [pointer.x, pointer.y, pointer.x, pointer.y],
        { ...commonProps, fill: drawColor }
      );
      fabricCanvas.add(line);
      drawShapeRef.current = line;
    }
  };

  const handleShapeMove = (opt) => {
    if (!drawStartRef.current || !drawShapeRef.current || !fabricCanvas) return;
    const pointer = fabricCanvas.getPointer(opt.e);
    const start = drawStartRef.current;
    const shape = drawShapeRef.current;

    if (drawMode === 'rect') {
      const w = Math.abs(pointer.x - start.x);
      const h = Math.abs(pointer.y - start.y);
      shape.set({
        left: Math.min(pointer.x, start.x),
        top: Math.min(pointer.y, start.y),
        width: w,
        height: h,
      });
    } else if (drawMode === 'circle') {
      const rx = Math.abs(pointer.x - start.x) / 2;
      const ry = Math.abs(pointer.y - start.y) / 2;
      shape.set({
        left: Math.min(pointer.x, start.x),
        top: Math.min(pointer.y, start.y),
        rx,
        ry,
      });
    } else if (drawMode === 'line') {
      shape.set({ x2: pointer.x, y2: pointer.y });
    }

    fabricCanvas.requestRenderAll();
  };

  const handleShapeUp = () => {
    drawStartRef.current = null;
    drawShapeRef.current = null;
  };

  const stopDrawMode = () => {
    setDrawMode(null);
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
      fabricCanvas.requestRenderAll();
    }
  };

  // Add SVG accessory to canvas
  const addAccessoryToCanvas = (item) => {
    if (!fabricCanvas) return;
    const svgData = item.svg;
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    fabric.loadSVGFromURL(url, (objects, options) => {
      const group = fabric.util.groupSVGElements(objects, options);
      group.set({
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
      fabricCanvas.renderAll();
      URL.revokeObjectURL(url);
    });
  };

  // Add text to canvas
  const addTextToCanvas = () => {
    if (!fabricCanvas || !customText.trim()) return;

    if (isEditingText && selectedObject?.type === 'text') {
      selectedObject.set({
        text: customText,
        fontFamily: selectedFont,
        fontSize,
        fill: textColor,
        fontWeight: textBold ? 'bold' : 'normal',
      });
      fabricCanvas.renderAll();
    } else {
      const text = new fabric.Text(customText, {
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        fontSize,
        fill: textColor,
        fontFamily: selectedFont,
        fontWeight: textBold ? 'bold' : 'normal',
        selectable: true,
        evented: true,
        shadow: textShadow
          ? new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 6, offsetX: 2, offsetY: 2 })
          : null,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      if (!isEditingText) setCustomText('');
    }
  };

  const updateTextProp = (prop, val) => {
    if (isEditingText && selectedObject?.type === 'text') {
      selectedObject.set(prop, val);
      fabricCanvas?.renderAll();
    }
  };

  // Logo upload from file
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (file.type === 'image/svg+xml') {
        fabric.loadSVGFromURL(dataUrl, (objects, options) => {
          const group = fabric.util.groupSVGElements(objects, options);
          const maxSize = 150;
          const scale = maxSize / Math.max(group.width, group.height);
          group.set({
            left: fabricCanvas.getWidth() / 2,
            top: fabricCanvas.getHeight() / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
          });
          fabricCanvas.add(group);
          fabricCanvas.setActiveObject(group);
          fabricCanvas.renderAll();
        });
      } else {
        fabric.Image.fromURL(dataUrl, (img) => {
          const maxSize = 200;
          const scale = maxSize / Math.max(img.width, img.height);
          img.set({
            left: fabricCanvas.getWidth() / 2,
            top: fabricCanvas.getHeight() / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
          });
          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add 2D image from catalog URL onto canvas
  const addCatalogImageToCanvas = (url, label) => {
    if (!fabricCanvas) return;
    const { fabric } = require('fabric');
    fabric.Image.fromURL(url, (img) => {
      if (!img || !fabricCanvas) return;
      const maxSize = 300;
      const scale = maxSize / Math.max(img.width || 300, img.height || 200);
      img.set({
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  };

  // Add 2D accessory image onto canvas
  const addCatalogAccessoryToCanvas = (acc) => {
    if (!acc.image2dUrl || !fabricCanvas) return;
    addCatalogImageToCanvas(acc.image2dUrl, acc.name);
  };

  const hasCatalogImages = carCatalog?.images2d?.length > 0;
  const hasCatalogAccessories = carCatalog?.accessories?.some((a) => a.image2dUrl && (a.accessoryType === '2d' || a.accessoryType === 'both'));

  const categories = [
    ...(hasCatalogImages ? [{ id: 'car-views', name: 'Car Views', icon: <CarIcon size={14} /> }] : []),
    ...(hasCatalogAccessories ? [{ id: 'catalog-acc', name: 'Parts', icon: <FlagIcon size={14} /> }] : []),
    { id: 'stickers', name: 'Stickers', icon: <PaletteIcon size={14} /> },
    { id: 'spoilers', name: 'Spoilers', icon: <FlagIcon size={14} /> },
    { id: 'antennas', name: 'Antennas', icon: <RadioIcon size={14} /> },
    { id: 'graphics', name: 'Graphics', icon: <SparkleIcon size={14} /> },
    { id: 'text', name: 'Text', icon: <TypeIcon size={14} /> },
    { id: 'logo', name: 'Logo', icon: <ImageIcon size={14} /> },
    { id: 'draw', name: 'Draw', icon: <PencilIcon size={14} /> },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <CarPartsSelector
        fabricCanvas={fabricCanvas}
        selectedObject={selectedObject}
        onSelectPart={onSelectCarPart}
      />

      <div className="sidebar-header">
        <h3 className="sidebar-title">Customize</h3>
        <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id !== 'draw') stopDrawMode();
                }}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="accessories-grid">
            {/* Catalog Car Views */}
            {activeCategory === 'car-views' && (
              carCatalog?.images2d?.length > 0 ? (
                carCatalog.images2d.map((img) => (
                  <div
                    key={img.id}
                    className="accessory-item"
                    onClick={() => addCatalogImageToCanvas(img.url, img.label)}
                    title={`Add ${img.label}`}
                  >
                    <div className="accessory-preview catalog-img-preview">
                      <img src={img.url} alt={img.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                    <span className="accessory-name">{img.label || img.angle}</span>
                  </div>
                ))
              ) : (
                <div className="no-catalog-msg">No car images mapped for this model yet.</div>
              )
            )}

            {/* Catalog Accessories (2D) */}
            {activeCategory === 'catalog-acc' && (
              carCatalog?.accessories?.filter((a) => a.image2dUrl && (a.accessoryType === '2d' || a.accessoryType === 'both')).length > 0 ? (
                carCatalog.accessories
                  .filter((a) => a.image2dUrl && (a.accessoryType === '2d' || a.accessoryType === 'both'))
                  .map((acc) => (
                    <div
                      key={acc._id}
                      className="accessory-item"
                      onClick={() => addCatalogAccessoryToCanvas(acc)}
                      title={`Add ${acc.name}`}
                    >
                      <div className="accessory-preview catalog-img-preview">
                        {acc.thumbnailUrl
                          ? <img src={acc.thumbnailUrl} alt={acc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                          : <img src={acc.image2dUrl} alt={acc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />}
                      </div>
                      <span className="accessory-name">{acc.name}</span>
                    </div>
                  ))
              ) : (
                <div className="no-catalog-msg">No 2D accessories mapped for this car yet.</div>
              )
            )}

            {/* Built-in SVG Accessories grids */}
            {['stickers', 'spoilers', 'antennas', 'graphics'].includes(activeCategory) &&
              ACCESSORY_SVGS[activeCategory]?.map((item) => (
                <div
                  key={item.id}
                  className="accessory-item"
                  onClick={() => addAccessoryToCanvas(item)}
                  title={`Add ${item.name}`}
                >
                  <div
                    className="accessory-preview"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="accessory-name">{item.name}</span>
                </div>
              ))}

            {/* Text tool */}
            {activeCategory === 'text' && (
              <div className="text-input-section">
                <div className="text-input-container">
                  <textarea
                    value={customText}
                    onChange={(e) => {
                      setCustomText(e.target.value);
                      updateTextProp('text', e.target.value);
                    }}
                    placeholder={isEditingText ? 'Edit text...' : 'Type your text...'}
                    className="text-input"
                    rows={2}
                  />

                  <div className="text-controls">
                    <div className="control-group">
                      <label className="control-label">Font</label>
                      <select
                        value={selectedFont}
                        onChange={(e) => { setSelectedFont(e.target.value); updateTextProp('fontFamily', e.target.value); }}
                        className="font-select"
                      >
                        {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                    <div className="control-group">
                      <label className="control-label">Size: {fontSize}px</label>
                      <input
                        type="range" min="12" max="120" value={fontSize}
                        onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); updateTextProp('fontSize', v); }}
                        className="size-slider"
                      />
                    </div>

                    <div className="control-group">
                      <label className="control-label">Color</label>
                      <div className="color-control">
                        <input type="color" value={textColor}
                          onChange={(e) => { setTextColor(e.target.value); updateTextProp('fill', e.target.value); }}
                          className="color-picker"
                        />
                        <span className="color-value">{textColor}</span>
                      </div>
                    </div>

                    <div className="control-group toggle-row">
                      <label className="control-label">
                        <input type="checkbox" checked={textBold}
                          onChange={(e) => { setTextBold(e.target.checked); updateTextProp('fontWeight', e.target.checked ? 'bold' : 'normal'); }}
                        /> Bold
                      </label>
                      <label className="control-label">
                        <input type="checkbox" checked={textShadow}
                          onChange={(e) => {
                            setTextShadow(e.target.checked);
                            if (isEditingText && selectedObject?.type === 'text') {
                              selectedObject.set('shadow', e.target.checked
                                ? new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 6, offsetX: 2, offsetY: 2 })
                                : null);
                              fabricCanvas?.renderAll();
                            }
                          }}
                        /> Shadow
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={addTextToCanvas}
                    className={`btn ${isEditingText ? 'btn-success' : 'btn-primary'} add-text-btn`}
                    disabled={!customText.trim()}
                  >
                    {isEditingText ? <><PencilIcon size={14} /> Update Text</> : <><PlusIcon size={14} /> Add Text</>}
                  </button>
                </div>

                <div className="text-examples">
                  <p className="example-title">Quick examples:</p>
                  <div className="example-buttons">
                    {['RACING', 'SPORT', 'TURBO', 'CUSTOM', '2025', 'DRIFT'].map((ex) => (
                      <button key={ex} className="example-btn"
                        onClick={() => { setCustomText(ex); setTimeout(addTextToCanvas, 50); }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Logo upload */}
            {activeCategory === 'logo' && (
              <div className="logo-section">
                <p className="logo-description">
                  Upload a PNG, JPG, or SVG logo to place on your car.
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*,.svg"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <button
                  className="btn btn-primary logo-upload-btn"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <FolderIcon size={14} /> Choose Logo File
                </button>
                <div className="logo-tips">
                  <p><CheckIcon size={12} /> PNG with transparency works best</p>
                  <p><CheckIcon size={12} /> SVG files are supported</p>
                  <p><CheckIcon size={12} /> Resize with corner handles</p>
                </div>
              </div>
            )}

            {/* Drawing tools */}
            {activeCategory === 'draw' && (
              <div className="draw-section">
                <div className="draw-tools">
                  {[
                    { id: 'pencil', icon: <PencilIcon size={13} />, label: 'Pencil', title: 'Free draw' },
                    { id: 'rect', icon: <SquareIcon size={13} />, label: 'Rectangle', title: 'Draw rectangle' },
                    { id: 'circle', icon: <CircleIcon size={13} />, label: 'Ellipse', title: 'Draw ellipse' },
                    { id: 'line', icon: <MinusIcon size={13} />, label: 'Line', title: 'Draw line' },
                  ].map((tool) => (
                    <button
                      key={tool.id}
                      className={`draw-tool-btn ${drawMode === tool.id ? 'active' : ''}`}
                      onClick={() => setDrawMode(drawMode === tool.id ? null : tool.id)}
                      title={tool.title}
                    >
                      {tool.icon} {tool.label}
                    </button>
                  ))}
                  {drawMode && (
                    <button className="draw-tool-btn stop" onClick={stopDrawMode}>
                      <StopCircleIcon size={13} /> Stop Drawing
                    </button>
                  )}
                </div>

                {drawMode && (
                  <p className="draw-hint">
                    {drawMode === 'pencil'
                      ? 'Click and drag to draw freely'
                      : `Click and drag to draw a ${drawMode}`}
                  </p>
                )}

                <div className="draw-controls">
                  <div className="control-group">
                    <label className="control-label">Stroke Color</label>
                    <div className="color-control">
                      <input type="color" value={drawColor}
                        onChange={(e) => setDrawColor(e.target.value)}
                        className="color-picker"
                      />
                      <span className="color-value">{drawColor}</span>
                    </div>
                  </div>

                  <div className="control-group">
                    <label className="control-label">Fill Color</label>
                    <div className="color-control">
                      <input type="color" value={drawFill === 'transparent' ? '#ffffff' : drawFill}
                        onChange={(e) => setDrawFill(e.target.value)}
                        className="color-picker"
                      />
                      <label className="control-label" style={{ marginLeft: 8 }}>
                        <input type="checkbox"
                          checked={drawFill === 'transparent'}
                          onChange={(e) => setDrawFill(e.target.checked ? 'transparent' : '#ffffff')}
                        /> No fill
                      </label>
                    </div>
                  </div>

                  <div className="control-group">
                    <label className="control-label">Width: {drawWidth}px</label>
                    <input
                      type="range" min="1" max="20" value={drawWidth}
                      onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                      className="size-slider"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-instructions">
            <p className="instruction-text"><InfoIcon size={12} /> Click accessory to add it</p>
            <p className="instruction-text"><MoveIcon size={12} /> Drag to move, corners to resize</p>
            <p className="instruction-text"><KeyboardIcon size={12} /> Del to remove, Ctrl+Z to undo</p>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
