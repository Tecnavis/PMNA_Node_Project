const axios = require('axios');
const Booking = require('../Model/booking');
const LoggerFactory = require('../utils/logger/LoggerFactory');

class ExternalApiService {
    constructor() {
        this.baseURL = 'https://pmnacranes.pravasisit.com';
        this.apiEndpoint = '/update-status-live';
        this.allowedStatuses = [
            'assigned', 'running', 'completed', 'Booking Added', 'called to customer',
            'Order Received', 'On the way to pickup location', 'Vehicle Picked',
            'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped',
            'Order Completed', 'Cancelled', 'Rejected'
        ];
        
        // Create logger instance
        this.logger = LoggerFactory.createChildLogger({
            service: 'ExternalApiService'
        });
    }

    /**
     * Update status for a single booking
     * @param {string} fileNumber - The file number of the booking
     * @param {string} status - The status to update
     * @returns {Promise<Object>} API response
     */
    async updateStatusForBooking(fileNumber, status) {
        try {
            // Validate status
            if (!this.allowedStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Allowed statuses: ${this.allowedStatuses.join(', ')}`);
            }

            if (!fileNumber || fileNumber.trim() === '') {
                throw new Error('File number is required');
            }

            const payload = {
                filenumber: fileNumber.trim(),
                status: status
            };

            this.logger.info({
                fileNumber,
                status,
                endpoint: this.apiEndpoint
            }, 'Attempting to update booking status via external API');

            const response = await axios.post(
                `${this.baseURL}${this.apiEndpoint}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            this.logger.info({
                fileNumber,
                status,
                responseStatus: response.status,
                responseData: response.data
            }, 'Successfully updated booking status via external API');

            return {
                success: true,
                data: response.data,
                statusCode: response.status
            };

        } catch (error) {
            this.logger.error({
                fileNumber,
                status,
                errorMessage: error.message,
                errorCode: error.response?.status,
                errorData: error.response?.data
            }, 'Failed to update booking status via external API');

            // Return structured error
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500,
                data: error.response?.data
            };
        }
    }

