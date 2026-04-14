import React from "react";
import { Grid, Button } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function TicketFilter({
  selectedDate,
  setSelectedDate,
  onSearch,
  onClear,
}) {
  return (
    <Grid container justifyContent="flex-end" alignItems="center" spacing={2}>
      <Grid size="auto">
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Created Date"
            format="DD-MMM-YYYY"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            slotProps={{
              textField: {
                size: "small",
                sx: { width: 190 },
              },
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid size="auto">
        <Button
          variant="contained"
          size="small"
          color="primary"
          sx={{ px: 2 }}
          onClick={onSearch}
        >
          Search
        </Button>
        <Button
          variant="contained"
          size="small"
          color="error"
          sx={{ px: 2,ml:2 }}
          onClick={onClear}
        >
          Clear
        </Button>
      </Grid>
    </Grid>
  );
}
