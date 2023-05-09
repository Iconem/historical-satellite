import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import "./App.css";
import Map, { type MapRef, Source, Layer } from "react-map-gl";
import GeocoderControl from "./geocoder-control";
import ControlPanel, { type SplitMode } from "./control-panel";
import { subMonths } from "date-fns";
import Split from "react-split";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";

import { planetBasemapUrl, BasemapsIds, basemapsTmsSources } from "./utilities";

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
  const hash = window.location.hash;
  let hashed_viewstate = hash
    .substring(1)
    .split("/")
    .map((x) => parseFloat(x));
  if (hashed_viewstate.length !== 3) {
    hashed_viewstate = [3.0, 20.0, 20.0];
  }
  const [viewState, setViewState] = useState({
    zoom: hashed_viewstate[0],
    latitude: hashed_viewstate[1],
    longitude: hashed_viewstate[2],
    pitch: 0,
  });

  const [leftSelectedTms, setLeftSelectedTms] = useState<BasemapsIds>(
    BasemapsIds.PlanetMonthly
  );
  const [rightSelectedTms, setRightSelectedTms] = useState<BasemapsIds>(
    BasemapsIds.GoogleHybrid
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
  const [splitScreenMode, setSplitScreenMode] =
    useState<SplitMode>("split-screen");
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

  const sharedMapsProps = {
    viewState,
    mapboxAccessToken: MAPBOX_TOKEN,
    renderWorldCopies: false,
    dragRotate: false,
  };

  const handleSplitScreenChange = (
    event: React.MouseEvent<HTMLElement>,
    splitScreenMode: SplitMode
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
          // textAlign: "center",
          // padding: "30px",
          background: "#fffc", // "white",
          // width: "100%",
          // alignSelf: "flex-end",
          // margin: "0 30px",
          //   bottom: "30px",
          // position: "absolute",
          //   height: "100%",
          // height: "auto",

          zIndex: 30,
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
            activeMap == "left"
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
        {...sharedMapsProps}
        hash={true}
        // Left/Right Maps Sync
        id="left-map"
        ref={leftMapRef}
        onClick={() => setActiveMap("left")}
        onMoveStart={onLeftMoveStart}
        onMove={activeMap === "left" ? onMove : () => ({})}
        style={LeftMapStyle}
        mapStyle={leftMapboxMapStyle}

        // projection={"naturalEarth"} // globe mercator naturalEarth equalEarth  // TODO: eventually make projection controllable
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
            tiles={[basemapsTmsSources[leftSelectedTms].url]}
            maxzoom={basemapsTmsSources[leftSelectedTms].maxzoom || 20}
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
        {...sharedMapsProps}
        // Left/Right Maps Sync
        id="right-map"
        ref={rightMapRef}
        onClick={() => setActiveMap("right")}
        onMoveStart={onRightMoveStart}
        onMove={activeMap === "right" ? onMove : () => ({})}
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
            tiles={[basemapsTmsSources[rightSelectedTms].url]}
            maxzoom={basemapsTmsSources[rightSelectedTms].maxzoom || 20}
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
    </>
  );
}

export default App;
