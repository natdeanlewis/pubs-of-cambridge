import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";

import 'mapbox-gl/dist/mapbox-gl.css';

const App = () => {
  return (
    <div className="h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
};
export default App
