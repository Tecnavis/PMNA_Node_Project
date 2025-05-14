const Executive = require('../Model/executive');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { StatusCodes } = require('http-status-codes');

exports.createExecutive = asyncErrorHandler(async (req, res) => {
    const data = req.body;

    // Handle file upload
    if (req.file) {
        data.image = req.file.path;
    }

    const newExecutive = await Executive.create(data);

    if (!newExecutive) {
        throw new Error('Failed to create executive');
    }

    newExecutive.password = undefined;

    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: newExecutive
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
    data.password = updateData.password || data.password;
    data.address = updateData.address || data.address;
    data.userName = updateData.userName || data.userName;
    data.image = req.file.path || data.image;

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