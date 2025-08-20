import { useControl } from 'react-map-gl/mapbox-legacy'
import { createPortal } from 'react-dom'

import { Mode } from './map-controls'
import { useState } from 'react'
import { FaMousePointer, FaMapMarkerAlt, FaDrawPolygon, FaTrash, FaSave, FaPen, FaPenSquare, FaEyeSlash, FaEye, FaRegSquare } from 'react-icons/fa';
import { MdOutlinePolyline } from "react-icons/md";
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
  toggleMode: (mode: Mode) => void;
  exportDrawing: () => void;
  activeMode: Mode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  toggleDrawings: () => void;
  isVisible: boolean;
}

export function TerraDrawControlComponent({
  toggleMode,
  activeMode,
  deleteHandler,
  exportDrawing,
  toggleDrawings,
  position = "top-left",
  isVisible

}: TerraDrawControlProps) {
  const ctrl = useControl(() => new TerraDrawControl(), { position });

  const theme = useTheme();
  const selectColor = lighten(theme.palette.primary.light, 0.5);

  const [showControls, setShowControls] = useState(false);

  return createPortal(
    <div>
      <button onClick={() => setShowControls(!showControls)} title='draw'>
        {showControls ? <FaPen /> : <FaPen />}
      </button>

      {showControls && (
        <div style={{ marginTop: 5 }}>
          <button
            onClick={() => toggleMode("point")}
            style={{ backgroundColor: activeMode === "point" ? selectColor : "white" }}
            title="Point"
          >
            <FaMapMarkerAlt />
          </button>
          <button
            onClick={() => toggleMode("linestring")}
            style={{ backgroundColor: activeMode === "linestring" ? selectColor : "white" }}
            title="Linestring"
          >
            <MdOutlinePolyline />
          </button>
          <button
            onClick={() => toggleMode("rectangle")}
            style={{ backgroundColor: activeMode === "rectangle" ? selectColor : "white" }}
            title="Rectangle"

          >
            <FaRegSquare />
          </button>
          <button
            onClick={() => toggleMode("polygon")}
            style={{ backgroundColor: activeMode === "polygon" ? selectColor : "white" }}
            title="Polygon"
          >
            <FaDrawPolygon />
          </button>
          <button
            onClick={() => toggleMode("select")}
            style={{ backgroundColor: activeMode === "select" ? selectColor : "white" }}
            title="Select"
          >
            <FaMousePointer />
          </button>
          <button onClick={() => toggleDrawings()} style={{ marginTop: 0 }}>
            {isVisible ? <FaEye title='Hide' /> : <FaEyeSlash title='Show' />}
          </button>
          <button onClick={deleteHandler} title="Delete"> <FaTrash /> </button>
          <button onClick={exportDrawing} title="Export"> <FaSave /> </button>
        </div>
      )}
    </div>,
    ctrl.getElement()
  );
}
