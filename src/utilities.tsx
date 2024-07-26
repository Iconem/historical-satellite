import {
  differenceInMonths,
  addMonths,
  subMonths,
  format,
  eachYearOfInterval,
} from "date-fns";
import { useState, useEffect } from "react";
import { getWaybackItems } from '@vannizhang/wayback-core';
import { lngLatToWorld } from "@math.gl/web-mercator";
import ky from 'ky'


// Convert yandex from 3395 CRS to 3857 standard TMS tiles
const TITILER_ENDPOINT = 'https://titiler.xyz'
const tileMatrixSetId = 'WebMercatorQuad' // EPSG: 3857 https://titiler.xyz/tileMatrixSets/WebMercatorQuad
// gdalYandexWmsXml can be imported into qgis as an xml gdal_wms definition and has perfect overlay with other TMS sources
const yandexGdalWmsXml = '<GDAL_WMS><Service name="TMS"><ServerUrl>https://core-sat.maps.yandex.net/tiles?l=sat&amp;x=${x}&amp;y=${y}&amp;z=${z}&amp;scale=1&amp;lang=ru_RU</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>20</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3395</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount></GDAL_WMS>'
const yandexGdalUrl = encodeURIComponent(yandexGdalWmsXml)
// const yandex_url = "https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU"
const yandex_url = `${TITILER_ENDPOINT}/cog/tiles/${tileMatrixSetId}/{z}/{x}/{y}?url=${yandexGdalUrl}`;


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

// Set min/max dates for planet monthly basemaps on component mount
export const MIN_PLANET_DATE = new Date("2016-01-01T00:00:00.000");
export const MAX_PLANET_DATE = subMonths(new Date(), 1);


