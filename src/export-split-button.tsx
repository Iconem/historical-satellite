import { useState, useRef, Fragment } from "react";

import {
  Button,
  MenuItem,
  ButtonGroup,
  ClickAwayListener,
  Grow,
  Paper,
  Popper,
  MenuList,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";

// -------------------------------------------
// Component: ExportSplitButton
// -------------------------------------------
// Material UI MUI SplitButton
// https://mui.com/material-ui/react-button-group/

const splitButtonOptions = ["All Frames", "Script only"];

function ExportSplitButton(props: any) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(1);

  // const handleClick = () => {
  //   console.info(`You clicked ${splitButtonOptions[selectedIndex]}`);
  // };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number,
    setExportInterval: Function
  ) => {
    setSelectedIndex(index);
    setOpen(false);
    // When export type is set to script only, setInterval to every month to get all frames in batch script
    if (index == 1) {
      setExportInterval(1);
    }
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpen(false);
  };
  const exportFramesMode = selectedIndex == 0;

  return (
    <Fragment>
      <ButtonGroup aria-label="split button" variant="outlined">
        <Button onClick={handleToggle} ref={anchorRef}>
          {splitButtonOptions[selectedIndex]}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="select merge strategy"
          aria-haspopup="menu"
          onClick={() => props.handleClick(exportFramesMode)}
          variant="contained"
          disableElevation
        >
          <FontAwesomeIcon icon={faDownload} />
        </Button>
      </ButtonGroup>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        placement={"top"}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {splitButtonOptions.map((option, index) => (
                    <MenuItem
                      key={option}
                      selected={index === selectedIndex}
                      onClick={(event) =>
                        handleMenuItemClick(
                          event,
                          index,
                          props.setExportInterval
                        )
                      }
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Fragment>
  );
}

export default ExportSplitButton;
