import React, { useEffect, useRef, useState } from 'react';
import './Canvas.css';

const { fabric } = require('fabric');

const MAX_HISTORY = 50;

const Canvas = ({ setFabricCanvas, onSelection, onClearSelection, onUndoRedoReady, onZoomChange }) => {
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

    // If canvas already exists, resize it in-place — never recreate on resize
    // because that would wipe the background image and all canvas objects.
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.setWidth(canvasSize.width);
        fabricCanvasRef.current.setHeight(canvasSize.height);
        fabricCanvasRef.current.renderAll();
      } catch (e) {}
      return;
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

      // ── Zoom & Pan ────────────────────────────────────────────────────────
      // Ctrl+scroll → zoom to cursor; plain scroll → pan; Shift+scroll → pan X
      canvas.on('mouse:wheel', (opt) => {
        const e = opt.e;
        e.preventDefault();
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          let zoom = canvas.getZoom() * (0.999 ** e.deltaY);
          zoom = Math.max(0.1, Math.min(zoom, 10));
          canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
          if (onZoomChange) onZoomChange(zoom);
        } else if (e.shiftKey) {
          canvas.relativePan({ x: -e.deltaY, y: 0 });
        } else {
          canvas.relativePan({ x: -e.deltaX, y: -e.deltaY });
        }
      });

      // Alt+drag, middle-mouse drag, or Space+drag → pan
      const isPanningRef = { current: false };
      const panStartRef = { current: { x: 0, y: 0 } };
      const spaceDownRef = { current: false };

      canvas.on('mouse:down', (opt) => {
        const e = opt.e;
        if (e.altKey || e.button === 1 || spaceDownRef.current) {
          isPanningRef.current = true;
          panStartRef.current = { x: e.clientX, y: e.clientY };
          canvas.selection = false;
          canvas.defaultCursor = 'grabbing';
          canvas.hoverCursor = 'grabbing';
          e.preventDefault();
        }
      });

      canvas.on('mouse:move', (opt) => {
        if (!isPanningRef.current) return;
        const e = opt.e;
        canvas.relativePan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        panStartRef.current = { x: e.clientX, y: e.clientY };
      });

      canvas.on('mouse:up', () => {
        if (!isPanningRef.current) return;
        isPanningRef.current = false;
        if (!spaceDownRef.current) {
          canvas.selection = true;
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'move';
        } else {
          canvas.defaultCursor = 'grab';
          canvas.hoverCursor = 'grab';
        }
      });

      // Space bar → grab cursor + pan mode
      const origHandleKeyDown = handleKeyDown;
      const handleKeyDownWithSpace = (e) => {
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.target.isContentEditable) {
          e.preventDefault();
          spaceDownRef.current = true;
          canvas.defaultCursor = 'grab';
          canvas.hoverCursor = 'grab';
          canvas.selection = false;
          canvas.requestRenderAll();
          return;
        }
        origHandleKeyDown(e);
      };

      const handleKeyUp = (e) => {
        if (e.code === 'Space') {
          spaceDownRef.current = false;
          isPanningRef.current = false;
          canvas.selection = true;
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'move';
          canvas.requestRenderAll();
        }
      };

      document.addEventListener('keydown', handleKeyDownWithSpace);
      document.addEventListener('keyup', handleKeyUp);
      // (handleKeyDown is replaced below; remove it from the cleanup too)
      // store refs for cleanup
      canvas._panKeyUp = handleKeyUp;
      canvas._panKeyDown = handleKeyDownWithSpace;

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
      const c0 = fabricCanvasRef.current;
      if (c0?._panKeyDown) document.removeEventListener('keydown', c0._panKeyDown);
      if (c0?._panKeyUp) document.removeEventListener('keyup', c0._panKeyUp);
      if (fabricCanvasRef.current) {
        try {
          canvasDisposedRef.current = true;
          const c = fabricCanvasRef.current;
          fabricCanvasRef.current = null;
          // Silence any in-flight requestAnimationFrame render callbacks
          // that would crash after dispose nulls the canvas context.
          c.renderAll = () => {};
          c.requestRenderAll = () => {};
          c.renderAndReset = () => {};
          c.clear();
          c.dispose();
        } catch (e) {}
      }
      // Clear parent state so no effects fire on the disposed canvas
      setFabricCanvas(null);
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
