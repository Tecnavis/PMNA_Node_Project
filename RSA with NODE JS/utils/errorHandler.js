export const handleError = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    
    // Differentiate between validation errors and server errors
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    
    res.status(statusCode).json({
        success: false,
        message: `Error while processing ${context} request`,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
};