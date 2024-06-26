import Slider from '@mui/material/Slider';
import React from 'react';

export default function OpacitySlider(props:any) {
  const [value, setValue] = React.useState<number>(1);
  const handleOpacityChange = (event:any) => {
    setValue(event.target.value);
    props.setOpacity(event.target.value / 100);
    };
    return (
      <Slider
        style={{width: '10vw'}}
        value={value}
        step={1}
        // aria-label='Always visible'
        size="small"
        min={0}
        max={100}
        valueLabelDisplay='auto'
        onChange={handleOpacityChange}
        getAriaValueText={v => `Opacity: ${v} %`}
        valueLabelFormat={v => `Opacity: ${v} %`}
      />
    );
}
  