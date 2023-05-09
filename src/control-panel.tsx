import { useState, useRef, useEffect, Fragment } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import { LngLatBounds } from "mapbox-gl";
// import Slider from "@mui/material/Slider";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import PropTypes from 'prop-types'

import LinksSection from "./links-section";

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

  // ButtonGroup
  ButtonGroup,
  ClickAwayListener,
  Grow,
  Paper,
  Popper,
  MenuList,
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
  BasemapsIds,
  basemapsTmsSources,
  getSliderMarks,
} from "./utilities";

// Set min/max dates for planet monthly basemaps on component mount
const minDate = new Date("2016-01-01T00:00:00.000");
const maxDate = subMonths(new Date(), 1);
const monthsCount = differenceInMonths(maxDate, minDate);
const marks = getSliderMarks(minDate, maxDate);

function valueLabelFormat(value: number) {
  return `${formatDate(sliderValToDate(value, minDate))}`;
}

const splitButtonOptions = ["All Frames", "Script only"];
export type MapSplitMode = "side-by-side" | "split-screen";

// -------------------------------------------
// Component: PlayableSlider
// -------------------------------------------
// Component which is a playable slider, a Slider with PlayableControls
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

// -------------------------------------------
// Component: PlayableControls
// -------------------------------------------
// Component for PlayableControls, based on this S/O post + customized
// https://stackoverflow.com/questions/66983676/control-the-material-ui-slider-with-a-play-and-stop-buttons-in-react-js
// TODO setTimelineDate should be replaced by setSliderValue or similar
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

