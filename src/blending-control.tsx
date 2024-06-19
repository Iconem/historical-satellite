
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

const BlendingControl = (props:any) => {
  const blendingModes = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ];

  const handleBlendingModeChange = (event:any) => {
    props.setBlendingMode(event.target.value);
  };

  return (
    <FormControl sx={{ m: 0, minWidth: 200, textAlign: "left" }} size="small">
      <InputLabel id="select-label">Blending Mode</InputLabel>
      <Select
        labelId="select-label"
        id="demo-select-small"
        value={props.selectedBlendingMode}
        label="Blending Mode"
        onChange={handleBlendingModeChange}
      >
        {blendingModes.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {mode}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default BlendingControl;