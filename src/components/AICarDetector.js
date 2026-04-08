import React, { useState } from 'react';
import './AICarDetector.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const AICarDetector = ({ fabricCanvas, onPartsDetected }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectedParts, setDetectedParts] = useState([]);

  // AI-based car part detection using computer vision techniques
  const detectCarParts = async () => {
    if (!fabricCanvas) return;

    setIsDetecting(true);
    setDetectionProgress(0);

    try {
      // Get the background image (car)
      const backgroundImage = fabricCanvas.backgroundImage;
      if (!backgroundImage) {
        alert('Please upload a car image first!');
        setIsDetecting(false);
        return;
      }

      // Create canvas for image processing
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      // Set canvas size to match the image (use higher resolution for small parts)
      const scale = 2; // 2x resolution for better small part detection
      tempCanvas.width = backgroundImage.width * scale;
      tempCanvas.height = backgroundImage.height * scale;
      
      // Draw the car image at higher resolution
      ctx.scale(scale, scale);
      ctx.drawImage(backgroundImage.getElement(), 0, 0);

      setDetectionProgress(20);

      // Convert to grayscale for better edge detection
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const grayscaleData = convertToGrayscale(imageData);
      ctx.putImageData(grayscaleData, 0, 0);

      setDetectionProgress(40);

      // Apply advanced edge detection for small parts
      const edges = applyAdvancedEdgeDetection(ctx, tempCanvas.width, tempCanvas.height);
      
      setDetectionProgress(60);

      // Find both large and small car parts
      const largeParts = await identifyLargeCarParts(edges, tempCanvas.width, tempCanvas.height);
      const smallParts = await identifySmallCarParts(edges, tempCanvas.width, tempCanvas.height);
      
      setDetectionProgress(80);

      // Combine all detected parts
      const allParts = [...largeParts, ...smallParts];
      
      // Create fabric objects for detected parts
      const fabricParts = createFabricParts(allParts, fabricCanvas);
      
      setDetectionProgress(100);

      // Update state and callback
      setDetectedParts(fabricParts);
      onPartsDetected(fabricParts);

      // Add detected parts to canvas
      fabricParts.forEach(part => {
        fabricCanvas.add(part.overlay);
      });
      fabricCanvas.renderAll();

    } catch (error) {
      console.error('AI Detection Error:', error);
      alert('AI detection failed. Please try again.');
    } finally {
      setIsDetecting(false);
      setTimeout(() => setDetectionProgress(0), 1000);
    }
  };

  // Convert image to grayscale
  const convertToGrayscale = (imageData) => {
    const data = imageData.data;
    const grayscale = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      grayscale.data[i] = gray;     // Red
      grayscale.data[i + 1] = gray; // Green
      grayscale.data[i + 2] = gray; // Blue
      grayscale.data[i + 3] = data[i + 3]; // Alpha
    }
    
    return grayscale;
  };

  // Apply advanced edge detection for small parts
  const applyAdvancedEdgeDetection = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const edges = new Uint8ClampedArray(width * height);
    
    // Multi-scale edge detection for different sized parts
    const scales = [1, 2, 3]; // Different kernel sizes for different part sizes
    
    scales.forEach(scale => {
      const kernelSize = scale * 2 + 1;
      const sobelX = generateSobelKernel(kernelSize, 'x');
      const sobelY = generateSobelKernel(kernelSize, 'y');
      
      for (let y = kernelSize; y < height - kernelSize; y++) {
        for (let x = kernelSize; x < width - kernelSize; x++) {
          let pixelX = 0;
          let pixelY = 0;
          
          // Apply kernels
          for (let j = -kernelSize; j <= kernelSize; j++) {
            for (let i = -kernelSize; i <= kernelSize; i++) {
              const idx = ((y + j) * width + (x + i)) * 4;
              const gray = data[idx];
              const kernelIdx = (j + kernelSize) * (kernelSize * 2 + 1) + (i + kernelSize);
              
              pixelX += gray * sobelX[kernelIdx];
              pixelY += gray * sobelY[kernelIdx];
            }
          }
          
          const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
          // Lower threshold for better detection, especially for low-contrast images
          const threshold = Math.max(20, 30 + scale * 5);
          edges[y * width + x] = Math.max(edges[y * width + x], magnitude > threshold ? 255 : 0);
        }
      }
    });
    
    return edges;
  };

  // Generate Sobel kernels of different sizes
  const generateSobelKernel = (size, direction) => {
    const kernel = [];
    const center = Math.floor(size / 2);
    
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        if (direction === 'x') {
          if (j === center) {
            kernel.push(i - center);
          } else {
            kernel.push(0);
          }
        } else {
          if (i === center) {
            kernel.push(j - center);
          } else {
            kernel.push(0);
          }
        }
      }
    }
    
    return kernel;
  };

  // Identify small car parts using contour analysis
  const identifySmallCarParts = async (edges, width, height) => {
    const smallParts = [];
    
    // Find small contours and shapes
    const contours = findContours(edges, width, height, 5, 50); // Small contours 5-50 pixels
    
    // Classify small parts based on shape and position
    contours.forEach(contour => {
      const part = classifySmallPart(contour, width, height);
      if (part) {
        smallParts.push(part);
      }
    });
    
    return smallParts;
  };

  // Find contours in edge image
  const findContours = (edges, width, height, minSize, maxSize) => {
    const visited = new Array(width * height).fill(false);
    const contours = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (edges[idx] > 0 && !visited[idx]) {
          const contour = traceContour(edges, width, height, x, y, visited);
          if (contour.length >= minSize && contour.length <= maxSize) {
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  };

  // Trace a single contour
  const traceContour = (edges, width, height, startX, startY, visited) => {
    const contour = [];
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || edges[idx] === 0) {
        continue;
      }
      
      visited[idx] = true;
      contour.push({x, y});
      
      // Check 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push({x: x + dx, y: y + dy});
        }
      }
    }
    
    return contour;
  };

  // Classify small parts based on contour characteristics
  const classifySmallPart = (contour, imageWidth, imageHeight) => {
    if (contour.length < 5) return null;
    
    // Calculate bounding box
    let minX = imageWidth, maxX = 0, minY = imageHeight, maxY = 0;
    contour.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / height;
    const area = width * height;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Scale back to original resolution
    const scale = 0.5; // Since we processed at 2x resolution
    const scaledX = centerX * scale;
    const scaledY = centerY * scale;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    // Classify based on size, aspect ratio, and position
    let partType = null;
    let color = '#888888';
    
    if (area < 100) { // Very small parts
      if (aspectRatio > 0.8 && aspectRatio < 1.2) {
        // Square-ish - could be emblem, badge
        partType = 'emblem';
        color = '#FFD700';
      } else if (aspectRatio > 2) {
        // Wide and short - could be light
        partType = 'light';
        color = '#FFFF00';
      } else if (aspectRatio < 0.5) {
        // Tall and narrow - could be antenna
        partType = 'antenna';
        color = '#C0C0C0';
      }
    } else if (area < 500) { // Small parts
      if (aspectRatio > 1.5) {
        // Horizontal - could be door handle
        partType = 'handle';
        color = '#8B4513';
      } else if (aspectRatio < 0.7) {
        // Vertical - could be mirror
        partType = 'mirror';
        color = '#87CEEB';
      } else {
        // Miscellaneous small part
        partType = 'detail';
        color = '#DDA0DD';
      }
    }
    
    if (!partType) return null;
    
    return {
      id: `${partType}_${Math.random().toString(36).substr(2, 9)}`,
      name: partType.charAt(0).toUpperCase() + partType.slice(1),
      x: scaledX - scaledWidth/2,
      y: scaledY - scaledHeight/2,
      width: scaledWidth,
      height: scaledHeight,
      color: color,
      confidence: 0.6,
      isSmallPart: true
    };
  };

  // Identify large car parts using actual image analysis
  const identifyLargeCarParts = async (edges, width, height) => {
    const parts = [];
    
    // First, find the main car body outline
    const carBounds = findCarBounds(edges, width, height);
    // No need to throw error - findCarBounds now always returns something

    // Analyze the car structure to find actual part boundaries
    const carStructure = analyzeCarStructure(edges, width, height, carBounds);

    // Extract specific parts based on the car structure
    const detectedParts = extractCarParts(carStructure, carBounds);
    
    return detectedParts;
  };

  // Find the main car boundaries
  const findCarBounds = (edges, width, height) => {
    // Find all edge points
    const edgePoints = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > 0) {
          edgePoints.push({ x, y });
        }
      }
    }

    // If no edges found, create a default bounding box
    if (edgePoints.length === 0) {
      console.warn('No edges detected, using default bounds');
      return {
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8,
        centerX: width / 2,
        centerY: height / 2
      };
    }

    // Find bounding box of all edges
    let minX = width, maxX = 0, minY = height, maxY = 0;
    edgePoints.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    // Add some padding to the bounding box
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  };

  // Analyze car structure to find key features
  const analyzeCarStructure = (edges, width, height, carBounds) => {
    const structure = {
      roofLine: null,
      hoodLine: null,
      trunkLine: null,
      wheelWells: [],
      pillars: [],
      windows: []
    };

    // Scan horizontal lines to find major car components
    const scanLines = [];
    for (let y = carBounds.y; y < carBounds.y + carBounds.height; y += 5) {
      let edgeCount = 0;
      let lastEdge = null;
      let segments = [];
      
      for (let x = carBounds.x; x < carBounds.x + carBounds.width; x++) {
        if (edges[y * width + x] > 0) {
          if (!lastEdge) {
            segments.push({ start: x, end: x });
          } else {
            segments[segments.length - 1].end = x;
          }
          lastEdge = x;
          edgeCount++;
        }
      }
      
      if (edgeCount > 10) {
        scanLines.push({ y, segments, edgeCount });
      }
    }

    // Identify major car components from scan lines
    const topLines = scanLines.slice(0, Math.floor(scanLines.length * 0.3));
    const middleLines = scanLines.slice(Math.floor(scanLines.length * 0.3), Math.floor(scanLines.length * 0.7));
    const bottomLines = scanLines.slice(Math.floor(scanLines.length * 0.7));

    // Find roof (top continuous lines)
    if (topLines.length > 0) {
      structure.roofLine = {
        y: topLines[Math.floor(topLines.length / 2)].y,
        segments: topLines[Math.floor(topLines.length / 2)].segments
      };
    }

    // Find hood (upper middle lines)
    if (middleLines.length > 0) {
      structure.hoodLine = {
        y: middleLines[0].y,
        segments: middleLines[0].segments
      };
    }

    // Find trunk (lower middle lines)
    if (middleLines.length > 2) {
      structure.trunkLine = {
        y: middleLines[middleLines.length - 1].y,
        segments: middleLines[middleLines.length - 1].segments
      };
    }

    // Scan vertical lines to find pillars and doors
    for (let x = carBounds.x; x < carBounds.x + carBounds.width; x += 10) {
      let edgeCount = 0;
      for (let y = carBounds.y; y < carBounds.y + carBounds.height; y++) {
        if (edges[y * width + x] > 0) {
          edgeCount++;
        }
      }
      
      // Vertical lines with high edge density might be pillars
      if (edgeCount > 20) {
        const relativeX = (x - carBounds.x) / carBounds.width;
        if (relativeX < 0.4) {
          structure.pillars.push({ x, side: 'left' });
        } else if (relativeX > 0.6) {
          structure.pillars.push({ x, side: 'right' });
        }
      }
    }

    return structure;
  };

  // Extract specific car parts from the structure analysis
  const extractCarParts = (structure, carBounds) => {
    const parts = [];
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    // Scale factor from image to canvas
    const scaleX = canvasWidth / fabricCanvas.backgroundImage.width;
    const scaleY = canvasHeight / fabricCanvas.backgroundImage.height;

    // Hood (front upper section)
    if (structure.hoodLine) {
      parts.push({
        id: 'hood',
        name: 'Hood',
        x: carBounds.x * scaleX,
        y: carBounds.y * scaleY,
        width: carBounds.width * scaleX * 0.4,
        height: (structure.hoodLine.y - carBounds.y) * scaleY,
        color: '#FF6B6B',
        confidence: 0.85
      });
    }

    // Roof (top section)
    if (structure.roofLine) {
      const roofStartY = structure.roofLine.y * scaleY;
      const roofHeight = ((structure.hoodLine?.y || structure.roofLine.y + 50) - structure.roofLine.y) * scaleY;
      
      parts.push({
        id: 'roof',
        name: 'Roof',
        x: (carBounds.x + carBounds.width * 0.2) * scaleX,
        y: roofStartY,
        width: carBounds.width * scaleX * 0.6,
        height: Math.abs(roofHeight),
        color: '#4ECDC4',
        confidence: 0.8
      });
    }

    // Doors (middle sections)
    const doorHeight = carBounds.height * 0.3 * scaleY;
    const doorY = (structure.hoodLine?.y || carBounds.y + carBounds.height * 0.3) * scaleY;
    
    parts.push({
      id: 'door_left',
      name: 'Door (Left)',
      x: (carBounds.x + carBounds.width * 0.1) * scaleX,
      y: doorY,
      width: carBounds.width * scaleX * 0.25,
      height: doorHeight,
      color: '#96CEB4',
      confidence: 0.75
    });

    parts.push({
      id: 'door_right',
      name: 'Door (Right)',
      x: (carBounds.x + carBounds.width * 0.65) * scaleX,
      y: doorY,
      width: carBounds.width * scaleX * 0.25,
      height: doorHeight,
      color: '#96CEB4',
      confidence: 0.75
    });

    // Trunk (rear section)
    if (structure.trunkLine) {
      parts.push({
        id: 'trunk',
        name: 'Trunk',
        x: (carBounds.x + carBounds.width * 0.6) * scaleX,
        y: structure.trunkLine.y * scaleY,
        width: carBounds.width * scaleX * 0.35,
        height: (carBounds.y + carBounds.height - structure.trunkLine.y) * scaleY,
        color: '#FFEAA7',
        confidence: 0.7
      });
    }

    // A-Pillars (front pillars)
    if (structure.pillars.length > 0) {
      const leftPillars = structure.pillars.filter(p => p.side === 'left').slice(0, 2);
      const rightPillars = structure.pillars.filter(p => p.side === 'right').slice(0, 2);

      leftPillars.forEach((pillar, index) => {
        parts.push({
          id: `a_pillar_left_${index}`,
          name: index === 0 ? 'A-Pillar (Left)' : 'B-Pillar (Left)',
          x: pillar.x * scaleX - 10,
          y: carBounds.y * scaleY,
          width: 20,
          height: carBounds.height * scaleY * 0.4,
          color: '#FFB6C1',
          confidence: 0.6
        });
      });

      rightPillars.forEach((pillar, index) => {
        parts.push({
          id: `a_pillar_right_${index}`,
          name: index === 0 ? 'A-Pillar (Right)' : 'B-Pillar (Right)',
          x: pillar.x * scaleX - 10,
          y: carBounds.y * scaleY,
          width: 20,
          height: carBounds.height * scaleY * 0.4,
          color: '#FFB6C1',
          confidence: 0.6
        });
      });
    }

    // Fenders (wheel areas)
    parts.push({
      id: 'fender_left',
      name: 'Fender (Left)',
      x: carBounds.x * scaleX,
      y: (carBounds.y + carBounds.height * 0.4) * scaleY,
      width: carBounds.width * scaleX * 0.15,
      height: carBounds.height * scaleY * 0.2,
      color: '#DDA0DD',
      confidence: 0.65
    });

    parts.push({
      id: 'fender_right',
      name: 'Fender (Right)',
      x: (carBounds.x + carBounds.width * 0.85) * scaleX,
      y: (carBounds.y + carBounds.height * 0.4) * scaleY,
      width: carBounds.width * scaleX * 0.15,
      height: carBounds.height * scaleY * 0.2,
      color: '#DDA0DD',
      confidence: 0.65
    });

    return parts.filter(part => part.confidence > 0.5); // Only return confident detections
  };

  // Create fabric objects for detected parts
  const createFabricParts = (parts, canvas) => {
    return parts.map(part => {
      const overlay = new fabric.Rect({
        left: part.x,
        top: part.y,
        width: part.width,
        height: part.height,
        fill: part.color + '60', // Add transparency
        stroke: part.color,
        strokeWidth: part.isSmallPart ? 1 : 2, // Thinner borders for small parts
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: part.isSmallPart ? 6 : 8, // Smaller corners for small parts
        opacity: part.isSmallPart ? 0.8 : 0.7, // More visible for small parts
        carPartId: part.id,
        carPartName: part.name,
        aiDetected: true,
        confidence: part.confidence,
        isSmallPart: part.isSmallPart
      });

      return {
        ...part,
        overlay: overlay
      };
    });
  };

  // Clear AI detected parts
  const clearAIParts = () => {
    if (!fabricCanvas) return;
    
    // Remove AI-detected parts
    const aiParts = fabricCanvas.getObjects().filter(obj => obj.aiDetected);
    aiParts.forEach(obj => fabricCanvas.remove(obj));
    
    fabricCanvas.renderAll();
    setDetectedParts([]);
    onPartsDetected([]);
  };

  return (
    <div className="ai-car-detector">
      <div className="detector-header">
        <h3 className="detector-title">🤖 AI Car Detection</h3>
        <div className="detector-actions">
          <button
            className={`detect-btn ${isDetecting ? 'detecting' : ''}`}
            onClick={detectCarParts}
            disabled={isDetecting}
          >
            {isDetecting ? '🔄 Analyzing...' : '🔍 Detect Parts'}
          </button>
          {detectedParts.length > 0 && (
            <button
              className="clear-btn"
              onClick={clearAIParts}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {isDetecting && (
        <div className="detection-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${detectionProgress}%` }}
            ></div>
          </div>
          <p className="progress-text">Analyzing car image... {detectionProgress}%</p>
        </div>
      )}

      {detectedParts.length > 0 && (
        <div className="detected-parts">
          <p className="parts-summary">
            ✅ Detected {detectedParts.length} parts ({detectedParts.filter(p => p.isSmallPart).length} small details)
          </p>
          <div className="parts-list">
            {detectedParts.map(part => (
              <div key={part.id} className={`detected-part-item ${part.isSmallPart ? 'small-part' : ''}`}>
                <div 
                  className="part-color-dot"
                  style={{ backgroundColor: part.color }}
                ></div>
                <span className="part-name">{part.name}</span>
                <span className="confidence">
                  {Math.round(part.confidence * 100)}%
                </span>
                {part.isSmallPart && (
                  <span className="small-badge">🔍</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detector-info">
        <p className="info-text">
          💡 AI uses computer vision to automatically identify car parts
        </p>
        <p className="info-text">
          📷 Upload a clear car image for best results
        </p>
      </div>
    </div>
  );
};

export default AICarDetector;
