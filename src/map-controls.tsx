import { ReactElement, memo, useEffect, useRef, useState } from 'react'
import CustomOverlay from './custom-overlay';
import { ScaleControl, NavigationControl, useControl } from "react-map-gl/mapbox-legacy";
import GeocoderControl from './geocoder-control'
import RulerControl from '@mapbox-controls/ruler';
import JSZip from 'jszip'
import bbox from '@turf/bbox'
import { kml } from '@tmcw/togeojson'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload} from '@fortawesome/free-solid-svg-icons'
import { TerraDraw, TerraDrawLineStringMode, TerraDrawPointMode, TerraDrawPolygonMode, TerraDrawRectangleMode, TerraDrawSelectMode} from "terra-draw";
import { TerraDrawMapboxGLAdapter } from 'terra-draw-mapbox-gl-adapter';
import { GeoJSONSource } from 'mapbox-gl';
import { TerraDrawControlComponent } from './terraDraw-control';
import { v4 as uuidv4 } from 'uuid';


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
    props.setGeojsonFeatures(geojsonFeatures)
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
          props.setGeojsonFeatures(null)
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
export   type Mode = "rectangle" | "polygon" | "point" | "linestring" | "static"| "select";
function MapDrawingComponent(props: any): ReactElement  {

  const selectedIdRef = useRef<string | number | null>(null);
  const isProgrammaticDeselect = useRef(false);

  const onSelect = (id: string | number) => {
    selectedIdRef.current = id;
  
    const leftDraw = props.terraDrawLeftRef?.current;
    const rightDraw = props.terraDrawRightRef?.current;
  
    if (leftDraw?.getSnapshot().some((f: { id: string | number; }) => f.id === id)) {
      leftDraw.selectFeature(id);
    }
  
    if (rightDraw?.getSnapshot().some((f: { id: string | number; }) => f.id === id)) {
      rightDraw.selectFeature(id);
    }
  };
  const onDeselect = () => {
    if (isProgrammaticDeselect.current) return;
  
    const id = selectedIdRef.current;
    if (!id) return;
  
    isProgrammaticDeselect.current = true;   
    
    props.terraDrawRightRef?.current?.deselectFeature(id);
    props.terraDrawLeftRef?.current?.deselectFeature(id);
  
    selectedIdRef.current = null;
    isProgrammaticDeselect.current = false;
  };
// Syncs a feature’s coordinates from one map to the other to keep both maps in sync
const isProgrammaticUpdate = { current: false };
function syncFeatureCoordsAcrossMaps(featureId: string, fromLeft: boolean) {
  if (isProgrammaticUpdate.current) return;

  const sourceDraw = fromLeft ? props.terraDrawLeftRef.current : props.terraDrawRightRef.current;
  const targetDraw = fromLeft ? props.terraDrawRightRef.current : props.terraDrawLeftRef.current;
  if (!sourceDraw || !targetDraw) return;
  console.log(" Syncc,, fromLeft:", fromLeft, "terraDrawLeft:", sourceDraw, "terraDrawRight:", targetDraw);
  const feature = sourceDraw.getSnapshot().find((f: { id: string; }) => f.id === featureId);
  if (!feature) return;

  const targetFeature = targetDraw.getSnapshot().find((f: { id: string; }) => f.id === featureId);
  if (
    targetFeature &&
    JSON.stringify(targetFeature.geometry.coordinates) ===
      JSON.stringify(feature.geometry.coordinates)
  ) {
    return;
  }

  isProgrammaticUpdate.current = true;
  if (targetFeature) {
    targetDraw.updateFeatureGeometry(feature.id, feature.geometry);
  } else {
    targetDraw.addFeatures([feature]);
  }
  isProgrammaticUpdate.current = false;
}
// Updates the shared GeoJSON source on the map with features from the specified TerraDraw instance
const sharedData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
function updateSharedSource( fromLeft: boolean) {
  const sourceDraw = fromLeft
    ? props.terraDrawLeftRef.current
    : props.terraDrawRightRef.current;

  if (!sourceDraw) {
    console.warn("sourceDraw n'est pas défini");
    return;
  }

  const allFeatures = sourceDraw.getSnapshot();
  const leftMap = props.leftMapRef?.current?.getMap();
  const rightMap = props.rightMapRef?.current?.getMap();

  [leftMap, rightMap].forEach((map) => {
    const mySource = map?.getSource("shared-draw-source") as GeoJSONSource;
    mySource?.setData({
      type: "FeatureCollection",
      features: allFeatures,
    });
  });
}

function initTerraDraw(
  map: mapboxgl.Map,
  drawRef: React.MutableRefObject<TerraDraw | null>,
) {
  // Stop previous instance
  if (drawRef.current) {
    try {
      drawRef.current.stop();
    } catch (e) {
      console.warn("Erreur lors du stop précédent :", e);
    }
  }
  // create terradraw instance
  if (!map.getSource("shared-draw-source")) {
    console.log('source added'); 
    map.addSource("shared-draw-source", { type: "geojson", data: sharedData });
  }
  const terraDraw = new TerraDraw({
    adapter: new TerraDrawMapboxGLAdapter({ map }),
    modes: [
      new TerraDrawRectangleMode(),
      new TerraDrawPolygonMode(),
      new TerraDrawPointMode(),
      new TerraDrawLineStringMode(),
      new TerraDrawSelectMode({
        styles: {
          selectedPolygonFillOpacity: 0.7,
          selectedPolygonOutlineColor: "#00FF00",
          selectedPointColor: "#00FF00",
          selectedPointOutlineColor: "#00FFFF",
          selectedLineStringColor: "#00FF00",
        },
        flags: {
          point: { feature: { draggable: true } },
          polygon: { feature: { draggable: true } },
          rectangle: { feature: { draggable: true } },
          linestring: { feature: { draggable: true } },
        },
        allowManualDeselection: true,
      }),
    ],
  });
  if (!terraDraw) return;
  terraDraw.start();

  console.log('draaaaaaaaaaaaw',terraDraw);
  const fromLeft = drawRef === props.terraDrawLeftRef;
  terraDraw.on("select", onSelect);
  terraDraw.on("deselect", onDeselect);
  terraDraw.on("change", (ids, type, context) => { 
    console.log(ids,type,context);
    if (!ids) return;
    if (type === 'update' || type === 'create' ) {
      ids.forEach(id => syncFeatureCoordsAcrossMaps(id, fromLeft));
    }
  });
  terraDraw.on("change", () => updateSharedSource(fromLeft));

  drawRef.current = terraDraw;
}

// UseEffects to initialize both left and right terradraw instances
useEffect(() => {
  const leftMap = props.leftMapRef?.current?.getMap();
  if (!leftMap) return;

  const init = () => initTerraDraw(leftMap, props.terraDrawLeftRef);
  if (leftMap.isStyleLoaded()) {
    init();
  } else {
    leftMap.once("load", init);
  }

  return () => {
    props.terraDrawLeftRef?.current?.stop();
  };
}, []);

useEffect(() => {
  const rightMap = props.rightMapRef?.current?.getMap();

  if (!rightMap) return;

  const init = () => initTerraDraw(rightMap, props.terraDrawRightRef);
  if (rightMap.isStyleLoaded()) {
    init();
  } else {
    rightMap.once("load", init);
  }

  return () => {
    props.terraDrawRightRef?.current?.stop();
  };
}, []);

  //Bring drawing to front after changing the basemap
  const alreadyMovedLeftRef = useRef(false);
  const alreadyMovedRightRef = useRef(false);
  const bringTerraDrawToFront = (alreadyMovedRef : React.MutableRefObject<boolean>, terraDraw: TerraDraw, map: mapboxgl.Map) => {
    if (alreadyMovedRef.current) return;
    if (map && terraDraw) {
      ["td-polygon", "td-polygon-outline", "td-linestring", "td-point"].forEach(layerId => {
        console.log(map.getLayer(layerId));
        
        if (map.getLayer(layerId)) map.moveLayer(layerId);
      });
    }
    alreadyMovedRef.current = true;
  };
  useEffect(() => {
  
    if (props.clickedMap == 'right') return;
    const leftMap = props.leftMapRef?.current?.getMap();
    const leftTerraDraw = props.terraDrawLeftRef?.current;

    if (!leftMap || !leftTerraDraw) return;
    
    alreadyMovedLeftRef.current = false;   
    const onIdle = () => {
      bringTerraDrawToFront(alreadyMovedLeftRef, leftTerraDraw,leftMap );
    };
    leftMap.on("idle", onIdle);
    return () => {
      leftMap.off("idle", onIdle);
    };
  }, [props.selectedBasemap, props.leftTimelineDate]);

  useEffect(() => {
    if (props.clickedMap == 'left') return;
    const rightMap = props.rightMapRef?.current?.getMap();
    const rightTerraDraw = props.terraDrawRightRef?.current;

    if (!rightMap || !rightTerraDraw) return;
    
    alreadyMovedRightRef.current = false;
    const onIdle = () => {
      bringTerraDrawToFront(alreadyMovedRightRef, rightTerraDraw, rightMap );
    };
    rightMap.on("idle", onIdle);
    return () => {
      rightMap.off("idle", onIdle);
    };
  }, [props.selectedBasemap, props.rightTimelineDate]);

  //Switch between draw's modes
  const [activeMode, setActiveMode] = useState<Mode>("static");
  const toggleMode = (mode: Mode) => {
    const newMode = activeMode === mode ? "static" : mode; 
    const leftTerraDraw = props.terraDrawLeftRef?.current;
    const rightTerraDraw = props.terraDrawRightRef?.current;
    if (leftTerraDraw && props.clickedMap == 'left') {   
      leftTerraDraw.setMode(newMode);
      rightTerraDraw.setMode(newMode);
      setActiveMode(newMode);
    } else if (rightTerraDraw && props.clickedMap == 'right'){
      rightTerraDraw.setMode(newMode);
      leftTerraDraw.setMode(newMode);
      setActiveMode(newMode);
    }
  };

  // export drawings of both maps left & right
  function exportDrawing() {
    const leftFeatures = props.terraDrawLeftRef?.current?.getSnapshot() ?? [];
    if (leftFeatures.length === 0) {
      console.warn("Aucun dessin à exporter.");
      return;
    }
    const geojson = {
      type: "FeatureCollection",
      features: leftFeatures,
    }; 
    const blob = new Blob([JSON.stringify(geojson)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_drawings.geojson"; 
    a.click();
    URL.revokeObjectURL(url);
  }

  //delete handler for selected feature
  function deleteHandler() {
    const leftDraw = props.terraDrawLeftRef.current;
    const rightDraw = props.terraDrawRightRef.current;
    
    if (!leftDraw || !rightDraw) return;
  
    const selectedId = selectedIdRef.current;
    
    if (selectedId) {
      const removeFrom = (drawInstance: TerraDraw) => {
        const snapshot = drawInstance.getSnapshot();
        const filteredFeatures = snapshot.filter(
          (f) => f.id !== undefined && f.id !== selectedId
        );
        drawInstance.clear();
        drawInstance.addFeatures(filteredFeatures);
      }; 
      removeFrom(leftDraw);
      removeFrom(rightDraw);

      selectedIdRef.current = null;
    } else {
      leftDraw.clear();
      rightDraw.clear();
    }
  }
  
  //reset the mode onclick on Escape
  useEffect(() => {
    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Escape") {
        setActiveMode('static');
        props.terraDrawLeftRef.current?.setMode("static");
        props.terraDrawRightRef.current?.setMode("static");       
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  //Toggle the visibility of the drawings of both right and left maps
  const [isVisible, setVisible] = useState(true);
  function toggleDrawings() {
    const leftMap = props.leftMapRef?.current?.getMap();
    const rightMap = props.rightMapRef?.current?.getMap();

    if (!leftMap && !rightMap) return;

    setVisible(!isVisible)

    const lefMapLayers= leftMap.getStyle().layers
    
    lefMapLayers.forEach((layer: any)=>{
      if (layer.id.startsWith('td')) {       
        leftMap.setLayoutProperty(
          layer.id,
          'visibility',
          !isVisible ? 'visible' : 'none'
        );
        rightMap.setLayoutProperty(
          layer.id,
          'visibility',
          !isVisible ? 'visible' : 'none'
        );
      }
    })   
  }

  return(
    <>
      <TerraDrawControlComponent
        toggleMode={toggleMode}
        activeMode={activeMode}
        deleteHandler={deleteHandler}
        exportDrawing= {exportDrawing}
        toggleDrawings={toggleDrawings}
        position="top-left"
        isVisible={isVisible}
      />
    </>
      
  )

}


function MapControls(props: any): ReactElement {
  const terraDrawLeftRef= useRef<TerraDraw>();
  const terraDrawRightRef= useRef<TerraDraw>();
  return (
    <>
      <GeocoderControl
        mapboxAccessToken={props.mapboxAccessToken}
        position="top-left"
        flyTo={false}
        mapRef={props.mapRef}
      />
      <WrappedRulerControl
        position="top-left"
      />

      <NavigationControl showCompass={false} position="top-left" />

      <FileUploadControl
        setGeojsonFeatures={props.setGeojsonFeatures}
        mapRef={props.mapRef}
        terraDrawLeftRef= {terraDrawLeftRef}
        terraDrawRightRef= {terraDrawRightRef}
      />

      <MapDrawingComponent 
      leftMapRef={props.leftMapRef}
      rightMapRef= {props.rightMapRef}
      clickedMap={props.clickedMap}
      terraDrawLeftRef={terraDrawLeftRef}
      terraDrawRightRef={terraDrawRightRef}
      selectedBasemap={props.selectedBasemap}
      setGeojsonFeatures={props.setGeojsonFeatures}
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