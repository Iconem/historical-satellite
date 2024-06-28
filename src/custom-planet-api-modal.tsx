import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';

function CustomPlanetApiModal(props: any) {
    const customPlanetApiKey = props.customPlanetApiKey;
    const UseCustomPlanetApiKey = props.UseCustomPlanetApiKey;
    const setCustomPlanetApiKey = props.setCustomPlanetApiKey;
    const setUseCustomPlanetApiKey = props.setUseCustomPlanetApiKey;

    const handleCheckboxChange = () => {
        setUseCustomPlanetApiKey(!UseCustomPlanetApiKey);
    };

    const handleInputChange = (event) => {
        setCustomPlanetApiKey(event.target.value);
    };


    return (
        <div className='customApiModal'>
            <Checkbox checked={UseCustomPlanetApiKey} onChange={handleCheckboxChange} />
            <TextField value={customPlanetApiKey} onChange={handleInputChange} label="Planet Monthly Key" />
        </div>
    );
};

export default CustomPlanetApiModal;
