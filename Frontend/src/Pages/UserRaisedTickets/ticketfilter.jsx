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
    <Grid container spacing={2} justifyContent="flex-end">
      <Grid size={{ xs: 12, md: "auto" }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Created Date"
            format="DD-MMM-YYYY"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            slotProps={{
              textField: {
                size: "small",
                sx: { width: "100%" },
              },
            }}
          />
        </LocalizationProvider>
      </Grid>

      <Grid
        size={{ xs: 12, md: "auto" }}
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Button variant="contained" color="primary" onClick={onSearch}>
          Search
        </Button>
        <Button
          variant="contained"
          color="error"
          sx={{ ml: 1 }}
          onClick={onClear}
        >
          Clear
        </Button>
      </Grid>
    </Grid>
  );
}
