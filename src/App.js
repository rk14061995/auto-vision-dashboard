import React, { useState, useRef, useCallback, useEffect } from 'react';
import Canvas from './components/Canvas';
import ThreeCanvas from './components/ThreeCanvas';
import UnifiedSidebar from './components/UnifiedSidebar';
import Toolbar from './components/Toolbar';
import CornerAd from './components/CornerAd';
import ProjectLimitModal from './components/ProjectLimitModal';
import { UploadIcon, DownloadIcon, ImageIcon, PencilIcon, CubeIcon, CarIcon, ShareIcon, XIcon } from './components/Icons';
import './App.css';
import axios from 'axios';

const { fabric } = require('fabric');

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

function App() {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedCarPart, setSelectedCarPart] = useState(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const fileInputRef = useRef(null);

  const [currentProject, setCurrentProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUploadedImage, setHasUploadedImage] = useState(false);

  const [userLimits, setUserLimits] = useState({
    canCreateProject: true,
    projectsRemaining: 0,
    projectLimit: 0,
    projectsUsed: 0,
    planType: 'free'
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  const canvasDisposedRef = useRef(false);
  const projectImageLoadingRef = useRef(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDataURL, setShareDataURL] = useState('');

  const [canvasMode, setCanvasMode] = useState('2d');
  const [carCatalog, setCarCatalog] = useState(null);

  const [cornerAds, setCornerAds] = useState({
    'bottom-left': null,
    'bottom-right': null
  });

  // Undo/Redo refs exposed by Canvas component
  const undoFnRef = useRef(null);
  const redoFnRef = useRef(null);

  // Auto-save
  const autoSaveTimerRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | ''

  const handleSelection = useCallback((object) => {
    setSelectedObject(object);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const handleCanvasSet = useCallback((canvas) => {
    if (canvas) {
      canvasDisposedRef.current = false;
    } else {
      canvasDisposedRef.current = true;
    }
    setFabricCanvas(canvas);
  }, []);

  const handleCarPartSelection = useCallback((carPart) => {
    setSelectedCarPart(carPart);
  }, []);

  // Receive undo/redo functions from Canvas
  const handleUndoRedoReady = useCallback(({ undo, redo }) => {
    undoFnRef.current = undo;
    redoFnRef.current = redo;
  }, []);

  const checkProjectLimits = useCallback(async () => {
    if (!userEmail) return null;

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.REACT_APP_ENV === 'development' ||
      !process.env.NODE_ENV ||
      window.location.hostname === 'localhost'
    ) {
      const unlimitedLimits = {
        canCreateProject: true,
        projectsRemaining: 999,
        projectLimit: 999,
        projectsUsed: 0,
        planType: 'developer'
      };
      setUserLimits(unlimitedLimits);
      return unlimitedLimits;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects/check-limit`, {
        headers: { Authorization: `Bearer ${userEmail}` }
      });
      if (response.data) {
        setUserLimits(response.data);
        return response.data;
      }
    } catch (err) {
      console.error('Failed to check project limits:', err);
      return null;
    }
  }, [userEmail]);

  const fetchUniqueAds = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ads/random`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const allAds = await res.json();
          if (Array.isArray(allAds) && allAds.length >= 2) {
            const shuffled = [...allAds].sort(() => 0.5 - Math.random());
            setCornerAds({ 'bottom-left': shuffled[0], 'bottom-right': shuffled[1] });
          } else if (Array.isArray(allAds) && allAds.length === 1) {
            setCornerAds({ 'bottom-left': allAds[0], 'bottom-right': null });
          }
        }
      }
    } catch (err) {
      // Silently disable ads when API unavailable
    }
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost'
    ) {
      return;
    }
    fetchUniqueAds();
    const interval = setInterval(fetchUniqueAds, 30000);
    return () => clearInterval(interval);
  }, [fetchUniqueAds]);

  // Load project from URL params (optional - standalone mode works without)
  useEffect(() => {
    const loadProject = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('projectId');
        const email = params.get('email');

        if (!projectId || !email) {
          // Standalone mode - no project ID needed
          setProjectLoading(false);
          return;
        }

        setUserEmail(email);

        const response = await axios.get(`${API_BASE_URL}/api/projects/${projectId}`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${email}` }
        });

        if (response.data.success) {
          setCurrentProject(response.data.project);
        }
      } catch (err) {
        console.error('Error loading project:', err);
        // Don't show error in standalone mode
      } finally {
        setProjectLoading(false);
      }
    };

    if (projectLoading) loadProject();
  }, [projectLoading]);

  // Fetch car catalog when project with car details is loaded
  useEffect(() => {
    if (!currentProject?.carDetails) return;
    const { make, model } = currentProject.carDetails;
    if (!make || !model) return;

    const slug = `${make}-${model}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    fetch(`${API_BASE_URL}/api/car-catalog/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.success) setCarCatalog(data.carCatalog); })
      .catch(() => {});
  }, [currentProject]);

  // Load base image when canvas and project are ready
  useEffect(() => {
    if (!currentProject?.baseImage || !fabricCanvas || canvasDisposedRef.current) return;
    if (projectImageLoadingRef.current) return;

    projectImageLoadingRef.current = true;

    const loadTimer = setTimeout(() => {
      if (!fabricCanvas || fabricCanvas.isDisposed || canvasDisposedRef.current) {
        projectImageLoadingRef.current = false;
        return;
      }

      fabric.Image.fromURL(currentProject.baseImage, (img) => {
        if (!fabricCanvas || fabricCanvas.isDisposed || canvasDisposedRef.current) {
          projectImageLoadingRef.current = false;
          return;
        }
        if (!fabricCanvas.contextContainer) {
          projectImageLoadingRef.current = false;
          return;
        }

        const canvas = fabricCanvas;
        const scaleX = canvas.getWidth() / img.width;
        const scaleY = canvas.getHeight() / img.height;
        const scale = Math.min(scaleX, scaleY);

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: canvas.getWidth() / 2,
          top: canvas.getHeight() / 2,
          selectable: false,
          evented: false
        });

        try {
          if (!canvas.isDisposed && !canvasDisposedRef.current && canvas.contextContainer) {
            canvas.clear();
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            canvas.renderAll();
            setHasUploadedImage(true);
          }
        } catch (err) {
          console.error('Canvas operation failed during project load:', err);
        } finally {
          projectImageLoadingRef.current = false;
        }
      });
    }, 100);

    return () => {
      clearTimeout(loadTimer);
      projectImageLoadingRef.current = false;
    };
  }, [currentProject, fabricCanvas]);

  // Handle car image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // In standalone mode, skip limit check
    if (userEmail) {
      const limits = await checkProjectLimits();
      if (limits && !limits.canCreateProject && limits.projectsRemaining <= 0) {
        setShowLimitModal(true);
        event.target.value = '';
        return;
      }
    }

    if (!fabricCanvas || fabricCanvas.isDisposed) return;

    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target.result, (img) => {
        if (!fabricCanvas || fabricCanvas.isDisposed) {
          setImageUploading(false);
          return;
        }

        const canvas = fabricCanvas;
        const scaleX = canvas.getWidth() / img.width;
        const scaleY = canvas.getHeight() / img.height;
        const scale = Math.min(scaleX, scaleY);

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: canvas.getWidth() / 2,
          top: canvas.getHeight() / 2,
          selectable: false,
          evented: false
        });

        try {
          if (!canvas.isDisposed && canvas.contextContainer) {
            canvas.clear();
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            canvas.renderAll();
            setHasUploadedImage(true);
          }
          setImageUploading(false);
          setSuccessMessage('Car image uploaded successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
          if (userEmail) checkProjectLimits();
        } catch (err) {
          console.error('Canvas operation failed:', err);
          setImageUploading(false);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  // Toolbar: object manipulation
  const handleDeleteSelected = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      try {
        fabricCanvas.remove(selectedObject);
        setSelectedObject(null);
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  const handleRotateLeft = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('angle', selectedObject.angle - 10);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateRight = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('angle', selectedObject.angle + 10);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateZLeft = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('skewX', (selectedObject.skewX || 0) - 5);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateZRight = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('skewY', (selectedObject.skewY || 0) + 5);
      fabricCanvas.renderAll();
    }
  };

  const handleFlipH = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('flipX', !selectedObject.flipX);
      fabricCanvas.renderAll();
    }
  };

  const handleFlipV = () => {
    if (selectedObject && fabricCanvas && !fabricCanvas.isDisposed) {
      selectedObject.set('flipY', !selectedObject.flipY);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomIn = () => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      const newZoom = Math.min(fabricCanvas.getZoom() + 0.25, 10);
      setCanvasZoom(newZoom);
      const center = { x: fabricCanvas.getWidth() / 2, y: fabricCanvas.getHeight() / 2 };
      fabricCanvas.zoomToPoint(center, newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomOut = () => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      const newZoom = Math.max(fabricCanvas.getZoom() - 0.25, 0.1);
      setCanvasZoom(newZoom);
      const center = { x: fabricCanvas.getWidth() / 2, y: fabricCanvas.getHeight() / 2 };
      fabricCanvas.zoomToPoint(center, newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleResetCanvas = () => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      setCanvasZoom(1);
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      fabricCanvas.renderAll();
    }
  };

  const handleUndo = () => {
    if (undoFnRef.current) undoFnRef.current();
  };

  const handleRedo = () => {
    if (redoFnRef.current) redoFnRef.current();
  };

  const EXPORT_MULTIPLIER = {
    free: 1,
    creator: 1.5,
    pro: 3,
    studio: 3,
    enterprise: 4,
    developer: 3,
  };

  const getExportLabel = (planType) => {
    const m = EXPORT_MULTIPLIER[planType] || 1;
    const baseW = fabricCanvas ? fabricCanvas.getWidth() : 800;
    const px = Math.round(baseW * m);
    if (px <= 720) return '720p';
    if (px <= 1080) return '1080p';
    if (px <= 2160) return '4K';
    return `${px}px`;
  };

  const handleExport = (format = 'png') => {
    if (!fabricCanvas || fabricCanvas.isDisposed) return;
    try {
      const planType = userLimits.planType || 'free';
      const multiplier = EXPORT_MULTIPLIER[planType] || 1;
      const currentZoom = fabricCanvas.getZoom();
      fabricCanvas.setZoom(1);
      fabricCanvas.renderAll();

      let watermarkObj = null;
      if (planType === 'free') {
        const { fabric: fabricLib } = require('fabric');
        watermarkObj = new fabricLib.Text('AutoVision Pro', {
          left: fabricCanvas.getWidth() - 10,
          top: fabricCanvas.getHeight() - 10,
          originX: 'right',
          originY: 'bottom',
          fontSize: 20,
          fill: 'rgba(255,255,255,0.75)',
          fontFamily: 'Arial',
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(watermarkObj);
        fabricCanvas.renderAll();
      }

      const dataURL = fabricCanvas.toDataURL({ format, quality: 1, multiplier });

      if (watermarkObj) {
        fabricCanvas.remove(watermarkObj);
        fabricCanvas.renderAll();
      }

      const filename = currentProject?.projectName
        ? `${currentProject.projectName.toLowerCase().replace(/\s+/g, '-')}.${format}`
        : `autovision-export.${format}`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataURL;
      link.click();

      fabricCanvas.setZoom(currentZoom);
      fabricCanvas.renderAll();
    } catch (err) {
      // Export error — silently skip
    }
  };

  const handleOpenShare = () => {
    if (!fabricCanvas || fabricCanvas.isDisposed) return;
    try {
      const currentZoom = fabricCanvas.getZoom();
      fabricCanvas.setZoom(1);
      fabricCanvas.renderAll();
      const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
      fabricCanvas.setZoom(currentZoom);
      fabricCanvas.renderAll();
      setShareDataURL(dataURL);
      setShowShareModal(true);
    } catch (e) {
      // ignore
    }
  };

  const handleShareCopy = async () => {
    if (!shareDataURL) return;
    try {
      const res = await fetch(shareDataURL);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setSuccessMessage('Image copied to clipboard');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (e) {
      setError('Clipboard not available — use Download instead');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleShareDownload = () => {
    if (!shareDataURL) return;
    const link = document.createElement('a');
    link.download = 'autovision-share.png';
    link.href = shareDataURL;
    link.click();
  };

  // Save canvas state to server
  const saveCanvas = useCallback(async () => {
    if (!currentProject?._id || !userEmail || !fabricCanvas || fabricCanvas.isDisposed) return;
    setSaveStatus('saving');
    try {
      const canvasData = JSON.stringify(
        fabricCanvas.toJSON(['carPartId', 'carPartName', 'aiDetected', 'llmDetected', 'customType', 'confidence', 'isSmallPart'])
      );
      await axios.put(
        `${API_BASE_URL}/api/projects/${currentProject._id}`,
        { canvasData },
        { headers: { Authorization: `Bearer ${userEmail}` } }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      setSaveStatus('');
    }
  }, [currentProject, userEmail, fabricCanvas]);

  // Debounced auto-save — triggers 3s after last canvas change
  const scheduleAutoSave = useCallback(() => {
    if (!currentProject?._id || !userEmail) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(saveCanvas, 3000);
  }, [saveCanvas, currentProject, userEmail]);

  // Wire auto-save to canvas events
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.on('object:added', scheduleAutoSave);
    fabricCanvas.on('object:modified', scheduleAutoSave);
    fabricCanvas.on('object:removed', scheduleAutoSave);
    return () => {
      fabricCanvas.off('object:added', scheduleAutoSave);
      fabricCanvas.off('object:modified', scheduleAutoSave);
      fabricCanvas.off('object:removed', scheduleAutoSave);
      clearTimeout(autoSaveTimerRef.current);
    };
  }, [fabricCanvas, scheduleAutoSave]);

  // Restore canvas overlay objects from saved canvasData after base image loads
  useEffect(() => {
    if (!currentProject?.canvasData || !fabricCanvas || canvasDisposedRef.current) return;
    // Small delay to ensure background image is set first
    const timer = setTimeout(() => {
      if (!fabricCanvas || fabricCanvas.isDisposed || canvasDisposedRef.current) return;
      try {
        const saved = JSON.parse(currentProject.canvasData);
        // loadFromJSON replaces everything — keep background by restoring after
        const bgImage = fabricCanvas.backgroundImage;
        fabricCanvas.loadFromJSON(saved, () => {
          if (bgImage) fabricCanvas.setBackgroundImage(bgImage, fabricCanvas.renderAll.bind(fabricCanvas));
          else fabricCanvas.renderAll();
        });
      } catch (e) {
        // canvasData invalid — skip silently
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentProject?.canvasData, fabricCanvas]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <span className="brand-icon"><CarIcon size={26} /></span>
            <h1 className="app-title">AutoVision Pro</h1>
            <span className="brand-tagline">Car Customization Studio</span>
          </div>
          <div className="header-actions">
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            {saveStatus === 'saving' && <div className="save-status saving">Saving…</div>}
            {saveStatus === 'saved' && <div className="save-status saved">Saved</div>}

            {/* Canvas mode toggle */}
            <div className="canvas-mode-toggle">
              <button
                className={`mode-btn ${canvasMode === '2d' ? 'active' : ''}`}
                onClick={() => setCanvasMode('2d')}
                title="2D Editor — draw, paint parts, add stickers"
              >
                <PencilIcon size={14} /> 2D Edit
              </button>
              <button
                className={`mode-btn ${canvasMode === '3d' ? 'active' : ''}`}
                onClick={() => setCanvasMode('3d')}
                title="3D Viewer — rotate and paint the 3D model"
              >
                <CubeIcon size={14} /> 3D View
                <span className="mode-btn-badge">Preview</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="form-input"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="btn btn-primary upload-btn">
              {imageUploading ? (
                <><span className="spinner-small"></span> Uploading...</>
              ) : (
                <><UploadIcon size={15} /> Upload Car</>
              )}
            </label>

            <div className="export-group">
              <button
                onClick={() => handleExport('png')}
                className="btn btn-success"
                title={`Export PNG (${getExportLabel(userLimits.planType)})`}
              >
                <DownloadIcon size={15} /> Export PNG ({getExportLabel(userLimits.planType)})
              </button>
              <button onClick={() => handleExport('jpeg')} className="btn btn-export-alt">
                <ImageIcon size={15} /> JPG
              </button>
              <button onClick={handleOpenShare} className="btn btn-share" title="Share canvas">
                <ShareIcon size={15} /> Share
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3D coming-soon banner */}
      {canvasMode === '3d' && (
        <div className="coming-soon-bar">
          <CubeIcon size={14} />
          <span>
            <strong>3D Customization Preview</strong> — You're exploring an early preview.
            Full 3D customization with part-level painting, accessories &amp; more is <strong>coming soon</strong>.
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="app-main">
        {/* Unified Sidebar — 2D mode only */}
        {canvasMode === '2d' && (
          <UnifiedSidebar
            fabricCanvas={fabricCanvas}
            selectedObject={selectedObject}
            onSelectCarPart={handleCarPartSelection}
            carCatalog={carCatalog}
            planType={userLimits.planType}
            userEmail={userEmail}
            carMake={currentProject?.carDetails?.make}
            carModel={currentProject?.carDetails?.model}
          />
        )}

        {/* Canvas Area */}
        <div className="canvas-container">
          {!hasUploadedImage && canvasMode === '2d' && (
            /* Backdrop dims only the canvas area */
            <div className="welcome-backdrop" />
          )}
          {!hasUploadedImage && canvasMode === '2d' && (
            /* Card is fixed so it centers on the full viewport, not just the canvas strip */
            <div className="welcome-overlay">
              <div className="welcome-card">
                <div className="welcome-icon"><CarIcon size={52} className="welcome-car-icon" /></div>
                <h2 className="welcome-title">Welcome to AutoVision Pro</h2>
                <p className="welcome-subtitle">
                  Upload your car photo to start customizing — paint parts, add stickers, logos, text and more.
                </p>
                <label htmlFor="image-upload" className="btn btn-primary welcome-upload-btn">
                  <UploadIcon size={16} /> Upload Your Car Photo
                </label>
                <p className="welcome-hint">or switch to <strong>3D View</strong> to explore 3D models</p>
              </div>
            </div>
          )}

          {canvasMode === '2d' ? (
            <Canvas
              setFabricCanvas={handleCanvasSet}
              onSelection={handleSelection}
              onClearSelection={handleClearSelection}
              onUndoRedoReady={handleUndoRedoReady}
              onZoomChange={setCanvasZoom}
            />
          ) : (
            <ThreeCanvas
              onSelection={handleSelection}
              onClearSelection={handleClearSelection}
              carCatalog={carCatalog}
            />
          )}
        </div>

      </div>

      {/* Toolbar — 2D mode only */}
      {canvasMode === '2d' && (
        <Toolbar
          selectedObject={selectedObject}
          selectedCarPart={selectedCarPart}
          onDeleteSelected={handleDeleteSelected}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onRotateZLeft={handleRotateZLeft}
          onRotateZRight={handleRotateZRight}
          onFlipH={handleFlipH}
          onFlipV={handleFlipV}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetCanvas={handleResetCanvas}
          canvasZoom={canvasZoom}
          fabricCanvas={fabricCanvas}
          canvasMode={canvasMode}
        />
      )}

      {/* Corner Ads */}
      <CornerAd position="bottom-left" ad={cornerAds['bottom-left']} />
      <CornerAd position="bottom-right" ad={cornerAds['bottom-right']} />

      {/* Project Limit Modal */}
      <ProjectLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        userLimits={userLimits}
        onUpgrade={() => setShowLimitModal(false)}
      />

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-backdrop" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <span>Share Your Design</span>
              <button className="share-modal-close" onClick={() => setShowShareModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            {shareDataURL && (
              <img src={shareDataURL} alt="Canvas preview" className="share-preview" />
            )}
            <div className="share-modal-actions">
              {typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem && (
                <button className="btn btn-primary" onClick={handleShareCopy}>
                  Copy Image
                </button>
              )}
              <button className="btn btn-success" onClick={handleShareDownload}>
                <DownloadIcon size={14} /> Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
