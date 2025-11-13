import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapPage = () => {
  const houstonCoords = [30.1, -95.5]; // Center near Houston / Tomball / Woodlands

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <h2 style={{ textAlign: 'center', padding: '10px' }}>
        Map of Houston / Tomball / Woodlands
      </h2>
      <MapContainer
        center={houstonCoords}
        zoom={11}
        style={{ height: '90%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
};

export default MapPage;