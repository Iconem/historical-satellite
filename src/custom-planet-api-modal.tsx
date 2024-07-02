import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';

function CustomPlanetApiModal(props: any) {
    
    const handleInputChange = (event:any) => {
        props.setCustomPlanetApiKey(event.target.value);
    };
 
    return (
        <div className='customApiModal'>
            <TextField  value={`${props.customPlanetApiKey}` == 'undefined' ? `${props.customPlanetApiKey}` : props.customPlanetApiKey} onChange={handleInputChange} size={'small'} label="Planet Monthly Key" style={{ width: '86%' }} />
        </div>
    );
};

export default CustomPlanetApiModal;
