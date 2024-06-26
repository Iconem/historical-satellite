import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import "./App.css";
import Map, { type MapRef, Source, Layer, ScaleControl, useControl } from "react-map-gl";
import GeocoderControl from "./geocoder-control";
import ControlPanel, { type MapSplitMode } from "./control-panel";
import { set, subMonths } from "date-fns";
import Split from "react-split";
import {RulerControl} from 'mapbox-gl-controls'
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import MapboxDraw from '@mapbox/mapbox-gl-draw';

// import '@mapbox-controls/ruler/src/index.css';


import {
  planetBasemapUrl,
  BasemapsIds,
  basemapsTmsSources,
  debounce,
  useLocalStorage,
} from "./utilities";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
let rulerOk = false;
// TODO Avoid tile popping on setTiles of rasterTileSet imagery source
// https://github.com/mapbox/mapbox-gl-js/issues/12707


/* eslint-disable complexity,max-statements */
function MapboxRulerControl(props: any) {
  const customControl = useControl(
    () => {
      const ctrl = new RulerControl({
        ...props
      });
      return ctrl;
    },
    {
      position: props.position
    }
  );

  return null;
}

function MapboxRulerControl2(props: any) {
  useControl<MapboxDraw>(
    () => new RulerControl(props),
    ({map}: {map: MapRef}) => {
      map.on('ruler.on', (evt: {features: object[]}) => {console.log('ruler.on', evt)});
      map.on('ruler.off', (evt: {features: object[]}) => {console.log('ruler.off', evt)});
    },
    ({map}: {map: MapRef}) => {
      map.off('ruler.on', props.onCreate);
      map.off('ruler.off', props.onUpdate);
    },
    {
      position: props.position
    }
  );

  return null;
}


function DrawControl(props: any) { // DrawControlProps) {
  useControl(() => new MapboxDraw(props), {
    position: props.position
  });

  return null;
}


function DrawControl2(props: any) {
  useControl<MapboxDraw>(
    () => new MapboxDraw(props),
    ({map}: {map: MapRef}) => {
      map.on('draw.create', (evt: {features: object[]}) => {console.log('on draw.create', evt)});
      map.on('draw.update', (evt: {features: object[]}) => {console.log('on draw.update', evt)});
      map.on('draw.delete', (evt: {features: object[]}) => {console.log('on draw.delete', evt)});
    },
    ({map}: {map: MapRef}) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.update', props.onUpdate);
      map.off('draw.delete', props.onDelete);
    },
    {
      position: props.position
    }
  );

  return null;
}






