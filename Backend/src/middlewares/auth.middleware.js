const { verifyToken } = require('../utils')

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const token = authHeader.split(' ')[1];
        req.user = verifyToken(token);
        
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = {
    authenticate
}