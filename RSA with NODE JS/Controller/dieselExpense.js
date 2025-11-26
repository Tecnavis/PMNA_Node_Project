const DieselExpense = require('../Model/dieselExpense');
const PetrolPump = require('../Model/petrol'); // Make sure to import

// In your createExpense controller
exports.createExpense = async (req, res) => {
    try {
        const { expenseId, driver, description, amount, vehicleNumber, expenceKm, petrolPump } = req.body;
        
        if (!expenseId || !driver || !description || !amount || !expenceKm || !vehicleNumber || !petrolPump) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // FIXED: Proper file validation
        if (!req.files || req.files.length < 2 || req.files.length > 3) {
            return res.status(400).json({ message: 'Upload 2 to 3 images only' });
        }

        const images = req.files.map((img) => img.filename);

        const newExpense = new DieselExpense({
            expenseId,
            driver,
            petrolPump,
            description,
            amount,
            images,
            vehicleNumber,
            expenceKm
        });

        await newExpense.save();
        
        // Populate petrol pump details in response
        await newExpense.populate('petrolPump');
        
        return res.status(201).json({ 
            message: 'Expense created successfully', 
            data: newExpense 
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// FIX THIS TOO in your updateExpense function:
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // FIXED: Proper file validation for update
        if (req.files) {
            if (req.files.length < 2 || req.files.length > 3) {
                return res.status(400).json({ message: 'Upload 2 to 3 images only' });
            }
            const images = req.files.map((img) => img.filename);
            updates.images = images;
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

// Update getAllExpenses to populate petrolPump
exports.getAllExpenses = async (req, res) => {
    try {
        const { month, year, vehicleNumber, page = 1, limit = 10, all = false } = req.query;

        const query = {};

        // Filter by month and year
        if (month && year) {
            const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
            const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
            query.createdAt = { $gte: startDate, $lt: endDate };
        }
        // Filter by vehicle number
        if (vehicleNumber) {
            query.vehicleNumber = vehicleNumber;
        }

        let expenses;
        let totalCount;
        
        if (all === 'true') {
            expenses = await DieselExpense.find({ 
                ...query,
                _id: { $exists: true, $ne: null }
            })
                .sort({ createdAt: -1 })
                .populate('driver')
                .populate('petrolPump') // Add this line
                .lean();
            
            expenses = expenses.filter(expense => 
                expense && 
                expense._id && 
                typeof expense._id === 'object' &&
                expense._id.toString
            );
            totalCount = expenses.length;
        } else {
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const skip = (pageNumber - 1) * limitNumber;
            
            totalCount = await DieselExpense.countDocuments({ 
                ...query,
                _id: { $exists: true, $ne: null }
            });
            expenses = await DieselExpense.find({ 
                ...query,
                _id: { $exists: true, $ne: null }
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .populate('driver')
                .populate('petrolPump') // Add this line
                .lean();
            
            expenses = expenses.filter(expense => 
                expense && 
                expense._id && 
                typeof expense._id === 'object' &&
                expense._id.toString
            );
        }

        res.status(200).json({ 
            data: expenses,
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: all === 'true' ? 1 : Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.error('Error fetching diesel expenses:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Update getExpenseById to populate petrolPump
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await DieselExpense.findById(id)
            .populate('driver')
            .populate('petrolPump'); // Add this line
            
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
// Delete diesel expense
exports.deleteExpensesByDriver = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await DieselExpense.findById(id);
        if (!expense) {
            return res.status(404).json({ message: 'Diesel expense not found' });
        }

        // Delete images from Cloudinary if they exist
        if (expense.images && expense.images.length > 0) {
            try {
                for (const imageUrl of expense.images) {
                    // Extract public_id from Cloudinary URL
                    const publicId = imageUrl.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`diesel-expenses/${publicId}`);
                }
                console.log('All images deleted from Cloudinary for expense:', id);
            } catch (error) {
                console.error('Error deleting images from Cloudinary:', error);
                // Continue with deletion even if image deletion fails
            }
        }

        await DieselExpense.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Diesel expense deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
