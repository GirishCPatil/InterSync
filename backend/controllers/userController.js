const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const createUser = async (req, res) => {
    try {
        const { name, email, password, skills, targetCompanies } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await User.create({
            name,
            email,
            password: hashedPassword,
            skills: skills || [],
            targetCompanies: targetCompanies || []
        });

        res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                skills: user.skills,
                targetCompanies: user.targetCompanies,
                peerRating: user.peerRating,
                isPremium: user.isPremium,
                resumeAnalysisCount: user.resumeAnalysisCount
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            skills: user.skills,
            targetCompanies: user.targetCompanies,
            peerRating: user.peerRating,
            isPremium: user.isPremium,
            resumeAnalysisCount: user.resumeAnalysisCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const ratePeer = async (req, res) => {
    try {
        const { targetUserId, rating } = req.body;

        if (!targetUserId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Valid targetUserId and rating (1-5) are required' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        // Calculate new average rating
        const currentTotal = targetUser.peerRating * targetUser.ratingCount;
        const newTotal = currentTotal + Number(rating);
        const newCount = targetUser.ratingCount + 1;
        const newAverage = newTotal / newCount;

        // Update target user
        targetUser.peerRating = parseFloat(newAverage.toFixed(1)); // Keep 1 decimal place
        targetUser.ratingCount = newCount;
        await targetUser.save();

        res.status(200).json({ message: 'Rating submitted successfully', newRating: targetUser.peerRating });
    } catch (error) {
        console.error('Error rating peer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        // Only premium users can access the leaderboard
        if (!req.user.isPremium) {
            return res.status(403).json({
                success: false,
                message: 'Leaderboard is a premium feature. Please upgrade to access it.'
            });
        }

        // Find top 10 users ranked by ratingCount DESC (which corresponds to interviews given)
        // Then by peerRating DESC
        const topPeers = await User.find({})
            .sort({ ratingCount: -1, peerRating: -1 })
            .limit(10)
            .select('name skills targetCompanies peerRating ratingCount isPremium');

        res.status(200).json({
            success: true,
            leaderboard: topPeers
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
}

module.exports = { createUser, loginUser, getProfile, ratePeer, getLeaderboard };
