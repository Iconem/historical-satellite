import { differenceInMonths, addMonths, subMonths } from "date-fns";

// Conversion between slider value and datepicker date
function sliderValToDate(val: number, minDate: Date) {
  return addMonths(new Date(minDate), val);
}
function dateToSliderVal(date: Date, minDate: Date) {
  return differenceInMonths(date, minDate);
}
const formatDate = (date: Date) => date.toISOString().substring(0, 7);

// PlanetMonthly URLS
const PLANET_BASEMAP_API_KEY = import.meta.env.VITE_PLANET_BASEMAP_API_KEY;

const dateTo_YYYY_MM = (date: Date) =>
  `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, "0")}`;
const planetBasemapUrl = (date: Date) => {
  const basemap_date_str = dateTo_YYYY_MM(date);
  // basemap_date_str = "2019_01";
  return `https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_${basemap_date_str}_mosaic/gmap/{z}/{x}/{y}.png?api_key=${PLANET_BASEMAP_API_KEY}`;
};

// const basemapsTmsUrls = {
// Typescript was not accepting computed strings in enums, so used open Mapbox api token for simplicity
enum BasemapsIds {
  PlanetMonthly,
  Google,
  Bing,
  Mapbox,
  ESRI,
  Heremaps,
  OSM,
  Yandex,
  Apple,
}
const basemapsTmsUrls: any = {
  [BasemapsIds.PlanetMonthly]: planetBasemapUrl(subMonths(new Date(), 2)),
  [BasemapsIds.Google]: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  [BasemapsIds.ESRI]:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
  // "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
  [BasemapsIds.Bing]:
    "https://t.ssl.ak.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=13578&n=z&prx=1", // bing uses quadkey
  [BasemapsIds.Mapbox]: `https://api.mapbox.com/v4/mapbox.satellite//{z}/{x}/{y}.webp?sku=101OD9Bs4ngtD&access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA`,
  [BasemapsIds.Heremaps]:
    "http://1.aerial.maps.cit.api.here.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/256/png8?app_id=eAdkWGYRoc4RfxVo0Z4B&app_code=TrLJuXVK62IQk0vuXFzaig&lg=eng", // api key from qms
  // [BasemapsIds.Apple]: "https://sat-cdn1.apple-mapkit.com/tile?style=7&size=1&scale=1&z={z}&x={x}&y={y}&v=9431&accessKey=1683306701_8122033819977440435_%2F_m%2F7Yr2z8iJgCTZiqebq%2FqV4P%2FT9jhTh5lYjhJ%2FyA4IQ%3D", // api key from browser
  [BasemapsIds.Yandex]:
    "https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU",
  [BasemapsIds.OSM]: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  // [BasemapsIds.Bing]: "http://t0.tiles.virtualearth.net/tiles/h{quadkey}.jpeg?g=854&amp;mkt=en-US&amp;token=Atq2nTytWfkqXjxxCDSsSPeT3PXjAl_ODeu3bnJRN44i3HKXs2DDCmQPA5u0M9z1", // bing uses quadkey
  // "Bing Sat"= "http://t0.tiles.virtualearth.net/tiles/a{q}.jpeg?g=854&amp;mkt=en-US&amp;token=Atq2nTytWfkqXjxxCDSsSPeT3PXjAl_ODeu3bnJRN44i3HKXs2DDCmQPA5u0M9z1",
  // "Google sat"= "https://mts1.google.com/vt/lyrs=s@186112443&amp;hl=en&amp;src=app&amp;s=Galile&amp;rlbl=1&amp;gl=AR&amp;key=AIzaSyARVMxmX0A7aRszJUjE33fSLQFMXAiMlxk&amp;z={Z}&amp;x={X}&amp;y={Y}",
  // "Heremaps Sat"= "http://1.aerial.maps.api.here.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/256/png8?app_id=hBqHrthpuP0nRYifaTTT&amp;app_code=iA3EYhFlEcBztET4RuA7Bg",
};

export {
  sliderValToDate,
  dateToSliderVal,
  formatDate,
  planetBasemapUrl,
  dateTo_YYYY_MM,
  BasemapsIds,
  basemapsTmsUrls,
};
