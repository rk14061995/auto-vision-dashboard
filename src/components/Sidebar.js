import React, { useState } from 'react';
import './Sidebar.css';
import CarPartsSelector from './CarPartsSelector';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const Sidebar = ({ fabricCanvas, selectedObject, onSelectCarPart }) => {
  const [activeCategory, setActiveCategory] = useState('spoilers');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // Accessories data - in a real app, these would be actual image URLs
  const accessories = {
    spoilers: [
      { id: 'spoiler1', name: 'Sport Spoiler', url: '/api/placeholder/120/40' },
      { id: 'spoiler2', name: 'Racing Spoiler', url: '/api/placeholder/140/45' },
      { id: 'spoiler3', name: 'GT Wing', url: '/api/placeholder/160/50' },
    ],
    antennas: [
      { id: 'antenna1', name: 'Shark Fin', url: '/api/placeholder/30/60' },
      { id: 'antenna2', name: 'Short Antenna', url: '/api/placeholder/20/50' },
      { id: 'antenna3', name: 'LED Antenna', url: '/api/placeholder/25/55' },
    ],
    stickers: [
      { id: 'sticker1', name: 'Flame Decal', url: '/api/placeholder/80/80' },
      { id: 'sticker2', name: 'Racing Stripe', url: '/api/placeholder/100/30' },
      { id: 'sticker3', name: 'Tribal', url: '/api/placeholder/90/90' },
      { id: 'sticker4', name: 'Skull', url: '/api/placeholder/70/70' },
    ],
    graphics: [
      { id: 'graphic1', name: 'Side Stripe', url: '/api/placeholder/150/40' },
      { id: 'graphic2', name: 'Hood Design', url: '/api/placeholder/120/80' },
      { id: 'graphic3', name: 'Racing Number', url: '/api/placeholder/60/60' },
    ]
  };

  // State for custom text
  const [customText, setCustomText] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(30);
  const [textColor, setTextColor] = useState('#000000');

  // Update text controls when a text object is selected
  React.useEffect(() => {
    if (selectedObject && selectedObject.type === 'text') {
      setCustomText(selectedObject.text);
      setSelectedFont(selectedObject.fontFamily);
      setFontSize(selectedObject.fontSize);
      setTextColor(selectedObject.fill);
      setIsEditingText(true);
      setActiveCategory('text');
    } else {
      setIsEditingText(false);
    }
  }, [selectedObject]);

  // Font options
  const fontOptions = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Comic Sans MS',
    'Impact',
    'Trebuchet MS',
    'Palatino',
    'Garamond'
  ];

  // Add custom text to canvas or update existing text
  const addCustomTextToCanvas = () => {
    if (!fabricCanvas || !customText.trim()) return;

    if (isEditingText && selectedObject && selectedObject.type === 'text') {
      // Update existing text object
      selectedObject.set({
        text: customText,
        fontFamily: selectedFont,
        fontSize: fontSize,
        fill: textColor,
        stroke: textColor
      });
      fabricCanvas.renderAll();
    } else {
      // Create new text object
      const text = new fabric.Text(customText, {
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        fontSize: fontSize,
        fill: textColor,
        fontFamily: selectedFont,
        fontWeight: 'bold',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: 8,
        padding: 5,
        // Add 3D rotation properties
        skewX: 0,
        skewY: 0,
        // Enable 3D transformation
        objectCaching: false,
        stroke: textColor,
        strokeWidth: 0,
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 5,
          offsetX: 2,
          offsetY: 2
        })
      });
      
      // Add to canvas
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
    }
    
    // Clear the input for new text, but keep it for editing
    if (!isEditingText) {
      setCustomText('');
    }
  };

  // Update text properties dynamically
  const updateTextProperties = (property, value) => {
    if (isEditingText && selectedObject && selectedObject.type === 'text') {
      selectedObject.set(property, value);
      fabricCanvas.renderAll();
    }
  };

  // Handle text change
  const handleTextChange = (value) => {
    setCustomText(value);
    updateTextProperties('text', value);
  };

  // Handle font change
  const handleFontChange = (value) => {
    setSelectedFont(value);
    updateTextProperties('fontFamily', value);
  };

  // Handle size change
  const handleSizeChange = (value) => {
    setFontSize(parseInt(value));
    updateTextProperties('fontSize', parseInt(value));
  };

  // Handle color change
  const handleColorChange = (value) => {
    setTextColor(value);
    updateTextProperties('fill', value);
    updateTextProperties('stroke', value);
  };

  // Create placeholder SVG for accessories
  const createPlaceholderSVG = (width, height, name) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" opacity="0.8" rx="4"/>
        <text x="50%" y="50%" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dy=".3em">
          ${name}
        </text>
      </svg>
    `)}`;
  };

  // Add accessory to canvas
  const addAccessoryToCanvas = (accessory) => {
    if (!fabricCanvas) return;

    // Create a placeholder image using SVG
    const svgUrl = createPlaceholderSVG(120, 80, accessory.name);
    
    fabric.Image.fromURL(svgUrl, (img) => {
      // Set initial position and properties
      const canvasWidth = fabricCanvas.getWidth();
      const canvasHeight = fabricCanvas.getHeight();
      
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        scaleX: 1,
        scaleY: 1,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: 8,
        padding: 5
      });
      
      // Add to canvas
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
    }, {
      crossOrigin: 'anonymous'
    });
  };

  const categories = [
    { id: 'spoilers', name: 'Spoilers', icon: '🏁' },
    { id: 'antennas', name: 'Antennas', icon: '📡' },
    { id: 'stickers', name: 'Stickers', icon: '🎨' },
    { id: 'graphics', name: 'Graphics', icon: '✨' },
    { id: 'text', name: 'Text', icon: '📝' }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Car Parts Selector */}
      <CarPartsSelector 
        fabricCanvas={fabricCanvas}
        selectedObject={selectedObject}
        onSelectPart={onSelectCarPart}
      />

      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">Custom Tools</h3>
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Accessories Grid */}
          <div className="accessories-grid">
            {activeCategory === 'text' ? (
              <div className="text-input-section">
                <div className="text-input-container">
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={isEditingText ? "Edit selected text..." : "Enter custom text..."}
                    className="text-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCustomTextToCanvas();
                      }
                    }}
                  />
                  
                  {/* Font Selection */}
                  <div className="text-controls">
                    <div className="control-group">
                      <label className="control-label">Font:</label>
                      <select
                        value={selectedFont}
                        onChange={(e) => handleFontChange(e.target.value)}
                        className="font-select"
                      >
                        {fontOptions.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="control-group">
                      <label className="control-label">Size:</label>
                      <div className="size-control">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={fontSize}
                          onChange={(e) => handleSizeChange(e.target.value)}
                          className="size-slider"
                        />
                        <span className="size-value">{fontSize}px</span>
                      </div>
                    </div>
                    
                    <div className="control-group">
                      <label className="control-label">Color:</label>
                      <div className="color-control">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="color-picker"
                        />
                        <span className="color-value">{textColor}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={addCustomTextToCanvas}
                    className={`btn ${isEditingText ? 'btn-success' : 'btn-primary'} add-text-btn`}
                    disabled={!customText.trim()}
                  >
                    {isEditingText ? 'Update Text' : 'Add Text'}
                  </button>
                </div>
                
                <div className="text-examples">
                  <p className="example-title">Examples:</p>
                  <div className="example-buttons">
                    {['RACING', 'SPORT', 'TURBO', 'CUSTOM'].map((example) => (
                      <button
                        key={example}
                        onClick={() => {
                          setCustomText(example);
                          setTimeout(() => addCustomTextToCanvas(), 100);
                        }}
                        className="example-btn"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              accessories[activeCategory]?.map(accessory => (
                <div
                  key={accessory.id}
                  className="accessory-item"
                  onClick={() => addAccessoryToCanvas(accessory)}
                  title={accessory.name}
                >
                  <div className="accessory-preview">
                    <img
                      src={createPlaceholderSVG(80, 60, accessory.name)}
                      alt={accessory.name}
                      className="accessory-image"
                    />
                  </div>
                  <span className="accessory-name">{accessory.name}</span>
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="sidebar-instructions">
            <p className="instruction-text">
              💡 Click on any accessory to add it to the canvas
            </p>
            <p className="instruction-text">
              🎯 Select objects to move, resize, or rotate
            </p>
            <p className="instruction-text">
              ⌨️ Press Delete to remove selected item
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
