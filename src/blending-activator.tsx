import Checkbox from '@mui/material/Checkbox';

export default function CheckboxBlending(props:any) {

    const handleCheckboxChange = (event:any) => {
        props.setBlendingActivation(event.target.checked);
    }
    return (
    <Checkbox
        // defaultChecked
        checked={props.blendingActivation}
        onChange={handleCheckboxChange}
        inputProps={{ 'aria-label': 'controlled' }}
        />
    );
}

