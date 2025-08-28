import { useState, useCallback, useEffect, useRef } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { writeArrayBuffer } from "geotiff";

import { LngLatBounds } from "mapbox-gl";

import { getWaybackItemsWithLocalChanges } from '@vannizhang/wayback-core';
import {
  addMonths,
  subMonths,
} from "date-fns";

import PlayableSlider from "./playable-slider";
import LinksSection from "./links-section";
import { ExportSplitButton, ExportButtonOptions } from "./export-split-button";
import SettingsModal from "./settings-modal";
import { toPixelData } from 'html-to-image';

import {
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
  Tooltip,
  Stack,
  IconButton,
  Divider,
  Box,
  Drawer,
  Slider,
  Checkbox,
  LinearProgress,
  Typography,
  Snackbar,
  SnackbarContent
} from "@mui/material";


import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';


import { differenceInMonths, eachMonthOfInterval, isValid } from "date-fns";
import JSZip from "jszip";
import { saveAs } from 'file-saver';
import {
  sliderValToDate,
  dateToSliderVal,
  formatDate,
  planetBasemapUrl,
  wayBackWithLocalChangesUrl,
  BasemapsIds,
  basemapsTmsSources,
  getSliderMarks,
  getSliderMarksEveryYear,
  MIN_PLANET_DATE,
  MAX_PLANET_DATE,
  useLocalStorage,
  getBingViewportDate,
  getEsriViewportDate,
  retrieveAppleAccessToken,
  chunkArray
} from "./utilities";


const TITILER_ENDPOINT = "https://titiler.xyz"; // https://app.iconem.com/titiler
const MAX_FRAME_RESOLUTION = 512; // 1024 - 2048 TODO 512 FOR TESTING? 2048 BETTER
const PROMISES_BATCH_SIZE = 5;
const PROMISES_BATCH_DELAY = 2000; // 2000ms

