import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const MyMapComponent = ({ baseLocation, onMapClick }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY', // Replace with your actual Google Maps API key
    });

    const [map, setMap] = useState(null);
    const [marker, setMarker] = useState(null);

    useEffect(() => {
        if (baseLocation) {
            setMarker(baseLocation);
        }
    }, [baseLocation]);

    const handleMapClick = (event) => {
        const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        };
        setMarker(location);
        onMapClick(location);
    };

    return (
        isLoaded ? (
            <div id="map" style={{ height: '400px', width: '100%' }}>
                <GoogleMap
                    mapContainerStyle={{ height: '100%', width: '100%' }}
                    center={marker || { lat: 10.8505, lng: 76.2711 }}
                    zoom={8}
                    onLoad={(map) => setMap(map)}
                    onClick={handleMapClick}
                >
                    {marker && (
                        <Marker
                            position={marker}
                            icon={{
                                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                scaledSize: new window.google.maps.Size(40, 40),
                            }}
                        />
                    )}
                </GoogleMap>
            </div>
        ) : <></>
    );
};

export default MyMapComponent;
