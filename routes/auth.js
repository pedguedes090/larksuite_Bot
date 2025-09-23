import express from 'express';
import UserManager from '../modules/userManager.js';

const router = express.Router();
const userManager = UserManager.getInstance();

// Simple session storage (in production, use Redis or proper session store)
const sessions = new Map();

// Generate session token
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware to check authentication
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const sessionData = sessions.get(token);
  if (Date.now() > sessionData.expires) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.user = sessionData.user;
  next();
};

// Register new user (sync with Lark)
router.post('/register', async (req, res) => {
  try {
    const { userId, password, larkUserId } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }
    
    // Check if user already exists
    if (userManager.userExists(userId)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user in system
    const user = userManager.getUser(userId);
    
    // Store password hash (in production, use proper password hashing)
    user.password = Buffer.from(password).toString('base64');
    user.larkUserId = larkUserId || userId;
    user.webAccess = true;
    
    userManager.saveUsers();
    
    res.json({ 
      success: true, 
      message: 'User registered successfully',
      userId: user.userId
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }
    
    // Get user
    if (!userManager.userExists(userId)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userManager.getUser(userId);
    
    // Check password (in production, use proper password verification)
    const storedPassword = user.password || '';
    const providedPassword = Buffer.from(password).toString('base64');
    
    if (storedPassword !== providedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const token = generateSessionToken();
    const sessionData = {
      user: {
        userId: user.userId,
        role: user.role,
        money: user.money,
        larkUserId: user.larkUserId
      },
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    sessions.set(token, sessionData);
    
    // Update last active
    user.lastActive = new Date().toISOString();
    userManager.saveUsers();
    
    res.json({
      success: true,
      token,
      user: sessionData.user
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Sync with Lark user
router.post('/sync-lark', requireAuth, async (req, res) => {
  try {
    const { larkUserId } = req.body;
    
    if (!larkUserId) {
      return res.status(400).json({ error: 'Lark User ID is required' });
    }
    
    // Update user's Lark connection
    const user = userManager.getUser(req.user.userId);
    user.larkUserId = larkUserId;
    user.lastSync = new Date().toISOString();
    
    userManager.saveUsers();
    
    res.json({ 
      success: true, 
      message: 'Lark account synced successfully' 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;