const Reward = require('../Model/reward');

// Create a new reward
exports.createReward = async (req, res) => {
  try {
    const { name, price, description, pointsRequired, stock, rewardFor } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !price || !pointsRequired || !stock || !rewardFor) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const reward = new Reward({
      name,
      price,
      description,
      pointsRequired,
      stock,
      rewardFor,
      image,
    });

    await reward.save();
    res.status(201).json(reward);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all rewards
exports.getAllRewards = async (req, res) => {
  try {
    const rewards = await Reward.find();
    res.status(200).json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single reward by ID
exports.getRewardById = async (req, res) => {
  try {
    const { id } = req.params;
    const reward = await Reward.findById(id);

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found.' });
    }

    res.status(200).json(reward);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a reward
exports.updateReward = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, pointsRequired, stock, rewardFor } = req.body;
    const image = req.file ? req.file.filename : null;

    const updatedReward = await Reward.findByIdAndUpdate(
      id,
      { name, price, description, pointsRequired, stock, rewardFor, ...(image && { image }) },
      { new: true }
    );

    if (!updatedReward) {
      return res.status(404).json({ message: 'Reward not found.' });
    }

    res.status(200).json(updatedReward);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a reward
exports.deleteReward = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReward = await Reward.findByIdAndDelete(id);

    if (!deletedReward) {
      return res.status(404).json({ message: 'Reward not found.' });
    }

    res.status(200).json({ message: 'Reward deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
