import { useState, useRef, useEffect, Fragment } from "react";

import { Slider, Button, Box, Tooltip } from "@mui/material";
import { addMonths, subMonths, isBefore, isAfter } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faForward,
  faPlay,
  faBackward,
  faForwardStep,
  faBackwardStep,
  faCircleStop,
} from "@fortawesome/free-solid-svg-icons";

// -------------------------------------------
// Component: PlayableSlider
// -------------------------------------------
// Component which is a playable slider, a Slider with PlayableControls
function PlayableSlider(props: any) {
  return (
    <>
      <Box sx={{ width: "50%", margin: "auto" }}>
        <Slider
          value={props.value}
          min={props.min}
          step={1}
          max={props.max}
          marks={props.marks}
          //
          onChange={props.onChange}
          valueLabelFormat={props.valueLabelFormat}
          getAriaValueText={props.valueLabelFormat}
          //
          size="small"
          stlye={{ width: "50%" }}
          valueLabelDisplay="auto"
        />
      </Box>
      <>
        <PlayableControls
          // setTimelineDate should be replaced by setSliderValue or similar
          setTimelineDate={props.setTimelineDate}
          playbackSpeedFPS={props.playbackSpeedFPS}
          minDate={props.minDate}
          maxDate={props.maxDate}
        />
      </>
    </>
  );
}

// -------------------------------------------
// Component: PlayableControls
// -------------------------------------------
// Component for PlayableControls, based on this S/O post + customized
// https://stackoverflow.com/questions/66983676/control-the-material-ui-slider-with-a-play-and-stop-buttons-in-react-js
// TODO setTimelineDate should be replaced by setSliderValue or similar
function PlayableControls(props: any) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const directionRef = useRef<"back" | "forward">("back");
  const intervalIdRef = useRef(0);

  const handleBack = () => {
    directionRef.current = "back";
    if (!isRunning) {
      setIsRunning(true);
    }
  };
  const handleNext = () => {
    directionRef.current = "forward";
    if (!isRunning) {
      setIsRunning(true);
    }
  };
  const handleBackStep = () => {
    // setTimelineDate should be replaced by setSliderValue or similar
    props.setTimelineDate(function (v: Date) {
      if (isAfter(subMonths(new Date(v), 1), props.minDate)) {
        return subMonths(new Date(v), 1);
      }
    });
  };
  const handleNextStep = () => {
    // setTimelineDate should be replaced by setSliderValue or similar
    props.setTimelineDate(function (v: Date) {
      if (isBefore(addMonths(new Date(v), 2), props.maxDate)) {
        return addMonths(new Date(v), 1);
      }
    });
  };
  const handleStop = () => {
    setIsRunning((r) => !r);
  };

  useEffect(() => {
    if (isRunning) {
      intervalIdRef.current = setInterval(() => {
        if (directionRef.current === "forward") {
          // setValue((v) => ++v);
          // setTimelineDate should be replaced by setSliderValue or similar
          props.setTimelineDate(function (v: Date) {
            if (isBefore(v, props.maxDate)) {
              return addMonths(v, 1);
            } else {
              setIsRunning(false);
              return v;
            }
          });
        }
        if (directionRef.current === "back") {
          // setValue((v) => --v);
          // setTimelineDate should be replaced by setSliderValue or similar
          props.setTimelineDate(function (v: Date) {
            if (isAfter(v, props.minDate)) {
              return subMonths(v, 1);
            } else {
              setIsRunning(false);
              return v;
            }
          });
        }
      }, 1000 / props.playbackSpeedFPS);
    }

    return () => clearInterval(intervalIdRef.current);
  }, [isRunning]);

  return (
    <>
      <Button onClick={handleBackStep}>
        <Tooltip title={"Previous Month"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faBackwardStep} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleBack}>
        <Tooltip title={"Play Back Animation"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faBackward} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleStop}>
        <Tooltip title={"Play/Pause Animation"}>
          <strong>
            {" "}
            {isRunning ? (
              <FontAwesomeIcon icon={faCircleStop} />
            ) : directionRef.current == "forward" ? (
              <FontAwesomeIcon icon={faPlay} />
            ) : (
              <FontAwesomeIcon icon={faPlay} transform="flip-h" />
            )}{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleNext}>
        <Tooltip title={"Play Animation"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faForward} />{" "}
          </strong>
        </Tooltip>
      </Button>
      <Button onClick={handleNextStep}>
        <Tooltip title={"Next Month"}>
          <strong>
            {" "}
            <FontAwesomeIcon icon={faForwardStep} />{" "}
          </strong>
        </Tooltip>
      </Button>
    </>
  );
}

export default PlayableSlider;
