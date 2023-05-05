import { useState, useRef, useEffect } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

// import { type LngLatBounds, type LngLat } from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
// import Slider from "@mui/material/Slider";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import PropTypes from 'prop-types'

import {
  Slider,
  Button,
  Box,
  Tooltip,
  TextField,
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Link,
  Typography,
} from "@mui/material";
import {
  differenceInMonths,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
} from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faForward,
  faPlay,
  faBackward,
  faForwardStep,
  faBackwardStep,
  faCircleStop,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";

import {
  sliderValToDate,
  dateToSliderVal,
  formatDate,
  planetBasemapUrl,
  dateTo_YYYY_MM,
  BasemapsIds,
  basemapsTmsUrls,
} from "./utilities";

// Set min/max dates for planet monthly basemaps on component mount
const minDate = new Date("2016-01-01T00:00:00.000");
const maxDate = new Date();
const monthsCount = differenceInMonths(maxDate, minDate) - 1;

// Helper functions to convert between date for date-picker and slider-value

function valueLabelFormat(value: number) {
  return `${formatDate(sliderValToDate(value, minDate))}`;
}

// Set custom slider marks for each beginning of year
const marks = Array.from({ length: monthsCount }, (_, index) =>
  sliderValToDate(index, minDate)
)
  .filter((date) => date.getMonth() == 0)
  .map((date) => ({
    value: dateToSliderVal(date, minDate),
    label: formatDate(date),
  }));

// Component which is a playable slider, a Slider with PlayableControls
// TODO: remove setTimelineDate
function PlayableSlider(props: any) {
  return (
    <>
      <Box sx={{ width: "50%", margin: "auto" }}>
        <Slider
          value={props.value}
          min={props.min}
          step={1}
          max={props.max}
          marks={props.marks}
          //
          onChange={props.onChange}
          valueLabelFormat={props.valueLabelFormat}
          getAriaValueText={props.valueLabelFormat}
          //
          size="small"
          stlye={{ width: "50%" }}
          valueLabelDisplay="auto"
        />
      </Box>
      <>
        <PlayableControls
          // setTimelineDate should be replaced by setSliderValue or similar
          setTimelineDate={props.setTimelineDate}
          playbackSpeedFPS={props.playbackSpeedFPS}
        />
      </>
    </>
  );
}
// Component for PlayableControls, based on this S/O post + customized
// https://stackoverflow.com/questions/66983676/control-the-material-ui-slider-with-a-play-and-stop-buttons-in-react-js
function PlayableControls(props: any) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const directionRef = useRef<"back" | "forward">("back");
  const intervalIdRef = useRef(0);

  const handleBack = () => {
    directionRef.current = "back";
    if (!isRunning) {
      setIsRunning(true);
    }
  };
  const handleNext = () => {
    directionRef.current = "forward";
    if (!isRunning) {
      setIsRunning(true);
    }
  };
  const handleBackStep = () => {
    // setTimelineDate should be replaced by setSliderValue or similar
    props.setTimelineDate(function (v: Date) {
      if (isAfter(v, minDate)) {
        return subMonths(v, 1);
      }
    });
  };
  const handleNextStep = () => {
    // setTimelineDate should be replaced by setSliderValue or similar
    props.setTimelineDate(function (v: Date) {
      if (isBefore(v, maxDate)) {
        return addMonths(v, 1);
      }
    });
  };
  const handleStop = () => {
    setIsRunning((r) => !r);
  };

  useEffect(() => {
    if (isRunning) {
      intervalIdRef.current = setInterval(() => {
        if (directionRef.current === "forward") {
          // setValue((v) => ++v);
          // setTimelineDate should be replaced by setSliderValue or similar
          props.setTimelineDate(function (v: Date) {
            if (isBefore(v, maxDate)) {
              return addMonths(v, 1);
            } else {
              setIsRunning(false);
              return v;
            }
          });
        }
        if (directionRef.current === "back") {
          // setValue((v) => --v);
          // setTimelineDate should be replaced by setSliderValue or similar
          props.setTimelineDate(function (v: Date) {
            if (isAfter(v, minDate)) {
              return subMonths(v, 1);
            } else {
              setIsRunning(false);
              return v;
            }
          });
        }
      }, 1000 / props.playbackSpeedFPS);
    }

    return () => clearInterval(intervalIdRef.current);
  }, [isRunning]);

  return (
    <>
      <Button onClick={handleBackStep}>
        <Tooltip title={"handleBackStep"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faBackwardStep} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleBack}>
        <Tooltip title={"handleBack"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faBackward} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleStop}>
        <Tooltip title={"handleStop"}>
          <strong>
            {" "}
            {isRunning ? (
              <FontAwesomeIcon icon={faCircleStop} />
            ) : directionRef.current == "forward" ? (
              <FontAwesomeIcon icon={faPlay} />
            ) : (
              <FontAwesomeIcon icon={faPlay} transform="flip-h" />
            )}{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleNext}>
        <Tooltip title={"handleNext"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faForward} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleNextStep}>
        <Tooltip title={"handleNextStep"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faForwardStep} />{" "}
          </strong>
        </Tooltip>
      </Button>
    </>
  );
}

