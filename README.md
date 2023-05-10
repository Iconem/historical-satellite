# historical-satellite

 - [historical-satellite.iconem.com](https://historical-satellite.iconem.com/)
 - [Github Repo](https://github.com/Iconem/historical-satellite)
 
## Intro
Simple app made to select through Planet Historical Monthly Basemaps and compare it against other TMS basemaps (like Google, Bing, Here, ESRI, Mapbox, Yandex, Apple). Useful for analyses like [Dilbarjin | LeMonde](https://www.lemonde.fr/international/article/2023/04/07/en-afghanistan-le-pillage-massif-d-un-site-archeologique-attribue-a-l-ei_6168703_3210.html) outside Qgis, directly within a web browser (inside or outside of Iconem).



Rough initial version, with:

 - Downloads all planet-basemaps-monthly from 2016-01 to present with the map viewport as extent 
 - Side-by-side comparison of imagery datasets (Planet monthly at 2 different timestamps, or satellite imagery sources from planet/google/bing/here/esri/mapbox/yandex/apple)
 - Downloaded images are geotiffs, so can be drag-and-dropped to qgis to get their location

## Features:

- 2 Maps in a Split view (split-screen or side-by-side)
- Settings component to select planet basemap timestamp
- Slider with play capabilities (forward/backward, play/pause or step-by-step and FPS control)
- Selector to choose raster source TMS url (via a TMS URL, or a planet monthly basemap)
- downloads planet monthly basemaps frames from 2016-01 to present via TiTiler (merge/crop tiles automagically and export to geotiff)
- Generate gdal_translate batch script to switches the burden from the browser (as well as remove the burden on Titiler middleware) to the user desktop client (prevents missing frames, allow larger resolution downloads, batches etc)

![App Screenshot](screenshot.jpg)
