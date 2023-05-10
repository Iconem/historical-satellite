import { useState, Fragment } from "react";
import {
  Modal,
  TextField,
  Typography,
  IconButton,
  Box,
  Tooltip,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { MIN_DATE, MAX_DATE } from "./utilities";

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
              minDate={dayjs(MIN_DATE)}
              maxDate={dayjs(props.maxDate)}
              value={dayjs(props.minDate)}
              onChange={(newValue) => props.setMinDate(new Date(newValue))}
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
              maxDate={dayjs(MAX_DATE)}
              value={dayjs(props.maxDate)}
              onChange={(newValue) => props.setMaxDate(new Date(newValue))}
            />
            {/* </Tooltip> */}
          </LocalizationProvider>{" "}
          <Typography id="modal-modal-description" sx={{ mt: 1, mb: 1 }}>
            Playback settings
          </Typography>{" "}
          <TextField
            style={{ width: "60px" }}
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
        </Box>
      </Modal>
    </Fragment>
  );
}
