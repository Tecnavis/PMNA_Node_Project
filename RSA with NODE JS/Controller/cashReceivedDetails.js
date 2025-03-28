const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')

exports.createReceivedDetails = async (req, res) => {
    try {
        const { balance, amount, currentNetAmount, driver, receivedAmount, remark } = req.body;
        
        if (!amount || !currentNetAmount || !driver || !receivedAmount || !balance) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const associateDriver = await Driver.findByIdAndUpdate(driver)

        //Check if the driver has the positive and in hand amount
        if (associateDriver.cashInHand !== 0 && (associateDriver.cashInHand - amount) <= 0) {
            return res.status(400).json({
                message: 'Failed to update received amount!, Please enter valid amount'
            })
        }
        associateDriver.cashInHand -= amount
        await associateDriver.save()
        // Create new record
        const receivedDetails = new ReceivedDetails({
            amount,
            balance,
            currentNetAmount,
            driver,
            receivedAmount,
            remark
        });

        await receivedDetails.save();
        res.status(201).json({ message: 'Received details created successfully', receivedDetails });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


exports.getAllReceivedDetails = async (req, res) => {
    try {
        const receivedDetails = await ReceivedDetails.find()
            .populate('driver')

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
