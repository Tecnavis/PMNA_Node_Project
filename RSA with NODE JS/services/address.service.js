const Address = require('../Model/address');

const createAddress = async (addressData) => {
    if (!addressData) {
        throw new Error('Address data is required');
    }

    // Ensure addressData is an object, not a string
    if (typeof addressData === 'string') {
        try {
            addressData = JSON.parse(addressData);
        } catch (error) {
            throw new Error('Address data must be a valid JSON object');
        }
    }

    console.log('✓ Creating address with data:', addressData);

    try {
        const newAddress = await Address.create(addressData);
        
        if (!newAddress) {
            throw new Error('Failed to create address');
        }

        console.log('✓ Address created successfully:', newAddress._id);
        return newAddress._id;
    } catch (error) {
        console.error('✗ Address creation error:', error);
        throw error;
    }
};

module.exports = {
    createAddress
};