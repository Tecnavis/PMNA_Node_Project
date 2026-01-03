// C:\Users\91974\Desktop\PMNA_Node_Project\PMNA_Node_Project\RSA Frontend\src\services\olaMapApi.ts
import { axiosInstance as axios } from "../config/axiosConfig";

export async function getDistance(currentLat: string, currentLng: string, pickupLocation: any) {
    const response = await axios.post('/olamaps-proxy', null, {  // Use relative URL to your proxy
        params: {
            origin: `${currentLat},${currentLng}`,
            destination: `${pickupLocation.lat},${pickupLocation.lng}`,
            api_key: import.meta.env.VITE_REACT_APP_API_KEY,
        },
        headers: {
            'X-Request-Id': `${Math.random().toString(36).substring(2, 6)}-${Date.now()}`
        },
    });

    const routes = response.data.routes;
    let distance = 'Distance not available';

    if (routes?.length > 0) {

        if (routes[0]?.legs?.length > 0 && routes[0].legs[0]?.readable_distance) {
            distance = routes[0].legs[0].readable_distance; // Use readable_distance
        } else {
            console.error(`No valid leg data found in the response for driver `);
        }
    } else {
        console.error(`No valid routes found in the response for driver `);
    }
    return `${distance}`
}