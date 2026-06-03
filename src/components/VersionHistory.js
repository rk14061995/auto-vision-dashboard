import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VersionHistory.css';
import { ClockIcon, LockIcon } from './Icons';

const MAX_SNAPSHOTS = 20;
const DEBOUNCE_MS = 30000;

const STORAGE_KEY = (email) => `avp_history_${email || 'local'}`;

const isPlanGated = (planType) =>
  planType === 'free' || planType === 'creator';

const VersionHistory = ({ fabricCanvas, userEmail, planType }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const debounceRef = useRef(null);
  const gated = isPlanGated(planType);

  // Load snapshots from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY(userEmail));
      if (stored) {
        setSnapshots(JSON.parse(stored));
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [userEmail]);

  const saveToStorage = useCallback((list) => {
    try {
      localStorage.setItem(STORAGE_KEY(userEmail), JSON.stringify(list));
    } catch (e) {
      // ignore storage errors
    }
  }, [userEmail]);

  const addSnapshot = useCallback((label) => {
    if (!fabricCanvas || fabricCanvas.isDisposed) return;
    try {
      const canvasJSON = JSON.stringify(
        fabricCanvas.toJSON(['carPartId', 'carPartName', 'aiDetected', 'llmDetected', 'customType', 'confidence', 'isSmallPart'])
      );
      const entry = {
        id: `snap_${Date.now()}`,
        label: label || `Snapshot ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
        canvasJSON,
      };
      setSnapshots((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_SNAPSHOTS);
        saveToStorage(updated);
        return updated;
      });
    } catch (e) {
      // ignore
    }
  }, [fabricCanvas, saveToStorage]);

  // Auto-snapshot: debounced 30s after canvas changes
  useEffect(() => {
    if (!fabricCanvas) return;
    const scheduleSnapshot = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        addSnapshot('Auto-save');
      }, DEBOUNCE_MS);
    };
    fabricCanvas.on('object:added', scheduleSnapshot);
    fabricCanvas.on('object:modified', scheduleSnapshot);
    fabricCanvas.on('object:removed', scheduleSnapshot);
    return () => {
      fabricCanvas.off('object:added', scheduleSnapshot);
      fabricCanvas.off('object:modified', scheduleSnapshot);
      fabricCanvas.off('object:removed', scheduleSnapshot);
      clearTimeout(debounceRef.current);
    };
  }, [fabricCanvas, addSnapshot]);

  const handleManualSnapshot = () => {
    addSnapshot(`Manual — ${new Date().toLocaleTimeString()}`);
  };

  const handleRestore = (snapshot) => {
    if (gated || !fabricCanvas || fabricCanvas.isDisposed) return;
    setRestoring(true);
    try {
      const bgImage = fabricCanvas.backgroundImage;
      fabricCanvas.loadFromJSON(JSON.parse(snapshot.canvasJSON), () => {
        if (bgImage) {
          fabricCanvas.setBackgroundImage(bgImage, fabricCanvas.renderAll.bind(fabricCanvas));
        } else {
          fabricCanvas.renderAll();
        }
        setRestoring(false);
      });
    } catch (e) {
      setRestoring(false);
    }
  };

  const handleDelete = (id) => {
    setSnapshots((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage(updated);
      return updated;
    });
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="version-history-panel">
      <button
        className="vh-header"
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="vh-header-left">
          <ClockIcon size={14} />
          <span>Version History</span>
        </span>
        <span className="vh-count">{snapshots.length}/{MAX_SNAPSHOTS}</span>
      </button>

      {isOpen && (
        <div className="vh-body">
          {gated && (
            <div className="vh-gate-overlay">
              <LockIcon size={20} />
              <span>Pro+ feature</span>
              <span className="vh-gate-sub">Upgrade to Pro to restore snapshots</span>
            </div>
          )}

          <button
            className="btn-save-snapshot"
            onClick={handleManualSnapshot}
          >
            Save Snapshot Now
          </button>

          {snapshots.length === 0 ? (
            <p className="vh-empty">No snapshots yet. Changes auto-save every 30s.</p>
          ) : (
            <ul className="vh-list">
              {snapshots.map((snap) => (
                <li key={snap.id} className="vh-item">
                  <div className="vh-item-info">
                    <span className="vh-item-label">{snap.label}</span>
                    <span className="vh-item-time">{formatTime(snap.timestamp)}</span>
                  </div>
                  <div className="vh-item-actions">
                    <button
                      className={`vh-restore-btn ${gated ? 'locked' : ''}`}
                      onClick={() => handleRestore(snap)}
                      disabled={gated || restoring}
                      title={gated ? 'Upgrade to Pro to restore' : 'Restore this snapshot'}
                    >
                      {gated ? <LockIcon size={12} /> : 'Restore'}
                    </button>
                    <button
                      className="vh-delete-btn"
                      onClick={() => handleDelete(snap.id)}
                      title="Delete snapshot"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