function LinearProgressWithLabel(props: { value: number }) {
  return (
    <Box display="flex" alignItems="center"  >
      <Box width="300px" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={35}>
        <Typography variant="body2" color='black'>
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

function valueLabelFormat(value: number, minDate: Date) {
  return `${formatDate(sliderValToDate(value, minDate))}`;
}

export type MapSplitMode = "side-by-side" | "split-screen";

type PartOfGdalCmd = {
  downloadUrl: string;
  batch_cmd: string;
  filename: string;
};


// Could integrate unknown TMS servers via NextGis QMS, but not needed since all major ones already there
// https://docs.nextgis.com/qms_srv_dev/doc/api.html
// https://qms.nextgis.com/api/v1/geoservices/?type=tms&search=satellite&limit=50&offset=0&submitter=&ordering=name

// -----------------------------------------------------
// Get TiTiler Crop url from params (bounds and tmsUrl)
// -----------------------------------------------------
// Download merged/cropped version of the TMS tiled using the TiTiler /cog/bbox (previously /cog/crop) endpoint
// Uses the gdal mini-driver WMS/TMS xml string representation
// See this discussion: https://github.com/developmentseed/titiler/discussions/640
// https://titiler.xyz/cog/crop/-110,-70,110,70.png?url=%3CGDAL_WMS%3E%3CService%20name%3D%27TMS%27%3E%3CServerUrl%3Ehttp%3A%2F%2Fmt.google.com%2Fvt%2Flyrs%3Dy%26amp%3Bx%3D%24%7Bx%7D%26amp%3By%3D%24%7By%7D%26amp%3Bz%3D%24%7Bz%7D%3C%2FServerUrl%3E%3C%2FService%3E%3CDataWindow%3E%3CUpperLeftX%3E-20037508.34%3C%2FUpperLeftX%3E%3CUpperLeftY%3E20037508.34%3C%2FUpperLeftY%3E%3CLowerRightX%3E20037508.34%3C%2FLowerRightX%3E%3CLowerRightY%3E-20037508.34%3C%2FLowerRightY%3E%3CTileLevel%3E18%3C%2FTileLevel%3E%3CTileCountX%3E1%3C%2FTileCountX%3E%3CTileCountY%3E1%3C%2FTileCountY%3E%3CYOrigin%3Etop%3C%2FYOrigin%3E%3C%2FDataWindow%3E%3CProjection%3EEPSG%3A3857%3C%2FProjection%3E%3CBlockSizeX%3E256%3C%2FBlockSizeX%3E%3CBlockSizeY%3E256%3C%2FBlockSizeY%3E%3CBandsCount%3E3%3C%2FBandsCount%3E%3CCache%20%2F%3E%3C%2FGDAL_WMS%3E

const escapeTmsUrl = (url: string) =>
  url

    .replace("{x}", "${x}")
    .replace("{y}", "${y}")
    .replace("{z}", "${z}")
    .replace('{level}', '${z}')
    .replace('{row}', '${y}')
    .replace('{col}', '${x}')
    .replace("{quadkey}", "${quadkey}")
    .replaceAll("&", "&amp;");

function buildGdalWmsXml(tmsUrl: string) {
  return (!tmsUrl?.includes('quadkey')) ?
    `<GDAL_WMS><Service name='TMS'><ServerUrl>${escapeTmsUrl(tmsUrl)}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>`
    :
    `<GDAL_WMS><Service name='VirtualEarth'><ServerUrl>${escapeTmsUrl(tmsUrl)}</ServerUrl></Service><MaxConnections>4</MaxConnections><Cache/></GDAL_WMS>`;
}

// See discussion here https://github.com/developmentseed/titiler/discussions/640
function titilerCropUrl(
  bounds: LngLatBounds,
  tmsUrl: string,
  maxFrameResolution: number = MAX_FRAME_RESOLUTION,
  titilerEndpoint: string = TITILER_ENDPOINT
) {
  const wmsUrl = buildGdalWmsXml(tmsUrl)
  // titiler returned image is in 4326 CRS, cannot be modified yet
  const coords_str = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}.tif?max_size=${maxFrameResolution}&coord-crs=epsg:4326`; // 4326
  // Bug with 3857 bounds, InternalServerError 500 on titiler, so feature-request to support dst-tms
  // const ll_3857 = convertLatlonTo3857(bounds.getSouthWest());
  // const ur_3857 = convertLatlonTo3857(bounds.getNorthEast());
  // const coords_str = `${ll_3857.x},${ll_3857.y},${ur_3857.x},${ur_3857.y}.tif?max_size=${MAX_FRAME_SIZE}&coord-crs=epsg:3857`; // 3857

  // pre 0.15.0, endpoint is /cog/crop/ like on app.ico titiler endpoint at commit day
  // post 0.15.0 included, endpoint is /cog/bbox/
  const bbox_crop_endpoint = titilerEndpoint.toLowerCase().includes('app.iconem') ? 'crop' : 'bbox';
  return `${titilerEndpoint}/cog/${bbox_crop_endpoint}/${coords_str}&url=${encodeURIComponent(
    wmsUrl
  )}`;
}

/*
// Testing
titilerEndpoint = "https://titiler.xyz" 
coords_str = '-110,-70,110,70'
wmsUrl = "<GDAL_WMS><Service name='TMS'><ServerUrl>http://mt.google.com/vt/lyrs=y&amp;x=${x}&amp;y=${y}&amp;z=${z}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>"
a = `${titilerEndpoint}/cog/crop/${coords_str}&url=${encodeURIComponent(
    wmsUrl
  )}`;
*/

// -----------------------------------------------------
// BATCHES DOWNLOAD
// Download TiTiler images by batches to avoid too many requests
// resulting in 500 internal server error
// ------------------------------------------------------
const timer = async (ms: number): Promise<any> =>
  await new Promise((resolve) => setTimeout(resolve, ms));



function generateZip(zip: JSZip, foldername: any) {
  zip.generateAsync({ type: "blob" })
    .then(function (blob: any) {
      saveAs(blob, `${foldername}.zip`)
    });
}

// -----------------------------------------------------
// Mini-Components only used in ControlPanel
// ------------------------------------------------------
const OpacitySlider = (props: any) => {
  const handleOpacityChange = (event: any) => {
    props.setOpacity(event.target.value);
  };
  return (
    <Slider
      style={{ width: '10vw' }}
      value={props.opacity}
      step={0.005}
      size="small"
      min={0}
      max={1}
      valueLabelDisplay='auto'
      onChange={handleOpacityChange}
      getAriaValueText={v => `Opacity: ${Math.round(v * 100)} %`}
      valueLabelFormat={v => `Opacity: ${Math.round(v * 100)} %`}
    />
  );
}

const BlendingActivator = (props: any) => {
  const handleCheckboxChange = (event: any) => {
    props.setBlendingActivation(event.target.checked);
  }
  return (
    <Checkbox
      checked={props.blendingActivation}
      onChange={handleCheckboxChange}
      inputProps={{ 'aria-label': 'controlled' }}
    />
  );
}

const BlendingControl = (props: any) => {
  const blendingModes = [
    'difference', 'exclusion', 'color-burn', 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'hard-light', 'soft-light', 'hue', 'saturation', 'color', 'luminosity', 'plus-darker', 'plus-lighter'
  ];

  const handleBlendingModeChange = (event: any) => {
    const mode = event.target.value;
    props.setBlendingMode(mode);
    if (mode !== 'normal') props.setBlendingActivation(true)
  };

  return (
    <FormControl sx={{ m: 0, minWidth: 200, textAlign: "left" }} size="small">
      <InputLabel id="select-label">Blending Mode</InputLabel>
      <Select
        labelId="select-label"
        id="demo-select-small"
        value={props.blendingMode}
        label="Blending Mode"
        onChange={handleBlendingModeChange}
      >
        {blendingModes.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {mode}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};



// -----------------------------------------------------
// Component: ControlPanelDrawer
// ------------------------------------------------------
function ControlPanelDrawer(props: any) {
  const [open, setOpen] = useState(true);
  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{
      display: 'flex',
      height: 0,
      alignItems: 'flex-end',
      flexDirection: 'row-reverse'
    }}>
      <IconButton
        color="inherit"
        aria-label="open settings"
        onClick={handleDrawerToggle}
        edge="start"
        sx={{
          m: 2,
          backgroundColor: 'rgb(200 200 200 / 57%)',
          color: open ? 'grey' : 'white',
          zIndex: 2000,
          transition: 'bottom 225ms cubic-bezier(0, 0, 0.2, 1) 0ms',
        }}
      >
        {(open ? <ExpandMore /> : <ExpandLess />)}
      </IconButton>
      <Drawer
        sx={{
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
          },
        }}
        variant="persistent"
        anchor="bottom"
        open={open}
      >

        <ControlPanel  {...props} />
      </Drawer>
    </Box>
  );
}


enum ProviderOptions {
  PlanetMonthly = "Planet",
  ESRIWayback = "Esri WayBack",
  ALL_OTHERS = "All Others",
}


// -----------------------------------------------------
// Component: ControlPanel
// ------------------------------------------------------
function ControlPanel(props: any) {
  // ---------------------------
  // Slider control
  // For slider play/pause loops
  const [playbackSpeedFPS, setPlaybackSpeedFPS] = useLocalStorage(
    "playbackSpeedFPS",
    2
  );
  const handleSliderChange = (_: Event, newValue: number) => {
    props.setTimelineDate(sliderValToDate(newValue, validMinDate));
  };

  const [minLeftDate, setLeftMinDate] = useLocalStorage("export_minDate", MIN_PLANET_DATE);
  const [maxLeftDate, setLeftMaxDate] = useLocalStorage("export_maxDate", MAX_PLANET_DATE);
  const [minRightDate, setRightMinDate] = useLocalStorage("export_minDate", MIN_PLANET_DATE);
  const [maxRightDate, setRightMaxDate] = useLocalStorage("export_maxDate", MAX_PLANET_DATE);
  const [collectionDateStr, setCollectionDateStr] = useState('?');

  const validLeftMinDate = minLeftDate && isValid(minLeftDate) ? minLeftDate : MIN_PLANET_DATE;
  const validLeftMaxDate = maxLeftDate && isValid(maxLeftDate) ? maxLeftDate : MAX_PLANET_DATE;
  const validRightMinDate = minRightDate && isValid(minRightDate) ? minRightDate : MIN_PLANET_DATE;
  const validRightMaxDate = maxRightDate && isValid(maxRightDate) ? maxRightDate : MAX_PLANET_DATE;
  const monthsCountLeft = differenceInMonths(validLeftMaxDate, validLeftMinDate);
  const monthsCountRight = differenceInMonths(validRightMaxDate, validRightMinDate);
  const [leftMarks, setLeftMarks] = useState(getSliderMarksEveryYear(validLeftMinDate, validLeftMaxDate));
  const [rightMarks, setRightMarks] = useState(getSliderMarksEveryYear(validRightMinDate, validRightMaxDate));

  const validMinDate = props.clickedMap == "left" ? validLeftMinDate : validRightMinDate
  const validMaxDate = props.clickedMap == "left" ? validLeftMaxDate : validRightMaxDate
  const marks = props.clickedMap == "left" ? leftMarks : rightMarks
  const monthsCount = props.clickedMap == "left" ? monthsCountLeft : monthsCountRight
  const setMinDate = props.clickedMap == "left" ? setLeftMinDate : setRightMinDate
  const setMaxDate = props.clickedMap == "left" ? setLeftMaxDate : setRightMaxDate

  //for linearProgress
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const collectionDateRetrievable: BasemapsIds[] = [BasemapsIds.Bing, BasemapsIds.ESRI]
  async function getCollectionDateViewport(selectedTms: BasemapsIds) {
    setCollectionDateStr('')
    let collectionDate = { minDate: '?', maxDate: '?' };
    const map = props.mapRef?.current?.getMap() as any;

    switch (selectedTms) {
      case BasemapsIds.Bing:
        collectionDate = await getBingViewportDate(map)
        break;
      case BasemapsIds.ESRI:
        collectionDate = await getEsriViewportDate(map)
        break;

      default:
        console.log(`Cannot retrieve collection date for ${selectedTms}.`);
    }
    console.log('\n\nRETRIEVED COLLECTION DATE', collectionDate)
    setCollectionDateStr(`${collectionDate?.minDate} - ${collectionDate?.maxDate}`)
  }

  const [exportInterval, setExportInterval] = useLocalStorage(
    "export_exportInterval",
    12
  );

  const [titilerEndpoint, setTitilerEndpoint] = useState(
    TITILER_ENDPOINT
  );
  const [maxFrameResolution, setMaxFrameResolution] = useLocalStorage(
    "export_maxFrameResolution",
    MAX_FRAME_RESOLUTION
  );
  const [collectionDateActivated, setCollectionDateActivated] = useLocalStorage(
    "collectionDateActivated",
    true
  );
  const map = props.mapRef?.current?.getMap() as any;

  const onMoveEnd_esriWaybackMarks = useCallback((e: any) => {
    const center = map?.getCenter()
    getWaybackItemsWithLocalChanges(
      {
        longitude: center?.lng || 0,
        latitude: center?.lat || 0,
      },
      map?.getZoom() || 0
    ).then(
      (waybackItemsWithLocalChanges: any) => {
        props.setWaybackItemsWithLocalChanges(waybackItemsWithLocalChanges)
        const parsedItemsWithLocalChanges = Object.values(waybackItemsWithLocalChanges).map((item: any) => {
          const { itemURL, releaseDateLabel, releaseDatetime, releaseNum } = item
          return {
            itemURL: itemURL.replace('{level}', '{z}').replace('{row}', '{y}').replace('{column}', '{y}'),
            releaseDatetime: new Date(releaseDatetime),
            releaseDateLabel,
            releaseNum
          }
        })
        const localChangesDates = parsedItemsWithLocalChanges
          .map(item => new Date(item.releaseDatetime))
          .sort((a, b) => a - b);
        // Offset a bit min and maxDates
        const waybackMinDate = subMonths(localChangesDates[0], 12);
        const waybackMaxDate = addMonths(localChangesDates[localChangesDates.length - 1], 12);
        const esriWaybackMarks = getSliderMarks(localChangesDates, waybackMinDate)

        // It should happen that this callback is remembered, and was setup when clickedMap was set to left or right
        // It is not updated via state/props
        if (clickedMapRef.current == 'left') {
          setLeftMinDate(waybackMinDate)
          setLeftMaxDate(waybackMaxDate)
          setLeftMarks(esriWaybackMarks)
        }
        if (clickedMapRef.current == 'right') {
          setRightMinDate(waybackMinDate)
          setRightMaxDate(waybackMaxDate)
          setRightMarks(esriWaybackMarks)
        }
      }
    );
  }
    , [])

  const clickedMapRef = useRef(props.clickedMap)
  useEffect(
    () => {
      const map = props.mapRef.current?.getMap()
      clickedMapRef.current = props.clickedMap
      if (map)
        map.off('moveend', onMoveEnd_esriWaybackMarks)

      if (props.selectedTms == BasemapsIds.PlanetMonthly) {
        // setMinDate(validMinDate <= MIN_PLANET_DATE ? MIN_PLANET_DATE : validMinDate)
        // setMaxDate(validMaxDate >= MAX_PLANET_DATE ? MAX_PLANET_DATE : validMaxDate)
        // const planetMarks = getSliderMarksEveryYear(validMinDate, validMaxDate)
        setMinDate(MIN_PLANET_DATE)
        setMaxDate(MAX_PLANET_DATE)
        const planetMarks = getSliderMarksEveryYear(MIN_PLANET_DATE, MAX_PLANET_DATE)
        props.clickedMap == "left" ? setLeftMarks(planetMarks) : setRightMarks(planetMarks)
      }
      else if (props.selectedTms == BasemapsIds.ESRIWayback) {
        if (map) {
          map.on('moveend', onMoveEnd_esriWaybackMarks);
          onMoveEnd_esriWaybackMarks({ target: map });
        }
      }
      else if (props.selectedTms == BasemapsIds.Apple) {
        retrieveAppleAccessToken()
      }
    },
    [props.clickedMap, props.selectedTms, props.mapRef]
  )

  const handleBasemapChange = (event: SelectChangeEvent) => {
    const selectedTms = event.target.value as BasemapsIds
    props.setSelectedTms(selectedTms); // as string
  };
  // ------------------------------------------
  // HANDLE EXPORT SAVE TO DISK
  // -------------------------------------------
  // Define function in component to use mapRef
  // Inspiration for ui overlays (date, latlon, scale) https://github.com/doersino/earthacrosstime/tree/master
  // function handleExportButtonClick(exportFramesMode: boolean = true) {

  const mapRef = props.mapRef;
  const bounds = mapRef?.current?.getMap()?.getBounds();
  // select all export options by default
  const providerOptions = Object.values(ProviderOptions) // ['Planet', 'Esri WayBack', 'All Others']
  const [selectedProviders, setSelectedProviders] = useState<string[]>(providerOptions);

  async function handleExportButtonClick(exportFramesMode: ExportButtonOptions = ExportButtonOptions.ALL_FRAMES, selectedProviders: ProviderOptions[]) {
    // html-to-image can do both export with clipPath and mixBlendMode, although seem a bit slower than html2canvas!
    // Note html2canvas cannot export with mixBlendModes and clipPath yet, see https://github.com/niklasvh/html2canvas/issues/580
    setIsDownloading(true);
    setDownloadProgress(0);
    setSnackbarMessage('Downloading Zip... ');
    var zip = new JSZip();
    if (exportFramesMode == ExportButtonOptions.COMPOSITED) {
      const bbox = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      };

      const parentElement = document.getElementById("mapsParent");
      if (!parentElement) {
        console.error("Cannot find mapsParent div");
        return;
      }

      const filter = (node: HTMLElement) => {
        const exclusionClasses = ['mapboxgl-ctrl-group', 'mapboxgl-ctrl-geocoder', 'mapboxgl-ctrl-logo', 'terradraw-group'];
        return !exclusionClasses.some((classname) => node.classList?.contains(classname));
      }
      const width = parentElement.clientWidth;
      const height = parentElement.clientHeight;
      const dpr = window.devicePixelRatio

      mapRef.current?.resize();
      await new Promise((resolve) => setTimeout(resolve, 50));

      toPixelData(parentElement, { filter: filter, canvasWidth: width / dpr, canvasHeight: height / dpr, skipFonts: true }).then(async (data) => {

        const pixelSizeX = (bbox.east - bbox.west) / width;
        const pixelSizeY = (bbox.north - bbox.south) / height;

        const metaData = {
          GeographicTypeGeoKey: 4326,
          GeogCitationGeoKey: 'WGS 84',
          height: height,
          width: width,
          ModelPixelScale: [pixelSizeX, pixelSizeY, 0],
          ModelTiepoint: [0, 0, 0, bbox.west, bbox.north, 0],
          SamplesPerPixel: 4,
          BitsPerSample: [8, 8, 8, 8],
          PlanarConfiguration: 1,
          PhotometricInterpretation: 2,

        };

        const arrayBuffer = await writeArrayBuffer(data, metaData);

        const blob = new Blob([arrayBuffer], { type: "image/tiff" });
        saveAs(blob, "composited_epsg4326.tif");
      })
        .catch((err) => console.error("Composited GeoTIFF export error:", err));


    }

    else {
      // Loop through each monthly basemap and download
      const aDiv = document.getElementById(
        "downloadFramesDiv"
      ) as HTMLAnchorElement;

      const filteredPlanetDates =
        eachMonthOfInterval({
          start: validMinDate,
          end: validMaxDate,
        }).filter((_: Date, i: number) => i % exportInterval == 0)

      function get_batch_cmd(tmsUrl: string, bounds, filename: string,) {
        const downloadUrl = titilerCropUrl(
          bounds,
          tmsUrl,
          maxFrameResolution,
          titilerEndpoint
        );

        const batch_cmd = `REM ${filename}\nREM ${downloadUrl}\n` +
          // gdal_translate command
          `%QGIS%\\bin\\gdal_translate -projwin ${bounds.getWest()} ${bounds.getNorth()} ${bounds.getEast()} ${bounds.getSouth()} -projwin_srs EPSG:4326 -outsize %BASEMAP_WIDTH% 0 "${buildGdalWmsXml(tmsUrl)}" %DOWNLOAD_FOLDER%\\${filename + "_gdal.tif"
          }`;
        return { downloadUrl, batch_cmd, filename }
      }

      const gdalTranslateCmds_planet = filteredPlanetDates.map((date) => {
        const tmsUrl = planetBasemapUrl(date, props.customPlanetApiKey);
        const date_YYYY_MM = formatDate(date);
        // TRYING METHOD 2
        // https://medium.com/charisol-community/downloading-resources-in-html5-a-download-may-not-work-as-expected-bf63546e2baa
        // Also potentially useful: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
        const filename = `PlanetMonthly_${date_YYYY_MM}`
        const cmd_obj = get_batch_cmd(tmsUrl, bounds, filename)

        return cmd_obj;
      });

      const center = mapRef?.current?.getMap()?.getCenter();
      const degrees_decimals = 4; // 4 decimals ~11m precision / 5 decimals ~1m precision
      const center_lng = center?.lng?.toFixed(degrees_decimals);
      const center_lat = center?.lat?.toFixed(degrees_decimals);
      const zoom = mapRef?.current?.getMap()?.getZoom();

      const wayBackWithLocalChangesResponse = await wayBackWithLocalChangesUrl(center?.lat, center?.lng, zoom);

      const gdalTranslateCmds_wayBack = wayBackWithLocalChangesResponse.map((item) => {
        const tmsUrl = item.itemURL
        const date_YYYY_MM = formatDate(new Date(item.releaseDateLabel));
        const filename = `Esri_WayBack_${date_YYYY_MM}`
        const cmd_obj = get_batch_cmd(tmsUrl, bounds, filename)
        return cmd_obj;
      });


      const gdalTranslateCmds_other = Object.entries(basemapsTmsSources)
        .filter(([key, value]) => {
          return key !== BasemapsIds.PlanetMonthly // handled in gdalTranslateCmds_planet
            && key !== BasemapsIds.ESRIWayback     // handled in gdalTranslateCmds_wayBack
        })
        .map(([key, value]) => {
          const filename = BasemapsIds[key]
          const tmsUrl = basemapsTmsSources[key].url

          const cmd_obj = get_batch_cmd(tmsUrl, bounds, filename)
          return cmd_obj;
        })

      //Builds a list of gdalTranslateCmds command objects based on selected providers
      function buildGdalTranslateCmds(
        selectedProviders: string[],
        allOthers: PartOfGdalCmd[],
        allEsri: PartOfGdalCmd[],
        allPlanet: PartOfGdalCmd[],
      ) {
        const isSelected = (provider: string) => selectedProviders.includes(provider);

        const tagWithStatus = (cmds: PartOfGdalCmd[], providerKey: string) =>
          cmds.map(cmd => ({
            ...cmd,
            provider: providerKey,
            active: isSelected(providerKey),
          }));

        return [
          ...tagWithStatus(allOthers, ProviderOptions.ALL_OTHERS),
          ...tagWithStatus(allEsri, ProviderOptions.ESRIWayback),
          ...tagWithStatus(allPlanet, ProviderOptions.PlanetMonthly),
        ];
      }

      const gdalTranslateCmds = buildGdalTranslateCmds(
        selectedProviders,
        gdalTranslateCmds_other,
        gdalTranslateCmds_wayBack,
        gdalTranslateCmds_planet
      );


      // Write gdal_translate command to batch script with indices to original location of cropped version
      const foldername = `historical-maps-${center_lng}-${center_lat}-${zoom}`;
      let currentProvider = "";
      const gdal_commands =
        "REM GDAL COMMANDS to retrieve Planet Monthly Basemaps (without TiTiler)\n" +
        `REM https://historical-satellite.iconem.com/#${zoom}/${center_lng}/${center_lat} \n` +
        `REM https://www.google.fr/maps/@${center_lat},${center_lng},${zoom}z/data=!3m2!1e3!4b1 \n` +
        "REM ---\n\n" +
        `set DOWNLOAD_FOLDER=${foldername}\n` +
        "set BASEMAP_WIDTH=4096\n\n" +
        `for /f "delims=" %%i in ('dir /b/od/t:c C:\\PROGRA~1\\QGIS*') do set QGIS="C:\\PROGRA~1\\%%i"\n` +
        `mkdir ${foldername} \n\n` +
        gdalTranslateCmds
          .map(cmd => {
            let result = "";
            if (cmd.provider !== currentProvider) {
              currentProvider = cmd.provider;
              result += `\nREM === ${currentProvider} ===\n`;
            }
            if (cmd.active) {
              result += cmd.batch_cmd;
            } else {
              result += cmd.batch_cmd.split('\n').map(line => `REM ${line}`).join('\n');
            }

            return result;
          })
          .join('\n');

      if (exportFramesMode == ExportButtonOptions.SCRIPT_ONLY) {
        var blob = new Blob([gdal_commands], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "gdal_commands.bat");
      }

      // METHOD 2 TEST not working, since MDN says only supported in secure contexts (HTTPS)
      // Other way using HTML Native Filesystem API
      // https://stackoverflow.com/questions/34870711/download-a-file-at-different-location-using-html5/70001920#70001920
      // https://developer.chrome.com/articles/file-system-access/#create-a-new-file
      // For desktop only: https://caniuse.com/native-filesystem-api

      // Dowloads all frames
      if (exportFramesMode == ExportButtonOptions.ALL_FRAMES) {
        // // --- METHOD 1 ---
        // gdalTranslateCmds.forEach((c) => {
        //   fetch(c.downloadUrl)
        //     .then((response) => response.blob())
        //     .then((blob) => {
        //       console.log("downloading new ", c.downloadUrl);
        //       const blobURL = URL.createObjectURL(blob);
        //       aDiv.href = blobURL;
        //       aDiv.download = c.date_YYYY_MM + "_titiler.tif";
        //       aDiv.click();
        //     });
        // });

        // // --- METHOD 2 : batches ---
        zip.file("gdal_commands.bat", gdal_commands);
        const cmdsToDownload = gdalTranslateCmds.filter(cmd => cmd.active);
        await fetchTitilerFramesBatches(cmdsToDownload, foldername, zip);
        console.log('Downloaded frames via Titiler instance')
      }
    }

    // Inform user, let message for 10s in case, useful in case error occured
    setDownloadProgress(100);
    setTimeout(() => {
      setIsDownloading(false);
      setSnackbarMessage('');
    }, 10000)

  }


  // Send batches of PROMISES_BATCH_SIZE POST requests to ApolloMapping API server
  async function fetchTitilerFramesBatches(
    gdalTranslateCmds: any,
    foldername: string,
    zip: JSZip
  ) {
    setDownloadProgress(0);
    const total = gdalTranslateCmds.length;
    let completed = 0;

    const chunked_cmds = [...chunkArray(gdalTranslateCmds, PROMISES_BATCH_SIZE)]
    // await Promise.all(
    console.log('Downloading by batches and writing to zip, chunked_cmds', chunked_cmds)
    // chunked_cmds.forEach(async (chunk: any) => {
    for (let chunk of chunked_cmds) {
      // console.log('chunk', chunk)
      let breakCondition = false
      await Promise.allSettled(
        chunk.map(async (c: any) => {
          // console.log('fetching', c.filename)
          await fetch(c.downloadUrl)
            .then((response) => {
              if (!response.ok) {
                throw new Error("HTTP status code: " + response)
              }
              return response.blob()
            })
            .then(async (blob) => {
              const arrayBuffer = await blob.arrayBuffer();
              if (c.provider === ProviderOptions.ESRIWayback) {
                var ESRI_wayback = zip.folder("ESRI_wayback");
                ESRI_wayback?.file(`${c.filename}_titiler.tif`, arrayBuffer);
              } else if (c.provider === ProviderOptions.PlanetMonthly) {
                var planet_monthly = zip.folder("planet_monthly");
                planet_monthly?.file(`${c.filename}_titiler.tif`, arrayBuffer);
              } else {
                var all_others = zip.folder("all_others");
                all_others?.file(`${c.filename}_titiler.tif`, arrayBuffer);
              }
              completed += 1;
              setDownloadProgress((completed / total) * 100);
              setSnackbarMessage(`Downloaded ${c.filename}`)
            })
            .catch((error) => {
              console.warn(`For ${c.filename}, Error occured during downloading. Error ${error}`)
              // Do not send message 'STOPPING SUBSEQUENTS TRIALS'
              setSnackbarMessage(`For ${c.filename}, Error occured during downloading`)
              // breakCondition = true
            })
        })
      ).catch((error) => {
        console.warn(`Error in Promise.all at chunk level, ${error}`)
      })

      // await timer(PROMISES_BATCH_DELAY);
      if (breakCondition) {
        setSnackbarMessage(`Error occured during downloading`)
        break
      }
    }
    console.log('out of for loop', completed)

    // Processed all chunks by batches, now writing zip and downloading
    if (completed > 0) {
      console.log('generating and exporting zip')
      generateZip(zip, foldername)
    }
  }

  const timeControlled = (tms: any) => [BasemapsIds.ESRIWayback, BasemapsIds.PlanetMonthly].includes(tms)
  const collectionDateAvailable = (tms: any) => collectionDateRetrievable.includes(tms)

  return (
    <div
      style={{
        width: "100%",
        pointerEvents: "auto",

        bottom: 0,
        right: 0,
        left: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        outline: "none",
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        zIndex: 20,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "30px",
          background: "#fffc",
          // width: "100%",
          alignSelf: "flex-end",
          position: "relative",
          height: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "60vw",
            marginInline: "auto",
            marginBottom: "15px",
            justifyContent: "space-evenly"
          }}
        >
          <Stack
            spacing={2}
            direction="row"
            sx={{ mb: 1 }}
            alignItems="center"
            divider={<Divider orientation="vertical" flexItem />}
            useFlexGap flexWrap="wrap"
          >

            <Stack
              spacing={2}
              direction="row"
              sx={{ mb: 1, flexGrow: 1, }}
              alignItems="center"
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
                  MenuProps={{
                    anchorOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                  }}
                >
                  {/* 
                    TODO
                    Use a combo-box with suggestions (sources) which can also be used to define a new TMS url
                    When copy-pasting a new tms url, would display a dialog to also set a friendly display name
                    Could add an option to remove every option, or reset TMS list
                    Could also more simply hide this list in the settings, so a user could add/remove new TMS sources
                    https://mui.com/material-ui/react-autocomplete/#creatable
                  */}
                  {Object.entries(basemapsTmsSources).map(([key, value]) => (
                    <MenuItem value={key} key={key} >
                      {BasemapsIds[key] + (timeControlled(key) ? ' 📅' : collectionDateAvailable(key) ? ' 🕒' : '')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {timeControlled(props.selectedTms) && (
                <>
                  {" "}
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                    <DatePicker
                      slotProps={{
                        textField: { size: "small", style: { width: "130px" } },
                      }}
                      views={["year", "month"]}
                      label="Basemap Date"
                      format="YYYY/MM"
                      minDate={dayjs(validMinDate)}
                      maxDate={dayjs(validMaxDate)}
                      value={dayjs(props.timelineDate)}
                      onChange={(newValue) =>
                        props.setTimelineDate(new Date(newValue))
                      }
                    />
                  </LocalizationProvider>{" "}
                </>
              )}{" "}
              <IconButton
                color="primary"
                aria-label="swap map sources"
                onClick={props.swapMapSources}
              >
                <SwapHorizIcon />
              </IconButton>
            </Stack>
            <Stack
              spacing={2}
              direction="row"
              sx={{ mb: 1, flexGrow: 1, }}
              alignItems="center"
            >
              <BlendingActivator
                blendingActivation={props.blendingActivation}
                setBlendingActivation={props.setBlendingActivation}
              />
              <BlendingControl
                blendingMode={props.blendingMode}
                setBlendingMode={props.setBlendingMode}
                setBlendingActivation={props.setBlendingActivation}
              />
              <OpacitySlider
                setOpacity={props.setOpacity}
                opacity={props.opacity}
              />
            </Stack>
            {/* )} */}
            <Stack
              spacing={2}
              direction="row"
              sx={{ mb: 1, flexGrow: 1, }}
              alignItems="center"
            >
              <ExportSplitButton
                handleExportButtonClick={handleExportButtonClick}
                setExportInterval={setExportInterval}
                selectedProviders={selectedProviders}
              />

              <a
                id="downloadFramesDiv"
                style={{ display: "none" }}
                target="_blank"
                download=""
              />

              <SettingsModal
                playbackSpeedFPS={playbackSpeedFPS}
                setPlaybackSpeedFPS={setPlaybackSpeedFPS}
                minDate={validMinDate}
                setMinDate={setMinDate}
                maxDate={validMaxDate}
                setMaxDate={setMaxDate}
                exportInterval={exportInterval}
                // additional settings
                setExportInterval={setExportInterval}
                titilerEndpoint={titilerEndpoint}
                setTitilerEndpoint={setTitilerEndpoint}
                maxFrameResolution={maxFrameResolution}
                setMaxFrameResolution={setMaxFrameResolution}
                collectionDateActivated={collectionDateActivated}
                setCollectionDateActivated={setCollectionDateActivated}
                setCustomPlanetApiKey={props.setCustomPlanetApiKey}
                customPlanetApiKey={props.customPlanetApiKey}
                selectedProviders={selectedProviders}
                setSelectedProviders={setSelectedProviders}
                providerOptions={providerOptions}
              />
            </Stack>

            <Snackbar
              open={isDownloading}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              sx={{ zIndex: 9999, }}
            >
              <SnackbarContent
                sx={{ 'background': "rgba(255, 255, 255, 1);", textAlign: 'center' }} // the change is here }}
                message={
                  <Box display="flex" flexDirection="column" alignItems="center"  >
                    <Typography variant="body2" color='black'>
                      {snackbarMessage}
                    </Typography>
                    < LinearProgressWithLabel value={downloadProgress} />
                  </Box>
                }
              />
            </Snackbar>

          </Stack>
        </div>
        {
          props.selectedTms !== BasemapsIds.PlanetMonthly &&
          (
            <div
              style={{
                display: "flex",
                width: "60vw",
                marginInline: "auto",
                marginBottom: "15px",
                justifyContent: "space-evenly",
                minHeight: '31px'
              }}
            >
              {(collectionDateActivated && collectionDateAvailable(props.selectedTms)) ? (
                <Tooltip title={"Caution, Beta feature, only for Bing for now, Seems inacurate"}>
                  <Button
                    variant="outlined" // outlined or text
                    size="small"
                    sx={{ display: 'true' }}
                    onClick={() => {
                      getCollectionDateViewport(props.selectedTms)
                    }}>
                    Collection Date: {collectionDateStr}
                  </Button>
                </Tooltip>
              ) : <>{" "}</>}
            </div>
          )
        }
        {(props.selectedTms == BasemapsIds.PlanetMonthly || props.selectedTms == BasemapsIds.ESRIWayback) && (
          <PlayableSlider
            setTimelineDate={props.setTimelineDate}
            playbackSpeedFPS={playbackSpeedFPS}
            minDate={validMinDate}
            maxDate={validMaxDate}
            //
            min={0}
            max={monthsCount}
            marks={marks}
            //
            value={dateToSliderVal(props.timelineDate, validMinDate)}
            onChange={handleSliderChange}
            valueLabelFormat={(value: any) =>
              valueLabelFormat(value, validMinDate)
            }
          />
        )}
        <LinksSection mapRef={props.mapRef} />
      </div>
    </div>
  );
}

export default ControlPanelDrawer;

