import React, { useState, useRef, useCallback, useEffect } from 'react';
import Canvas from './components/Canvas';
import ThreeCanvas from './components/ThreeCanvas';
import Sidebar from './components/Sidebar';
import AISidebar from './components/AISidebar';
import Toolbar from './components/Toolbar';
import CornerAd from './components/CornerAd';
import ProjectLimitModal from './components/ProjectLimitModal';
import { UploadIcon, DownloadIcon, ImageIcon, PencilIcon, CubeIcon, CarIcon } from './components/Icons';
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

  const [canvasMode, setCanvasMode] = useState('2d');
  const [carCatalog, setCarCatalog] = useState(null);

  const [cornerAds, setCornerAds] = useState({
    'bottom-left': null,
    'bottom-right': null
  });

  // Undo/Redo refs exposed by Canvas component
  const undoFnRef = useRef(null);
  const redoFnRef = useRef(null);

  const handleSelection = useCallback((object) => {
    setSelectedObject(object);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const handleCanvasSet = useCallback((canvas) => {
    if (canvas) {
      canvasDisposedRef.current = false;
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
      const newZoom = Math.min(canvasZoom + 0.1, 3);
      setCanvasZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomOut = () => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      const newZoom = Math.max(canvasZoom - 0.1, 0.3);
      setCanvasZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handleResetCanvas = () => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      setCanvasZoom(1);
      fabricCanvas.setZoom(1);
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

  const handleExport = (format = 'png') => {
    if (fabricCanvas && !fabricCanvas.isDisposed) {
      try {
        const currentZoom = fabricCanvas.getZoom();
        fabricCanvas.setZoom(1);
        fabricCanvas.renderAll();

        const dataURL = fabricCanvas.toDataURL({
          format,
          quality: 1,
          multiplier: 2
        });

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
        console.error('Export error:', err);
      }
    }
  };

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
              <button onClick={() => handleExport('png')} className="btn btn-success">
                <DownloadIcon size={15} /> Export PNG
              </button>
              <button onClick={() => handleExport('jpeg')} className="btn btn-export-alt">
                <ImageIcon size={15} /> JPG
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-main">
        {/* Left Sidebar — 2D mode only */}
        {canvasMode === '2d' && (
          <Sidebar
            fabricCanvas={fabricCanvas}
            selectedObject={selectedObject}
            onSelectCarPart={handleCarPartSelection}
            carCatalog={carCatalog}
          />
        )}

        {/* Canvas Area */}
        <div className="canvas-container">
          {!hasUploadedImage && canvasMode === '2d' && (
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
            />
          ) : (
            <ThreeCanvas
              onSelection={handleSelection}
              onClearSelection={handleClearSelection}
              carCatalog={carCatalog}
            />
          )}
        </div>

        {/* Right Sidebar — 2D mode only */}
        {canvasMode === '2d' && (
          <AISidebar
            fabricCanvas={fabricCanvas}
            selectedObject={selectedObject}
            onSelectCarPart={handleCarPartSelection}
          />
        )}
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
    </div>
  );
}

export default App;
