import React, { useEffect, useRef, useState } from 'react';
import './Canvas.css';

// Import fabric using the v5 method
const { fabric } = require('fabric');

const Canvas = ({ setFabricCanvas, onSelection, onClearSelection }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Calculate responsive canvas size
    const updateCanvasSize = () => {
      const container = canvasRef.current.parentElement;
      const maxWidth = container.clientWidth - 40;
      const maxHeight = container.clientHeight - 40;
      
      const width = Math.min(maxWidth, 800);
      const height = Math.min(maxHeight, 600);
      
      setCanvasSize({ width, height });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || canvasSize.width === 0) return;

    // Dispose existing canvas if any
    if (fabricCanvasRef.current) {
      try {
        // Clear all objects before disposal
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.dispose();
      } catch (error) {
        console.log('Error disposing canvas:', error);
      }
      fabricCanvasRef.current = null;
    }

    // Create new Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: '#f8f9fa',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      renderOnAddRemove: true
    });

    // Canvas event handlers
    canvas.on('selection:created', (e) => {
      onSelection(e.selected[0]);
    });

    canvas.on('selection:updated', (e) => {
      onSelection(e.selected[0]);
    });

    canvas.on('selection:cleared', () => {
      onClearSelection();
    });

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.remove(activeObject);
          onClearSelection();
        }
      }
      
      // Copy/Paste functionality (optional enhancement)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            activeObject.clone((cloned) => {
              canvas._clipboard = cloned;
            });
          }
        }
        
        if (e.key === 'v') {
          if (canvas._clipboard) {
            canvas._clipboard.clone((clonedObj) => {
              canvas.discardActiveObject();
              clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
              });
              canvas.add(clonedObj);
              canvas.setActiveObject(clonedObj);
              canvas.requestRenderAll();
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Set canvas reference
    fabricCanvasRef.current = canvas;
    setFabricCanvas(canvas);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (fabricCanvasRef.current) {
        try {
          // Clear canvas before disposal to prevent clearRect errors
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.log('Error disposing canvas:', error);
        }
        fabricCanvasRef.current = null;
      }
    };
  }, [canvasSize, onSelection, onClearSelection]);

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Canvas;