// TODO: integrate unknown TMS servers via NextGis QMS:
// https://docs.nextgis.com/qms_srv_dev/doc/api.html
// https://qms.nextgis.com/api/v1/geoservices/?type=tms&search=satellite&limit=50&offset=0&submitter=&ordering=name

export type Mode = "side-by-side" | "split-screen";

// Download merged/cropped version of the TMS tiled using TiTiler
// See this post: https://github.com/developmentseed/titiler/discussions/640
// https://titiler.xyz/cog/crop/-110,-70,110,70.png?url=%3CGDAL_WMS%3E%3CService%20name%3D%27TMS%27%3E%3CServerUrl%3Ehttp%3A%2F%2Fmt.google.com%2Fvt%2Flyrs%3Dy%26amp%3Bx%3D%24%7Bx%7D%26amp%3By%3D%24%7By%7D%26amp%3Bz%3D%24%7Bz%7D%3C%2FServerUrl%3E%3C%2FService%3E%3CDataWindow%3E%3CUpperLeftX%3E-20037508.34%3C%2FUpperLeftX%3E%3CUpperLeftY%3E20037508.34%3C%2FUpperLeftY%3E%3CLowerRightX%3E20037508.34%3C%2FLowerRightX%3E%3CLowerRightY%3E-20037508.34%3C%2FLowerRightY%3E%3CTileLevel%3E18%3C%2FTileLevel%3E%3CTileCountX%3E1%3C%2FTileCountX%3E%3CTileCountY%3E1%3C%2FTileCountY%3E%3CYOrigin%3Etop%3C%2FYOrigin%3E%3C%2FDataWindow%3E%3CProjection%3EEPSG%3A3857%3C%2FProjection%3E%3CBlockSizeX%3E256%3C%2FBlockSizeX%3E%3CBlockSizeY%3E256%3C%2FBlockSizeY%3E%3CBandsCount%3E3%3C%2FBandsCount%3E%3CCache%20%2F%3E%3C%2FGDAL_WMS%3E

const escapeTmsUrl = (url: string) =>
  url.replace("{x}", "${x}").replace("{y}", "${y}").replace("{z}", "${z}");
