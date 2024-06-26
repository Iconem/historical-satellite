import Slider from '@mui/material/Slider';
import React from 'react';

export default function OpacitySlider(props:any) {
  const handleOpacityChange = (event:any) => {
    props.setOpacity(event.target.value);
  };
  return (
    <Slider
      style={{width: '10vw'}}
      value={props.opacity}
      step={0.005}
      // aria-label='Always visible'
      size="small"
      min={0}
      max={1}
      valueLabelDisplay='auto'
      onChange={handleOpacityChange}
      getAriaValueText={v => `Opacity: ${Math.round(v * 100)} %`}
      valueLabelFormat={v => `Opacity: ${Math.round(v * 100)} %`}
    />
  );
}
  