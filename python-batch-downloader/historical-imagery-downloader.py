# Download planet basemaps around all features of input vector file
# cd C:\Users\jonathan\Downloads\batch-download-afgha && py historical-imagery-downloader.py

import os
from dotenv import dotenv_values

from osgeo import gdal
import geopandas as gpd
import fiona
import pyproj

import pandas as pd

# import numpy as np

# os.getenv("PLANET_BASEMAP_API_KEY", default=None)
config = dotenv_values(".env")  # config = {"PLANET_BASEMAP_API_KEY": "123xyz"}
PLANET_BASEMAP_API_KEY = config.get("PLANET_BASEMAP_API_KEY")

BOUNDS_BUFFER_METERS = 2000
BASEMAP_WIDTH_PIX = 1024

fiona.drvsupport.supported_drivers["LIBKML"] = "rw"
fiona.drvsupport.supported_drivers["KML"] = "rw"


kmz_fp = "Sites-Philippe-Marquis.kmz"
virtual_file = "/vsizip/" + kmz_fp + "/" + "doc.kml"
virtual_file = "doc.kml"

virtual_file = "Sites-Marquis-2023-05-22-clean.gpkg"

collection = fiona.open(virtual_file)
first_record = next(iter(collection))  # first record
# print("first_record :", first_record)
# print("bounds:", shape(first_record["geometry"]).bounds)


# with fiona.open(virtual_file) as collection:
#     gdf = gpd.GeoDataFrame.from_features(collection)

#     print("collection\n", set(gdf.geom_type), "\n\n", gdf, "\n\n")

gdf_list = []
for layer in fiona.listlayers(virtual_file):
    # print("yo")
    # gdf = gpd.read_file(
    #     virtual_file,
    #     driver="LIBKML",
    #     layer=layer,
    #     engine="fiona",
    #     # ignore_geometry=True,
    # )
    gdf = gpd.read_file(
        virtual_file,
        layer=layer,
        # ignore_geometry=True,
    )
    gdf_list.append(gdf)

# print("yoyo", end="\n\n")

gdf = gpd.GeoDataFrame(pd.concat(gdf_list, ignore_index=True))
# print("collection\n", set(gdf.geom_type), "\n\n", gdf, "\n\n")

# r = open(virtual_file, "r")
# f = fiona.BytesCollection(bytes(r.read()))

# # empty GeoDataFrame
# gdf = gpd.GeoDataFrame()

# # iterate over layers
# for layer in fiona.listlayers(f.path):
#     s = gpd.read_file(f.path, driver="LIBKML", layer=layer)
#     gdf = gpd.concat([gdf, s], ignore_index=True)


print(gdf.head())
gdf_points = gdf[gdf.geom_type == "Point"]

# gdf_points.plot()


def export_planet_basemap_bounds(
    date_YYYY_MM,
    projWin,
    output_ds=None,
    projWinSRS="EPSG:3857",
    width=BASEMAP_WIDTH_PIX,
    height=0,
):
    tms_url = f"https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_{date_YYYY_MM}_mosaic/gmap/${{z}}/${{x}}/${{y}}.png?api_key={PLANET_BASEMAP_API_KEY}"
    if output_ds is None:
        output_ds = f"{date_YYYY_MM}_gdal.tif"

    input_ds = f"<GDAL_WMS><Service name='TMS'><ServerUrl>{tms_url}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>"

    gdal.Translate(
        output_ds,
        input_ds,
        format="GTiff",
        width=width,
        height=height,
        projWin=projWin,
        projWinSRS=projWinSRS,
    )
    # https://gdal.org/api/python/osgeo.gdal.html#osgeo.gdal.TranslateOptions


