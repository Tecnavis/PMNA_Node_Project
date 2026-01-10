// StaffWorkManager.tsx
import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import StaffWorkTemplate from './StaffWorkTemplate';
import StaffDailyCheck from './StaffDailyCheck';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`staff-work-tabpanel-${index}`}
      aria-labelledby={`staff-work-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const StaffWorkManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Staff Work Management
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Assign Permanent Tasks" />
          <Tab label="Daily Task Check" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <StaffWorkTemplate />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <StaffDailyCheck />
      </TabPanel>
    </Box>
  );
};

export default StaffWorkManager;