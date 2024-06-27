
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

const BlendingControl = (props:any) => {
  const blendingModes = [
    'difference', 'exclusion', 'color-burn', 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'hard-light', 'soft-light', 'hue', 'saturation', 'color', 'luminosity'
  ];

  const handleBlendingModeChange = (event:any) => {
    const mode = event.target.value;
    props.setBlendingMode(mode);
    if (mode !== 'normal') props.setBlendingActivation(true)
  };

  return (
    <FormControl sx={{ m: 0, minWidth: 200, textAlign: "left" }} size="small">
      <InputLabel id="select-label">Blending Mode</InputLabel>
      <Select
        labelId="select-label"
        id="demo-select-small"
        value={props.blendingMode}
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