export function useWaybackUrl(date: Date, waybackItemsWithLocalChanges: Array<any>) {
  const [wayBackItems, setWaybackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(String);

  useEffect(() => {
    const initWayBackItems = async () => {
      const items = await getWaybackItems();
      setWaybackItems(items);
      setLoading(false);
    };
    initWayBackItems();
  }, []);

  useEffect(() => {

    //         itemURL: itemURL.replace('{level}', '{z}').replace('{row}', '{y}').replace('{column}', '{y}'), 
    //         releaseDatetime: new Date(releaseDatetime), 
    //         releaseDateLabel, 
    //         releaseNum

    let waybackItems_: Array<any>;
    if (waybackItemsWithLocalChanges && waybackItemsWithLocalChanges.length > 0) {
      waybackItems_ = waybackItemsWithLocalChanges
    } else {
      waybackItems_ = wayBackItems
    }

    const sortedItems = Object.values(waybackItems_).sort(function (a, b) {
      return a.releaseDatetime - b.releaseDatetime;
    })
    const closestSuperior = sortedItems.find(
      item => (new Date(item.releaseDatetime) > date),
      sortedItems
    )
    // console.log('ESRI Wayback testing ', sortedItems, closestSuperior, closestSuperior?.itemURL)
    if (closestSuperior) {
      const closestUrl = closestSuperior?.itemURL
        .replace('{level}', '{z}')
        .replace('{row}', '{y}')
        .replace('{col}', '{x}')
      setUrl(closestUrl)
    } else {
      setUrl("https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/" + "239/{z}/{y}/{x}")
    }
  }, [date, loading, wayBackItems]);

  return { url, loading };
}



const planetBasemapUrl = (date: Date, customApi?: string) => {
  // basemap_date_str = "2019_01";
  return `https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_${format(
    date,
    "yyyy_MM"
  )}_mosaic/gmap/{z}/{x}/{y}.png?api_key=${customApi ? customApi : PLANET_BASEMAP_API_KEY}`;
};

// Set custom slider marks for each beginning of year
function getSliderMarks(dates_array: Date[], minDate: Date) {
  return dates_array.map((date: Date) => ({
    value: dateToSliderVal(date, minDate),
    label: formatDate(date),
  }));
}

// Set custom slider marks for each beginning of year
function getSliderMarksEveryYear(minDate: Date, maxDate: Date) {
  const dates_array = eachYearOfInterval({
    start: minDate <= maxDate ? minDate : maxDate,
    end: minDate <= maxDate ? maxDate : minDate,
  })
  return getSliderMarks(dates_array, minDate);
}

// const basemapsTmsUrls = {
// Typescript was not accepting computed strings in enums, so used open Mapbox api token for simplicity
enum BasemapsIds {
  ESRIWayback,
  PlanetMonthly,
  GoogleSat,
  Bing,
  ESRI,
  Mapbox,
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
  [BasemapsIds.ESRIWayback]: {
    maxzoom: 19,
  },
  [(BasemapsIds.PlanetMonthly)]: {
    url: planetBasemapUrl(subMonths(new Date(), 2)),
    maxzoom: 20,
  },
  [BasemapsIds.GoogleHybrid]: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxzoom: 21,
  },
  [BasemapsIds.ESRI]: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
    // url: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/239/{z}/{y}/{x}",
    maxzoom: 19,
  },
  // "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg",
  [BasemapsIds.Bing]: {
    // url: "http://a0.ortho.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=90",
    url: 'https://t.ssl.ak.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=14603&n=z&prx=1',
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
  // Apple requires a changing accessKey
  // [BasemapsIds.Apple]: {
  //   url: "https://sat-cdn3.apple-mapkit.com/tile?style=7&size=1&scale=1&z={z}&x={x}&y={y}&v=9801&accessKey=1721982180_2825845599881494057_%2F_UvNg5jEboEb8eMslp86Eeymjt%2FfRcTunBvgsiAiEb6Q%3D",
  //   maxzoom: 20,
  // },
  [BasemapsIds.Yandex]: {
    // url: "https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU",
    url: yandex_url,
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
  // "Mapbox Sat"= "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA",
};

// Lighter to use this utility rather than import whole of proj4
function convertLatlonTo3857(point: LngLat) {
  var x = (point.lng * 20037508.34) / 180;
  var y =
    Math.log(Math.tan(((90 + point.lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
}

/**
 * http://www.kevinsubileau.fr/informatique/boite-a-code/php-html-css/javascript-debounce-throttle-reduire-appels-fonction.html
 * Retourne une fonction qui, tant qu'elle continue à être invoquée,
 * ne sera pas exécutée. La fonction ne sera exécutée que lorsque
 * l'on cessera de l'appeler pendant plus de N millisecondes.
 * Si le paramètre `immediate` vaut vrai, alors la fonction
 * sera exécutée au premier appel au lieu du dernier.
 * Paramètres :
 *  - func : la fonction à `debouncer`
 *  - wait : le nombre de millisecondes (N) à attendre avant
 *           d'appeler func()
 *  - immediate (optionnel) : Appeler func() à la première invocation
 *                            au lieu de la dernière (Faux par défaut)
 *  - context (optionnel) : le contexte dans lequel appeler func()
 *                          (this par défaut)
 */
function debounce(
  func: Function,
  wait: number,
  immediate = false,
  context?: any
) {
  let result: any;
  let timeout: any = null;
  return function () {
    var ctx = context || this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) result = func.apply(ctx, args);
    };
    var callNow = immediate && !timeout;
    // Tant que la fonction est appelée, on reset le timeout.
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) result = func.apply(ctx, args);
    return result;
  };
}

// Utility to get react state from localStorage if exists
// From https://www.robinwieruch.de/local-storage-react/
const useLocalStorage = (
  storageKey: string,
  fallbackState: any,
  compareTypes = true,
  isDate = false
): any => {
  const storedItem = localStorage.getItem(storageKey);
  // console.log(storedItem, 'storedItem')
  let initValue = storedItem ? JSON.parse(storedItem) : fallbackState;
  if (isDate) {
    initValue = new Date(initValue);
  }
  // If fallbackState is not null, then: if it has a type, check localStorage value has same type / or if type is object (and arrays are objects), check they have the same signature
  if (fallbackState && compareTypes) {
    if (
      typeof initValue !== typeof fallbackState ||
      (typeof initValue === "object" &&
        fallbackState !== null &&
        !objectsHaveSameKeys(fallbackState, initValue))
    ) {
      // console.log(`Setting ${storageKey} value to fallbackState`)
      initValue = fallbackState;
    }
  }
  const [value, setValue] = useState(initValue);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.log(
        "Local Storage is full, Cannot update storage key",
        storageKey
      );
    }
  }, [value, storageKey]);

  return [value, setValue];
};

