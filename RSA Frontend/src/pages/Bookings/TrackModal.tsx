import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import "./TrackModal.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
  "Vehicle Dropped",
  "Rejected"
];

// Map each status to a route
const statusRoutes: { [key: string]: string } = {
  "Booking Added": "/appBooking",
  "called to customer": "/appBooking",
  "Order Received": "/pickupLocation",
  "On the way to pickup location": "/pickupLocation",
  "Vehicle Picked": "/onTheWayDropoff",
  "Vehicle Confirmed": "/onTheWayDropoff",
  "To DropOff Location": "/onTheWayDropoff",
  "On the way to dropoff location": "/onTheWayDropoff",
  "Vehicle Dropped": "/paymentSettlement"
};

const TrackModal: React.FC<TrackModalProps> = ({ open, onClose, itemId }) => {
  const [statusIndex, setStatusIndex] = useState<number>(0);
  const navigate = useNavigate();

  // Fetch booking status when modal opens and itemId is available
  useEffect(() => {
    if (open && itemId) {
      axios
        .get(`${import.meta.env.VITE_BACKEND_URL}/booking/${itemId}`)
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

  // Navigate based on current status
  const handleProceed = () => {
    console.log("proceed")
    const currentStatus = statuses[statusIndex];
    const route = statusRoutes[currentStatus];
    console.log("route",route)

    if (route) {
        navigate(`${route}?itemId=${itemId}`); // Pass itemId as a query parameter
    } else {
      console.error("No route mapped for status:", currentStatus);
    }
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
            behaviour="none" // Prevents dragging

          />
        </div>
        {/* Display Current Status */}
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold">Current Status:</h3>
          <p className="text-xl text-blue-600 mt-2">{statuses[statusIndex]}</p>
        </div>
        <Button 
  variant="outlined" 
  sx={{
    borderColor: "red",
    marginTop:"10px",
    color: "red",
    backgroundColor: "white",
    "&:hover": {
      backgroundColor: "red",
      color: "white",
    }
  }} 
  onClick={handleProceed}
>
  Proceed to {statusRoutes[statuses[statusIndex]] ? statuses[statusIndex] : "Next"}
</Button>

       
      </DialogContent>
    </Dialog>
  );
};

export default TrackModal;
