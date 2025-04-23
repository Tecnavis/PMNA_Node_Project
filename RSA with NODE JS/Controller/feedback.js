const Feedback = require('../Model/feedback');

// Create a new feedback
exports.createFeedback = async (req, res) => {
  try {
    const { question, yesPoint, noPoint } = req.body;
    console.log(req.body,'this is the body')
    const newFeedback = new Feedback({ question, yesPoint, noPoint });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback created successfully', data: newFeedback });
  } catch (error) {
    res.status(500).json({ message: 'Error creating feedback', error: error.message });
  }
};

// Get all feedbacks
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.status(200).json({ message: 'Feedbacks retrieved successfully', data: feedbacks });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedbacks', error: error.message });
  }
};

// Get a single feedback by ID
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.status(200).json({ message: 'Feedback retrieved successfully', data: feedback });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedback', error: error.message });
  }
};

// Update a feedback by ID
exports.updateFeedback = async (req, res) => {
  try {
    const { question, yesPoint, noPoint } = req.body;
    const updatedFeedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { question, yesPoint, noPoint },
      { new: true, runValidators: true }
    );

    if (!updatedFeedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.status(200).json({ message: 'Feedback updated successfully', data: updatedFeedback });
  } catch (error) {
    res.status(500).json({ message: 'Error updating feedback', error: error.message });
  }
};

// Delete a feedback by ID
exports.deleteFeedback = async (req, res) => {
  try {
    const deletedFeedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!deletedFeedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting feedback', error: error.message });
  }
};
