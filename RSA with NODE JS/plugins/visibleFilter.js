// Custome plugin for exclude document not reached pickupdate
const visibleFilter = (schema) => {
    const methods = ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'findById'];

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    methods.forEach((method) => {
        schema.pre(method, function () {
            const query = this.getQuery();
            if (query._includeHidden) {
                delete query._includeHidden;
                return;
            }

            if (!query.pickupDate) {
                this.where({ pickupDate: { $lte: today } });
            }
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
                pickupDate: { $lte: today }
            }
        });
    });

    schema.index({ pickupDate: 1 });
};

module.exports = visibleFilter;
