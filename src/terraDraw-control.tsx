import { useControl } from 'react-map-gl/mapbox-legacy'
import { createPortal } from 'react-dom'

import { Mode } from './map-controls'
import { useState } from 'react'
import { FaMousePointer, FaMapMarkerAlt, FaRegSquare, FaDrawPolygon, FaTrash, FaSave} from 'react-icons/fa';
import { MdOutlineDraw, MdDraw, MdOutlinePolyline  } from "react-icons/md";
import { PiEyeClosedBold, PiEyeBold, PiRectangleLight  } from "react-icons/pi";

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
  
    const [showControls, setShowControls] = useState(false);
    
    return createPortal(
      <div>
        <button onClick={() => setShowControls(!showControls)} title ='draw'>
        {showControls ? <MdDraw /> : <MdOutlineDraw />}
        </button>

        {showControls && (
          <div style={{ marginTop: 5 }}>
            <button onClick={() => toggleDrawings()}>
              {isVisible ? <PiEyeBold title='Hide'/> : <PiEyeClosedBold title='Show'/>}
            </button>
            <button 
              onClick={() => toggleMode("select")}
              style={{ backgroundColor: activeMode === "select" ? "lightgreen" : "white" }}
              title="Select"
            >
              <FaMousePointer /> 
            </button>
            <button
              onClick={() => toggleMode("point")}
              style={{ backgroundColor: activeMode === "point" ? "lightgreen" : "white" }}
              title="Point"
            >
              <FaMapMarkerAlt />
            </button>
            <button
              onClick={() => toggleMode("linestring")}
              style={{ backgroundColor: activeMode === "linestring" ? "lightgreen" : "white" }}
              title="linestring"
            >
              <MdOutlinePolyline />
            </button>
            <button
              onClick={() => toggleMode("rectangle")}
              style={{ backgroundColor: activeMode === "rectangle" ? "lightgreen" : "white" }}
              title="Rectangle"

            >
              <PiRectangleLight />
            </button>
            <button
              onClick={() => toggleMode("polygon")}
              style={{ backgroundColor: activeMode === "polygon" ? "lightgreen" : "white" }}
              title="Polygon"
            >
              <FaDrawPolygon />
            </button>
            <button onClick={deleteHandler} title="Delete"> <FaTrash /> </button>
            <button onClick={exportDrawing} title="Export"> <FaSave /> </button>
          </div>
        )}
      </div>,
      ctrl.getElement()
    );
  }
  