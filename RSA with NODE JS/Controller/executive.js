const Executive = require('../Model/executive');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ✅ Add this import

exports.createExecutive = asyncErrorHandler(async (req, res) => {
    const data = req.body;

    // Handle file upload
    if (req.file) {
        data.image = req.file.path;
    }

    // 🔥 IMPORTANT: Don't modify the data object directly
    // Create a new object with hashed password
    const executiveData = {
        name: data.name,
        email: data.email,
        address: data.address,
        phone: data.phone,
        userName: data.userName,
        image: data.image,
        cashInHand: data.cashInHand || 0,
        rewardPoints: data.rewardPoints || 0,
        // Password will be hashed by the pre-save hook in the model
        password: data.password
    };

    // Create the executive - the pre-save hook will hash the password
    const newExecutive = await Executive.create(executiveData);

    if (!newExecutive) {
        throw new Error('Failed to create executive');
    }

    newExecutive.password = undefined;

    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: newExecutive
    });
});

exports.loginExecutive = asyncErrorHandler(async (req, res) => {
    const { userName, password } = req.body;

    // 1. Check if username and password are provided
    if (!userName || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Please provide username and password'
        });
    }

    // 2. Find executive - explicitly select password field
    const executive = await Executive.findOne({ userName }).select('+password');

    if (!executive) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    // 3. Debug logging
    console.log('Provided password:', password);
    console.log('Stored hash:', executive.password);
    console.log('User found:', executive.userName);

    // 4. Check if password matches
    const isPasswordMatched = await executive.comparePassword(password);

    if (!isPasswordMatched) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid credentials - password mismatch'
        });
    }

    // 5. Create Token
    const token = jwt.sign(
        { 
            id: executive._id,
            role: 'executive'
        }, 
        process.env.JWT_SECRET || 'secret_key', 
        { expiresIn: '24h' }
    );

    // 6. Remove password from output
    executive.password = undefined;

    return res.status(StatusCodes.OK).json({
        success: true,
        token,
        data: executive
    });
});

exports.getAllMarketingExecutive = asyncErrorHandler(async (req, res) => {
    let {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        search,
        projectionFields,
        disablePagination
    } = req.query;

    if (search) {
        search = search.trim();
    }

    let projection = null;
    if (projectionFields) {
        projection = projectionFields.split(',').join(' ');
    }

    const query = search
        ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        }
        : {};

    const total = await Executive.countDocuments(query);

    let execQuery = Executive.find(query, projection).select('-__v').sort(sortBy);

    // Only apply limit & skip if pagination is not disabled
    if (!disablePagination || disablePagination === 'false') {
        execQuery = execQuery
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
    }

    const executives = await execQuery;

    return res.status(StatusCodes.OK).json({
        success: true,
        data: executives,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: disablePagination === 'true' ? 1 : Math.ceil(total / limit),
            disabled: disablePagination === 'true'
        },
    });
});

exports.getExecutiveById = asyncErrorHandler(async (req, res) => {
    let { id } = req.params;

    const executive = await Executive.findById(id)

    return res.status(StatusCodes.OK).json({
        success: true,
        data: executive,
    });
})

exports.udpateExecutiveDetails = asyncErrorHandler(async (req, res) => {
    const updateData = req.body;
    const { id } = req.params;

    const data = await Executive.findById(id);

    data.name = updateData.name || data.name;
    data.email = updateData.email || data.email;
    data.phone = updateData.phone || data.phone;
    data.address = updateData.address || data.address;
    data.userName = updateData.userName || data.userName;
    data.image = req.file?.path || data.image;

    // 🔥 Hash password if provided
    if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(updateData.password, salt);
    }

    await data.save()

    return res.status(StatusCodes.OK).json({
        success: true,
        data,
    });
});

exports.deleteExecutive = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    const data = await Executive.findByIdAndDelete(id);

    return res.status(StatusCodes.OK).json({
        success: true,
        data,
    });
})
// Add this temporary endpoint to fix existing users
exports.fixPasswords = asyncErrorHandler(async (req, res) => {
    try {
        const executives = await Executive.find();
        let updatedCount = 0;

        for (const executive of executives) {
            // Check if password is plain text
            if (executive.password && !executive.password.startsWith('$2')) {
                // Hash the password
                const salt = await bcrypt.genSalt(10);
                executive.password = await bcrypt.hash(executive.password, salt);
                await executive.save();
                updatedCount++;
                console.log(`Fixed password for: ${executive.userName}`);
            }
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            message: `Fixed ${updatedCount} passwords`
        });
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
});