    /**
     * Update status for all WhatsApp bookings with a specific status
     * @param {string} status - The status to update
     * @param {Object} filter - Additional filter criteria
     * @returns {Promise<Object>} Results of the bulk update
     */
    async updateStatusForAllWhatsAppBookings(status, filter = {}) {
        try {
            if (!this.allowedStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Allowed statuses: ${this.allowedStatuses.join(', ')}`);
            }

            // Find all WhatsApp bookings
            const query = {
                isWhatsappBooking: true,
                ...filter
            };

            this.logger.info({
                status,
                filter,
                query
            }, 'Fetching WhatsApp bookings for status update');

            const bookings = await Booking.find(query)
                .select('fileNumber status')
                .lean();

            if (bookings.length === 0) {
                this.logger.info('No WhatsApp bookings found for update');
                return {
                    success: true,
                    message: 'No WhatsApp bookings found for update',
                    total: 0,
                    updated: 0,
                    failed: 0,
                    results: []
                };
            }

            this.logger.info({
                count: bookings.length
            }, `Found ${bookings.length} WhatsApp bookings for status update`);

            const results = [];
            let updatedCount = 0;
            let failedCount = 0;

            // Process bookings sequentially to avoid overwhelming the external API
            for (const booking of bookings) {
                try {
                    // Only update if status is different
                    if (booking.status === status) {
                        results.push({
                            fileNumber: booking.fileNumber,
                            success: true,
                            message: 'Status already matches target status',
                            skipped: true
                        });
                        continue;
                    }

                    const result = await this.updateStatusForBooking(booking.fileNumber, status);
                    
                    if (result.success) {
                        // Update local booking status if external API call was successful
                        await Booking.updateOne(
                            { _id: booking._id },
                            { 
                                $set: { 
                                    status: status,
                                    externalApiUpdatedAt: new Date(),
                                    lastExternalApiStatus: status
                                } 
                            }
                        );
                        updatedCount++;
                    } else {
                        failedCount++;
                    }

                    results.push({
                        fileNumber: booking.fileNumber,
                        success: result.success,
                        message: result.success ? 'Updated successfully' : result.error,
                        apiResponse: result
                    });

                    // Small delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    failedCount++;
                    results.push({
                        fileNumber: booking.fileNumber,
                        success: false,
                        message: error.message,
                        error: error
                    });
                    this.logger.error({
                        fileNumber: booking.fileNumber,
                        error: error.message
                    }, 'Error updating individual booking status');
                }
            }

            const summary = {
                success: true,
                message: `Processed ${bookings.length} WhatsApp bookings`,
                total: bookings.length,
                updated: updatedCount,
                failed: failedCount,
                results: results
            };

            this.logger.info(summary, 'Bulk status update completed');

            return summary;

        } catch (error) {
            this.logger.error({
                status,
                error: error.message,
                stack: error.stack
            }, 'Failed to update WhatsApp bookings status');

            return {
                success: false,
                error: error.message,
                total: 0,
                updated: 0,
                failed: 0,
                results: []
            };
        }
    }

    /**
     * Update status for a single booking and save the result
     * @param {string} bookingId - MongoDB booking ID
     * @param {string} status - The status to update
     * @returns {Promise<Object>} Update result
     */
    async updateBookingStatus(bookingId, status) {
        try {
            const booking = await Booking.findById(bookingId);
            
            if (!booking) {
                throw new Error(`Booking with ID ${bookingId} not found`);
            }

            if (!booking.isWhatsappBooking) {
                return {
                    success: true,
                    message: 'Booking is not a WhatsApp booking, skipping external API update',
                    skipped: true
                };
            }

            if (!booking.fileNumber) {
                throw new Error('Booking file number is required');
            }

            const result = await this.updateStatusForBooking(booking.fileNumber, status);

            // Update booking record with API call result
            if (result.success) {
                booking.externalApiUpdatedAt = new Date();
                booking.lastExternalApiStatus = status;
                booking.externalApiSuccess = true;
                booking.externalApiError = null;
            } else {
                booking.externalApiSuccess = false;
                booking.externalApiError = result.error;
            }

            await booking.save();

            return {
                bookingId: booking._id,
                fileNumber: booking.fileNumber,
                success: result.success,
                message: result.success ? 'Status updated successfully' : result.error,
                apiResponse: result
            };

        } catch (error) {
            this.logger.error({
                bookingId,
                status,
                error: error.message
            }, 'Failed to update booking status');

            return {
                success: false,
                error: error.message,
                bookingId
            };
        }
    }

    /**
     * Batch update status for multiple bookings
     * @param {Array<string>} bookingIds - Array of booking IDs
     * @param {string} status - The status to update
     * @returns {Promise<Object>} Batch update results
     */
    async batchUpdateBookingStatus(bookingIds, status) {
        try {
            const results = [];
            let successCount = 0;
            let failureCount = 0;

            for (const bookingId of bookingIds) {
                try {
                    const result = await this.updateBookingStatus(bookingId, status);
                    results.push(result);
                    
                    if (result.success && !result.skipped) {
                        successCount++;
                    } else if (!result.success) {
                        failureCount++;
                    }
                } catch (error) {
                    failureCount++;
                    results.push({
                        bookingId,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                total: bookingIds.length,
                successCount,
                failureCount,
                results
            };

        } catch (error) {
            this.logger.error({
                bookingIdsCount: bookingIds?.length,
                status,
                error: error.message
            }, 'Batch update failed');

            return {
                success: false,
                error: error.message,
                total: bookingIds?.length || 0,
                successCount: 0,
                failureCount: bookingIds?.length || 0,
                results: []
            };
        }
    }
}

// Create singleton instance
const externalApiService = new ExternalApiService();

module.exports = externalApiService;