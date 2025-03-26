//Generate showroom link
exports.generateShowRoomLink = (showroom) => {
    // const baseUrl = `https://rsapmna-de966.web.app/showrooms/showroom/showroomDetails`; // Your actual base URL
    const baseUrl = `http://localhost:5173/showroom/showroom-details`; // Your actual base URL

    const queryParams = new URLSearchParams({
        id: showroom._id,
        name: showroom.name,
        location: showroom.location,
        image: showroom.image,
        helpline: showroom.helpline,
        phone: showroom.phone,
        state: showroom.state,
        district: showroom.district,
    }).toString();

    const link = `${baseUrl}?${queryParams}`;
    return link
};