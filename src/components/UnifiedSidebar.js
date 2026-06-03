import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AISidebar from './AISidebar';
import './UnifiedSidebar.css';

const UnifiedSidebar = ({
  fabricCanvas,
  selectedObject,
  onSelectCarPart,
  carCatalog,
  planType,
  userEmail,
  carMake,
  carModel,
}) => {
  const [activeTab, setActiveTab] = useState('tools');

  return (
    <div className="unified-sidebar">
      <div className="unified-tabs">
        <button
          className={`unified-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          Tools
        </button>
        <button
          className={`unified-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI
        </button>
      </div>

      {/* Always render both panels to preserve state; toggle visibility only */}
      <div className="unified-panel" style={{ display: activeTab === 'tools' ? 'flex' : 'none' }}>
        <Sidebar
          fabricCanvas={fabricCanvas}
          selectedObject={selectedObject}
          onSelectCarPart={onSelectCarPart}
          carCatalog={carCatalog}
          planType={planType}
        />
      </div>

      <div className="unified-panel" style={{ display: activeTab === 'ai' ? 'flex' : 'none' }}>
        <AISidebar
          fabricCanvas={fabricCanvas}
          selectedObject={selectedObject}
          onSelectCarPart={onSelectCarPart}
          userEmail={userEmail}
          carMake={carMake}
          carModel={carModel}
          planType={planType}
        />
      </div>
    </div>
  );
};

export default UnifiedSidebar;
