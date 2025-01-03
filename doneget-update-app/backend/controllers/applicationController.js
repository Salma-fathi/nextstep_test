import Application from '../models/Application.js';  // Ensure correct import path
import Job from '../models/Job.js';

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;  // Get applicationId from route parameter
    const { status } = req.body;  // Get status from the request body

    console.log('Received applicationId:', applicationId);  // Log received applicationId
    console.log('Received status:', status);  // Log received status

    // Validate the status
    const validStatuses = ['approved', 'rejected', 'interviewing'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Valid values are "approved", "rejected", and "interviewing".' });
    }

    // Ensure the user (agent) is authenticated and has a role
    if (!req.user || req.user.role !== 'agent') {
      return res.status(403).json({ message: 'You do not have permission to update the application status.' });
    }

    // Find the application by its ID
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    console.log('Application found:', application);  // Log the application found

    // Check if the application is in the right state to change status
    if (application.status === 'approved' && status === 'interviewing') {
      return res.status(400).json({ message: 'Cannot change status from approved to interviewing.' });
    }
    if (application.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot update a rejected application.' });
    }

    // Find the job related to this application
    const job = await Job.findById(application.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    console.log('Job found:', job);  // Log the job found

    // Ensure the job belongs to the authenticated agent
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to manage this application' });
    }

    // Update the status of the application
    application.status = status;
    application.updatedAt = Date.now();  // Update the timestamp

    // Save the updated application
    await application.save();
    console.log('Application updated:', application);  // Log the updated application

    return res.status(200).json({
      message: 'Application status updated successfully',
      application,
    });

  } catch (error) {
    console.error(error);

    // Handle token expiration error
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }

    // Catch any other errors
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Get application details
export const getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;  // Extract applicationId from URL

    // Find the application by its ID and populate the related job and user details
    const application = await Application.findById(applicationId)
      .populate('job', 'title description postedBy')  // Populate job details (e.g., title, description, and postedBy)
      .populate('user', 'name email')  // Populate user details (e.g., name and email)
      .exec();  // Execute the query

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Send the application details back in the response
    return res.status(200).json({
      message: 'Application details fetched successfully',
      application,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
