import React from "react";
import SignIn from "views/auth/SignIn";
import MainDashboard from "views/admin/default";
import ChangePassword from "views/admin/changepassword";
import Logout from "views/auth/Logout";
import SensorData from "views/admin/sensors";
import SprayingControl from "views/admin/spraying";
import Notifications from "views/admin/notifications/index.jsx";

// Import the icon you prefer
import {
  MdLock,
  MdHome,
  MdExitToApp,
  MdPassword,
  MdDevicesOther,
  MdSensors,
  MdWaterDrop,
  MdNotifications,
  MdSettings,
  MdQueryStats,
} from "react-icons/md";

const routes = [
  // Main Dashboard - Keep only this route active
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
  },

  // IoT Rice Pest Spraying Automation System Routes - Commented out temporarily
  // {
  //   name: "Device Management",
  //   layout: "/admin",
  //   path: "devices",
  //   icon: <MdDevicesOther className="h-6 w-6" />,
  //   component: <DeviceManagement />,
  // },
  {
    name: "Sensor Data",
    layout: "/admin",
    path: "sensors",
    icon: <MdSensors className="h-6 w-6" />,
    component: <SensorData />,
  },
  {
    name: "Spraying Control",
    layout: "/admin",
    path: "spraying",
    icon: <MdWaterDrop className="h-6 w-6" />,
    component: <SprayingControl />,
  },
  {
    name: "Notifications",
    layout: "/admin",
    path: "notifications",
    icon: <MdNotifications className="h-6 w-6" />,
    component: <Notifications />,
    badge: {
      text: "New",
      color: "red",
      condition: true, // This can be connected to the unread notifications count
    }
  },
  // {
  //   name: "Analytics",
  //   layout: "/admin",
  //   path: "analytics",
  //   icon: <MdQueryStats className="h-6 w-6" />,
  //   component: <Analytics />,
  // },
  // {
  //   name: "System Settings",
  //   layout: "/admin",
  //   path: "settings",
  //   icon: <MdSettings className="h-6 w-6" />,
  //   component: <Settings />,
  // },

  // Authentication and User Management Routes
  {
    name: "Sign In",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
  },
  {
    name: "Change Password",
    layout: "/admin",
    path: "change-password",
    icon: <MdPassword className="h-6 w-6" />,
    component: <ChangePassword />,
  },
  {
    name: "Logout",
    layout: "/admin",
    path: "logout",
    icon: <MdExitToApp className="h-6 w-6" />,
    component: <Logout />,
  },
];

export default routes;