// -------------------------------------------
// Component: ExportSplitButton
// -------------------------------------------
// Material UI MUI SplitButton
// https://mui.com/material-ui/react-button-group/
function ExportSplitButton(props: any) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(1);

  // const handleClick = () => {
  //   console.info(`You clicked ${splitButtonOptions[selectedIndex]}`);
  // };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number
  ) => {
    setSelectedIndex(index);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpen(false);
  };
  const exportFramesMode = selectedIndex == 0;

  return (
    <Fragment>
      <ButtonGroup ref={anchorRef} aria-label="split button" variant="outlined">
        <Button onClick={handleToggle}>
          {splitButtonOptions[selectedIndex]}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="select merge strategy"
          aria-haspopup="menu"
          onClick={() => props.handleClick(exportFramesMode)}
          variant="contained"
        >
          <FontAwesomeIcon icon={faDownload} />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{
          zIndex: 1,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {splitButtonOptions.map((option, index) => (
                    <MenuItem
                      key={option}
                      selected={index === selectedIndex}
                      onClick={(event) => handleMenuItemClick(event, index)}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Fragment>
  );
}

// Could integrate unknown TMS servers via NextGis QMS, but not needed since all major ones already there
// https://docs.nextgis.com/qms_srv_dev/doc/api.html
// https://qms.nextgis.com/api/v1/geoservices/?type=tms&search=satellite&limit=50&offset=0&submitter=&ordering=name

// -----------------------------------------------------
// Get TiTiler Crop url from params (bounds and tmsUrl)
// -----------------------------------------------------
// Download merged/cropped version of the TMS tiled using the TiTiler /cog/crop endpoint
// Uses the gdal mini-driver WMS/TMS xml string representation
// See this discussion: https://github.com/developmentseed/titiler/discussions/640
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
    "https://titiler.xyz/cog/crop/" +
    // "https://app.iconem.com/titiler/cog/crop/" +
    `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}` +
    ".tif" +
    `?url=${encodeURIComponent(wmsUrl)}` +
    "&max_size=1024&coord-crs=epsg:4326"
  );
}

// -----------------------------------------------------
// Component: ControlPanel
// ------------------------------------------------------
function ControlPanel(props) {
  // ---------------------------
  // Slider control
  const handleSliderChange = (_: Event, newValue: number) => {
    props.setTimelineDate(sliderValToDate(newValue, minDate));
  };
  // For slider play/pause loops
  const [playbackSpeedFPS, setPlaybackSpeedFPS] = useState<number>(2);

  const handleBasemapChange = (event: SelectChangeEvent) => {
    props.setSelectedTms(event.target.value as string);
  };
  // ------------------------------------------
  // HANDLE EXPORT SAVE TO DISK
  // -------------------------------------------
  // Define function in component to use mapRef
  // Inspiration for ui overlays (date, latlon, scale) https://github.com/doersino/earthacrosstime/tree/master
  function handleExportButtonClick(exportFramesMode: boolean = true) {
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
        (date, index) => index >= 0 && index <= 1000 && date.getMonth() >= 0
      ) // Test with only yearly downloads
      .map((date) => {
        const tmsUrl = planetBasemapUrl(date);
        const downloadUrl = titilerCropUrl(bounds, tmsUrl);
        const date_YYYY_MM = formatDate(date);
        console.log("downloading", aDiv.href, "to", aDiv.download);
        // METHOD 1 WILL SIMPLY OPEN IMAGE IN NEW TAB
        // aDiv.href = downloadUrl;
        // aDiv.download = date_YYYY_MM + '_titiler.tif';
        // aDiv.click();
        // The download link won't work for cross-origin requests unless the other server sends a Content-Disposition: attachment header with the response. For security reasons.

        // TRYING METHOD 2
        // https://medium.com/charisol-community/downloading-resources-in-html5-a-download-may-not-work-as-expected-bf63546e2baa
        // Also potentially useful: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
        if (exportFramesMode)
          fetch(downloadUrl)
            .then((response) => response.blob())
            .then((blob) => {
              const blobURL = URL.createObjectURL(blob);
              aDiv.href = blobURL;
              aDiv.download = date_YYYY_MM + "_titiler.tif";
              aDiv.click();
            });

        return (
          `REM ${date_YYYY_MM}: ${downloadUrl}\n` +
          `%QGIS%\\bin\\gdal_translate -projwin ${bounds.getWest()} ${bounds.getNorth()} ${bounds.getEast()} ${bounds.getSouth()} -projwin_srs EPSG:4326 -outsize %BASEMAP_WIDTH% 0 "<GDAL_WMS><Service name='TMS'><ServerUrl>${escapeTmsUrl(
            tmsUrl
          )}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>" %DOWNLOAD_FOLDER%\\${
            date_YYYY_MM + "_gdal.tif"
          }`
        );
      });

    // Write gdal_translate command to batch script with indices to original location of cropped version
    const center = mapRef?.current?.getMap()?.getCenter();
    const degrees_decimals = 4; // 4 decimals ~11m precision / 5 decimals ~1m precision
    const center_lng = center?.lng?.toFixed(degrees_decimals);
    const center_lat = center?.lat?.toFixed(degrees_decimals);
    const zoom = mapRef?.current?.getMap()?.getZoom();
    const foldername = `planet-monthly-${center_lng}-${center_lat}-${zoom}`;
    const gdal_commands =
      "REM GDAL COMMANDS to retrieve Planet Monthly Basemaps (without TiTiler)\n" +
      `REM https://historical-satellite.iconem.com/#${zoom}/${center_lng}/${center_lat} \n` +
      `REM https://www.google.fr/maps/@${center_lat},${center_lng},${zoom}z/data=!3m2!1e3!4b1 \n` +
      "REM ---\n\n" +
      `set DOWNLOAD_FOLDER=${foldername}\n` +
      "set BASEMAP_WIDTH=4096\n\n" +
      `for /f "delims=" %%i in ('dir /b/od/t:c C:\\PROGRA~1\\QGIS*') do set QGIS="C:\\PROGRA~1\\%%i"\n` +
      `mkdir ${foldername} \n\n` +
      gdalTranslateCmds.join("\n");
    aDiv.href =
      "data:text/plain;charset=utf-8," + encodeURIComponent(gdal_commands);
    aDiv.download = "gdal_commands.bat";

    aDiv.click();
    // METHOD 2 TEST not working, since MDN says only supported in secure contexts (HTTPS)
    // Other way using HTML Native Filesystem API
    // https://stackoverflow.com/questions/34870711/download-a-file-at-different-location-using-html5/70001920#70001920
    // https://developer.chrome.com/articles/file-system-access/#create-a-new-file
    // For desktop only: https://caniuse.com/native-filesystem-api
    console.log(gdal_commands);
  }

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
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
          background: "#fffc",
          width: "100%",
          alignSelf: "flex-end",
          position: "relative",
          height: "auto",
        }}
      >
        <FormControl
          sx={{ m: 0, minWidth: 200, textAlign: "left" }}
          size="small"
        >
          <InputLabel id="select-label">Basemap</InputLabel>
          <Select
            labelId="demo-select-small-label"
            id="demo-select-small"
            value={props.selectedTms}
            label="Basemap"
            onChange={handleBasemapChange}
          >
            {Object.entries(basemapsTmsSources).map(([key, value]) => (
              <MenuItem value={key} key={key}>
                {BasemapsIds[key]}
              </MenuItem>
            ))}
            {/* <MenuItem value={''}>Mapbox</MenuItem> */}
          </Select>
        </FormControl>{" "}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
          <DatePicker
            slotProps={{
              textField: { size: "small", style: { width: "130px" } },
            }}
            // label={'"year" and "month"'}
            views={["year", "month"]}
            // style={{ margin: "50px", width: "10px" }}
            label="Basemap Date"
            format="YYYY/MM"
            minDate={dayjs(minDate)}
            maxDate={dayjs(maxDate)}
            value={dayjs(props.timelineDate)}
            onChange={(newValue) => props.setTimelineDate(new Date(newValue))}
            // renderInput={(params) => (
            //   <TextField {...params} sx={{ width: "10px" }} />
            // )}
          />
        </LocalizationProvider>{" "}
        <TextField
          style={{ width: "60px" }}
          size={"small"}
          id="outlined-number"
          label="FPS"
          type="number"
          value={`${playbackSpeedFPS}`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPlaybackSpeedFPS(parseFloat(event.target.value));
          }}
          InputLabelProps={{
            shrink: true,
          }}
        />{" "}
        <>
          <ExportSplitButton handleClick={handleExportButtonClick} />
          <a
            id="downloadFramesDiv"
            style={{ display: "none" }}
            target="_blank"
            download=""
          />
        </>{" "}
        {props.selectedTms == BasemapsIds.PlanetMonthly && (
          <PlayableSlider
            setTimelineDate={props.setTimelineDate}
            playbackSpeedFPS={playbackSpeedFPS}
            //
            min={0}
            max={monthsCount}
            marks={marks}
            //
            value={dateToSliderVal(props.timelineDate, minDate)}
            onChange={handleSliderChange}
            valueLabelFormat={valueLabelFormat}
          />
        )}
        <LinksSection mapRef={props.mapRef} />
      </div>
    </div>
  );
}

export default ControlPanel;
