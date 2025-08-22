import { useControl } from 'react-map-gl/mapbox-legacy'
import { createPortal } from 'react-dom'

import { DrawingMode } from './map-controls'
import { useState } from 'react'
import { FaMousePointer, FaMapMarkerAlt, FaDrawPolygon, FaTrash, FaSave, FaPen, FaPenSquare, FaEyeSlash, FaEye, FaRegSquare } from 'react-icons/fa';
import { MdOutlinePolyline } from "react-icons/md";
import { PiBoundingBoxBold } from "react-icons/pi";
// import { BsBoundingBoxCircles } from "react-icons/bs";
import { useTheme, lighten } from '@mui/material/styles';

class TerraDrawControl {
  private _container: HTMLDivElement
  constructor() {
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
  }
  onAdd() {
    return this._container;
  }
  onRemove() {
    this._container.remove();
  }
  getElement() {
    return this._container;
  }
}
interface TerraDrawControlProps {
  deleteHandler: () => void;
  toggleMode: (mode: DrawingMode) => void;
  exportDrawing: () => void;
  activeDrawingMode: DrawingMode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  toggleDrawings: () => void;
  drawingsVisible: boolean;
}

export function TerraDrawControlComponent({
  toggleMode,
  activeDrawingMode,
  deleteHandler,
  exportDrawing,
  toggleDrawings,
  position = "top-left",
  drawingsVisible

}: TerraDrawControlProps) {
  const ctrl = useControl(() => new TerraDrawControl(), { position });
  const [showControls, setShowControls] = useState(true);

  const theme = useTheme();
  const selectColor = lighten(theme.palette.primary.main, 0.1);
  const defaultColor = "black";

  return createPortal(
    <div>
      <button onClick={() => setShowControls(!showControls)} title='Draw Geometry'>
        {showControls ? <FaPen /> : <FaPen />}
      </button>

      {showControls && (
        <div style={{ marginTop: 5 }}>
          <button
            onClick={() => toggleMode("point")}
            style={{ color: activeDrawingMode === "point" ? selectColor : defaultColor }}
            title="Point"
          >
            <FaMapMarkerAlt />
          </button>
          <button
            onClick={() => toggleMode("rectangle")}
            style={{ color: activeDrawingMode === "rectangle" ? selectColor : defaultColor }}
            title="Rectangle"
          >
            <PiBoundingBoxBold />
          </button>
          <button
            onClick={() => toggleMode("linestring")}
            style={{ color: activeDrawingMode === "linestring" ? selectColor : defaultColor }}
            title="Linestring"
          >
            <MdOutlinePolyline />
          </button>
          <button
            onClick={() => toggleMode("polygon")}
            style={{ color: activeDrawingMode === "polygon" ? selectColor : defaultColor }}
            title="Polygon"
          >
            <FaDrawPolygon />
          </button>
          <button
            onClick={() => toggleMode("select")}
            style={{ color: activeDrawingMode === "select" ? selectColor : defaultColor }}
            title="Select &#10;Drag whole features, Edit coordinates or midpoints, Right-click to delete single coordinate or Press DEL to delete single-feature "
          >
            <FaMousePointer />
          </button>
          <button onClick={() => toggleDrawings()} style={{ marginTop: 0 }}>
            {drawingsVisible ? <FaEye title='Hide drawings' /> : <FaEyeSlash title='Show drawings' />}
          </button>
          <button onClick={deleteHandler} title="Clear all canvas&#10;Otherwise select and press keyboard DEL to delete single feature"> <FaTrash /> </button>
          <button onClick={exportDrawing} title="Export Geojson FeatureCollection"> <FaSave /> </button>
        </div>
      )}
    </div>,
    ctrl.getElement()
  );
}
