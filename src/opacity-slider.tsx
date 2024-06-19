import Slider from '@mui/material/Slider';
import React from 'react';

export default function OpacitySlider(props:any) {
  const [value, setValue] = React.useState<number>(1);
  const handleOpacityChange = (event:any) => {
    setValue(event.target.value);
    props.setOpacity(event.target.value);
    };
    return (
        <div>
            <Slider
            style={{width: '10vw'}}
            value={value}
            step={0.05}
            aria-label='Always visible'
            min={0}
            max={1}
            valueLabelDisplay='on'
            onChange={handleOpacityChange}
            />
        </div>
        );
}
  