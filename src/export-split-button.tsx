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
import { useLocalStorage } from "./utilities";

// -------------------------------------------
// Component: ExportSplitButton
// -------------------------------------------
// Material UI MUI SplitButton
// https://mui.com/material-ui/react-button-group/

const splitButtonOptions = ["All Frames", "Script only", "Composited"];
export enum ExportButtonOptions {
  ALL_FRAMES= "All Frames",
  SCRIPT_ONLY = "Script only",
  COMPOSITED = "Composited",
}


export function ExportSplitButton(props: any) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  // const [exportSelectedIndex, setExportSelectedIndex] = useState(1);
  const [exportSelectedIndex, setExportSelectedIndex] = useLocalStorage(
    "export_buttonexportSelectedIndex",
    1
  );

  // const handleClick = () => {
  //   console.info(`You clicked ${splitButtonOptions[exportSelectedIndex]}`);
  // };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number,
    setExportInterval: Function
  ) => {
    setExportSelectedIndex(index);
    setOpen(false);
    // When export type is set to script only, setInterval to every month to get all frames in batch script
    // if (index == 1) {
    //   setExportInterval(1);
    // }
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
  // const exportFramesMode = exportSelectedIndex == 0;
  // const a = Object.keys(ExportButtonOptions)[ exportSelectedIndex ]
  // const b = ExportButtonOptions[exportSelectedIndex as (typeof ExportButtonOptions)]
  const exportFramesMode = Object.values(ExportButtonOptions)[exportSelectedIndex];
  // const index: number = Object.keys(LookingForEnum).indexOf('Casual'); // 1


  return (
    <Fragment>
      <ButtonGroup aria-label="split button" variant="outlined">
        <Button onClick={handleToggle} ref={anchorRef}>
          {splitButtonOptions[exportSelectedIndex]}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="select merge strategy"
          aria-haspopup="menu"
          onClick={() => props.handleExportButtonClick(exportFramesMode)}
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
        sx={{zIndex: 10}}
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
                      // disabled={option == 'Composited'}
                      selected={index === exportSelectedIndex}
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

// export default ExportSplitButton;
