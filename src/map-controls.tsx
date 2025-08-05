import { ReactElement, memo, useCallback, useEffect, useRef, useState } from 'react'
import CustomOverlay from './custom-overlay';
import { ScaleControl, NavigationControl, useControl } from "react-map-gl/mapbox-legacy";
import GeocoderControl from './geocoder-control'
import RulerControl from '@mapbox-controls/ruler';
import JSZip from 'jszip'

import bbox from '@turf/bbox'
import { kml } from '@tmcw/togeojson'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons'

import { TerraDraw, TerraDrawFreehandMode, TerraDrawPointMode, TerraDrawPolygonMode, TerraDrawRectangleMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapboxGLAdapter } from 'terra-draw-mapbox-gl-adapter';
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import mapboxgl from 'mapbox-gl';
import { string } from 'prop-types';
import { long2tile } from '@vannizhang/wayback-core';


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
              properties: {
                ...(feature.properties || {}),
                mode,
              },
            };

            // To see if we delete the uploaded geojsonfeature from mapbox if we added it to terradraw....
            //in this case we should add in the props setGeojsonFeatures and set it here to {}...
          }); 
          const terraDraw = props.terraDrawLeftRef?.current;
        
          if (terraDraw) {
            terraDraw.addFeatures(updatedFeatures);
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

function RemoveFeatures(props: any): ReactElement {
  return (
    <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
      <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button
          type="button"
          title="Remove Features (geojson, kml etc)"
          onClick={() => {
            props.setGeojsonFeatures({
              type: 'FeatureCollection', features: []
            })
          }}
        >
          <span className="mapboxgl-ctrl-icon" style={{ paddingTop: '7px' }}>
            <FontAwesomeIcon icon={faTrash} />{' '}
          </span>
        </button>
      </div>
    </CustomOverlay>
  )
}


function FileUploadControl(props: any): ReactElement {
  return (
    <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
      <FileInput {...props} />
    </CustomOverlay>
  )
}

function MapDrawingComponent(props: any): ReactElement  {

  function initTerraDrawLeft(map: mapboxgl.Map) {
      if (props.terraDrawLeftRef.current) {
        try {
          props.terraDrawLeftRef.current.stop();
        } catch (e) {
          console.warn("Erreur lors du stop précédent :", e);
        }
      }
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapboxGLAdapter({ map }),
      modes: [
        new TerraDrawRectangleMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawPointMode(),
        new TerraDrawSelectMode({
          styles: {
            selectedPolygonFillOpacity: 0.7,
            selectedPolygonOutlineColor: "#00FF00",
            selectedPointColor: "#00FF00",
            selectedPointOutlineColor: "#00FFFF",
          },
          // Enable editing tools by Feature
          flags: {
            point: { feature: { draggable: true } },
            polygon: { feature: { draggable: true } },
            rectangle: { feature: { draggable: true } },
          },
          allowManualDeselection: true,
        })
      ],
    });
  
    terraDraw.start();
    const layers = map.getStyle().layers;
    
      if (layers) {
        layers.forEach(layer => {
          if (layer.id.startsWith('terra-draw')) {
            try {
              map.moveLayer(layer.id);
            } catch(e) {
              console.log(e);
              
            }
          }
        });
      }
    props.terraDrawLeftRef.current = terraDraw;
  }
  
  function initTerraDrawRight(map: mapboxgl.Map) {
    if (props.terraDrawRightRef.current) {
      try {
        props.terraDrawRightRef.current.stop();
      } catch (e) {
        console.warn("Erreur lors du stop précédent :", e);
      }
    }
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapboxGLAdapter({ map }),
      modes: [
        new TerraDrawRectangleMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawPointMode(),
        new TerraDrawSelectMode({
          styles: {
            selectedPolygonFillOpacity: 0.7,
            selectedPolygonOutlineColor: "#00FF00",
            selectedPointColor: "#00FF00",
            selectedPointOutlineColor: "#00FFFF",
          },
          // Enable editing tools by Feature
          flags: {
            point: { feature: { draggable: true } },
            polygon: { feature: { draggable: true } },
            rectangle: { feature: { draggable: true } },
          },
          allowManualDeselection: true,
        })
      ],
    });
  
    terraDraw.start();
    const layers = map.getStyle().layers;
    if (layers) {
      layers.forEach(layer => {
        if (layer.id.startsWith('terra-draw')) {
          try {
            map.moveLayer(layer.id);
          } catch(e) {
            console.log(e);
            
          }
        }
      });
    }
    props.terraDrawRightRef.current = terraDraw;
  }

  //initialize both left and right terradraw
  useEffect(() => {
    const leftMap = props.leftMapRef?.current?.getMap();
    if (!leftMap) return;

      if (leftMap.isStyleLoaded()) {
        initTerraDrawLeft(leftMap);
      } else {
        leftMap.once("load", () => {
          initTerraDrawLeft(leftMap);
        });
      }

    // Nettoyage
    return () => {
      props.terraDrawLeftRef?.current?.stop();
    };
  }, []);
  

  useEffect(()=>{
    const rightMap = props.rightMapRef?.current?.getMap();
    if (!rightMap) return;

      if (rightMap.isStyleLoaded()) {
        initTerraDrawRight(rightMap);
      } else {
        rightMap.once("load", () => {
          initTerraDrawRight(rightMap);
        });
      }

    // Nettoyage
    return () => {
      props.terraDrawRightRef?.current?.stop();
    };
  },[])

  //reset the terradraw mode on switch between maps
  useEffect(() => {
    const left = props.terraDrawLeftRef?.current;
    const right = props.terraDrawRightRef?.current;
  
    if (!left || !right) return;
  
    try {
      left.setMode('static');
    } catch (e) {
      console.warn("Erreur setMode left:", e);
    }
  
    try {
      right.setMode('static');
    } catch (e) {
      console.warn("Erreur setMode right:", e);
    }
  
    setActiveMode('static');
  }, [props.clickedMap]);

  //move terradraw layer to the front
  useEffect(() => {
    console.log('AAAAAA',props.selectedBasemap);
    const leftMap = props.leftMapRef?.current?.getMap();
    const rightMap = props.rightMapRef?.current?.getMap();
  
    // if (!leftMap ) return;

    function bringTerraDrawToFront(map: mapboxgl.Map) {
      const layers = map.getStyle().layers;
      console.log('LAYEEEEEEEEEEEEEEERS', layers);
      
      if (!layers) return;
  
      layers.forEach((layer) => {
        if (layer.id.startsWith("td")) {
          try {
            map.moveLayer(layer.id); 
            console.log(`Moved layer ${layer.id}`);
          } catch (e) {
            console.warn(`Erreur moveLayer sur ${layer.id}`, e);
          }
        }
      });
    }
  
    if (leftMap.isStyleLoaded()) {
      console.log('left loaded');
      bringTerraDrawToFront(leftMap);
    } else {
      console.log('left still loaded');
      leftMap.on("load", () => {
        console.log('UPPPPPPPPPP');
        
        const waiting = () => {
          if (!leftMap.isStyleLoaded()) {
            setTimeout(waiting, 200);
          } else {
            bringTerraDrawToFront(leftMap);
          }
        };
        waiting();
        
        console.log('preteeeeeeeeee');
        
        bringTerraDrawToFront(leftMap);
      });
    }
    
    
    // if (rightMap.isStyleLoaded()) {
    //   console.log('right loaded');
      
    //   bringTerraDrawToFront(rightMap);
    // }
    rightMap.on("style.load", () => {
      console.log('right still loaded ');
      
      bringTerraDrawToFront(rightMap);
    });
  
  }, [props.selectedBasemap]);

  // useEffect(() => {
  //   const leftMap = props.leftMapRef?.current?.getMap();
  //   const rightMap = props.rightMapRef?.current?.getMap();
  
  //   if (!leftMap || !rightMap) return;
  
  //   function bringTerraDrawToFront(map: mapboxgl.Map) {
  //     const layers = map.getStyle().layers;
  //     if (!layers) return;
  
  //     layers.forEach((layer) => {
  //       console.log('layer', layer);
        
  //       if (layer.id.startsWith("td")) {
  //         try {
  //           map.moveLayer(layer.id);
  //           console.log(`Moved layer ${layer.id}`);
  //         } catch (e) {
  //           console.warn(`Erreur moveLayer sur ${layer.id}`, e);
  //         }
  //       }
  //     });
  //   }
  
  //   // Pour leftMap
  //   if (props.clickedMap === "left") {
  //     console.log('leftclicked');
      
  //     if (leftMap.isStyleLoaded()) {
  //       console.log('leftloaded');
        
  //       bringTerraDrawToFront(leftMap);
  //     } else {
  //       console.log('entre dans le else');
        
  //       // Sinon on attend le chargement du style
  //       leftMap.once("style.load", () => {
  //         console.log("leftMap style chargé (event)");
  //         bringTerraDrawToFront(leftMap);
  //       });
  //     }
  //   }
    
  
  //   // Même chose pour rightMap
  //   // if (rightMap.isStyleLoaded()) {
  //   //   bringTerraDrawToFront(rightMap);
  //   // } else {
  //   //   rightMap.on("style.load", () => {
  //   //     console.log("rightMap style chargé (event)");
  //   //     bringTerraDrawToFront(rightMap);
  //   //   });
  //   // }
  
  // }, [props.selectedBasemap]);
  


  //Switch between draw's modes
  type Mode = "rectangle" | "polygon" | "point" | "static"| "select";
  const [activeMode, setActiveMode] = useState<Mode>("static");

  const toggleMode = (mode: Mode) => {
    const newMode = activeMode === mode ? "static" : mode;

    if (props.clickedMap == 'left') {   
      props.terraDrawLeftRef?.current?.setMode(newMode);
      setActiveMode(newMode);
    } else if (props.clickedMap == 'right'){
      props.terraDrawRightRef?.current?.setMode(newMode);
      setActiveMode(newMode);
    }

  };

  // export drawings of both maps left & right
  function exportDrawing() {
    const leftFeatures = props.terraDrawLeftRef?.current?.getSnapshot() ?? [];
    const rightFeatures = props.terraDrawRightRef?.current?.getSnapshot() ?? [];

    console.log('FEATUUUUUUUUUUUUUURES',leftFeatures);
    
  
    // Fusionner les deux tableaux
    const combinedFeatures = [...leftFeatures, ...rightFeatures];
  
    if (combinedFeatures.length === 0) {
      console.warn("Aucun dessin à exporter.");
      return;
    }
  
    const geojson = {
      type: "FeatureCollection",
      features: combinedFeatures,
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
  

  //Select one feature
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onSelect = (id: string) => {
    setSelectedId(id);
  };
  useEffect(() => {
    const draw =
      props.clickedMap === "left"
        ? props.terraDrawLeftRef.current
        : props.terraDrawRightRef.current;
  
    if (!draw) return;
  
    draw.on("select", onSelect);
  
    return () => {
      draw.off("select", onSelect);
    };
  }, [props.clickedMap]);
  

  //delete handler for selected feature
  function deleteHandler() {
    const draw =
      props.clickedMap === "left"
        ? props.terraDrawLeftRef.current
        : props.terraDrawRightRef.current;
  
    if (!draw) return;
  
    if (selectedId) {
      const snapshot = draw?.getSnapshot();
      const filteredFeatures = snapshot.filter(
        (f: { id: any }) => f.id !== selectedId
      );
  
      draw.clear(); 
      draw.addFeatures(filteredFeatures); 
  
      setSelectedId(null); 
    } else {
      draw.clear(); 
    }
  }
  const buttonStyle = {
    fontSize: "16px",
    padding: "2px",
    backgroundColor: "white",
    border: "none",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  };
  
  return(
    <div
      style={{
        position: "absolute",
        top: '35%',
        left: "10px",
        zIndex: 1,
        backgroundColor: "white",
        padding: "2px",
        borderRadius: "2px",
        boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "1px",

      }}
      className="terradraw-group"
    >

      <button 
      onClick={() => toggleMode("select")}
      style={{ 
        ...buttonStyle,
        backgroundColor: activeMode === "select" ? "lightgreen" : "white" }}
      >
        🖱️ 
      </button>
      <button
        onClick={() => toggleMode("rectangle")}
        style={{ 
          ...buttonStyle, 
          backgroundColor: activeMode === "rectangle" ? "lightgreen" : "white" }}
      >
        ▭
      </button>
      <button
        onClick={() => toggleMode("polygon")}
        style={{  
          ...buttonStyle,
          backgroundColor: activeMode === "polygon" ? "lightgreen" : "white" }}
      >
        ⬠
      </button>
      <button
        onClick={() => toggleMode("point")}
        style={{  
          ...buttonStyle,
          backgroundColor: activeMode === "point" ? "lightgreen" : "white" }}
      >
        📍
      </button>
      <button onClick={() =>deleteHandler()} style={{  ...buttonStyle}}> 
        🗑️ 
      </button>
      <button onClick={exportDrawing}  style={{  ...buttonStyle}}> 💾  </button>

    </div>

  )
  
}


function MapControls(props: any): ReactElement {
  // const terraDrawRef = useRef<TerraDraw>();
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

      <FileUploadControl
        setGeojsonFeatures={props.setGeojsonFeatures}
        mapRef={props.mapRef}
        terraDrawLeftRef= {terraDrawLeftRef}
        // terraDrawRef={terraDrawRef}
      />
      <RemoveFeatures 
        setGeojsonFeatures={props.setGeojsonFeatures}
        // terraDrawRef={terraDrawRef}
      />

      <NavigationControl showCompass={false} position="top-left" />

      <MapDrawingComponent 
      leftMapRef={props.leftMapRef}
      rightMapRef= {props.rightMapRef}
      clickedMap={props.clickedMap}
      terraDrawLeftRef={terraDrawLeftRef}
      terraDrawRightRef={terraDrawRightRef}
      selectedBasemap={props.selectedBasemap}
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