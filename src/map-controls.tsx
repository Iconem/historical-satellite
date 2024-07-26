import {ReactElement, memo, useCallback} from 'react'
import CustomOverlay from './custom-overlay';
import { ScaleControl, NavigationControl, useControl } from "react-map-gl";
import GeocoderControl from './geocoder-control'
import RulerControl from '@mapbox-controls/ruler';

import bbox from '@turf/bbox'
import { kml } from '@tmcw/togeojson'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload } from '@fortawesome/free-solid-svg-icons'


export function WrappedRulerControl(props: any) {
  useControl(() => new RulerControl(props), {
    position: props.position
  });
  return null;
}

function FileInput(props: any): ReactElement {
  function handleKMLUpload(event): void {
    event.preventDefault()
    const kmlFile = event.target.files[0]
    console.log('kmlFile info', kmlFile)
    console.log('props in handleKMLUpload', props)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const kmlContent: string = e.target?.result as string
      const xmlDoc = new DOMParser().parseFromString(kmlContent, 'text/xml')
      const geojsonFeatures = kml(xmlDoc)
      console.log('geojsonFeatures from kml', geojsonFeatures)

      // Zoom on imported kml
      const bounds = bbox(geojsonFeatures)
      const [minLng, minLat, maxLng, maxLat] = bounds
      console.log('mapRef', props)
      props.mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 150,
          duration: 1000,
          center: [0.5 * (minLng + maxLng), 0.5 * (minLat + maxLat)],
        }
      )

      // Can be imported but not edited because not added to the draw features component
      console.log('props in onload', props)
      props.setDrawFeatures([{ ...geojsonFeatures.features[0], id: 'imported_kml_feature' }])
      // Not useful
      // props.map.fire("draw.create", {
      //   features: [{...geojsonFeatures.features[0], id: 'imported_kml_feature'}]
      // });
    }
    reader.readAsText(event.target.files[0], 'UTF-8')
  }

  return (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
      <input
        id="kmlUploadInput"
        type="file"
        onChange={(e) => {
          handleKMLUpload(e)
        }}
        style={{ pointerEvents: 'auto', display: 'none' }}
      />
      <button
        type="button"
        title="Upload KML AOI (will just zoom to it, not load it)"
        onClick={() => {
          document.getElementById('kmlUploadInput')?.click()
        }}
      >
        <span className="mapboxgl-ctrl-icon" style={{ padding: '7px' }}>
          <FontAwesomeIcon icon={faUpload} />{' '}
        </span>
      </button>
    </div>
  )
}


function FileUploadControl(props: any): ReactElement {
  const onDrawCreate = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])
  const onDrawUpdate = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])

  const onDrawDelete = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        delete newFeatures[f.id]
      }
      return newFeatures
    })
  }, [])

  return (
   
      <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
        <FileInput setDrawFeatures={props.setDrawFeatures} mapRef={props.mapRef} />
      </CustomOverlay>
  )
}

function MapControls(props: any): ReactElement {


  return (
    <>
      <GeocoderControl
          mapboxAccessToken={props.mapboxAccessToken}
          position="top-left"
          flyTo={false} 
          mapRef={props.mapRef}
        />
        <WrappedRulerControl
          position="top-left"
        />

      {/* <FileUploadControl 
      
      /> */}
      <NavigationControl showCompass={false} position="top-left" />

      <ScaleControl
        unit={'metric'}
        position="top-left"
        // style={{ clear: 'none' }}
        maxWidth={60} 
      />
    </>
  )
}

export default memo(MapControls)