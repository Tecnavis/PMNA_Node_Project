const { Reward } = require('../Model/reward');

// Create a new reward
exports.createReward = async (req, res) => {
  const { name, price, description, pointsRequired, stock, rewardFor } = req.body;

  try {
    const image = req.file ? req.file.filename : null;

    if (!name || !price || !pointsRequired || !stock || !rewardFor || !description) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const reward = new Reward({
      name,
      price: +price,
      description,
      pointsRequired: +pointsRequired,
      stock: +stock,
      rewardFor,
      image,
    });

    await reward.save();
    res.status(201).json(reward);

  } catch (error) {
    console.log(error)
    console.log(error.message)
    res.status(500).json({ error: error.message });
  }
};

// Get all rewards
exports.getAllRewards = async (req, res) => {
  try {
    const { rewardFor } = req.query;

    // Define the filter object
    const filter = {};

    // Add rewardFor to the filter if it exists in the query
    if (rewardFor) {
      filter.rewardFor = rewardFor;
    }

    // Fetch rewards based on the filter
    const rewards = await Reward.find(filter);
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
    const { name, price, description, pointsRequired, stock, rewardFor, image } = req.body;

    const img = req.file ? req.file.filename : image;

    const updatedReward = await Reward.findByIdAndUpdate(
      id,
      { name, price, description, pointsRequired, stock, rewardFor, image: img },
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