// Check if object vars have same attribs and props, or are both (or all) arrays
// From https://stackoverflow.com/questions/14368596/how-can-i-check-that-two-objects-have-the-same-set-of-property-names
function objectsHaveSameKeys(...objects: any): boolean {
  const anyIsNullOrUndef = objects.some((obj: any) => obj == null);
  if (anyIsNullOrUndef) return false;
  const areAllArrays = objects.every((arr: Array<any>) => Array.isArray(arr));
  const allKeys = objects.reduce(
    (keys: Array<string>, object: any) => keys.concat(Object.keys(object)),
    []
  );
  const union = new Set(allKeys);
  return (
    areAllArrays ||
    objects.every((object: any) => union.size === Object.keys(object).length)
  );
}


// For bing Aerial, can retrieve the imagery tile collection date min/max properties - and aggregate into a viewport min/max
// Could also be displayed on top of each tile, in a corner, so no aggregation needed.
//  type mapboxgl.TransformRequestFunction = (url: string, resourceType: mapboxgl.ResourceType) => mapboxgl.RequestParameters
let numTilesLoaded = 0;
const tiles_dates = []
const transformRequest = function (
  url: string,
  resourceType: mapboxgl.ResourceType
) {
  if (numTilesLoaded === undefined) numTilesLoaded = 0;
  if (resourceType == "Tile") {
    numTilesLoaded++;
    console.log(
      "numTilesLoaded from beginning/component load",
      numTilesLoaded
    );

    if (url.includes("virtualearth.net")) getBingDatesFromUrl(url);
  }
  return { url };
} as mapboxgl.TransformRequestFunction;

function getBingDatesFromResponse(response: Response) {
  const dates_str = response.headers
    .get("X-Ve-Tilemeta-Capturedatesrange")
    ?.split("-");
  const dates = dates_str?.map((s) => new Date(s));
  return dates;
}
function getVisibleTilesXYZ(map: mapboxgl.Map, tileSize: number) {
  const tiles = [];
  const zoom = Math.floor(map.getZoom()) + 1;
  const bounds = map.getBounds();
  // const topLeft = map.project(bounds.getNorthWest());
  // const bottomRight = map.project(bounds.getSouthEast());
  const topLeft = lngLatToWorld(bounds.getNorthWest().toArray()).map(
    (x) => (x / 512) * 2 ** zoom
  );
  const bottomRight = lngLatToWorld(bounds.getSouthEast().toArray()).map(
    (x) => (x / 512) * 2 ** zoom
  );
  console.log("getVisibleTilesXYZ", map, zoom, bounds, topLeft, bottomRight);

  for (
    let x = Math.floor(topLeft[0]); // .x
    x <= Math.floor(bottomRight[0]);
    x++
  ) {
    for (
      let y = Math.floor(topLeft[1]); // .y
      y >= Math.floor(bottomRight[1]);
      y--
    ) {
      tiles.push({ x, y, z: zoom });
    }
  }

  return tiles;
}
function toQuad(x: number, y: number, z: number) {
  var quadkey = "";
  for (var i = z; i >= 0; --i) {
    var bitmask = 1 << i;
    var digit = 0;
    if ((x & bitmask) !== 0) {
      digit |= 1;
    }
    if ((y & bitmask) !== 0) {
      digit |= 2;
    }
    quadkey += digit;
  }
  return quadkey;
}
function getBingUrl(quadkey: string) {
  // return "https://t.ssl.ak.tiles.virtualearth.net/tiles/a12022010003311020210.jpeg?g=13578&n=z&prx=1";
  return basemapsTmsSources[BasemapsIds.Bing].url.replace(
    "{quadkey}",
    quadkey
  );
}
async function getBingDatesFromUrl(url: string) {
  const dates = await fetch(url).then(function (response) {
    // In the bing case, can look for a response header property
    console.log(url, response.headers);
    const dates = getBingDatesFromResponse(response);
    console.log("getBingDatesFromUrl, in fetch", dates);
    return dates;
  });
  return dates ?? "error on fetch ?";
}

