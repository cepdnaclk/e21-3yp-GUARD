// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Check if the request has an Authorization header
    const authHeader = req.header('Authorization');
    
    // 2. Make sure the header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // 3. Extract just the token string (remove the word "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // 4. Verify the token using your secret key from the .env file
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Attach the decoded user data (like userId) to the request so the controller can use it
        req.user = verified; 
        
        // 6. Token is valid, proceed to the actual route controller!
        next(); 
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token.' });
    }
};