const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapSearchBox.tsx', 'utf8');

const oldUpdateMapBoundary = `  // Initialize or update the map layers for the search boundary
  const updateMapBoundary = (feature: any) => {
    if (!map) return;
    
    // Add source if it doesnt exist
    if (!map.getSource("search-boundary")) {
      map.addSource("search-boundary", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      
      map.addLayer({
        id: "search-boundary-fill",
        type: "fill",
        source: "search-boundary",
        paint: {
          "fill-color": "#f43f5e",
          "fill-opacity": 0.15
        }
      });
      
      map.addLayer({
        id: "search-boundary-line",
        type: "line",
        source: "search-boundary",
        paint: {
          "line-color": "#f43f5e",
          "line-width": 3,
          "line-dasharray": [2, 2]
        }
      });

      map.addLayer({
        id: "search-boundary-point",
        type: "circle",
        source: "search-boundary",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f43f5e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
    }

    const source = map.getSource("search-boundary") as any;
    if (source) {
      if (feature) {
        source.setData({
          type: "FeatureCollection",
          features: [feature]
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }
  };`;

const newUpdateMapBoundary = `  // Initialize or update the map layers for the search boundary
  const updateMapBoundary = (feature: any) => {
    if (!map) return;
    
    // Remove if exists to ensure it's always freshly on top
    if (map.getLayer("search-boundary-point")) map.removeLayer("search-boundary-point");
    if (map.getLayer("search-boundary-line")) map.removeLayer("search-boundary-line");
    if (map.getLayer("search-boundary-fill")) map.removeLayer("search-boundary-fill");
    if (map.getSource("search-boundary")) map.removeSource("search-boundary");

    if (!feature || !feature.geometry) return;

    map.addSource("search-boundary", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [feature]
      }
    });
    
    map.addLayer({
      id: "search-boundary-fill",
      type: "fill",
      source: "search-boundary",
      paint: {
        "fill-color": "#f43f5e",
        "fill-opacity": 0.15
      }
    });
    
    map.addLayer({
      id: "search-boundary-line",
      type: "line",
      source: "search-boundary",
      paint: {
        "line-color": "#f43f5e",
        "line-width": 3,
        "line-dasharray": [3, 3]
      }
    });
    
    // Add point layer ONLY if it is a Point geometry
    if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") {
      map.addLayer({
        id: "search-boundary-point",
        type: "circle",
        source: "search-boundary",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f43f5e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
    }
  };`;

code = code.replace(oldUpdateMapBoundary, newUpdateMapBoundary);
fs.writeFileSync('src/components/map/MapSearchBox.tsx', code);
