const fs = require('fs');

let code = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');

// 1. Remove duplicate Blob Tool buttons
let blobCount = code.split('{/* Blob Tool */}').length - 1;
if (blobCount > 1) {
  // Regex to remove one instance of Blob Tool button
  const blobBtnRegex = /\{\/\* Blob Tool \*\/\}[\s\S]*?<\/button>\s*/;
  // Replace the first instance with empty string to remove the duplicate
  code = code.replace(blobBtnRegex, '');
}

// 2. Change Blob tool icon to a Brush icon
const oldBlobIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
            </svg>`;
const brushIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>`;
code = code.replace(oldBlobIcon, brushIcon);

// 3. Remove duplicate EDIT TOOLBAR
let editToolbarCount = code.split('{/* EDIT TOOLBAR').length - 1;
if (editToolbarCount > 1) {
  const editToolbarRegex = /\{\/\* EDIT TOOLBAR \(Shown only when an area is selected\) \*\/\}[\s\S]*?<\/div>\s*\}\)\s*/;
  code = code.replace(editToolbarRegex, '');
}

// 4. Update the map cursor depending on toolMode!
// We can use a useEffect to update the cursor on the canvas.
const cursorEffect = `
  useEffect(() => {
    if (!map.current) return;
    const canvas = map.current.getCanvas();
    if (toolMode === "pen") {
      canvas.style.cursor = "crosshair";
      map.current.dragPan.disable();
    } else if (toolMode === "blob") {
      canvas.style.cursor = "crosshair";
      map.current.dragPan.disable();
    } else {
      canvas.style.cursor = "grab";
      map.current.dragPan.enable();
    }
  }, [toolMode, mapLoaded]);
`;

code = code.replace(
  '  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);',
  '  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);\n' + cursorEffect
);

// We need to also clean up m.dragPan.enable/disable inside events, so they don't override our state-based logic.
// In mousedown for blob:
code = code.replace('m.dragPan.disable();', ''); // remove from mousedown
// In mouseup for blob:
code = code.replace('m.dragPan.enable();', ''); // remove from mouseup

fs.writeFileSync('src/components/map/MapContainer.tsx', code);
