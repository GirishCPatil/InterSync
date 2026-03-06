const User = require('../models/userModel');

const findMatch = async (req, res) => {
    try {
        const { skills, targetCompanies } = req.body;
        const userId = req.user._id;

        if (!skills || !targetCompanies || skills.length === 0) {
            return res.status(400).json({ message: 'Skills and target companies are required' });
        }

        // Find users with overlapping skills OR target companies, excluding the current user
        const matchedUser = await User.findOne({
            _id: { $ne: userId },
            $or: [
                { skills: { $in: skills } },
                { targetCompanies: { $in: targetCompanies } }
            ]
        }).select('-password').sort({ peerRating: -1 });

        if (!matchedUser) {
            return res.status(404).json({ message: 'No matching peer found. Try broadening your skills.' });
        }

        res.status(200).json({
            message: 'Peer matched successfully!',
            match: {
                _id: matchedUser._id,
                name: matchedUser.name,
                email: matchedUser.email,
                skills: matchedUser.skills,
                targetCompanies: matchedUser.targetCompanies,
                peerRating: matchedUser.peerRating,
                isPremium: matchedUser.isPremium
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during matching' });
    }
};

module.exports = { findMatch };
