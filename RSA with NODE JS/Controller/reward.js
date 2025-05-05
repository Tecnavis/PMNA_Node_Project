const { Reward, RewardFor } = require('../Model/reward');
const ShowroomStaff = require('../Model/showroomStaff');
const Booking = require('../Model/booking');
const Staff = require('../Model/staff');
const Driver = require('../Model/driver');
const Showroom = require('../Model/showroom');
const Redemption = require('../Model/redemption');
const { default: mongoose } = require('mongoose');

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

exports.redeemReward = async (req, res) => {
  const { rewardId = '', rewardFor, userId, bookingId = '' } = req.query;
  try {

    let redemption

    if (rewardFor === 'Showroom') {
      redemption = await manageRewardRedeemForShowroom(userId, bookingId);
    } else {
      redemption = await manageRewardRedeem(rewardId, userId, rewardFor);
    }

    return res.status(201).json({
      success: true,
      data: redemption,
      message: 'Redemption redeemed successfull.',
    });
  } catch (error) {
    console.error('[REDEEM ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};


const manageRewardRedeem = async (rewardId, userId, rewardFor) => {
  const session = await mongoose.startSession();
  let historyRedeem = null;

  try {
    await session.withTransaction(async () => {
      if (!mongoose.Types.ObjectId.isValid(rewardId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid reward or staff ID');
      }

      let userModel;
      switch (rewardFor) {
        case 'ShowroomStaff':
          userModel = ShowroomStaff;
          break;
        case 'Staff':
          userModel = Staff;
          break;
        case 'Driver':
          userModel = Driver;
          break;
        default:
          throw new Error('Invalid user type');
      }

      const [reward, user] = await Promise.all([
        Reward.findById(rewardId).session(session),
        userModel.findById(userId).session(session)
      ]);

      if (!reward) throw new Error('Reward not found');
      if (!user) throw new Error('Staff member not found');
      if (reward.rewardFor !== rewardFor) throw new Error(`This reward is not available for ${rewardFor}`);
      if (reward.stock <= 0) throw new Error('This reward is out of stock');

      let useAblePoints = user.rewardPoints
    
      if (reward.pointsRequired > useAblePoints) {
          throw new Error(`Insufficient points. Available points (${useAblePoints})`);
        
      }

      historyRedeem = new Redemption({
        reward: reward._id,
        user: user._id,
        redeemByModel: rewardFor
      });

      reward.stock -= 1;
      user.rewardPoints -= reward.pointsRequired;
      reward.TotalRedeem = (reward.TotalRedeem || 0) + 1;

      await Promise.all([
        historyRedeem.save({ session }),
        reward.save({ session }),
        user.save({ session })
      ]);
    });

    return historyRedeem;
  } catch (err) {
    console.error('[TRANSACTION FAILED]', err);
    throw err;
  } finally {
    session.endSession();
  }
};

const manageRewardRedeemForShowroom = async (showroomId, bookingId) => {
  try {
    const showroom = await Showroom.findById(showroomId);
    const booking = await Booking.findById(bookingId);

    if (!showroom || !booking) {
      throw new Error('Invalid showroom or booking ID.');
    }

    if (booking.rewardAmount) {
      throw new Error('Rewards have already been redeemed for this booking.');
    }

    if (showroom.rewardPoints > 0) {
      throw new Error(`Insufficient points. Available points (${showroom.rewardPoints})`);
    }

    const usablePoints = showroom.rewardPoints / 2;

    const pointsToUse = Math.min(usablePoints, booking.totalAmount);

    booking.rewardAmount = pointsToUse;
    booking.totalAmount -= pointsToUse;
    showroom.rewardPoints -= pointsToUse;

    await Promise.all([booking.save(), showroom.save()]);

    return {
      message: 'Reward applied successfully',
      rewardUsed: pointsToUse,
      updatedBooking: booking,
      updatedShowroom: showroom,
    };
  } catch (error) {
    console.error('Error redeeming reward:', error);
    throw new Error('Internal server error.');
  }
};


// Function for get the redemptions base ont he userId userType
exports.getRedemptions = async (userId, userType) => {
  return Redemption.find({ user: userId })
    .populate('reward')
    .sort({ createdAt: -1 });
};

// Controller for get all redemtions for user
exports.getAllredemationsBaseUserType = async (req, res) => {
  const { userType, userId } = req.query
  try {

    const redemptions = await this.getRedemptions(userId, userType)

    if (!redemptions) {
      return res.status(404).json({
        success: false,
        message: "Not redeems done yet",
      });
    }

    return res.status(200).json({
      message: "Redemtions fetched success",
      success: true,
      data: redemptions
    })
  } catch (error) {
    console.log(error.message)
    res.status(500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// Controller for get the possible redemable rewards base on userType and reward points
exports.getAllRedeemableRewards = async (req, res) => {
  const { userType, points } = req.query;

  try {
    // Validate required query parameters
    if (!userType || !points) {
      return res.status(400).json({
        success: false,
        message: 'Both userType and points are required query parameters'
      });
    }

    // Validate points is a number
    const numericPoints = Number(points);
    if (isNaN(numericPoints)) {
      return res.status(400).json({
        success: false,
        message: 'Points must be a valid number'
      });
    }

    // Calculate usable points (half of available points)
    const usablePoints = numericPoints / 2;

    // Find rewards that match the user type and are affordable
    const redeemableRewards = await Reward.find({
      rewardFor: userType,
      pointsRequired: { $lte: usablePoints }, // Changed from $gte to $lte (less than or equal)
      stock: { $gt: 0 } // Only include rewards with available stock
    }).sort({ pointsRequired: -1 }); // Sort by points descending

    return res.status(200).json({
      success: true,
      count: redeemableRewards.length,
      usablePoints: usablePoints,
      rewards: redeemableRewards
    });

  } catch (error) {
    console.error('[GET REDEEMABLE REWARDS ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch redeemable rewards',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};