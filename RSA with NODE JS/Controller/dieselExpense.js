const DieselExpense = require('../Model/dieselExpense');

// Create a new diesel expense
exports.createExpense = async (req, res) => {
    try {
        const { expenseId, driver, description, amount } = req.body;

        if (!expenseId || !driver || !description || !amount) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (!req.files && req.files < 2 || req.files > 3) {
            return res.status(400).json({ message: 'Upload 2 to 3 images only' });
        }

        const images = req.files.map((img) => img.filename);

        const newExpense = new DieselExpense({
            expenseId,
            driver,
            description,
            amount,
            images
        });

        await newExpense.save();
        return res.status(201).json({ message: 'Expense created successfully', data: newExpense });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update an existing diesel expense
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (req.files && req.files < 2 || req.files > 3) {
            const images = req.files.map((img) => img.fileName);
            updates.images = images
        }

        const updatedExpense = await DieselExpense.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!updatedExpense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.status(200).json({ message: 'Expense updated', data: updatedExpense });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Approve or disapprove an expense
exports.toggleApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const expense = await DieselExpense.findById(id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        expense.status = status || expense.status;
        await expense.save();

        return res.status(200).json({ message: `Expense ${expense.status ? 'approved' : 'disapproved'}`, data: expense });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all expenses - for Admin
exports.getAllExpenses = async (req, res) => {
    try {
        const expenses = await DieselExpense.find().populate('driver');
        res.status(200).json({ data: expenses });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get single expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await DieselExpense.findById(id).populate('driver');
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        res.status(200).json({ data: expense });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all expenses by a specific driver
exports.getExpensesByDriver = async (req, res) => {
    try {
        const { driverId } = req.params;

        const expenses = await DieselExpense.find({ driver: driverId }).populate('driver');
        res.status(200).json({ data: expenses });
        
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
