const mongoose = require('mongoose');

const Expense = require('../Model/expense')
const Driver = require('../Model/driver');
const Advance = require('../Model/advance');

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


         // Only update driver's cashInHand if the expense is being approved
        if (status === true) {
            driver.cashInHand -= expense.amount;
            await driver.save();

            if (expense.amount > 0) {
                await distributeReceivedAmount(driver._id, expense.amount, "Driver Total Expense.");
            }
        }

        // Determine the status text based on the boolean status
        const statusText = status ? "approved" : "rejected";

        const updatedExpense = await Expense.findByIdAndUpdate(id, {
            approve: status,
            status: statusText
        }, { new: true });

        return res.status(200).json({
            message: `Expense ${statusText} successfully`,
            success: true,
            expenseData: updatedExpense
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ 
            message: 'Error updating expense status', 
            error: error.message 
        });
    }
}

// controllers/expenseController.js

// All expenses, newest first
exports.getAllExpense = async (req, res) => {
    try {
        const { month, year, search, page = 1, limit = 10, all = false } = req.query;
        const query = {};
          // Convert page and limit to numbers
        const pageNum = all ? 1 : Math.max(1, parseInt(page, 10));
        const limitNum = all ? Number.MAX_SAFE_INTEGER : Math.max(1, parseInt(limit, 10));
        // Month and Year filter
        if (month && year) {
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                return res.status(400).json({ message: 'Invalid month or year' });
            }

            if (monthNum < 1 || monthNum > 12) {
                return res.status(400).json({ message: 'Month must be between 1 and 12' });
            }

            const startDate = new Date(yearNum, monthNum - 1, 1);
            const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const yearNum = parseInt(year);
            if (isNaN(yearNum)) {
                return res.status(400).json({ message: 'Invalid year' });
            }

            const startDate = new Date(yearNum, 0, 1);
            const endDate = new Date(yearNum, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Add search functionality (new)
        if (search && search.trim() !== '') {
            const drivers = await Driver.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');

            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { driver: { $in: drivers.map(d => d._id) } }
            ];
        }
  // Get total count of documents
// Get total count of documents
        const total = await Expense.countDocuments(query);


        const expenses  = await Expense
            .find(query)  // ← Use the query object here
            .sort({ createdAt: -1 })
            .populate('driver')
            .skip(all ? 0 : (pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

          return res.status(200).json({
            message: "Expenses fetched successfully",
            success: true,
            expenseData: expenses,
            pagination: {
                total,
                page: pageNum,
                limit: all ? total : limitNum,
                totalPages: all ? 1 : Math.ceil(total / limitNum),
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
};

exports.getAllPendingExpense = async (req, res) => {
    try {
        const pendingExpense = await Expense
 .find({ 
                approve: { $exists: false },
                status: "pending" 
            })
                        .sort({ createdAt: -1 })           // ← same here
            .populate('driver');

        return res.status(200).json({
            message: "All Pending Expenses are fetched successfully",
            success: true,
            expenseData: pendingExpense
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching pending expenses', error: error.message });
    }
};


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
// ------------------------------------------------
exports.completeSettlement = async (req, res) => {
    try {

        const { driverId } = req.params;
        const { advanceAmount } = req.body;

        // Get driver WITH LOCK to prevent concurrent modifications
        const driver = await Driver.findById(driverId)
            .select('cashInHand')
            .lean();

        if (!driver) {
            return res.status(404).json({ message: "Driver not found", success: false });
        }

        // Get pending expenses
        const pendingExpenses = await Expense.find({
            driver: driverId,
            $or: [
                { approve: { $exists: false } },
                { approve: false }
            ]
        })

        if (pendingExpenses.length === 0) {
            const updatedDriver = await Driver.findByIdAndUpdate(
                driverId,
                {
                    $set: {
                        previousSettlementCompletedDate: driver.settlementCompletedDate,
                        settlementCompletedDate: new Date(),
                        settlement: true
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            return res.status(200).json({
                message: "Settlement marked as completed (no pending expenses)",
                success: true,
                driverData: updatedDriver
            });
        }

        // Calculate total pending amount
        const totalPending = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        let newCashInHand = driver.cashInHand;

        // Handle advance if needed
        if (advanceAmount && advanceAmount > 0) {
            const newAdvance = await Advance.create([{
                driver: driverId,
                addedAdvance: advanceAmount,
                advance: advanceAmount,
                type: 'settlement',
                userModel: 'Driver',
                remark: 'Advance for expense settlement'
            }]);
            newCashInHand += advanceAmount;
        }

        // Verify cash is sufficient
        if (newCashInHand < totalPending) {
            return res.status(400).json({
                message: `Insufficient funds. Need $${totalPending - newCashInHand} more`,
                success: false,
                requiredAmount: totalPending - newCashInHand
            });
        }

        // APPROVE ALL EXPENSES
        const updateResult = await Expense.updateMany(
            {
                driver: driverId,
                $or: [
                    { approve: { $exists: false } },
                    { approve: false }
                ]
            },
            {
                $set: {
                    approve: true,
                    approvedDate: new Date(),
                    status: 'approved'
                }
            },
        );

        // ATOMICALLY update driver's cash and settlement status
        const updatedDriver = await Driver.findOneAndUpdate(
            { _id: driverId }, // Additional check
            {
                $set: {
                    settlement: true,
                    previousSettlementCompletedDate: driver.settlementCompletedDate, // Use the actual date

                    settlementCompletedDate: new Date()
                },
                $inc: {
                    cashInHand: -totalPending,
                    totalExpense: totalPending
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedDriver) {
            return res.status(400).json({
                message: "Cash deduction failed - possible race condition",
                success: false
            });
        }

        if (totalPending > 0 && !advanceAmount) {
            await distributeReceivedAmount(driverId, totalPending, "Driver Completed Expense Settlement.")
        }

        return res.status(200).json({
            message: "Settlement completed successfully",
            success: true,
            driverData: updatedDriver,
            approvedExpensesCount: updateResult.modifiedCount,
            amountDeducted: totalPending
        });

    } catch (error) {
        console.error('Settlement error:', error);
        return res.status(500).json({
            message: 'Error completing settlement',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}