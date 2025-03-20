const Point = require("../Model/points")

exports.updatePoint = async (req, res) => {
    try {
        const { point } = req.body;
        const { id } = req.query;

        const pointData = await Point.findById(id);
        if (!pointData) return res.status(404).json({ error: 'Point not found' });

        pointData.bookingPoint = point

        await pointData.save();
        res.status(200).json(pointData);
    } catch (error) {
        console.error('Error updating point:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPoint = async (req, res) => {
    try {
        const pointData = await Point.findOne();
        if (!pointData) return res.status(404).json({ error: 'Point not found' });
        res.status(200).json({ point: pointData });
    } catch (error) {
        console.error('Error updating driver:', error);
        res.status(500).json({ error: error.message });
    }
};
