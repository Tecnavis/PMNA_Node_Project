const { validationResult } = require("express-validator")

exports.validateHandler = (
    req, res, next
) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: "Validation error."
        });
    } else next();
}