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
  console.log('TerraDrawControlComponent activeMode', activeMode)

  const theme = useTheme();
  const selectColor = lighten(theme.palette.primary.main, 0.1);
  const defaultColor = "black";

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
            style={{ color: activeMode === "point" ? selectColor : defaultColor }}
            title="Point"
          >
            <FaMapMarkerAlt />
          </button>
          <button
            onClick={() => toggleMode("linestring")}
            style={{ color: activeMode === "linestring" ? selectColor : defaultColor }}
            title="Linestring"
          >
            <MdOutlinePolyline />
          </button>
          <button
            onClick={() => toggleMode("rectangle")}
            style={{ color: activeMode === "rectangle" ? selectColor : defaultColor }}
            title="Rectangle"

          >
            <FaRegSquare />
          </button>
          <button
            onClick={() => toggleMode("polygon")}
            style={{ color: activeMode === "polygon" ? selectColor : defaultColor }}
            title="Polygon"
          >
            <FaDrawPolygon />
          </button>
          <button
            onClick={() => toggleMode("select")}
            style={{ color: activeMode === "select" ? selectColor : defaultColor }}
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