function titilerCropUrl(bounds: LngLatBounds, tmsUrl: string) {
  // const bounds = new LngLatBounds(new LngLat(-110, -70), new LngLat(110, 70));
  // "http://mt.google.com/vt/lyrs=y&amp;x=${x}&amp;y=${y}&amp;z=${z}";
  const wmsUrl = `<GDAL_WMS><Service name='TMS'><ServerUrl>${escapeTmsUrl(
    tmsUrl
  )}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>`;
  //
  return (
    // "https://titiler.xyz/cog/crop/" +
    "https://app.iconem.com/titiler/cog/crop/" +
    `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}` +
    ".tif" +
    `?url=${encodeURIComponent(wmsUrl)}` +
    "&max_size=1024&coord-crs=epsg:4326"
  );
}
function ControlPanel(props) {
  // ---------------------------
  // Slider control
  const handleSliderChange = (_: Event, newValue: number) => {
    props.setTimelineDate(sliderValToDate(newValue, minDate));
  };
  // For slider play/pause loops
  const [playbackSpeedFPS, setPlaybackSpeedFPS] = useState<number>(2);

  // End of playback controls
  // ---------------------------

  const handleSplitScreenChange = (
    event: React.MouseEvent<HTMLElement>,
    splitScreenMode: string
  ) => {
    if (splitScreenMode !== null) {
      props.setSplitScreenMode(splitScreenMode);
    }

    if (splitScreenMode == "side-by-side") {
      props.setSplitPanelSizesPercent([50, 50]);
    }
  };

  // ------------------------------------------
  // HANDLE EXPORT SAVE TO DISK
  // -------------------------------------------
  // Define function in component to use mapRef
  // Inspiration for ui overlays (date, latlon, scale) https://github.com/doersino/earthacrosstime/tree/master
  function handleExportButtonClick() {
    const aDiv = document.getElementById(
      "downloadFramesDiv"
    ) as HTMLAnchorElement;
    const mapRef = props.mapRef;
    const bounds = mapRef?.current?.getMap()?.getBounds();
    // Loop through each monthly basemap and download
    const gdalTranslateCmds = Array.from(
      { length: monthsCount },
      (value, index) => sliderValToDate(index, minDate)
    )
      .filter(
        (date, index) => index > 20 && index <= 50 && date.getMonth() == 0
      ) // Test with only yearly downloads
      .map((date) => {
        const tmsUrl = planetBasemapUrl(date);
        const downloadUrl = titilerCropUrl(bounds, tmsUrl);
        const date_YYYY_MM = dateTo_YYYY_MM(date);
        console.log("downloading", aDiv.href, "to", aDiv.download);
        // METHOD 1 WILL SIMPLY OPEN IMAGE IN NEW TAB
        // aDiv.href = downloadUrl;
        // aDiv.download = date_YYYY_MM + '_titiler.tif';
        // aDiv.click();
        // The download link won't work for cross-origin requests unless the other server sends a Content-Disposition: attachment header with the response. For security reasons.

        // TRYING METHOD 2
        // https://medium.com/charisol-community/downloading-resources-in-html5-a-download-may-not-work-as-expected-bf63546e2baa
        // Also potentially useful: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
        fetch(downloadUrl)
          .then((response) => response.blob())
          .then((blob) => {
            const blobURL = URL.createObjectURL(blob);
            aDiv.href = blobURL;
            aDiv.download = date_YYYY_MM + "_titiler.tif";
            aDiv.click();
          });

        return (
          `REM ${dateTo_YYYY_MM(date)}: ${downloadUrl}\n` +
          `%QGIS%\\bin\\gdal_translate -projwin ${bounds.getWest()} ${bounds.getNorth()} ${bounds.getEast()} ${bounds.getSouth()} -projwin_srs EPSG:4326 -outsize %BASEMAP_WIDTH% 0 "<GDAL_WMS><Service name='TMS'><ServerUrl>${escapeTmsUrl(
            tmsUrl
          )}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>" ${
            date_YYYY_MM + "_gdal.tif"
          }`
        );
      });
    const gdal_commands =
      "REM GDAL COMMANDS to retrieve without TiTiler\nREM ---\n\n" +
      `for /f "delims=" %%i in ('dir /b/od/t:c C:\\PROGRA~1\\QGIS*') do set QGIS="C:\\PROGRA~1\\%%i"\n` +
      "set BASEMAP_WIDTH=4096\n\n" +
      gdalTranslateCmds.join("\n");
    aDiv.href =
      "data:text/plain;charset=utf-8," + encodeURIComponent(gdal_commands);
    aDiv.download = "gdal_commands.bat";

    // METHOD 1
    aDiv.click();

    // METHOD 2 TEST not working, since MDN says only supported in secure contexts (HTTPS)
    // const handle = getHandle();
    // save(handle, "encodeURIComponent(gdal_commands)");

    console.log(gdal_commands);
  }

  // Other way using HTML Native Filesystem API
  // https://stackoverflow.com/questions/34870711/download-a-file-at-different-location-using-html5/70001920#70001920
  // https://developer.chrome.com/articles/file-system-access/#create-a-new-file
  // For desktop only: https://caniuse.com/native-filesystem-api
  /*
  async function getHandle() {
    // set some options, like the suggested file name and the file type.
    const options = {
      suggestedName: "Historicl-satellite-downloader.bat",
      types: [
        {
          description: "Frames/Batch downloader",
          accept: {
            "text/plain": [".bat"],
            "image/png": [".png"],
            "image/tif": [".tif"],
          },
        },
      ],
    };
    // prompt the user for the location to save the file.
    const handle = await window.showSaveFilePicker(options);
    return handle;
  }

  async function save(handle: any, text: string) {
    // creates a writable, used to write data to the file.
    const writable = await handle.createWritable();
    // write a string to the writable.
    await writable.write(text);
    // close the writable and save all changes to disk. this will prompt the user for write permission to the file, if it's the first time.
    await writable.close();
  }

  function handleExportButtonClick2() {
    // calls the function to let the user pick a location.
    const handle = getHandle();
    // save data to this location as many times as you want. first time will ask the user for permission
    save(handle, "hello");
    save(handle, "Lorem ipsum...");
  }
  */

  const handleBasemapChange = (event: SelectChangeEvent) => {
    props.setSelectedTms(event.target.value as string);
  };
  const bounds = props.mapRef?.current?.getMap()?.getBounds();

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        // height: "25%",
        pointerEvents: "auto",

        bottom: 0,
        right: 0,
        left: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        outline: "none",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "30px",
          background: "white",
          width: "100%",
          alignSelf: "flex-end",
          // margin: "0 30px",
          //   bottom: "30px",
          position: "relative",
          //   height: "100%",
          height: "auto",
        }}
      >
        <ToggleButtonGroup
          color="primary"
          value={props.splitScreenMode}
          exclusive
          onChange={handleSplitScreenChange}
          aria-label="Platform"
          size="small"
        >
          <ToggleButton value="split-screen">Split</ToggleButton>
          <ToggleButton value="side-by-side">Side</ToggleButton>
        </ToggleButtonGroup>{" "}
        <FormControl sx={{ m: 0, minWidth: 120 }} size="small">
          <InputLabel id="select-label">Basemap</InputLabel>
          <Select
            labelId="demo-select-small-label"
            id="demo-select-small"
            value={props.selectedTms}
            label="Basemap"
            onChange={handleBasemapChange}
          >
            {Object.entries(basemapsTmsUrls).map(([key, value]) => (
              <MenuItem value={key} key={key}>
                {BasemapsIds[key]}
              </MenuItem>
            ))}
            {/* <MenuItem value={''}>Mapbox</MenuItem> */}
          </Select>
        </FormControl>{" "}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
          <DatePicker
            slotProps={{ textField: { size: "small" } }}
            // label={'"year" and "month"'}
            views={["year", "month"]}
            // style={{ margin: "50px", width: "10px" }}
            label="Basemap Date"
            format="YYYY/MM"
            minDate={dayjs(minDate)}
            maxDate={dayjs(maxDate)}
            value={dayjs(props.timelineDate)}
            onChange={(newValue) => props.setTimelineDate(new Date(newValue))}
          />
        </LocalizationProvider>{" "}
        <TextField
          style={{ width: "100px" }}
          size={"small"}
          id="outlined-number"
          label="Playback FPS"
          type="number"
          value={`${playbackSpeedFPS}`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPlaybackSpeedFPS(parseFloat(event.target.value));
          }}
          // min={0.1}
          // max={100}
          InputLabelProps={{
            shrink: true,
          }}
        />{" "}
        <>
          <Button variant="contained" onClick={handleExportButtonClick}>
            <Tooltip title={"Export monthly frames"}>
              <strong>
                {" "}
                <FontAwesomeIcon icon={faDownload} />{" "}
              </strong>
            </Tooltip>
          </Button>
          <a
            id="downloadFramesDiv"
            style={{ display: "none" }}
            target="_blank"
            download=""
          />
        </>
        <PlayableSlider
          setTimelineDate={props.setTimelineDate}
          playbackSpeedFPS={playbackSpeedFPS}
          //
          min={0}
          max={monthsCount}
          marks={marks}
          // step={1}
          //
          value={dateToSliderVal(props.timelineDate, minDate)}
          onChange={handleSliderChange}
          valueLabelFormat={valueLabelFormat}
        />
        <Typography variant="body2">
          {" "}
          Useful:{" "}
          <Link href="https://google.com/intl/fr/earth/versions/#earth-pro">
            Google Earth Pro Desktop
          </Link>
          {" (with Historical imagery or "}
          <Link
            href={`https://earth.google.com/web/@${bounds?.getCenter()?.lat},${
              bounds?.getCenter()?.lng
            },2120.14317151a,89404.62057254d,35y,0h,0t,0r`}
          >
            Web
          </Link>
          {") | ESRI "}
          <Link
            href={`https://livingatlas.arcgis.com/wayback/#active=37890&ext=${bounds?.getWest()},${bounds?.getSouth()},${bounds?.getEast()},${bounds?.getNorth()}`}
          >
            Imagery Wayback Machine
          </Link>
          {" | and "}
          <Link
            href={`https://earthengine.google.com/timelapse#v=${
              bounds?.getCenter()?.lat
            },${
              bounds?.getCenter()?.lng
            },10,latLng&t=0.03&ps=50&bt=19840101&et=20201231&startDwell=0&endDwell=0`}
          >
            Google Timelapse
          </Link>{" "}
        </Typography>
        {/* <div
          style={{
            backgroundColor: "red",
            position: "absolute",
            width: "50px",
            height: "50px",
            bottom: 0,
            left: props.activeMap == "left" ? 0 : "",
            right: props.activeMap == "left" ? "" : 0,
          }}
        ></div> */}
      </div>
    </div>
  );
}

export default ControlPanel;