function getMinMaxDates(datesArr) {
  const min = Math.min(...(datesArr as any))
  console.log(min)
  const minDate = new Date(
    min
  )
    .toISOString()
    .slice(0, 10);
  const maxDate = new Date(
    Math.max(...(datesArr as any))
  )
    .toISOString()
    .slice(0, 10);
  console.log("yaya", datesArr, "\n", minDate, maxDate);
  return { minDate, maxDate }
}
async function getBingViewportDate(map: any) {
  const xyzArray = getVisibleTilesXYZ(map, 256); // source.tileSize)
  console.log(xyzArray);
  const quadkeysArray = xyzArray.map((xyz: any) => toQuad(xyz.x, xyz.y, xyz.z));
  console.log(quadkeysArray);
  const bingUrls = quadkeysArray.map((quadkey: string) => getBingUrl(quadkey));
  console.log(bingUrls);

  // const promArray = bingUrls.map(async (url) => {
  //   return await getBingDatesFromUrl(url);
  // });
  // console.log("promArray", promArray);
  // Promise.all(promArray).then((dates) => {
  //   console.log("after promise.all", dates);
  //   const minDate = Math.min(...(dates as any).map((d: number[]) => d[0]));
  //   const maxDate = Math.max(...(dates as any).map((d: number[]) => d[1]));
  //   console.log(dates, minDate, maxDate);
  //   document.a = dates;
  // });

  const tilesDates = await Promise.all(
    bingUrls.map(async (url) => await getBingDatesFromUrl(url))
  );
  console.log(tilesDates)
  // Each bing dates elements has a min and max date, stored in a 2 tuple array. Can be flattened for easier min/max computation
  return getMinMaxDates(tilesDates.flat())
}
async function getEsriViewportDate(map: any) {
  const ESRI_MAPSERVER_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/16/query'
  const esriUrl = new URL(ESRI_MAPSERVER_URL)
  const bounds = map.getBounds();
  const [xmax, ymin] = bounds.getSouthEast().toArray()
  const [xmin, ymax] = bounds.getNorthWest().toArray()
  console.log('bounds', bounds)

  esriUrl.search = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ xmin, ymin, xmax, ymax }),
    maxAllowableOffset: '0',
    outFields: 'NICE_DESC,NICE_NAME,OBJECTID,SAMP_RES,SRC_ACC,SRC_DATE2',
    spatialRel: 'esriSpatialRelIntersects',
    where: '1=1',
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
  }) as any

  const esriResultsRaw = await ky
    .get(esriUrl.toString(), {}).json()

  console.log(esriResultsRaw)

  const esriDates = esriResultsRaw?.features.map(f => {
    const dateEpoch = f.attributes['SRC_DATE2']
    const date = dateEpoch ?
      new Date(dateEpoch)
      : '?'
    return date
  })
  console.log('esriDates', esriDates)
  return getMinMaxDates(esriDates)
}


