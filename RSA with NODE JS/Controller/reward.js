const { Reward, RewardFor } = require('../Model/reward');
const ShowroomStaff = require('../Model/showroomStaff');
const Booking = require('../Model/booking');
const Staff = require('../Model/staff');
const Driver = require('../Model/driver');
const Showroom = require('../Model/showroom');
const Redemption = require('../Model/redemption');
const { default: mongoose } = require('mongoose');
const { createAddress } = require('../services/address.service');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');
const { StatusCodes } = require('http-status-codes');

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
    const rewards = await Reward.find(filter).sort({ pointsRequired: -1 });
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
  const { rewardId = '', rewardFor, userId, bookingId = '', staffId, userType, address } = req.query;

  try {

    let redemption

    if (rewardFor === 'Showroom') {
      redemption = await manageRewardRedeemForShowroom(userId, bookingId);
    } else {
      redemption = await manageRewardRedeem(rewardId, userId || staffId, rewardFor || userType, address);
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


const manageRewardRedeem = async (rewardId, userId, rewardFor, address) => {
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
      if (rewardFor === 'ShowroomStaff' && !address) throw new Error('Address is missing.');
      if (reward.rewardFor !== rewardFor) throw new Error(`This reward is not available for ${rewardFor}`);
      if (reward.stock <= 0) throw new Error('This reward is out of stock');

      let useAblePoints = user.rewardPoints

      if (reward.pointsRequired > useAblePoints) {
        throw new Error(`Insufficient points. Available points (${useAblePoints})`);
      }

      let addressId
      if (address) {
        addressId = await createAddress(address)
      }

      historyRedeem = new Redemption({
        reward: reward._id,
        user: user._id,
        redeemByModel: rewardFor
      });

      if (addressId) {
        historyRedeem.address = addressId
      }

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
  if (!mongoose.Types.ObjectId.isValid(showroomId) || !mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid showroom or booking ID.');
  }
  const showroom = await Showroom.findById(showroomId);
  const booking = await Booking.findById(bookingId);

  if (!showroom || !booking) {
    throw new Error('Invalid showroom or booking ID.');
  }
  if (booking.rewardAmount) {
    throw new Error('Rewards have already been redeemed for this booking.');
  }
  if (!(showroom.rewardPoints > 0)) {
    throw new Error(`Insufficient points. Available points (${showroom.rewardPoints || 0})`);
  }

  // A showroom can use up to half of its points on one booking
  const usablePoints = Math.floor(showroom.rewardPoints / 2);
  const pointsToUse = Math.max(0, Math.min(usablePoints, Number(booking.totalAmount) || 0));
  if (pointsToUse <= 0) {
    throw new Error('Nothing to redeem for this booking.');
  }

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
    // Sort redemptions by points from lowest to highest
    const sortedRedemptions = redemptions.sort((a, b) => a.points - b.points);


    return res.status(200).json({
      message: "Redemtions fetched success",
      success: true,
      data: sortedRedemptions
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

exports.redeemShowroomPoint = async (req, res) => {
  const { showroomId } = req.params;
  const amount = Number(req.body?.rewardAmount);

  try {
    if (!mongoose.Types.ObjectId.isValid(showroomId)) {
      return res.status(400).json({ success: false, message: 'Invalid showroom.' });
    }
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ success: false, message: 'rewardAmount must be a non-zero number.' });
    }

    let showroom;
    if (amount > 0) {
      // Deduct only if enough points (atomic, so two tabs can't overspend)
      showroom = await Showroom.findOneAndUpdate(
        { _id: showroomId, rewardPoints: { $gte: amount } },
        { $inc: { rewardPoints: -amount } },
        { new: true }
      );
      if (!showroom) {
        const s = await Showroom.findById(showroomId).select('rewardPoints');
        if (!s) return res.status(404).json({ success: false, message: 'Showroom not found.' });
        return res.status(400).json({ success: false, message: `Insufficient points. Available points (${s.rewardPoints || 0})` });
      }
    } else {
      // A negative amount returns points (reward reduced when a booking was edited)
      showroom = await Showroom.findByIdAndUpdate(showroomId, { $inc: { rewardPoints: -amount } }, { new: true });
      if (!showroom) return res.status(404).json({ success: false, message: 'Showroom not found.' });
    }

    return res.status(200).json({
      success: true,
      message: amount > 0 ? 'Reward point redeemed successfully' : 'Reward points returned',
      rewardUsed: amount,
      updatedShowroom: showroom,
      data: showroom,
    });
  } catch (error) {
    console.error('[REDEEM ERROR]', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Get All redemptions
exports.getAllRedeems = asyncErrorHandler(async (req, res) => {

  const redeems = await Redemption.find()
    .populate('reward')
    .populate('address')
    .sort({ createdAt: -1 });

  const populatedRedeems = await Promise.all(
    redeems.map(async (redemption) => {
      if (redemption.user && redemption.redeemByModel) {
        const userModel = mongoose.model(redemption.redeemByModel);
        const user = await userModel.findById(redemption.user);
        return {
          ...redemption.toObject(),
          user: user
        };
      }
      return redemption;
    })
  );

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "All redeems fetched successfully",
    data: populatedRedeems,
  });
});

// Approve redeem by id
exports.approveRedeemById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Redemption id is missing.');
  }

  const redemption = await Redemption.findById(id);
  if (!redemption) {
    throw new NotFoundError('Redemption not found');
  }

  if (redemption.approval) {
    throw new BadRequestError('Redemption is already approved');
  }
  if (redemption.rejected) {
    throw new BadRequestError('This redemption was rejected and its points were returned. Ask the user to redeem again.');
  }

  const updatedRedemption = await Redemption.findByIdAndUpdate(
    id,
    {
      approval: true,
      rejected: false,
    },
    { new: true, runValidators: true }
  );

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Redemption approved successfully",
    data: updatedRedemption,
  });
});

exports.rejectRedeemById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Redemption id is missing.');
  }

  // Flip to rejected only once (atomic) so points are never returned twice
  const redemption = await Redemption.findOneAndUpdate(
    { _id: id, rejected: { $ne: true } },
    { approval: false, rejected: true },
    { new: true }
  );
  if (!redemption) {
    const exists = await Redemption.exists({ _id: id });
    if (!exists) throw new NotFoundError('Redemption not found');
    throw new BadRequestError('Redemption is already rejected');
  }

  // Return the points to the user and the item to stock
  let refunded = 0;
  const reward = await Reward.findById(redemption.reward);
  if (reward) {
    refunded = Number(reward.pointsRequired) || 0;
    await Reward.updateOne({ _id: reward._id }, { $inc: { stock: 1, TotalRedeem: -1 } });
    const modelName = redemption.redeemByModel;
    if (refunded > 0 && modelName && mongoose.modelNames().includes(modelName)) {
      await mongoose.model(modelName).updateOne({ _id: redemption.user }, { $inc: { rewardPoints: refunded } });
    }
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: refunded ? `Redemption rejected — ${refunded} points returned` : "Redemption rejected successfully",
    data: redemption,
  });
});
