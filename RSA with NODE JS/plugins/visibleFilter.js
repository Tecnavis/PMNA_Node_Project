// Custome plugin for exclude document not reached pickupdate
const visibleFilter = (schema) => {
    const methods = ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'findById'];

    // "today" must be worked out on every query — it used to be fixed when the server started,
    // so after midnight scheduled bookings stayed hidden until the next restart.
    const endOfToday = () => {
        const today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        return today;
    };

    methods.forEach((method) => {
        schema.pre(method, function () {
            const query = this.getQuery();
            if (query._includeHidden) {
                delete query._includeHidden;
                return;
            }
            const today = endOfToday();

            this.where({
                $or: [
                    { pickupDate: { $lte: today } },
                    { pickupDate: { $exists: false } },
                    { pickupDate: null },
                    { pickupDate: '' }
                ]
            });
        });
    });

    schema.pre('aggregate', function () {
        if (this.options && this.options._includeHidden) {
            delete this.options._includeHidden;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.pipeline().unshift({
            $match: {
                $or: [
                    { pickupDate: { $lte: today } },
                    { pickupDate: { $exists: false } },
                    { pickupDate: null },
                    { pickupDate: '' }
                ]
            }
        });
    });

    schema.index({ pickupDate: 1 });
};

module.exports = visibleFilter;