// 1. Get a Bearer which is for now transmitted in plain text in file https://beta.maps.apple.com which has to be requested with User-Agent like `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36`
// 1. look for script tag with `data-initial-token` in html head, like so: `<script src="/static/maps-app-web-client/mapkitjs/mapkit.core.js?appVersion=1.0.672" data-dist-url="/static/maps-app-web-client/mapkitjs" data-libraries="services,overlays,spi,spi-services,spi-annotations,spi-webgl-layers" data-callback="mapkitCallback" data-initial-token="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkdKNUdaREZMODkifQ.eyJpc3MiOiJDNVU4OTI3MzZZIiwib3JpZ2luIjoiaHR0cHM6Ly9iZXRhLm1hcHMuYXBwbGUuY29tIiwiaWF0IjoxNzIyMDAzMjY1LCJleHAiOjE3MjIwMDUwNjV9.qNjJ4YinkmFej6Bp4qNgHx5WbuvYCh7QoMBmr86G3gLgsoEmtrLE-0oDPuaTmTpeP0hWzW9RE36IRSlk2_cBUA" async></script>`
// 1. This Bearer can be used to build an API GET request to https://cdn.apple-mapkit.com/ma/bootstrap with `Authorization Bearer` in http header. 
// 1. This request returns a JSON object which includes `"accessKey": "1722005505_3938378975598212411_/_0m2SvW3sxJ28bz3fDCXW1B7m/7QQnyDeQmdZQUldt+Q=",`
const CORS_SH_API_KEY = 'temp_78f9d3a11671a9218d571d74f34ee3f3' // This cors.sh key will only be valid 3 days, up to 2024-07-26
async function retrieveAppleAccessToken() {
  console.log('retrieveAppleAccessToken 2')
  const appleMapsUrl = 'https://beta.maps.apple.com'
  // const proxiedUrl = 'https://corsproxy.io/?https%3A%2F%2Fbeta.maps.apple.com'
  // const proxiedUrl = 'https://crossorigin.me/https://beta.maps.apple.com'
  // const proxiedUrl = 'https://api.cors.lol/url=https:/beta.maps.apple.com'
  const proxiedUrl = `https://proxy.cors.sh/${appleMapsUrl}`
  const apple_headers = {
    'x-cors-api-key': CORS_SH_API_KEY,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://beta.maps.apple.com',
    'Origin': 'https://beta.maps.apple.com',
    // 'x-requested-with': 'https://beta.maps.apple.com',
  }
  const appleMapsHtml = await ky.get(
    proxiedUrl,
    { headers: apple_headers, }
  ).text()
  const htmlDoc = new DOMParser().parseFromString(appleMapsHtml, 'text/html')
  // const scriptWithInitialToken = Array.from(htmlDoc.head.childNodes).find(c => (c as HTMLElement).hasAttribute('data-initial-token'))
  const scriptWithInitialToken = htmlDoc.evaluate('//*[@data-initial-token]', htmlDoc, null, XPathResult.ANY_TYPE, null).iterateNext() as HTMLElement;
  // const initialToken = scriptWithInitialToken?.getAttribute('data-initial-token')
  const initialToken = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkdKNUdaREZMODkifQ.eyJpc3MiOiJDNVU4OTI3MzZZIiwib3JpZ2luIjoiaHR0cHM6Ly9iZXRhLm1hcHMuYXBwbGUuY29tIiwiaWF0IjoxNzIyMDA4OTE5LCJleHAiOjE3MjIwMTA3MTl9.fOyPu_YY1qQvwHy6xFPnkQa1ssQ_sNiDiwEvuk_-xSg1H4hWopG3cDGwF2g1G0htQ2H1jiRFlJEpggvqbLLj-A'
  console.log('initialToken', initialToken)

  const appleApiJson = await ky.get(
    `https://proxy.cors.sh/https://cdn.apple-mapkit.com/ma/bootstrap`,
    {
      headers: {
        ...apple_headers,
        'Authorization': `Bearer ${initialToken}`
      },
    }
  ).json()
  console.log('json', appleApiJson)
  const accessKey = appleApiJson?.accessKey
  console.log('accessKey', accessKey)
}


export {
  sliderValToDate,
  dateToSliderVal,
  formatDate,
  planetBasemapUrl,
  BasemapsIds,
  basemapsTmsSources,
  getSliderMarksEveryYear,
  getSliderMarks,
  convertLatlonTo3857,
  debounce,
  useLocalStorage,
  getBingViewportDate,
  getEsriViewportDate,
  retrieveAppleAccessToken,
};
