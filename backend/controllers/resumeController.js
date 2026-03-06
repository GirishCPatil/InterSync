const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require("@google/genai");
const User = require('../models/userModel');

// Multer config - memory storage for PDF processing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const analyzeResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a PDF file' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Apply Premium Limit
        if (!user.isPremium && user.resumeAnalysisCount >= 3) {
            return res.status(403).json({
                message: 'Free limit reached. Please upgrade to Premium for unlimited resume analysis.',
                requiresPremium: true
            });
        }

        // Extract text from PDF
        const pdfData = await pdfParse(req.file.buffer);
        let text = pdfData.text;

        // Truncate text if too long to save tokens
        if (text.length > 15000) {
            text = text.substring(0, 15000);
        }

        const prompt = `
Please act as an expert technical recruiter. Analyze the following resume text and provide a structured JSON response. Do not include any markdown formatting or code blocks in your response, just the raw JSON object.

The JSON should have the exact following structure:
{
  "score": <number out of 100 representing overall quality>,
  "suggestion": "<a brief 1-2 sentence overall suggestion>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "keywordsFound": ["<kw1>", "<kw2>"],
  "keywordsMissing": ["<kw1>", "<kw2>"]
}

Resume text:
${text}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        // Extract raw JSON from Gemini response
        let rawResponse = response.text ? response.text : response.candidates[0].content.parts[0].text;

        // Clean up markdown markers if Gemini accidentally includes them
        rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const analysisData = JSON.parse(rawResponse);

        res.status(200).json({
            success: true,
            score: analysisData.score || 0,
            suggestion: analysisData.suggestion || "Ensure your resume highlights quantifiable achievements.",
            strengths: analysisData.strengths || [],
            weaknesses: analysisData.weaknesses || [],
            foundKeywords: analysisData.keywordsFound || [],
            missingKeywords: analysisData.keywordsMissing || []
        });

        // Increment usage count for free users
        if (!user.isPremium) {
            user.resumeAnalysisCount += 1;
            await user.save();
        }

    } catch (error) {
        console.error("Error analyzing resume:", error);
        res.status(500).json({ message: 'Error analyzing resume with AI' });
    }
};

module.exports = { analyzeResume, upload };
