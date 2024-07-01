import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
// import Checkbox from '@mui/material/Checkbox';

function CustomPlanetApiModal(props: any) {
    const customPlanetApiKey = props.customPlanetApiKey;
    const setCustomPlanetApiKey = props.setCustomPlanetApiKey;


    const handleInputChange = (event:any) => {
        if (event.target.value.length > 10) {
        setCustomPlanetApiKey(event.target.value);
        }
    };


    return (
        <div className='customApiModal'>
            <TextField value={customPlanetApiKey} onChange={handleInputChange} size={'small'} label="Planet Monthly Key" />
        </div>
    );
};

export default CustomPlanetApiModal;
