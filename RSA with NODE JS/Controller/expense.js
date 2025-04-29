const Expense = require('../Model/expense')
const Driver = require('../Model/driver');
const { distributeReceivedAmount } = require('../services/bookingService');

exports.createExpense = async (req, res) => {
    try {

        const { amount, type, description } = req.body;
        const { id } = req.params;

        if (!amount || !type || !description || !id) {
            return res.status(400).json({
                message: "All fields are required!",
                success: false
            })
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Image is required!",
                success: false
            });
        }

        const expense = new Expense({
            amount,
            type,
            description,
            driver: id,
            image: req.file.filename
        });

        await expense.save();

        return res.status(201).json({
            message: "Expense created successfully",
            success: true,
            expenseData: expense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error creating expense', error: error.message });
    }
}

exports.udpateExpense = async (req, res) => {
    try {

        const updatedExpenseData = req.body;
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: "id is required!",
                success: false
            })
        }

        const expense = await Expense.findById(id).populate('driver')

        const updatedExpense = await Expense.findByIdAndUpdate(id, {
            updatedExpenseData,
            image: req.file ? req.file.filename : expense.image
        }, { new: true });

        return res.status(201).json({
            message: "Expense created successfully",
            success: true,
            expenseData: updatedExpense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error updating expense', error: error.message });
    }
}

exports.approve = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id) {
            return res.status(400).json({
                message: "id is required!",
                success: false
            })
        }

        const expense = await Expense.findById(id)

        const driver = await Driver.findById(expense.driver)

        
        driver.cashInHand -= expense.amount
        await driver.save()
        
        if (expense.amount > 0) {
            await distributeReceivedAmount(driver._id, expense.amount, "Driver Total Expense.")
        }
        const updatedExpense = await Expense.findByIdAndUpdate(id, {
            approve: status
        }, { new: true });

        return res.status(201).json({
            message: "Expense created successfully",
            success: true,
            expenseData: updatedExpense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error approving expense', error: error.message });
    }
}

exports.getAllExpense = async (req, res) => {
    try {
        const expense = await Expense.find().populate('driver')

        return res.status(201).json({
            message: "All Expenses are fetched successfully",
            success: true,
            expenseData: expense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
}

exports.getAllPendingExpense = async (req, res) => {
    try {
        const pendingExpense = await Expense.find({ approve: { $exists: false } }).populate('driver');

        return res.status(201).json({
            message: "All Expenses are fetched successfully",
            success: true,
            expenseData: pendingExpense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
}

exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findById(id).populate('drvier')

        return res.status(201).json({
            message: "Expense fetched successfully",
            success: true,
            expensData: expense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
}

exports.getAllExpenseForDriver = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.find({ driver: id }).populate('driver');

        return res.status(201).json({
            message: "Expense fetched successfully",
            success: true,
            expensData: expense
        })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
}