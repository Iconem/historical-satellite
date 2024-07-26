import { useState, Fragment } from "react";
import {
  Modal,
  TextField,
  Typography,
  IconButton,
  Box,
  Tooltip, 
  Checkbox, 
  FormControlLabel,
  // CheckboxChangeEvent,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { MIN_PLANET_DATE, MAX_PLANET_DATE } from "./utilities";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

export default function SettingsModal(props: any) {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const errorMessage = "start Date should be before end date!";
  
  const handleCollectionDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.setCollectionDateActivated( event.target.checked);
  };
  
  const handlePlanetApiInputChange = (event:any) => {
    props.setCustomPlanetApiKey(event.target.value);
};

  return (
    <Fragment>
      <IconButton aria-label="delete" onClick={handleOpen} size={"small"}>
        <FontAwesomeIcon icon={faGear} />
      </IconButton>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            <FontAwesomeIcon icon={faGear} /> Settings
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 1, mb: 1 }}>
            Export Frames settings
          </Typography>{" "}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
            {/* <Tooltip title={"Export start date (from)"}> */}
            <DatePicker
              slotProps={{
                textField: {
                  size: "small",
                  style: { width: "130px" },
                  //   helperText:
                  //     props.minDate <= props.maxDate ? " " : errorMessage,
                },
              }}
              views={["year", "month"]}
              label="Export start"
              format="YYYY/MM"
              minDate={dayjs(MIN_PLANET_DATE)}
              maxDate={dayjs(props.maxDate)}
              value={dayjs(props.minDate)}
              onChange={(newValue) => props.setExportMinDate(new Date(newValue))}
            />
            {/* </Tooltip> */}
          </LocalizationProvider>
          <Tooltip title={"Export interval (every X months)"}>
            <TextField
              style={{ width: "80px" }}
              size={"small"}
              id="outlined-number"
              label="Interval"
              type="number"
              value={`${props.exportInterval}`}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                props.setExportInterval(parseFloat(event.target.value));
              }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Tooltip>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
            {/* <Tooltip title={"Export end date (to)"}> */}
            <DatePicker
              slotProps={{
                textField: { size: "small", style: { width: "130px" } },
              }}
              views={["year", "month"]}
              label="Export end"
              format="YYYY/MM"
              minDate={dayjs(props.minDate)}
              maxDate={dayjs(MAX_PLANET_DATE)}
              value={dayjs(props.maxDate)}
              onChange={(newValue) => props.setExportMaxDate(new Date(newValue))}
            />
            {/* </Tooltip> */}
          </LocalizationProvider>{" "}
          <Typography id="modal-modal-description" sx={{ mt: 1, mb: 1 }}>
            Additional export settings
          </Typography>{" "}
          <TextField
            style={{ width: "130px" }}
            sx={{ mt: 1 }}
            size={"small"}
            label="Frame Resolution"
            type="number"
            value={`${props.maxFrameResolution}`}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              props.setMaxFrameResolution(parseInt(event.target.value));
            }}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            style={{ width: "210px" }}
            sx={{ mt: 1 }}
            size={"small"}
            label="TiTiler Endpoint"
            value={`${props.titilerEndpoint}`}
            onChange={props.setTitilerEndpoint}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <Typography id="modal-modal-description" sx={{ mt: 1, mb: 1 }}>
            Playback settings
          </Typography>{" "}
          <TextField
            style={{ width: "80px" }}
            size={"small"}
            id="outlined-number"
            label="FPS"
            type="number"
            value={`${props.playbackSpeedFPS}`}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              props.setPlaybackSpeedFPS(parseFloat(event.target.value));
            }}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <FormControlLabel
            label="Activate Collection Date (Beta, caution)"
            control={
              <Checkbox
                checked={props.collectionDateActivated}
                onChange={handleCollectionDateChange}
                inputProps={{ 'aria-label': 'controlled' }}
              />
            }
          />
          
          <div className='customApiModal'>
              <TextField  value={props.customPlanetApiKey} onChange={handlePlanetApiInputChange} size={'small'} label="Planet Monthly Key" style={{ width: '86%' }} />
          </div>

        </Box>
      </Modal>
    </Fragment>
  );
}
