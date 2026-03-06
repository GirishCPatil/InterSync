const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a Razorpay order
const createOrder = async (req, res) => {
    try {
        const options = {
            amount: 49900, // ₹499 in paise
            currency: 'INR',
            receipt: `rcpt_${req.user._id.toString().slice(-10)}_${Date.now()}`,
            notes: {
                userId: req.user._id.toString()
            }
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
};

// Client-side payment verification (after checkout)
const verifyClientPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Update user to premium
            await User.findByIdAndUpdate(req.user._id, { isPremium: true });

            res.status(200).json({
                success: true,
                message: 'Payment verified! You are now a premium member.'
            });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Payment verification error' });
    }
};

module.exports = { createOrder, verifyClientPayment };
