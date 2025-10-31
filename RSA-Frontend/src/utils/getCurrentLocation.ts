type LocationData = {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | string;
    altitudeAccuracy: number | string;
    heading: number | string;
    speed: number | string;
    timestamp: string;
};

function getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject("Geolocation is not supported by this browser.");
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = position.coords;

                const locationData: LocationData = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    altitude: coords.altitude ?? "Not available",
                    altitudeAccuracy: coords.altitudeAccuracy ?? "Not available",
                    heading: coords.heading ?? "Not available",
                    speed: coords.speed ?? "Not available",
                    timestamp: new Date(position.timestamp).toLocaleString(),
                };

                resolve(locationData);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
}

export default getCurrentLocation;
