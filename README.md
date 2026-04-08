# RideCraft

A React-based web application for customizing car images with accessories using Fabric.js.

## Features

- **Image Upload**: Upload car images from local system
- **Canvas Editor**: Interactive Fabric.js canvas with drag-and-drop functionality
- **Accessories Panel**: Sidebar with categorized accessories (Spoilers, Antennas, Stickers, Graphics)
- **Drag & Drop Editing**: Move, resize, rotate, and delete objects
- **Layer Management**: Objects stack properly with new items on top
- **Controls Toolbar**: Delete, rotate, zoom, and reset controls
- **Export Feature**: Download customized images as high-quality PNG
- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Shortcuts**: Delete key, Ctrl+C/V for copy/paste

## Tech Stack

- React 18 (functional components with hooks)
- Fabric.js 5.3.0 (canvas manipulation)
- Modern CSS with responsive design
- No additional UI frameworks (clean, minimal dependencies)

## Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd car_customization_tool
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Car Image**: Click "Upload Car Image" button and select a car image from your device
2. **Add Accessories**: Browse categories in the left sidebar and click on accessories to add them to the canvas
3. **Edit Objects**: 
   - Click to select objects
   - Drag to move
   - Use corner handles to resize
   - Use rotation handle to rotate
   - Press Delete key to remove selected object
4. **Canvas Controls**: Use the toolbar at the bottom for zoom, rotation, and deletion
5. **Export**: Click "Export Image" to download your customized car as PNG

## Project Structure

```
car_customization_tool/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Canvas.js
│   │   ├── Canvas.css
│   │   ├── Sidebar.js
│   │   ├── Sidebar.css
│   │   ├── Toolbar.js
│   │   └── Toolbar.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Component Architecture

### App.js
- Main application component
- Manages global state (canvas, selected object, zoom)
- Handles image upload and export functionality
- Coordinates between all child components

### Canvas.js
- Fabric.js canvas initialization and management
- Event handling for selection and keyboard shortcuts
- Responsive canvas sizing
- Object manipulation utilities

### Sidebar.js
- Accessories categories and items
- Placeholder SVG generation for demo accessories
- Add-to-canvas functionality
- Collapsible design for screen space optimization

### Toolbar.js
- Object editing controls (delete, rotate)
- Canvas controls (zoom in/out, reset)
- Selection information display
- Quick tips and help

## Customization

### Adding Real Accessories

To replace placeholder accessories with real images:

1. Add your PNG images to the `public/assets/accessories/` directory
2. Update the `accessories` object in `Sidebar.js` with real image URLs:
   ```javascript
   spoilers: [
     { id: 'spoiler1', name: 'Sport Spoiler', url: '/assets/accessories/spoiler1.png' },
     // ... more accessories
   ]
   ```

### Styling

The application uses plain CSS for styling. You can customize:
- Colors and themes in the respective CSS files
- Layout and responsiveness in `App.css`
- Component-specific styles in individual component CSS files

### Canvas Configuration

Modify canvas settings in `Canvas.js`:
- Canvas size and aspect ratio
- Object control styling
- Event handling behavior
- Background and grid settings

## Browser Support

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Tips

- Large car images may impact performance. Optimize images before upload
- Too many accessories on canvas can slow down rendering
- Canvas exports are optimized at 2x resolution for quality

## Troubleshooting

### Canvas Not Loading
- Ensure Fabric.js is properly installed
- Check browser console for JavaScript errors
- Verify all component imports are correct

### Image Upload Issues
- Check file size limits (browser dependent)
- Ensure image format is supported (JPG, PNG, GIF)
- Verify CORS settings if using external images

### Export Not Working
- Check browser download permissions
- Ensure canvas has content before exporting
- Verify pop-up blockers aren't blocking downloads

## Development

### Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests (if added)
- `npm run eject` - Eject from Create React App (one-way operation)

### Adding New Features

The modular structure makes it easy to add new features:
- New accessory categories in `Sidebar.js`
- Additional canvas controls in `Toolbar.js`
- Enhanced editing capabilities in `Canvas.js`
- New export formats in `App.js`

## License

This project is open source and available under the MIT License.
