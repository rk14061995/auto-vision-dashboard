import React, { useEffect, useRef, useState } from 'react';
import './Canvas.css';

const { fabric } = require('fabric');

const MAX_HISTORY = 50;

const Canvas = ({ setFabricCanvas, onSelection, onClearSelection, onUndoRedoReady }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const canvasDisposedRef = useRef(false);

  // Undo/redo state
  const historyRef = useRef({ stack: [], index: -1 });
  const isRestoringRef = useRef(false);

  useEffect(() => {
    // Measure from the outer wrapper's parent (.canvas-container), which fills
    // the available viewport. The wrapper itself shrinks to content, so going
    // one level up gives us the real available space.
    const updateCanvasSize = () => {
      const container = wrapperRef.current?.parentElement;
      if (!container) return;
      const maxWidth = container.clientWidth - 48;
      const maxHeight = container.clientHeight - 48;
      setCanvasSize({
        width: Math.max(400, Math.min(maxWidth, 1100)),
        height: Math.max(300, Math.min(maxHeight, 750))
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || canvasSize.width === 0) return;

    // Dispose existing canvas
    if (fabricCanvasRef.current) {
      try {
        canvasDisposedRef.current = true;
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.dispose();
      } catch (e) {}
      fabricCanvasRef.current = null;
    }

    const handleKeyDown = (e) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Ignore shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject();
        if (active) {
          canvas.remove(active);
          onClearSelection();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          doUndo(canvas);
        }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          doRedo(canvas);
        }
        if (e.key === 'c') {
          const active = canvas.getActiveObject();
          if (active) {
            active.clone((cloned) => { canvas._clipboard = cloned; });
          }
        }
        if (e.key === 'v') {
          if (canvas._clipboard) {
            canvas._clipboard.clone((clonedObj) => {
              canvas.discardActiveObject();
              clonedObj.set({ left: clonedObj.left + 10, top: clonedObj.top + 10, evented: true });
              canvas.add(clonedObj);
              canvas.setActiveObject(clonedObj);
              canvas.requestRenderAll();
            });
          }
        }
        if (e.key === 'a') {
          e.preventDefault();
          const objs = canvas.getObjects();
          if (objs.length > 0) {
            const sel = new fabric.ActiveSelection(objs, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
          }
        }
      }
    };

    const initTimer = setTimeout(() => {
      if (!canvasRef.current) return;
      canvasDisposedRef.current = false;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: '#f8f9fa',
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        renderOnAddRemove: true
      });

      // History helpers (closures over `canvas`)
      const saveState = () => {
        if (isRestoringRef.current) return;
        const objects = canvas.getObjects().map((obj) =>
          obj.toJSON(['carPartId', 'carPartName', 'aiDetected', 'customType'])
        );
        const serialized = JSON.stringify(objects);

        const h = historyRef.current;
        // Truncate redo branch
        h.stack = h.stack.slice(0, h.index + 1);
        h.stack.push(serialized);
        if (h.stack.length > MAX_HISTORY) {
          h.stack.shift();
        } else {
          h.index++;
        }
      };

      const restoreObjects = (serialized, canvasRef2) => {
        const c = canvasRef2 || canvas;
        isRestoringRef.current = true;
        const objects = JSON.parse(serialized);
        const backgroundImg = c.backgroundImage;

        c.getObjects().forEach((obj) => c.remove(obj));

        if (objects.length === 0) {
          isRestoringRef.current = false;
          c.requestRenderAll();
          return;
        }

        fabric.util.enlivenObjects(objects, (enlivened) => {
          enlivened.forEach((obj) => c.add(obj));
          if (backgroundImg) c.setBackgroundImage(backgroundImg, () => {});
          c.discardActiveObject();
          c.requestRenderAll();
          isRestoringRef.current = false;
        });
      };

      const undo = () => {
        const h = historyRef.current;
        if (h.index <= 0) return;
        h.index--;
        restoreObjects(h.stack[h.index]);
      };

      const redo = () => {
        const h = historyRef.current;
        if (h.index >= h.stack.length - 1) return;
        h.index++;
        restoreObjects(h.stack[h.index]);
      };

      // Assign to module-level so keyboard handler can call them
      doUndo = undo;
      doRedo = redo;

      // Save initial empty state
      saveState();

      // Canvas events
      canvas.on('selection:created', (e) => onSelection(e.selected[0]));
      canvas.on('selection:updated', (e) => onSelection(e.selected[0]));
      canvas.on('selection:cleared', () => onClearSelection());

      canvas.on('object:added', () => saveState());
      canvas.on('object:removed', () => saveState());
      canvas.on('object:modified', () => saveState());

      document.addEventListener('keydown', handleKeyDown);

      fabricCanvasRef.current = canvas;
      setFabricCanvas(canvas);

      // Expose undo/redo to parent
      if (onUndoRedoReady) {
        onUndoRedoReady({ undo, redo });
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (fabricCanvasRef.current) {
          try {
            fabricCanvasRef.current.clear();
            fabricCanvasRef.current.dispose();
          } catch (e) {}
          fabricCanvasRef.current = null;
        }
      };
    }, 50);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (fabricCanvasRef.current) {
        try {
          canvasDisposedRef.current = true;
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.dispose();
        } catch (e) {}
        fabricCanvasRef.current = null;
      }
    };
  }, [canvasSize, onSelection, onClearSelection, setFabricCanvas, onUndoRedoReady]);

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
};

// Module-level undo/redo refs updated on canvas init
let doUndo = () => {};
let doRedo = () => {};

export default Canvas;
