import { axiosInstance as axios } from "../config/axiosConfig";

export async function getDistance(currentLat: string, currentLng: string, pickupLocation: any) {

    const response = await axios.post('https://api.olamaps.io/routing/v1/directions', null, {
        params: {
            origin: `${currentLat},${currentLng}`,
            destination: `${pickupLocation.lat},${pickupLocation.lng}`,
            api_key: import.meta.env.VITE_REACT_APP_API_KEY,
        },
        headers: {
            'X-Request-Id': `${Math.random().toString(36).substring(2, 6)}-${Date.now()}`
        },
    });

    // Log the API response to inspect the structure
    console.log(`API Response for driver :`, response.data);

    const routes = response.data.routes;
    let distance = 'Distance not available';

    if (routes?.length > 0) {
        console.log(`Routes for driver :`, routes); // Log routes to inspect its structure

        if (routes[0]?.legs?.length > 0 && routes[0].legs[0]?.readable_distance) {
            distance = routes[0].legs[0].readable_distance; // Use readable_distance
            console.log(`Driver  pickup distance: ${distance}`);
        } else {
            console.error(`No valid leg data found in the response for driver `);
        }
    } else {
        console.error(`No valid routes found in the response for driver `);
    }
    return `${distance}`
}