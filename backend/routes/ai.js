const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');

const protectRoute = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        return res.status(401).json({ error: "Unauthorized - Invalid Token" });
    }
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

router.post('/chat', protectRoute, async (req, res) => {
    try {
        const { prompt, history } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        // ======================================================================
        //   THIS IS THE DEFINITIVE FIX
        // ======================================================================
        // Using the latest, recommended, and most stable model name.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const formattedHistory = (history || []).map(msg => ({
            role: msg.sender === 'me' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 250,
            },
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error in AI chat route:", error.message);
        res.status(500).json({ error: "Failed to get response from AI." });
    }
});

module.exports = router;