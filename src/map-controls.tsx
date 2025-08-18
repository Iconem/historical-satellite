import { ReactElement, memo, useRef } from 'react'
import CustomOverlay from './custom-overlay';
import { ScaleControl, NavigationControl, useControl } from "react-map-gl/mapbox-legacy";
import GeocoderControl from './geocoder-control'
import RulerControl from '@mapbox-controls/ruler';
import JSZip from 'jszip'
import bbox from '@turf/bbox'
import { kml } from '@tmcw/togeojson'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import { TerraDraw } from "terra-draw";

import { v4 as uuidv4 } from 'uuid';
import { MapDrawingComponent } from './drawing-component';


export function WrappedRulerControl(props: any) {
  useControl(() => new RulerControl(props), {
    position: props.position
  });
  return null;
}

// JS Zip libraries
// 7M https://www.npmjs.com/package/jszip https://stuk.github.io/jszip/ 
// 3M https://www.npmjs.com/package/unzipper https://github.com/ZJONSSON/node-unzipper#readme
// 500k https://www.npmjs.com/package/@zip.js/zip.js https://gildas-lormeau.github.io/zip.js/

function FileInput(props: any): ReactElement {
  // Helper to zoom to bounds and use setter for geojsonFeature
  function updateGeojsonFeatures(geojsonFeatures: any) {
    const bounds = bbox(geojsonFeatures)
    const [minLng, minLat, maxLng, maxLat] = bounds
    props.mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: 150,
        duration: 0 * 1000,
        center: [0.5 * (minLng + maxLng), 0.5 * (minLat + maxLat)],
      }
    )
    console.log('bounds fitted, geojsonFeatures set to file input')
  }

  function handleFileUpload(event): void {
    // event.preventDefault()
    const inputFile = event.target.files[0]
    const filename = inputFile.name
    console.log('inputFile info', inputFile)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const fileExt = filename.split('.').pop().toLowerCase();
      // Handle zip differently because it has async operations
      if (fileExt == 'kmz') {
        console.log('input file is KMZ')
        // var new_zip = new JSZip();
        JSZip.loadAsync(inputFile)
          .then(function (zipContent) {
            return zipContent.file("doc.kml")?.async("string");
          }).then(function (kmlString): void {
            console.log('doc.kml file content', kmlString);
            const xmlDoc = new DOMParser().parseFromString(kmlString, 'text/xml')
            geojsonFeatures = kml(xmlDoc)
            updateGeojsonFeatures(geojsonFeatures)
          });
      }
      else {
        const fileContent: string = e.target?.result as string
        let geojsonFeatures: FeatureCollection = {
          type: 'FeatureCollection',
          features: [
          ]
        };
        if (fileExt == 'kml') {
          console.log('input file is KML')
          const xmlDoc = new DOMParser().parseFromString(fileContent, 'text/xml')
          geojsonFeatures = kml(xmlDoc)

        }
        else if (['json', 'geojson'].includes(fileExt)) {
          console.log('input file is GEOJSON')
          geojsonFeatures = JSON.parse(fileContent);
        }
        // Focus Zoom on imported geo features
        console.log('geojsonFeatures from input file', geojsonFeatures)
        updateGeojsonFeatures(geojsonFeatures)

        //add imported geojson file to terradraw
        //round coordinates to solve the 'coordinates too precise error' of terradraw 
        function roundCoords(coords: number[], precision = 6) {
          return coords.map((c) => parseFloat(c.toFixed(precision)));
        }
        if (geojsonFeatures.type === "FeatureCollection" && Array.isArray(geojsonFeatures.features)) {

          const updatedFeatures = geojsonFeatures.features.map((feature: any) => {
            let mode = "static";

            switch (feature.geometry.type) {
              case "Point":
                feature.geometry.coordinates = roundCoords(feature.geometry.coordinates);
                mode = "point";
                break;
              case "Polygon":
              case "MultiPolygon":
                mode = "polygon";
                break;
              default:
                console.warn("Unsupported geometry type:", feature.geometry.type);
            }

            return {
              ...feature,
              id: feature.id || uuidv4(),
              properties: {
                ...(feature.properties || {}),
                mode,
              },
            };
          });
          const terraDrawLeft = props.terraDrawLeftRef?.current;
          const terraDrawRight = props.terraDrawRightRef?.current;

          if (terraDrawLeft) {
            terraDrawLeft.addFeatures(updatedFeatures);
          }

          if (terraDrawRight) {
            terraDrawRight.addFeatures(updatedFeatures);
          }
        } else {
          console.error("Invalid GeoJSON format for TerraDraw");
        }

      }
    }
    reader.readAsText(inputFile, 'UTF-8')
  }

  return (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
      <input
        id="fileUploadInput"
        type="file"
        onChange={(e) => {
          handleFileUpload(e)
        }}
        style={{ pointerEvents: 'auto', display: 'none' }}
        accept='.kml,.kmz,.json,.geojson'
      />
      <button
        type="button"
        title="Upload geo file (kml, geojson, kmz etc)"
        onClick={() => {
          document.getElementById('fileUploadInput')?.click()
        }}
      >
        <span className="mapboxgl-ctrl-icon" style={{ paddingTop: '7px' }}>
          <FontAwesomeIcon icon={faUpload} />{' '}
        </span>
      </button>
    </div>
  )
}


function FileUploadControl(props: any): ReactElement {
  return (
    <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
      <FileInput {...props} />
    </CustomOverlay>
  )
}
export type Mode = "rectangle" | "polygon" | "point" | "linestring" | "static" | "select";



function MapControls(props: any): ReactElement {
  const terraDrawLeftRef = useRef<TerraDraw>();
  const terraDrawRightRef = useRef<TerraDraw>();
  const mapRef = props.clickedMap === "left" ? props.leftMapRef : props.rightMapRef;
  return (
    <>
      <GeocoderControl
        mapboxAccessToken={props.mapboxAccessToken}
        position="top-left"
        flyTo={false}
        mapRef={mapRef}
      />
      <WrappedRulerControl
        position="top-left"
      />

      <NavigationControl showCompass={false} position="top-left" />

      <FileUploadControl
        mapRef={mapRef}
        terraDrawLeftRef={terraDrawLeftRef}
        terraDrawRightRef={terraDrawRightRef}
      />

      <MapDrawingComponent
        leftMapRef={props.leftMapRef}
        rightMapRef={props.rightMapRef}
        clickedMap={props.clickedMap}
        terraDrawLeftRef={terraDrawLeftRef}
        terraDrawRightRef={terraDrawRightRef}
        selectedTms={props.selectedTms}
        leftTimelineDate={props.leftTimelineDate}
        rightTimelineDate={props.rightTimelineDate}
      />

      <ScaleControl
        unit={'metric'}
        position="bottom-left"
        // style={{ clear: 'none' }}
        maxWidth={400}
      />
    </>
  )
}

export default memo(MapControls)