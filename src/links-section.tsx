import { Link, Typography } from "@mui/material";

// -------------------------------------------
// Component: LinksSection
// -------------------------------------------
function LinksSection(props: { mapRef: any }) {
  const bounds = props.mapRef?.current?.getMap()?.getBounds();
  const zoom = props.mapRef?.current?.getMap()?.getZoom();
  const center = props.mapRef?.current?.getMap()?.getCenter();

  return (
    <Typography variant="body2">
      {" "}
      Useful:{" "}
      <Link
        href={`https://earth.google.com/web/@${center?.lat},${center?.lng},0a,${((38000 * 4096) / Math.pow(2, zoom)) *
          Math.cos((center?.lat * Math.PI) / 180)
          }d,35y,0h,0t,0r/data=CgwqBggBEgAYAUICCAE6AwoBMEoNCP___________wEQAA`}
        target={"_blank"}
      >
        Google Earth Web
      </Link>
      {" Historical + Timelapse"}
      {" | ESRI "}
      <Link
        href={`https://livingatlas.arcgis.com/wayback/#active=37890&ext=${bounds?.getWest()},${bounds?.getSouth()},${bounds?.getEast()},${bounds?.getNorth()}&localChangesOnly=true`}
        target={"_blank"}
      >
        Imagery Wayback Machine
      </Link>
      {" | "}
      <Link href={`https://qms.nextgis.com/#`}>NextGIS QMS</Link>
      {" | "}
      <Link
        href={`https://mc.bbbike.org/mc/?lon=${center?.lng}&lat=${center?.lat}&zoom=${zoom}&num=4&mt0=mapnik-german&mt1=cyclemap&mt2=bing-hybrid`}
        target={"_blank"}
      >
        BBBike MapCompare
      </Link>
      {" | Older: Google "}
      <Link
        href={`https://earthengine.google.com/timelapse#v=${center?.lat},${center?.lng},${zoom},latLng&t=0.03&ps=50&bt=19840101&et=20201231&startDwell=0&endDwell=0`}
        target={"_blank"}
      >
        Timelapse
      </Link>
      {" & "}
      <Link
        href="https://google.com/intl/fr/earth/versions/#earth-pro"
        target={"_blank"}
      >
        Earth Pro Desktop
      </Link>
      {" | "}
      <Link
        href={`https://github.com/iconem/historical-satellite/`}
        target={"_blank"}
      >
        GitHub repo
      </Link>
      {" | Made by "}
      <Link href={`https://iconem.com`} target={"_blank"}>
        Iconem
      </Link>
      {" | Qiusheng Wu "}
      <Link href={`https://giswqs-streamlit.hf.space/Timelapse`} target={"_blank"}>
        Landsat/Sentinel Timelapse
      </Link>
    </Typography>
  );
}

export default LinksSection;
