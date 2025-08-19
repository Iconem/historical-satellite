import { ReactElement, useEffect, useRef, useState, useMemo } from "react";
import { TerraDrawControlComponent } from "./terraDraw-control";
import { TerraDraw, TerraDrawLineStringMode, TerraDrawPointMode, TerraDrawPolygonMode, TerraDrawRectangleMode, TerraDrawSelectMode } from "terra-draw";
import { Mode } from "./map-controls";
import { GeoJSONSource } from "mapbox-gl";
import { TerraDrawMapboxGLAdapter } from "terra-draw-mapbox-gl-adapter";

export function MapDrawingComponent(props: any): ReactElement {

    const selectedIdRef = useRef<string | number | null>(null);
    const isProgrammaticDeselect = useRef(false);

    const onSelect = (id: string | number) => {
        selectedIdRef.current = id;

        const leftDraw = props.terraDrawLeftRef?.current;
        const rightDraw = props.terraDrawRightRef?.current;

        if (leftDraw?.getSnapshot().some((f: { id: string | number; }) => f.id === id)) {
            leftDraw.selectFeature(id);
        }

        if (rightDraw?.getSnapshot().some((f: { id: string | number; }) => f.id === id)) {
            rightDraw.selectFeature(id);
        }
    };
    const onDeselect = () => {
        if (isProgrammaticDeselect.current) return;

        const id = selectedIdRef.current;
        if (!id) return;

        isProgrammaticDeselect.current = true;

        props.terraDrawRightRef?.current?.deselectFeature(id);
        props.terraDrawLeftRef?.current?.deselectFeature(id);

        selectedIdRef.current = null;
        isProgrammaticDeselect.current = false;
    };
    // Syncs a feature’s coordinates from one map to the other to keep both maps in sync
    function roundCoords(coords: any, precision = 6): any {
        if (typeof coords[0] === "number") {
            return coords.map((c: number) => +c.toFixed(precision));
        }
        return coords.map((c: any) => roundCoords(c, precision));
    }
    const isProgrammaticUpdate = { current: false };
    function syncFeatureCoordsAcrossMaps(featureId: string, fromLeft: boolean) {
        if (isProgrammaticUpdate.current) return;

        const sourceDraw = fromLeft ? props.terraDrawLeftRef.current : props.terraDrawRightRef.current;
        const targetDraw = fromLeft ? props.terraDrawRightRef.current : props.terraDrawLeftRef.current;
        if (!sourceDraw || !targetDraw) return;
        const feature = sourceDraw.getSnapshot().find((f: { id: string; }) => f.id === featureId);
        if (!feature) return;

        const targetFeature = targetDraw.getSnapshot().find((f: { id: string; }) => f.id === featureId);
        if (
            targetFeature &&
            JSON.stringify(targetFeature.geometry.coordinates) ===
            JSON.stringify(feature.geometry.coordinates)
        ) {
            return;
        }

        isProgrammaticUpdate.current = true;
        if (targetFeature) {
            const roundedGeometry = {
                ...feature.geometry,
                coordinates: roundCoords(feature.geometry.coordinates)
            };
            targetDraw.updateFeatureGeometry(feature.id, roundedGeometry);
        } else {
            const roundedFeature = {
                ...feature,
                geometry: {
                    ...feature.geometry,
                    coordinates: roundCoords(feature.geometry.coordinates)
                }
            };
            targetDraw.addFeatures([roundedFeature]);
        }
        isProgrammaticUpdate.current = false;
    }
    // Updates the shared GeoJSON source on the map with features from the specified TerraDraw instance
    const sharedData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };
    function updateSharedSource(fromLeft: boolean) {
        const sourceDraw = fromLeft
            ? props.terraDrawLeftRef.current
            : props.terraDrawRightRef.current;

        if (!sourceDraw) {
            console.warn("sourceDraw n'est pas défini");
            return;
        }

        const allFeatures = sourceDraw.getSnapshot();
        const leftMap = props.leftMapRef?.current?.getMap();
        const rightMap = props.rightMapRef?.current?.getMap();

        [leftMap, rightMap].forEach((map) => {
            const mySource = map?.getSource("shared-draw-source") as GeoJSONSource;
            mySource?.setData({
                type: "FeatureCollection",
                features: allFeatures,
            });
        });
    }

    function initTerraDraw(
        map: mapboxgl.Map,
        drawRef: React.MutableRefObject<TerraDraw | null>,
    ) {
        console.log('intializing terradraw');
        // Stop previous instance
        if (drawRef.current) {
            try {
                drawRef.current.stop();
            } catch (e) {
                console.warn("Erreur lors du stop précédent :", e);
            }
        }
        // create terradraw instance
        if (!map.getSource("shared-draw-source")) {
            map.addSource("shared-draw-source", { type: "geojson", data: sharedData });
        }
        const terraDraw = new TerraDraw({
            adapter: new TerraDrawMapboxGLAdapter({ map }),
            modes: [
                new TerraDrawRectangleMode(),
                new TerraDrawPolygonMode(),
                new TerraDrawPointMode(),
                new TerraDrawLineStringMode(),
                new TerraDrawSelectMode({
                    styles: {
                        selectedPolygonFillOpacity: 0.7,
                        selectedPolygonOutlineColor: "#00FF00",
                        selectedPointColor: "#00FF00",
                        selectedPointOutlineColor: "#00FFFF",
                        selectedLineStringColor: "#00FF00",
                    },
                    flags: {
                        point: { feature: { draggable: true } },
                        polygon: { feature: { draggable: true } },
                        rectangle: { feature: { draggable: true } },
                        linestring: { feature: { draggable: true } },
                    },
                    allowManualDeselection: true,
                }),
            ],
        });
        if (!terraDraw) return;
        terraDraw.start();

        const fromLeft = drawRef === props.terraDrawLeftRef;
        terraDraw.on("select", onSelect);
        terraDraw.on("deselect", onDeselect);
        terraDraw.on("change", (ids, type, context) => {
            if (!ids) return;
            if (type === 'update' || type === 'create') {
                ids.forEach(id => syncFeatureCoordsAcrossMaps(id, fromLeft));
            }
        });
        terraDraw.on("change", () => updateSharedSource(fromLeft));

        drawRef.current = terraDraw;
        console.log('terradraw intialized');
    }

    // UseEffects to initialize both left and right terradraw instances
    useEffect(() => {
        console.log('useEffect')
        const leftMap = props.leftMapRef?.current?.getMap();
        console.log('leftMap', leftMap)
        if (!leftMap) return;

        const init = () => initTerraDraw(leftMap, props.terraDrawLeftRef);
        if (leftMap.isStyleLoaded()) {
            init();
        } else {
            leftMap.once("load", init);
        }

        return () => {
            props.terraDrawLeftRef?.current?.stop();
        };
    }, [props.leftMapRef]);

    useEffect(() => {
        console.log('useEffect')
        const rightMap = props.rightMapRef?.current?.getMap();
        console.log('rightMap', rightMap)

        if (!rightMap) return;

        const init = () => initTerraDraw(rightMap, props.terraDrawRightRef);
        if (rightMap.isStyleLoaded()) {
            init();
        } else {
            rightMap.once("load", init);
        }

        return () => {
            props.terraDrawRightRef?.current?.stop();
        };
    }, [props.rightMapRef]);

    //Bring drawing to front after changing the basemap
    const alreadyMovedLeftRef = useRef(false);
    const alreadyMovedRightRef = useRef(false);
    const bringTerraDrawToFront = (alreadyMovedRef: React.MutableRefObject<boolean>, terraDraw: TerraDraw, map: mapboxgl.Map) => {
        if (alreadyMovedRef.current) return;
        if (map && terraDraw) {
            ["td-polygon", "td-polygon-outline", "td-linestring", "td-point"].forEach(layerId => {

                if (map.getLayer(layerId)) map.moveLayer(layerId);
            });
        }
        alreadyMovedRef.current = true;
    };
    useEffect(() => {

        if (props.clickedMap == 'right') return;
        const leftMap = props.leftMapRef?.current?.getMap();
        const leftTerraDraw = props.terraDrawLeftRef?.current;

        if (!leftMap || !leftTerraDraw) return;

        alreadyMovedLeftRef.current = false;
        const onIdle = () => {
            bringTerraDrawToFront(alreadyMovedLeftRef, leftTerraDraw, leftMap);
        };
        if (!leftMap.loaded()) {
            leftMap.once("load", onIdle);
        }
        leftMap.on("idle", onIdle);
        return () => {
            leftMap.off("idle", onIdle);
        };
    }, [props.selectedTms, props.leftTimelineDate]);

    useEffect(() => {
        if (props.clickedMap == 'left') return;
        const rightMap = props.rightMapRef?.current?.getMap();
        const rightTerraDraw = props.terraDrawRightRef?.current;

        if (!rightMap || !rightTerraDraw) return;

        alreadyMovedRightRef.current = false;
        const onIdle = () => {
            bringTerraDrawToFront(alreadyMovedRightRef, rightTerraDraw, rightMap);
        };

        if (!rightMap.loaded()) {
            rightMap.once("load", onIdle);
        }
        rightMap.on("idle", onIdle);
        return () => {
            rightMap.off("idle", onIdle);
        };
    }, [props.selectedTms, props.rightTimelineDate]);

    //Switch between draw's modes
    const [activeMode, setActiveMode] = useState<Mode>("static");
    const toggleMode = (mode: Mode) => {
        const newMode = activeMode === mode ? "static" : mode;

        const leftTerraDraw = props.terraDrawLeftRef?.current;
        const rightTerraDraw = props.terraDrawRightRef?.current;

        if (!leftTerraDraw || !rightTerraDraw) {
            console.warn("At least one instance of TerraDraw is not ready");
            return;
        }
        if (leftTerraDraw?.enabled) leftTerraDraw.setMode(newMode);
        if (rightTerraDraw?.enabled) rightTerraDraw.setMode(newMode);

        setActiveMode(newMode);
    };


    // export drawings of both maps left & right
    function exportDrawing() {
        const leftFeatures = props.terraDrawLeftRef?.current?.getSnapshot() ?? [];
        if (leftFeatures.length === 0) {
            console.warn("Aucun dessin à exporter.");
            return;
        }
        const geojson = {
            type: "FeatureCollection",
            features: leftFeatures,
        };
        const blob = new Blob([JSON.stringify(geojson)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_drawings.geojson";
        a.click();
        URL.revokeObjectURL(url);
    }

    //delete handler for selected feature
    function deleteHandler() {
        const leftDraw = props.terraDrawLeftRef.current;
        const rightDraw = props.terraDrawRightRef.current;

        if (!leftDraw || !rightDraw) return;

        const selectedId = selectedIdRef.current;

        if (selectedId) {
            const removeFrom = (drawInstance: TerraDraw) => {
                const snapshot = drawInstance.getSnapshot();
                const filteredFeatures = snapshot.filter(
                    (f) => f.id !== undefined && f.id !== selectedId
                );
                drawInstance.clear();
                drawInstance.addFeatures(filteredFeatures);
            };
            removeFrom(leftDraw);
            removeFrom(rightDraw);

            selectedIdRef.current = null;
        } else {
            leftDraw.clear();
            rightDraw.clear();
        }
    }

    //reset the mode onclick on Escape
    useEffect(() => {
        const handleKeyDown = (event: { key: string; }) => {
            if (event.key === "Escape") {
                setActiveMode('static');
                props.terraDrawLeftRef.current?.setMode("static");
                props.terraDrawRightRef.current?.setMode("static");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    //Toggle the visibility of the drawings of both right and left maps
    const [isVisible, setVisible] = useState(true);
    function toggleDrawings() {
        const leftMap = props.leftMapRef?.current?.getMap();
        const rightMap = props.rightMapRef?.current?.getMap();

        if (!leftMap && !rightMap) return;

        setVisible(!isVisible)

        const lefMapLayers = leftMap.getStyle().layers

        lefMapLayers.forEach((layer: any) => {
            if (layer.id.startsWith('td')) {
                leftMap.setLayoutProperty(
                    layer.id,
                    'visibility',
                    !isVisible ? 'visible' : 'none'
                );
                rightMap.setLayoutProperty(
                    layer.id,
                    'visibility',
                    !isVisible ? 'visible' : 'none'
                );
            }
        })
    }

    return (
        <>
            <TerraDrawControlComponent
                toggleMode={toggleMode}
                activeMode={activeMode}
                deleteHandler={deleteHandler}
                exportDrawing={exportDrawing}
                toggleDrawings={toggleDrawings}
                position="top-left"
                isVisible={isVisible}
            />
        </>

    )

}