// middleware/authUserOrProvider.js
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const authUserOrProvider = async (req, res, next) => {
    try {
        // Try to get token from cookies
        const userToken = req.cookies.cookie;
        const providerToken = req.cookies.providerCookie;
        
        let user = null;
        let userType = null;

        // Try to authenticate as regular user first
        if (userToken) {
            try {
                const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
                
                const foundUser = await prisma.user.findUnique({
                    where: { id: decoded.userId }
                });
                
                if (foundUser) {
                    user = foundUser;
                    userType = 'USER';
                    req.userType = 'USER'; // Store user type separately
                }
            } catch (error) {
                console.log('User token verification failed:', error.message);
            }
        }

        // If not a regular user, try to authenticate as provider
        if (!user && providerToken) {
            try {
                const decoded = jwt.verify(providerToken, process.env.JWT_PROVIDER);
                
                const foundProvider = await prisma.serviceProvider.findUnique({
                    where: { id: decoded.id }
                });
                
                if (foundProvider) {
                    user = foundProvider;
                    userType = 'PROVIDER';
                    req.userType = 'PROVIDER'; // Store user type separately
                }
            } catch (error) {
                console.log('Provider token verification failed:', error.message);
            }
        }

        if (!user) {
            return res.status(401).json({ 
                message: 'Authentication required. Please login.' 
            });
        }

        // Attach user info with clear distinction
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            type: userType,
            originalData: user
        };

        // Add helper methods
        req.user.isUser = () => userType === 'USER';
        req.user.isProvider = () => userType === 'PROVIDER';

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ 
            message: 'Authentication failed',
            error: error.message 
        });
    }
};

// Add this middleware for user-specific routes
export const requireUser = (req, res, next) => {
    if (!req.user || !req.user.isUser()) {
        return res.status(403).json({
            message: 'Access denied. User account required.'
        });
    }
    next();
};

// Add this middleware for provider-specific routes
export const requireProvider = (req, res, next) => {
    if (!req.user || !req.user.isProvider()) {
        return res.status(403).json({
            message: 'Access denied. Provider account required.'
        });
    }
    next();
};