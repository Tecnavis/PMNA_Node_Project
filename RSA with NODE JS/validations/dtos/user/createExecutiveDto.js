const { body, check, param } = require("express-validator");
const { allowedImageMimeTypes, maxFileSize } = require("../../../constants/fileConstants");
const Executive = require('../../../Model/executive');

const CreateExecutiveSchema = [
    // Email validation
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email")
        .normalizeEmail()
        .custom(async (value) => {
            const existingUser = await Executive.findOne({ email: value });
            if (existingUser) {
                throw new Error("Email already in use");
            }
        }),

    // Name validation
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2-100 characters"),
    // Address validation
    body("address")
        .trim()
        .notEmpty().withMessage("Address is required")
        .isLength({ max: 500 }).withMessage("Name must be between 500 characters"),

    // Phone validation
    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .isMobilePhone("any").withMessage("Please provide a valid phone number")
        .isLength({ min: 10 }).withMessage("Phone number must be 10 digits")
        .custom(async (value) => {
            const existingUser = await Executive.findOne({ phone: value });
            if (existingUser) {
                throw new Error("Phone number already in use");
            }
        }),

    // Username validation
    body("userName")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 4, max: 30 }).withMessage("Username must be 4-30 characters")
        .custom(async (value) => {
            const existingUser = await Executive.findOne({ userName: value });
            if (existingUser) {
                throw new Error("Username already in use");
            }
        }),

    // Password validation
    body("password")
        .trim()
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    // .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    // .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    // .matches(/\d/).withMessage("Password must contain at least one number"),

    // File validation
    check("image")
        .custom((value, { req }) => {
            if (!req.file) {
                throw new Error("Profile image is required");
            }
            return true;
        })
        .custom((value, { req }) => {
            if (req.file) {
                if (!allowedImageMimeTypes.includes(req.file.mimetype)) {
                    throw new Error(`Invalid file type. Allowed types: ${allowedImageMimeTypes.join(", ")}`);
                }
                if (req.file.size > maxFileSize) {
                    throw new Error(`File too large. Max size: ${maxFileSize / (1024 * 1024)}MB`);
                }
            }
            return true;
        })
];

const getExecutiveByIdSchema = [
    param('id')
    .isLength({ min: 3, max: 50 })
    .withMessage('Slug must be 3-50 characters long')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
]



module.exports = { CreateExecutiveSchema, getExecutiveByIdSchema };