def export_planet_basemap_center_buffer(
    date_YYYY_MM,
    center_latlon,
    output_ds=None,
    buffer=BOUNDS_BUFFER_METERS,
    width=BASEMAP_WIDTH_PIX,
    height=0,
):
    center_3857 = transformer_4326_3857.transform(center_latlon[0], center_latlon[1])
    bounds_west = center_3857[0] - buffer / 2
    bounds_east = center_3857[0] + buffer / 2
    bounds_south = center_3857[1] - buffer / 2
    bounds_north = center_3857[1] + buffer / 2
    projWin = [bounds_west, bounds_north, bounds_east, bounds_south]
    export_planet_basemap_bounds(
        date_YYYY_MM,
        projWin,
        output_ds,
        projWinSRS="EPSG:3857",
        width=width,
        height=height,
    )


""" # Gdal_translate Helpers 
# %QGIS%\\bin\\gdal_translate -projwin ${bounds.getWest()} ${bounds.getNorth()} ${bounds.getEast()} ${bounds.getSouth()} -projwin_srs EPSG:4326 -outsize %BASEMAP_WIDTH_PIX% 0 "<GDAL_WMS><Service name='TMS'><ServerUrl>{tms_url}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>" ${date_YYYY_MM + "_gdal.tif"}

# input_ds_google = f"<GDAL_WMS><Service name='TMS'><ServerUrl>http://mt.google.com/vt/lyrs=s&amp;x=${{x}}&amp;y=${{y}}&amp;z=${{z}}</ServerUrl></Service><DataWindow><UpperLeftX>-20037508.34</UpperLeftX><UpperLeftY>20037508.34</UpperLeftY><LowerRightX>20037508.34</LowerRightX><LowerRightY>-20037508.34</LowerRightY><TileLevel>18</TileLevel><TileCountX>1</TileCountX><TileCountY>1</TileCountY><YOrigin>top</YOrigin></DataWindow><Projection>EPSG:3857</Projection><BlockSizeX>256</BlockSizeX><BlockSizeY>256</BlockSizeY><BandsCount>3</BandsCount><Cache /></GDAL_WMS>"
"""


transformer_4326_3857 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:3857")

# for i in range(2):
date_YYYY_MM = "2021_02"
center_latlon = (48.958581, 2.329102)
buffer = BOUNDS_BUFFER_METERS
# projWinSRS = "EPSG:3857"
# width = BASEMAP_WIDTH_PIX
# height = 0
export_planet_basemap_center_buffer(
    date_YYYY_MM,
    center_latlon,
    buffer=BOUNDS_BUFFER_METERS,
)


min_month = "2016-01"
max_month = "2023-04"
period_freq = "3M"  # retrieves image evey one month
months = list(pd.date_range(min_month, max_month, freq=period_freq).strftime("%Y_%m"))
months.remove("2017_01")  # mosaic 2017-01 seem to not be present

# Other settings
buffer = BOUNDS_BUFFER_METERS
# projWinSRS = "EPSG:3857"
# width = BASEMAP_WIDTH_PIX
# height = 0

for index, row in gdf_points[:10000].iterrows():  # iterfeatures or iterrows():
    # print(row)
    # point = gdf_points.loc[index, "geometry"]
    out_fp = f"historical_{min_month}_{max_month}_{period_freq}_{row.geometry.x:.6f}_{row.geometry.y:.6f}"
    os.makedirs(out_fp, exist_ok=True)
    print(f"\nExporting planet monthly [{index}/{len(gdf_points)}] for ", out_fp)
    for date_YYYY_MM in months:
        print("   ", date_YYYY_MM, end="")
        # new_date = np.datetime64('2022-04') + np.timedelta64(5, 'M')
        # date_YYYY_MM = "2021_02"
        # center_latlon = (48.958581, 2.329102)
        center_latlon = (row.geometry.y, row.geometry.x)
        output_ds = os.path.join(out_fp, f"{date_YYYY_MM}_gdal.tif")
        if not os.path.exists(output_ds):  # only process if not existing already
            export_planet_basemap_center_buffer(
                date_YYYY_MM,
                center_latlon,
                buffer=BOUNDS_BUFFER_METERS,
                output_ds=output_ds
                # projWinSRS = "EPSG:3857"
                # width = BASEMAP_WIDTH_PIX
                # height = 0
            )
            print("   done  ", end="\r", flush=True)
        else:
            print("   exists", end="\r", flush=True)
