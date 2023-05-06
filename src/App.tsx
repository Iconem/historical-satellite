import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import "./App.css";
import Map, { type MapRef, Source, Layer } from "react-map-gl";
import GeocoderControl from "./geocoder-control";
import ControlPanel, { type Mode } from "./control-panel";
import { subMonths } from "date-fns";
import Split from "react-split";

import { planetBasemapUrl, BasemapsIds, basemapsTmsUrls } from "./utilities";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// APP COMPONENT
function App() {
  // Maps refs
  const leftMapRef = useRef<MapRef>();
  const rightMapRef = useRef<MapRef>();

  // State variables
  // const [basemapStyle, setBasemapStyle] = useState<string>(
  //   "satellite-streets-v12"
  // );
  const basemapStyle = "satellite-streets-v12";
  const [leftTimelineDate, setLeftTimelineDate] = useState<Date>(
    subMonths(new Date(), 1)
  );
  const [rightTimelineDate, setRightTimelineDate] = useState<Date>(
    subMonths(new Date(), 18)
  );
  // Like Mapbox gl compare https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-compare/
  const [splitPanelSizesPercent, setSplitPanelSizesPercent] = useState([
    75, 25,
  ]);
  const [viewState, setViewState] = useState({
    longitude: 20,
    latitude: 20,
    zoom: 3.5,
    pitch: 0,
  });

  const [leftSelectedTms, setLeftSelectedTms] = useState<BasemapsIds>(
    BasemapsIds.PlanetMonthly
  );
  const [rightSelectedTms, setRightSelectedTms] = useState<BasemapsIds>(
    BasemapsIds.Google
  );
  // End of state variables
  function resizeMaps() {
    leftMapRef.current?.getMap()?.resize();
    rightMapRef.current?.getMap()?.resize();
    // rightMapRef.current.resize();
  }

  // Update raster TMS source faster than react component remount on timelineDate state update
  useEffect(() => {
    leftMapRef.current
      ?.getSource("planetbasemap-source")
      ?.setTiles([planetBasemapUrl(leftTimelineDate)]);
  }, [leftTimelineDate]);
  useEffect(() => {
    (rightMapRef.current?.getSource("planetbasemap-source") as any)?.setTiles([
      planetBasemapUrl(rightTimelineDate),
    ]);
  }, [rightTimelineDate]);

  // const minDate = new Date("2016-01-01T00:00:00.000");
  // const maxDate = new Date();
  // const monthsCount = differenceInMonths(maxDate, minDate) - 1;

  // -----------------------
  // SPLIT SIDE BY SIDE MAPS
  // Implement split screen side by side maps to make it easier to compare two consecutive timestamps
  // https://github.com/visgl/react-map-gl/blob/7.0-release/examples/side-by-side/src/app.tsx
  // Two maps could be firing 'move' events at the same time, if the user interacts with one
  // while the other is in transition.
  // This state specifies which map to use as the source of truth
  // It is set to the map that received user input last ('movestart')
  const [activeMap, setActiveMap] = useState<"left" | "right">("left");
  const [splitScreenMode, setSplitScreenMode] = useState<Mode>("split-screen");
  const LeftMapStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    width:
      splitScreenMode === "split-screen"
        ? `100%`
        : `${splitPanelSizesPercent[0]}%`,
    height: "100%",
  };
  const RightMapStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
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
  };
  useEffect(() => {
    resizeMaps();
  }, [splitScreenMode]);

  // const mapBounds = leftMapRef?.current?.getMap()?.getBounds();

  const onLeftMoveStart = useCallback(() => setActiveMap("left"), []);
  const onRightMoveStart = useCallback(() => setActiveMap("right"), []);
  const onMove = useCallback((evt: any) => setViewState(evt.viewState), []);

  const leftMapboxMapStyle = useMemo(() => {
    return leftSelectedTms == BasemapsIds.Mapbox
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : // : // : "mapbox://styles/mapbox/streets-v12"
        { version: 8, sources: {}, layers: [] };
  }, [leftSelectedTms]);
  const rightMapboxMapStyle = useMemo(() => {
    return rightSelectedTms == BasemapsIds.Mapbox
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : // : // : "mapbox://styles/mapbox/streets-v12"
        { version: 8, sources: {}, layers: [] };
  }, [rightSelectedTms]);
  // {
  //   `mapbox://styles/mapbox/${basemapStyle}`;
  // }
  // mapStyle={
  //   leftSelectedTms == BasemapsIds.Mapbox
  //     ? "mapbox://styles/mapbox/satellite-streets-v12"
  //     : // : "mapbox://styles/mapbox/streets-v12"
  //       { version: 8, sources: {}, layers: [] }
  // } // "mapbox://styles/mapbox/dark-v9"

  /*
  const width = typeof window === "undefined" ? 100 : window.innerWidth;
  const leftMapPadding = useMemo(() => {
    return {
      // left: splitScreenMode === "split-screen" ? width / 2 : 0,
      left:
        splitScreenMode === "split-screen"
          ? (0 * (width * splitPanelSizesPercent[0])) / 100
          : 0,
      top: 0,
      right:
        splitScreenMode === "split-screen"
          ? (0 * (width * splitPanelSizesPercent[0])) / 100
          : 0,
      bottom: 0,
    };
  }, [width, splitScreenMode, splitPanelSizesPercent]);
  const rightMapPadding = useMemo(() => {
    return {
      right:
        splitScreenMode === "split-screen"
          ? (0 * (width * splitPanelSizesPercent[0])) / 100
          : 0,
      top: 0,
      left:
        splitScreenMode === "split-screen"
          ? (0 * (width * splitPanelSizesPercent[0])) / 100
          : 0,
      bottom: 0,
    };
  }, [width, splitScreenMode, splitPanelSizesPercent]);
  */

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
      <div>
        <Split
          sizes={splitPanelSizesPercent}
          minSize={100}
          expandToMin={false}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          className="split"
          style={{ height: "100vh" }}
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
              // backgroundColor: "rgba(255,0,0,0.5)",
            }}
          ></div>
          <div
            style={{
              height: "100vh",
              width: "100%",
              backgroundColor: "#00262F",
              // backgroundColor: "rgba(0,0,255,0.5)",
            }}
          ></div>
        </Split>
      </div>
      <Map
        // Either use this controlled state
        id="left-map"
        {...viewState}
        // padding={leftMapPadding}
        onMoveStart={onLeftMoveStart}
        onMove={activeMap === "left" ? onMove : () => ({})}
        style={LeftMapStyle}
        hash={true}
        mapStyle={leftMapboxMapStyle}
        // mapStyle={
        //   leftSelectedTms == BasemapsIds.Mapbox
        //     ? "mapbox://styles/mapbox/satellite-streets-v12"
        //     : // : "mapbox://styles/mapbox/streets-v12"
        //       { version: 8, sources: {}, layers: [] }
        // } // "mapbox://styles/mapbox/dark-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        renderWorldCopies={false}
        dragRotate={false}
        // projection={"naturalEarth"} // globe mercator naturalEarth equalEarth  // TODO: eventually make projection controllable
        ref={leftMapRef}
        onClick={() => setActiveMap("left")}
      >
        <GeocoderControl
          mapboxAccessToken={MAPBOX_TOKEN}
          position="top-left"
          flyTo={{ speed: 2.5 }}
          mapRef={leftMapRef}
        />
        {/* <Source
          id="planetbasemap-source"
          scheme="xyz"
          type="raster"
          tiles={[planetBasemapUrl(timelineDate)]}
          tileSize={256}
          // key={basemap_date_str}
        >
          <Layer type="raster" layout={{}} paint={{}} />
        </Source> */}

        {leftSelectedTms == BasemapsIds.Mapbox ? (
          <></>
        ) : leftSelectedTms == BasemapsIds.PlanetMonthly ? (
          <Source
            id="planetbasemap-source"
            scheme="xyz"
            type="raster"
            tiles={[planetBasemapUrl(leftTimelineDate)]}
            tileSize={256}
            key={"planetBasemap"}
            // key={basemap_date_str}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        ) : (
          <Source
            id="tms-source"
            scheme="xyz"
            type="raster"
            tiles={[basemapsTmsUrls[leftSelectedTms]]}
            tileSize={256}
            key={leftSelectedTms}
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
      </Map>

      <Map
        id="right-map"
        {...viewState}
        // padding={rightMapPadding}
        onMoveStart={onRightMoveStart}
        onMove={activeMap === "right" ? onMove : () => ({})}
        style={RightMapStyle}
        mapStyle={rightMapboxMapStyle}
        // mapStyle="mapbox://styles/mapbox/satellite-streets-v12" // "mapbox://styles/mapbox/dark-v9"
        // mapStyle={
        //   rightSelectedTms == BasemapsIds.Mapbox
        //     ? "mapbox://styles/mapbox/satellite-streets-v12"
        //     : { version: 8, sources: {}, layers: [] }
        // } // "mapbox://styles/mapbox/dark-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        ref={rightMapRef}
        onClick={() => setActiveMap("right")}
      >
        {rightSelectedTms == BasemapsIds.Mapbox ? (
          <></>
        ) : rightSelectedTms == BasemapsIds.PlanetMonthly ? (
          <Source
            id="planetbasemap-source"
            scheme="xyz"
            type="raster"
            tiles={[planetBasemapUrl(rightTimelineDate)]}
            tileSize={256}
            // key={basemap_date_str}
            key={"planetBasemap"}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        ) : (
          <Source
            id="tms-source"
            scheme="xyz"
            type="raster"
            tiles={[basemapsTmsUrls[rightSelectedTms]]}
            tileSize={256}
            key={rightSelectedTms}
          >
            <Layer type="raster" layout={{}} paint={{}} />
          </Source>
        )}
      </Map>
      <ControlPanel
        timelineDate={
          activeMap == "left" ? leftTimelineDate : rightTimelineDate
        }
        setTimelineDate={
          activeMap == "left" ? setLeftTimelineDate : setRightTimelineDate
        }
        selectedTms={activeMap == "left" ? leftSelectedTms : rightSelectedTms}
        setSelectedTms={
          activeMap == "left" ? setLeftSelectedTms : setRightSelectedTms
        }
        splitScreenMode={splitScreenMode}
        setSplitScreenMode={setSplitScreenMode}
        setSplitPanelSizesPercent={setSplitPanelSizesPercent}
        mapRef={leftMapRef}
        activeMap={activeMap}
      />
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.8)",
          position: "absolute",
          borderRadius: "25px",
          width: "25px",
          height: "25px",
          top: "10px",
          left:
            activeMap == "left"
              ? `${splitPanelSizesPercent[0] / 2}%`
              : `${splitPanelSizesPercent[0] + splitPanelSizesPercent[1] / 2}%`,
          transitionDuration: "250ms",
          transitionProperty: "all",
          // right: activeMap == "left" ? "" : `${splitPanelSizesPercent[1] / 2}%`,
          zIndex: "20",
        }}
      ></div>
    </>
  );
}

export default App;
