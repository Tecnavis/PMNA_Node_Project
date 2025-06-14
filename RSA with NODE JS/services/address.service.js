const Address = require('../Model/address');

const createAddress = async (addressData) => {
    if (!addressData) {
        throw new Error('Address data is required');
    }

    const newAddress = await Address.create(addressData);
    
    if (!newAddress) {
        throw new Error('Failed to create address');
    }

    return newAddress._id;
};

module.exports = {
    createAddress
};