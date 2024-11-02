import { NavLink } from "react-router-dom";


const handleButtonClick = () => {
  mapRef.current.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM
  })
}
export default function Navbar() {
  return (
    <div>
      <nav className="flex justify-between items-center mb-6">

      </nav>
    </div>
  );
}