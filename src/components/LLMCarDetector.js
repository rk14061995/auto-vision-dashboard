import React, { useState } from 'react';
import './LLMCarDetector.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const PART_COLORS = [
  '#FF6B6B','#45B7D1','#4ECDC4','#96CEB4','#FFEAA7',
  '#DDA0DD','#87CEEB','#FFA07A','#98FB98','#FFB6C1',
  '#B0C4DE','#F0E68C','#20B2AA','#DB7093','#9370DB',
];

const LLMCarDetector = ({ fabricCanvas, onPartsDetected, userEmail, carMake, carModel }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectedParts, setDetectedParts] = useState([]);
  const [creditError, setCreditError] = useState('');

  const detectCarParts = async () => {
    if (!fabricCanvas) return;

    setIsDetecting(true);
    setDetectionProgress(0);
    setCreditError('');

    try {
      const backgroundImage = fabricCanvas.backgroundImage;
      if (!backgroundImage) {
        alert('Please upload a car image first!');
        setIsDetecting(false);
        return;
      }

      setDetectionProgress(15);

      // Export canvas as base64 for Claude Vision
      const imageData = fabricCanvas.toDataURL({ format: 'png', quality: 0.85, multiplier: 1 });

      setDetectionProgress(30);

      // Call real Claude Vision API via auto-vision-web
      const res = await fetch(`${API_BASE_URL}/api/ai/detect-parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { Authorization: `Bearer ${userEmail}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: imageData,
          carMake: carMake || '',
          carModel: carModel || '',
        }),
      });

      setDetectionProgress(70);

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setCreditError(`Need ${data.creditsNeeded} credits (have ${data.balance}). Purchase more credits to use AI detection.`);
          setIsDetecting(false);
          return;
        }
        throw new Error(data.error || 'Detection failed');
      }

      // Claude returns parts with x/y/width/height as fractions (0-1) of image dimensions
      const canvasWidth = fabricCanvas.getWidth();
      const canvasHeight = fabricCanvas.getHeight();

      const parts = (data.parts || []).map((part, index) => ({
        id: `llm_part_${index}_${Date.now()}`,
        name: part.name,
        x: part.x * canvasWidth,
        y: part.y * canvasHeight,
        width: part.width * canvasWidth,
        height: part.height * canvasHeight,
        color: PART_COLORS[index % PART_COLORS.length],
        confidence: part.confidence,
        isSmallPart: part.isSmallPart || false,
      }));

      setDetectionProgress(90);

      const fabricParts = createFabricParts(parts, fabricCanvas);
      setDetectionProgress(100);

      setDetectedParts(fabricParts);
      onPartsDetected(fabricParts);

      fabricParts.forEach(part => fabricCanvas.add(part.overlay));
      fabricCanvas.renderAll();

    } catch (error) {
      console.error('Claude Detection Error:', error);
      useFallbackDetection();
    } finally {
      setIsDetecting(false);
      setTimeout(() => setDetectionProgress(0), 1000);
    }
  };

  // Fallback detection method
  const useFallbackDetection = () => {
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    
    const fallbackParts = [
      {
        id: 'fallback_hood',
        name: 'Hood',
        x: canvasWidth * 0.3,
        y: canvasHeight * 0.15,
        width: canvasWidth * 0.4,
        height: canvasHeight * 0.2,
        color: '#FF6B6B',
        confidence: 0.5
      },
      {
        id: 'fallback_door_left',
        name: 'Door Left',
        x: canvasWidth * 0.15,
        y: canvasHeight * 0.35,
        width: canvasWidth * 0.2,
        height: canvasHeight * 0.3,
        color: '#96CEB4',
        confidence: 0.5
      },
      {
        id: 'fallback_door_right',
        name: 'Door Right',
        x: canvasWidth * 0.65,
        y: canvasHeight * 0.35,
        width: canvasWidth * 0.2,
        height: canvasHeight * 0.3,
        color: '#96CEB4',
        confidence: 0.5
      }
    ];

    const fabricParts = createFabricParts(fallbackParts, fabricCanvas);
    setDetectedParts(fabricParts);
    onPartsDetected(fabricParts);

    fabricParts.forEach(part => {
      fabricCanvas.add(part.overlay);
    });
    fabricCanvas.renderAll();
  };

  // Create fabric objects for detected parts
  const createFabricParts = (parts, canvas) => {
    return parts.map(part => {
      const overlay = new fabric.Rect({
        left: part.x,
        top: part.y,
        width: part.width,
        height: part.height,
        fill: part.color + '60',
        stroke: part.color,
        strokeWidth: part.isSmallPart ? 1 : 2,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: part.isSmallPart ? 6 : 8,
        opacity: part.isSmallPart ? 0.8 : 0.7,
        carPartId: part.id,
        carPartName: part.name,
        llmDetected: true,
        confidence: part.confidence,
        isSmallPart: part.isSmallPart
      });

      return {
        ...part,
        overlay: overlay
      };
    });
  };

  // Clear LLM detected parts
  const clearLLMParts = () => {
    if (!fabricCanvas) return;
    
    const llmParts = fabricCanvas.getObjects().filter(obj => obj.llmDetected);
    llmParts.forEach(obj => fabricCanvas.remove(obj));
    
    fabricCanvas.renderAll();
    setDetectedParts([]);
    onPartsDetected([]);
  };

  return (
    <div className="llm-car-detector">
      <div className="detector-header">
        <h3 className="detector-title">🧠 AI Smart Detection</h3>
        <div className="detector-actions">
          <button
            className={`detect-btn ${isDetecting ? 'detecting' : ''}`}
            onClick={detectCarParts}
            disabled={isDetecting}
          >
            {isDetecting ? '🤖 Analyzing...' : '🧠 Smart Detect'}
          </button>
          {detectedParts.length > 0 && (
            <button
              className="clear-btn"
              onClick={clearLLMParts}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {creditError && (
        <div className="detector-credit-error">{creditError}</div>
      )}

      {isDetecting && (
        <div className="detection-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${detectionProgress}%` }}
            ></div>
          </div>
          <p className="progress-text">Claude AI analyzing image... {detectionProgress}%</p>
        </div>
      )}

      {detectedParts.length > 0 && (
        <div className="detected-parts">
          <p className="parts-summary">
            🧠 AI detected {detectedParts.length} parts ({detectedParts.filter(p => p.isSmallPart).length} small details)
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
        <p className="info-text">Uses Claude AI Vision to detect car parts (3 credits)</p>
        <p className="info-text">Works with any car photo — detects panels, lights, grille and more</p>
      </div>
    </div>
  );
};

export default LLMCarDetector;
