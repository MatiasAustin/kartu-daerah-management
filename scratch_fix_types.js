const fs = require('fs');
let c = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');
c = c.replace(/maplibregl\.(Map|GeoJSONSource|LngLatLike|MapMouseEvent)/g, 'MapLibreTypes.$1');
fs.writeFileSync('src/components/map/MapContainer.tsx', c);
