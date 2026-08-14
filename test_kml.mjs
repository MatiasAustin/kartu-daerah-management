import { kml } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";

const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Folder>
      <name>Test Lines</name>
      <Placemark>
        <name>Line 1</name>
        <LineString>
          <coordinates>
            106.8272,-6.1751,0
            106.8273,-6.1752,0
          </coordinates>
        </LineString>
      </Placemark>
      <Placemark>
        <name>Line 2</name>
        <MultiGeometry>
          <LineString>
            <coordinates>106.8,-6.1 106.9,-6.2</coordinates>
          </LineString>
        </MultiGeometry>
      </Placemark>
    </Folder>
  </Document>
</kml>
`;

const parser = new DOMParser();
const xml = parser.parseFromString(kmlString, "text/xml");
const geojson = kml(xml);
console.log(JSON.stringify(geojson, null, 2));
