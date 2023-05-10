import {
  differenceInMonths,
  addMonths,
  subMonths,
  format,
  eachYearOfInterval,
} from "date-fns";

// Helper functions to convert between date for date-picker and slider-value
// Conversion between slider value and datepicker date
function sliderValToDate(val: number, minDate: Date) {
  return addMonths(minDate, val);
}
function dateToSliderVal(date: Date, minDate: Date) {
  return differenceInMonths(date, minDate);
}
const formatDate = (date: Date) => format(date, "yyyy-MM");

// PlanetMonthly URLS
const PLANET_BASEMAP_API_KEY = import.meta.env.VITE_PLANET_BASEMAP_API_KEY;

const planetBasemapUrl = (date: Date) => {
  // basemap_date_str = "2019_01";
  return `https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_${format(
    date,
    "yyyy_MM"
  )}_mosaic/gmap/{z}/{x}/{y}.png?api_key=${PLANET_BASEMAP_API_KEY}`;
};

// Set custom slider marks for each beginning of year
const getSliderMarks = (minDate: Date, maxDate: Date) =>
  eachYearOfInterval({
    start: minDate,
    end: maxDate,
  }).map((date: Date) => ({
    value: dateToSliderVal(date, minDate),
    label: formatDate(date),
  }));

// const basemapsTmsUrls = {
// Typescript was not accepting computed strings in enums, so used open Mapbox api token for simplicity
enum BasemapsIds {
  PlanetMonthly,
  GoogleSat,
  Bing,
  Mapbox,
  ESRI,
  Heremaps,
  Yandex,
  Apple,
  GoogleHybrid,
  OSM,
}

// Could find other TMS tile urls on NextGis QMS
// https://qms.nextgis.com/
// Which is what QuickMapServices Qgis plugin uses
const basemapsTmsSources: any = {
  [BasemapsIds.PlanetMonthly]: {
    url: planetBasemapUrl(subMonths(new Date(), 2)),
    maxzoom: 20,
  },
  [BasemapsIds.GoogleHybrid]: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxzoom: 21,
  },
  [BasemapsIds.ESRI]: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
    maxzoom: 19,
  },
  // "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
  [BasemapsIds.Bing]: {
    url: "https://t.ssl.ak.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=13578&n=z&prx=1",
    maxzoom: 21,
  }, // bing uses quadkey
  [BasemapsIds.Mapbox]: {
    url: `https://api.mapbox.com/v4/mapbox.satellite//{z}/{x}/{y}.webp?sku=101OD9Bs4ngtD&access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA`,
    maxzoom: 22,
  },
  [BasemapsIds.Heremaps]: {
    url: "https://2.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/256/png8?app_id=eAdkWGYRoc4RfxVo0Z4B&app_code=TrLJuXVK62IQk0vuXFzaig&lg=eng",
    maxzoom: 20,
  },
  // 'https://2.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/5/15/12/256/png8?apiKey={YOUR_API_KEY}',
  // "http://1.aerial.maps.cit.api.here.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/256/png8?app_id=eAdkWGYRoc4RfxVo0Z4B&app_code=TrLJuXVK62IQk0vuXFzaig&lg=eng", // api key from qms
  // [BasemapsIds.Apple]: "https://sat-cdn1.apple-mapkit.com/tile?style=7&size=1&scale=1&z={z}&x={x}&y={y}&v=9431&accessKey=1683306701_8122033819977440435_%2F_m%2F7Yr2z8iJgCTZiqebq%2FqV4P%2FT9jhTh5lYjhJ%2FyA4IQ%3D", // api key from browser
  [BasemapsIds.Yandex]: {
    url: "https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU",
    maxzoom: 19,
  },
  [BasemapsIds.OSM]: {
    url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxzoom: 19,
  },
  [BasemapsIds.GoogleSat]: {
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    maxzoom: 21,
  },
  // [BasemapsIds.Bing]: "http://t0.tiles.virtualearth.net/tiles/h{quadkey}.jpeg?g=854&amp;mkt=en-US&amp;token=Atq2nTytWfkqXjxxCDSsSPeT3PXjAl_ODeu3bnJRN44i3HKXs2DDCmQPA5u0M9z1", // bing uses quadkey
  // "Bing Sat"= "http://t0.tiles.virtualearth.net/tiles/a{q}.jpeg?g=854&amp;mkt=en-US&amp;token=Atq2nTytWfkqXjxxCDSsSPeT3PXjAl_ODeu3bnJRN44i3HKXs2DDCmQPA5u0M9z1",
  // "Google sat"= "https://mts1.google.com/vt/lyrs=s@186112443&amp;hl=en&amp;src=app&amp;s=Galile&amp;rlbl=1&amp;gl=AR&amp;key=AIzaSyARVMxmX0A7aRszJUjE33fSLQFMXAiMlxk&amp;z={Z}&amp;x={X}&amp;y={Y}",
  // "Heremaps Sat"= "http://1.aerial.maps.api.here.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/256/png8?app_id=hBqHrthpuP0nRYifaTTT&amp;app_code=iA3EYhFlEcBztET4RuA7Bg",
};

// Lighter to use this utility rather than import whole of proj4
function convertLatlonTo3857(point: LngLat) {
  var x = (point.lng * 20037508.34) / 180;
  var y =
    Math.log(Math.tan(((90 + point.lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
}

export {
  sliderValToDate,
  dateToSliderVal,
  formatDate,
  planetBasemapUrl,
  BasemapsIds,
  basemapsTmsSources,
  getSliderMarks,
  convertLatlonTo3857,
};
