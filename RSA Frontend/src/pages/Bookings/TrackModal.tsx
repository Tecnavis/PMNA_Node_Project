import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import "./TrackModal.css";
import axios from "axios";

interface TrackModalProps {
  open: boolean;
  onClose: () => void;
  itemId?: string; // Accept itemId as an optional prop
}

const statuses = [
  "Booking Added",
  "called to customer",
  "Order Received",
  "On the way to pickup location",
  "Vehicle Picked",
  "Vehicle Confirmed",
  "To DropOff Location",
  "On the way to dropoff location",
  "Vehicle Dropped"
];

const TrackModal: React.FC<TrackModalProps> = ({ open, onClose, itemId }) => {
  const [statusIndex, setStatusIndex] = useState<number>(0);

  // Fetch booking status when modal opens and itemId is available
  useEffect(() => {
    if (open && itemId) {
      // Adjust the URL according to your backend endpoint
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/booking/${itemId}`)
        .then((res) => {
          const booking = res.data;
          const bookingStatus: string = booking.status; // Expect status is one of statuses
          const idx = statuses.indexOf(bookingStatus);
          if (idx >= 0) {
            setStatusIndex(idx);
          } else {
            setStatusIndex(0); // Default to first status if not found
          }
        })
        .catch((error) => {
          console.error("Error fetching booking status:", error);
        });
    }
  }, [open, itemId]);

  const sliderUpdate = (range: any) => {
    // noUiSlider returns an array of strings; convert the first value to number
    setStatusIndex(parseInt(range[0]));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="flex justify-between items-center">
        <span className="text-xl font-bold">Track Booking Status</span>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="p-4 flex flex-col items-center">
        {/* Slider */}
        <div className="w-full px-4">
          <Nouislider
            range={{ min: 0, max: statuses.length - 1 }}
            start={[statusIndex]}
            step={1}
            connect={[true, false]} // Connects the bar only up to the selected status
            onSlide={sliderUpdate}
            tooltips={[
              {
                to: (value: number): string => statuses[Math.round(value)],
                from: (value: string): number => statuses.indexOf(value)
              }
            ]}
            pips={{
              mode: "steps",
              density: -1,
              format: {
                to: (value: number) => "",
              },
            }}
          />
        </div>
        {/* Display Current Status */}
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold">Current Status:</h3>
          <p className="text-xl text-blue-600 mt-2">{statuses[statusIndex]}</p>
        </div>
        {/* Close Button */}
        <div className="mt-4">
          <Button variant="outlined" color="error" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackModal;