// APP COMPONENT
function App() {
  // Maps refs
  const leftMapRef = useRef<MapRef>();
  const rightMapRef = useRef<MapRef>();

  // State variables
  const [backgroundBasemapStyle, setBackgroundBasemapStyle] = useState<any>(
    // "satellite-streets-v12"
    { version: 8, sources: {}, layers: [], glyphs:"mapbox://fonts/mapbox/{fontstack}/{range}.pbf"
  }
  );
  // const backgroundBasemapStyle = "satellite-streets-v12";
  // const [leftTimelineDate, setLeftTimelineDate] = useState<Date>(
  //   subMonths(new Date(), 1)
  // );
  // const [rightTimelineDate, setRightTimelineDate] = useState<Date>(
  //   subMonths(new Date(), 18)
  // );
  const [leftTimelineDate, setLeftTimelineDate] = useLocalStorage(
    "leftTimelineDate",
    subMonths(new Date(), 1)
  );
  const [rightTimelineDate, setRightTimelineDate] = useLocalStorage(
    "rightTimelineDate",
    subMonths(new Date(), 18)
  );
  // Like Mapbox gl compare https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-compare/
  // const [splitPanelSizesPercent, setSplitPanelSizesPercent] = useState([75, 25]);
  const [splitPanelSizesPercent, setSplitPanelSizesPercent] = useLocalStorage(
    "ui_splitPanelSizesPercent",
    [75, 25]
  );
  const hash = window.location.hash;
  let hashed_viewstate = hash
    .substring(1)
    .split("/")
    .map((x) => parseFloat(x));
  if (hashed_viewstate.length !== 3) {
    hashed_viewstate = [2, 10, 0];
  }
  const [viewState, setViewState] = useState({
    zoom: hashed_viewstate[0],
    latitude: hashed_viewstate[1],
    longitude: hashed_viewstate[2],
    pitch: 0,
  });

  // const [leftSelectedTms, setLeftSelectedTms] = useState<BasemapsIds>(
  //   BasemapsIds.PlanetMonthly
  // );
  // const [rightSelectedTms, setRightSelectedTms] = useState<BasemapsIds>(
  //   BasemapsIds.GoogleHybrid
  // );
  const [leftSelectedTms, setLeftSelectedTms]: [BasemapsIds, (e: BasemapsIds)=>void] = useLocalStorage(
    "ui_leftSelectedTms",
    BasemapsIds.PlanetMonthly
  );
  const [rightSelectedTms, setRightSelectedTms]: [BasemapsIds, (e: BasemapsIds)=>void] = useLocalStorage(
    "ui_rightSelectedTms",
    BasemapsIds.GoogleHybrid
  );
  // End of state variables
  function resizeMaps() {
    leftMapRef.current?.getMap()?.resize();
    rightMapRef.current?.getMap()?.resize();
    // rightMapRef.current.resize();
  }

  // const leftRuler = new RulerControl();
  const rightRuler = new RulerControl();

  if (!rulerOk) {
    console.log("Adding ruler control");
    // leftMapRef.current?.getMap()?.addControl(leftRuler, "top-left");
    rightMapRef.current?.getMap()?.addControl(rightRuler, "top-right");
    if (leftMapRef.current?.getMap()) {rulerOk=true;}
    // setRulerOk(true);
  }

  // Update raster TMS source faster than react component remount on timelineDate state update
  // useEffect(() => {
  //   leftMapRef.current
  //     ?.getSource("planetbasemap-source")
  //     ?.setTiles([planetBasemapUrl(leftTimelineDate)]);
  // }, [leftTimelineDate]);
  // useEffect(() => {
  //   (rightMapRef.current?.getSource("planetbasemap-source") as any)?.setTiles([
  //     planetBasemapUrl(rightTimelineDate),
  //   ]);
  // }, [rightTimelineDate]);

  // -----------------------
  // SPLIT SIDE BY SIDE MAPS
  // Implement split screen side by side maps to make it easier to compare two consecutive timestamps
  // https://github.com/visgl/react-map-gl/blob/7.0-release/examples/side-by-side/src/app.tsx
  // Two maps could be firing 'move' events at the same time, if the user interacts with one
  // while the other is in transition.
  // This state specifies which map to use as the source of truth
  // It is set to the map that received user input last ('movestart')
  const [activeMap, setActiveMap] = useState<"left" | "right">("left");
  const [clickedMap, setClickedMap] = useState<"left" | "right">("left");
  // Initializing blending mode state
  const [blendingMode, setBlendingMode] = useState("normal");
  const [blendingActivation, setBlendingActivation] = useState(true);
  // Initializing opacity state
  const [opacity, setOpacity] = useState(100);
  // const [splitScreenMode, setSplitScreenMode] =
  //   useState<MapSplitMode>("split-screen");
  const [splitScreenMode, setSplitScreenMode] = useLocalStorage(
    "ui_splitScreenMode",
    "split-screen"
  );
  const LeftMapStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width:
      splitScreenMode === "split-screen"
        ? `100%`
        : `${splitPanelSizesPercent[0]}%`,
    height: "100%",
  };
  const RightMapStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left:
      splitScreenMode === "split-screen" ? 0 : `${splitPanelSizesPercent[0]}%`,
    width:
      splitScreenMode === "split-screen"
        ? `100%`
        : `${splitPanelSizesPercent[1]}%`,
    height: "100%",
    clipPath:
      splitScreenMode === "split-screen"
        ? `polygon(${splitPanelSizesPercent[0]}% 0%, ${splitPanelSizesPercent[0]}% 100%, 100% 100%, 100% 0% )`
        : "",
    // Adding blending mode
    mixBlendMode: blendingActivation ? blendingMode : "normal",
    opacity: opacity,

  };
  useEffect(() => {
    resizeMaps();
  }, [splitScreenMode]);

  // const mapBounds = leftMapRef?.current?.getMap()?.getBounds();

  // TODO: on playback, rightmap Moves so fires setActiveMap('right') on play, which is unwanted since it prevents further play
  // const onLeftMoveStart = useCallback(() => console.log("left"), []);
  // const onRightMoveStart = useCallback(() => console.log("right"), []);
  const onLeftMoveStart = useCallback(() => setActiveMap("left"), []);
  const onRightMoveStart = useCallback(() => setActiveMap("right"), []);
  const onMove = useCallback((evt: any) => setViewState(evt.viewState), []);
  const onMoveDebounce = debounce(onMove, 10, false);

  const leftMapboxMapStyle = useMemo(() => {
    return leftSelectedTms == BasemapsIds.Mapbox
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : backgroundBasemapStyle;
  }, [leftSelectedTms]);
  const rightMapboxMapStyle = useMemo(() => {
    return rightSelectedTms == BasemapsIds.Mapbox
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : backgroundBasemapStyle;
  }, [rightSelectedTms]);

  const sharedMapsProps = {
    viewState,
    mapboxAccessToken: MAPBOX_TOKEN,
    renderWorldCopies: false,
    dragRotate: false,
    width: "100%",
    height: "100%",
    projection:"naturalEarth", 
  };

  const handleSplitScreenChange = (
    event: React.MouseEvent<HTMLElement>,
    splitScreenMode: MapSplitMode
  ) => {
    if (splitScreenMode !== null) {
      setSplitScreenMode(splitScreenMode);
    }

    if (splitScreenMode == "side-by-side") {
      setSplitPanelSizesPercent([50, 50]);
    }
  };

  return (
    <>
      <style>
        {`
          /* Split pane style and gutter */
          .split {
            display: flex;
            flex-direction: row;
          }

          .gutter {
            /*background-color: #eee;*/
            background-repeat: no-repeat;
            background-position: 50%;
            pointer-events: auto;
            z-index: 10;
          }

          .gutter.gutter-horizontal {
            background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
            cursor: col-resize;
          }
        `}
      </style>
      <ToggleButtonGroup
        style={{
          background: "#fffc", // "white",
          zIndex: 20,
          position: "absolute",
          width: "100px",
          left: `calc(${splitPanelSizesPercent[0]}% - 50px)`,
          top: "10px",
        }}
        color="primary"
        value={splitScreenMode}
        exclusive
        onChange={handleSplitScreenChange}
        aria-label="Platform"
        size="small"
      >
        <ToggleButton
          value="split-screen"
          style={{ width: "50%", margin: "0" }}
        >
          Split
        </ToggleButton>
        <ToggleButton
          value="side-by-side"
          style={{ width: "50%", margin: "0" }}
        >
          Side
        </ToggleButton>
      </ToggleButtonGroup>{" "}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.8)",
          position: "absolute",
          borderRadius: "25px",
          width: "25px",
          height: "25px",
          top: "10px",
          left:
            clickedMap == "left"
              ? `${splitPanelSizesPercent[0] / 2}%`
              : `${splitPanelSizesPercent[0] + splitPanelSizesPercent[1] / 2}%`,
          transitionDuration: "250ms",
          transitionProperty: "all",
          // right: activeMap == "left" ? "" : `${splitPanelSizesPercent[1] / 2}%`,
          zIndex: "20",
        }}
      ></div>
      <div>
        <Split
          sizes={splitPanelSizesPercent}
          minSize={100}
          expandToMin={false}
          gutterSize={30}
          gutterAlign="center"
          snapOffset={50}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          className="split"
          style={{ height: "100vh", backgroundColor: "#001624" }}
          onDragEnd={function (sizes: number[]) {
            setSplitPanelSizesPercent(sizes);
            resizeMaps();
          }}
          onDrag={function (sizes: number[]) {
            setSplitPanelSizesPercent(sizes);
            resizeMaps();
          }}
        >
          <div
            style={{
              height: "100vh",
              width: "100%",
              backgroundColor: "#001624",
            }}
          ></div>
          <div
            style={{
              height: "100vh",
              width: "100%",
              backgroundColor: "#00262F",
            }}
          ></div>
        </Split>
      </div>
      <Map
        {...sharedMapsProps}
        hash={true}
        // Left/Right Maps Sync
        id="left-map"
        ref={leftMapRef}
        onClick={() => setClickedMap("left")}
        onMoveStart={onLeftMoveStart}
        // onMove={activeMap === "left" ? onMove : () => ({})}
        onMove={activeMap === "left" ? onMoveDebounce : () => ({})}
        style={LeftMapStyle}
        mapStyle={leftMapboxMapStyle}
        // transformRequest={transformRequest}

        // projection={"naturalEarth"} // globe mercator naturalEarth equalEarth  // TODO: eventually make projection controllable
      >
        <GeocoderControl
          mapboxAccessToken={MAPBOX_TOKEN}
          position="top-left"
          flyTo={true}
          mapRef={leftMapRef}
        />
        <MapboxRulerControl2 
          position="top-left"
          invisible= {false}
          // labelFormat= {(n: number) => string}
          // lineLayout= {import('mapbox-gl').LineLayout}
          // linePaint= {import('mapbox-gl').LinePaint}
          // markerLayout= {import('mapbox-gl').CircleLayout}
          // markerPaint= {import('mapbox-gl').CirclePaint}
          // labelLayout= {import('mapbox-gl').SymbolLayout}
          // labelPaint= {import('mapbox-gl').SymbolPaint}
          />
          {/* <DrawControl
            position="top-left"
            displayControlsDefault={false}
            controls={{
              polygon: true,
              trash: true
            }}
          /> */}

        <DrawControl2 
            position="top-left"
            displayControlsDefault={true}
            controls={{
              polygon: true,
              trash: true
            }}
            />


        {leftSelectedTms == BasemapsIds.Mapbox ? (
          <></>
        ) : leftSelectedTms == BasemapsIds.PlanetMonthly ? (
          <Source
            id="planetbasemap-source"
            scheme="xyz"
            type="raster"
            // tiles={[]}
            tiles={[planetBasemapUrl(leftTimelineDate)]}
            tileSize={256}
            // key={"planetBasemap"}
            key={leftTimelineDate.toString()}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        ) : (
          <Source
            id="tms-source"
            scheme="xyz"
            type="raster"
            tiles={[basemapsTmsSources[leftSelectedTms].url]}
            maxzoom={basemapsTmsSources[leftSelectedTms].maxzoom || 20}
            tileSize={256}
            key={leftSelectedTms}
            // https://github.com/maptiler/tilejson-spec/tree/custom-projection/2.2.0
            // yandex is in CRS/SRS EPSG:3395 but mapbox source only supports CRS 3857 atm
            // crs={"EPSG:3395"}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        )}

        {/* {
        Array.from({ length: monthsCount }, (value, index) =>
          sliderValToDate(index)
        ).map(date => 
          <Source
            // id="planetbasemap-source"
            scheme="xyz"
            type="raster"
            tiles={[planetBasemapUrl(date)]}
            tileSize={512}
            // key={basemap_date_str}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source> 
        } */}
        {/* beforeId={"GROUP_"} */}
        <ScaleControl maxWidth={60} unit="metric" position={'top-left'}/>
      </Map>
      <Map
        {...sharedMapsProps}
        // Left/Right Maps Sync
        id="right-map"
        ref={rightMapRef}
        onClick={() => setClickedMap("right")}
        onMoveStart={onRightMoveStart}
        // onMove={activeMap === "right" ? onMove : () => ({})}
        onMove={activeMap === "right" ? onMoveDebounce : () => ({})}
        style={RightMapStyle}
        mapStyle={rightMapboxMapStyle}
      >
        {rightSelectedTms == BasemapsIds.Mapbox ? (
          <></>
        ) : rightSelectedTms == BasemapsIds.PlanetMonthly ? (
          <Source
            id="planetbasemap-source"
            scheme="xyz"
            type="raster"
            tiles={[planetBasemapUrl(rightTimelineDate)]}
            // tiles={[]}
            tileSize={256}
            // key={"planetBasemap"}
            key={rightTimelineDate.toString()}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        ) : (
          <Source
            id="tms-source"
            scheme="xyz"
            type="raster"
            tiles={[basemapsTmsSources[rightSelectedTms].url]}
            maxzoom={basemapsTmsSources[rightSelectedTms].maxzoom || 20}
            tileSize={256}
            key={rightSelectedTms}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        )}
        <ScaleControl maxWidth={60} unit="metric" position={'top-right'}/>
      </Map>
      <ControlPanel
        // Adding blending mode opacity, and blending mode activation to pass downward
        blendingActivation={blendingActivation}
        setBlendingActivation={setBlendingActivation}
        opacity={opacity}
        setOpacity={setOpacity}
        blendingMode={blendingMode}
        setBlendingMode={setBlendingMode}
        timelineDate={
          clickedMap == "left" ? leftTimelineDate : rightTimelineDate
        }
        setTimelineDate={
          clickedMap == "left" ? setLeftTimelineDate : setRightTimelineDate
        }
        selectedTms={clickedMap == "left" ? leftSelectedTms : rightSelectedTms}
        setSelectedTms={
          clickedMap == "left" ? setLeftSelectedTms : setRightSelectedTms
        }
        swapMapSources={() => {setLeftSelectedTms(rightSelectedTms); setRightSelectedTms(leftSelectedTms)}}
        splitScreenMode={splitScreenMode}
        setSplitScreenMode={setSplitScreenMode}
        setSplitPanelSizesPercent={setSplitPanelSizesPercent}
        mapRef={leftMapRef}
        clickedMap={clickedMap}
      />
    </>
  );
}

export default App;
