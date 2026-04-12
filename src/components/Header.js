import React from 'react';
import './Header.css';

export default function Header({
  currentProject,
  onLogout,
  onSaveProject,
  onImageUpload,
  fileInputRef
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>Car Customization Tool</h1>
        {currentProject && <p>{currentProject.projectName}</p>}
      </div>
      <div className="header-ctas">
        <button className="header-btn" onClick={onSaveProject}>
          Save Project
        </button>
        <button
          className="header-btn"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          Upload Image
        </button>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={onImageUpload}
        />
        <button className="header-btn logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
