import { ReactElement, useEffect, useRef, useState, useCallback } from "react";
import { TerraDrawControlComponent } from "./terraDraw-control";
import {
    TerraDraw,
    TerraDrawLineStringMode,
    TerraDrawPointMode,
    TerraDrawPolygonMode,
    TerraDrawRectangleMode,
    TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapboxGLAdapter } from "terra-draw-mapbox-gl-adapter";
import { DrawingMode } from "./map-controls";
import { saveAs } from 'file-saver';

type MapDrawingProps = {
    leftMapRef: React.MutableRefObject<any>;
    rightMapRef: React.MutableRefObject<any>;
    terraDrawLeftRef: React.MutableRefObject<TerraDraw | null>;
    terraDrawRightRef: React.MutableRefObject<TerraDraw | null>;
    clickedMap?: "left" | "right";
    leftSelectedTms?: string;
    rightSelectedTms?: string;
    leftTimelineDate?: string;
    rightTimelineDate?: string;
};

export function MapDrawingComponent(props: MapDrawingProps): ReactElement {
    const [activeDrawingMode, setActiveDrawingMode] = useState<DrawingMode>("static");
    const [drawingsVisible, setDrawingsVisible] = useState(true);

    // --- Toggle drawings visibility ---
    const toggleDrawings = useCallback(() => {
        setDrawingsVisible(v => !v);
    }, []);

    // whenever drawingsVisible changes, imperatively update map layers
    useEffect(() => {
        const leftMap = props.leftMapRef.current?.getMap();
        const rightMap = props.rightMapRef.current?.getMap();
        if (!leftMap || !rightMap) return;
        if (!leftMap.isStyleLoaded() || !rightMap.isStyleLoaded()) return;

        const leftLayers = leftMap.getStyle()?.layers ?? [];
        leftLayers.forEach((layer: any) => {
            if (layer.id.startsWith("td")) {
                leftMap.setLayoutProperty(layer.id, "visibility", drawingsVisible ? "visible" : "none");
                rightMap.setLayoutProperty(layer.id, "visibility", drawingsVisible ? "visible" : "none");
            }
        });
    }, [drawingsVisible, props.leftMapRef, props.rightMapRef]);


    // --- Initialize each terradraw on its map instances once maps styles are ready ---
    const terradrawSelectModeOptions = {
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
    }

    const initTerraDraw = useCallback(
        (map: mapboxgl.Map, drawRef: React.MutableRefObject<TerraDraw | null>) => {
            if (!map) return;
            drawRef.current?.stop();

            const terraDraw = new TerraDraw({
                adapter: new TerraDrawMapboxGLAdapter({ map }),
                modes: [
                    new TerraDrawRectangleMode(),
                    new TerraDrawPolygonMode(),
                    new TerraDrawPointMode(),
                    new TerraDrawLineStringMode(),
                    new TerraDrawSelectMode(terradrawSelectModeOptions as any),
                ],
            });
            terraDraw.start();
            drawRef.current = terraDraw;
        },
        []
    );

    const setupTerradraw = (mapRef: any, drawRef: any) => {
        const map = mapRef?.current?.getMap();
        if (!map) return;
        if (map.isStyleLoaded()) {
            initTerraDraw(map, drawRef);
        } else {
            map.once("idle", () => initTerraDraw(map, drawRef));
        }
    };

    useEffect(() => {
        setupTerradraw(props.leftMapRef, props.terraDrawLeftRef);
        setupTerradraw(props.rightMapRef, props.terraDrawRightRef);

        return () => {
            props.terraDrawLeftRef.current?.stop();
            props.terraDrawRightRef.current?.stop();
        };
    }, [initTerraDraw, props.leftMapRef, props.rightMapRef]);

    // --- Mode toggle ---
    const toggleMode = useCallback(
        (mode: DrawingMode) => {
            const newMode = activeDrawingMode === mode ? "static" : mode;
            props.terraDrawLeftRef.current?.setMode(newMode);
            props.terraDrawRightRef.current?.setMode(newMode);
            setActiveDrawingMode(newMode);
        },
        [activeDrawingMode, props.terraDrawLeftRef, props.terraDrawRightRef]
    );

    // --- Sync drawn features between maps ---
    const isProgrammaticUpdate = useRef(false);
    const deepcopyFeatures = (sourceDraw: TerraDraw | null, targetDraw: TerraDraw | null) => {
        // We don't want any mid points or selection points so we filter them out
        const features = sourceDraw?.getSnapshot() || []
        const filteredFeatures = features.filter((f: any) => !f.properties.midPoint && !f.properties.selectionPoint)
        targetDraw?.clear()
        targetDraw?.addFeatures(filteredFeatures)
    }

    const onUpdateDraws = (sourceOfChange: 'left' | 'right', drawLeft: TerraDraw | null, drawRight: TerraDraw | null) => {
        if (isProgrammaticUpdate.current) return;
        isProgrammaticUpdate.current = true;
        console.log('onUpdateDraws', sourceOfChange, drawLeft, drawRight)
        if (sourceOfChange == 'left') {
            deepcopyFeatures(drawLeft, drawRight)
        } else {
            deepcopyFeatures(drawRight, drawLeft)
        }
        isProgrammaticUpdate.current = false;
    }

    useEffect(() => {
        // Syncs terradraw instances. We don't care about which drawings is the right one, only need to know which one fires event that will trigger a setState, then useEffect will watch these state changes and update both draws
        const onUpdateLeft = () => onUpdateDraws('left', props.terraDrawLeftRef?.current, props.terraDrawRightRef?.current)
        const onUpdateRight = () => onUpdateDraws('right', props.terraDrawLeftRef?.current, props.terraDrawRightRef?.current)

        props.terraDrawLeftRef?.current?.on("select", onUpdateLeft);
        props.terraDrawLeftRef?.current?.on("deselect", onUpdateLeft);
        props.terraDrawLeftRef?.current?.on("change", onUpdateLeft);
        props.terraDrawRightRef?.current?.on("select", onUpdateRight);
        props.terraDrawRightRef?.current?.on("deselect", onUpdateRight);
        props.terraDrawRightRef?.current?.on("change", onUpdateRight);

    }, [props.terraDrawLeftRef, props.terraDrawRightRef, onUpdateDraws]);


    // --- Bring TerraDraw Layers to Front even after basemaap source changed ---
    const bringTerraDrawToFront = (map: mapboxgl.Map) => {
        if (map) {

            ["td-polygon", "td-polygon-outline", "td-linestring", "td-point"].forEach(layerId => {
                if (map.getLayer(layerId)) map.moveLayer(layerId);
            });
        }
    };

    useEffect(() => {
        const leftMap = props.leftMapRef?.current?.getMap();
        const onIdle = () => bringTerraDrawToFront(leftMap);
        leftMap.once("sourcedata", onIdle);
        // Often terradraw was defined after initial source loaded, so had to call once, but delayed
        setTimeout(() => bringTerraDrawToFront(leftMap), 1000);
        return () => {
            leftMap.off("sourcedata", onIdle);
        };
    }, [props.leftSelectedTms, props.leftTimelineDate]);

    useEffect(() => {
        const rightMap = props.rightMapRef?.current?.getMap();
        const onIdle = () => bringTerraDrawToFront(rightMap);
        rightMap.once("sourcedata", onIdle);
        // Often terradraw was defined after initial source loaded, so had to call once, but delayed
        setTimeout(() => bringTerraDrawToFront(rightMap), 1000);
        return () => {
            rightMap.off("sourcedata", onIdle);
        };
    }, [props.rightSelectedTms, props.rightTimelineDate]);


    // --- Export drawings ---
    const exportDrawing = useCallback(
        () => {
            const features = props.terraDrawLeftRef?.current?.getSnapshot() ?? [];
            if (features.length === 0) {
                console.log("No drawings to export");
                return;
            }
            const geojson = {
                type: "FeatureCollection",
                features,
            };
            const blob = new Blob([JSON.stringify(geojson)], {
                type: "application/json",
            });
            saveAs(blob, "drawings.geojson");
        },
        [props.terraDrawLeftRef]
    );

    // --- Delete selected ---
    const deleteHandler = useCallback(() => {

        const leftDraw = props.terraDrawLeftRef.current;
        const rightDraw = props.terraDrawRightRef.current;
        if (!leftDraw || !rightDraw) return;

        leftDraw.clear();
        rightDraw.clear();
    }, [props.terraDrawLeftRef, props.terraDrawRightRef]);


    // --- Keyboard escape reset drawing-mode and delete ---
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            console.log('keyHandler, handler', e)
            if (e.key === "Escape") {
                toggleMode("static");
            }
        };
        window.addEventListener("keyup", handler);
        return () => window.removeEventListener("keyup", handler);
    }, []);

    return (
        <TerraDrawControlComponent
            toggleMode={toggleMode}
            activeDrawingMode={activeDrawingMode}
            deleteHandler={deleteHandler}
            exportDrawing={exportDrawing}
            toggleDrawings={toggleDrawings}
            position="top-left"
            drawingsVisible={drawingsVisible}
        />
    );
}

