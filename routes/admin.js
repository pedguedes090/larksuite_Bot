import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import UserManager from '../modules/userManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const userManager = UserManager.getInstance();

// Middleware to check admin privileges
const requireAdmin = async (req, res, next) => {
  try {
    // For demo purposes, we'll use a simple admin key
    // In production, implement proper authentication
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    
    if (!adminKey) {
      return res.status(401).json({ error: 'Admin key required' });
    }
    
    // Simple admin verification - in production use proper auth
    if (adminKey === 'admin123' || process.env.ADMIN_KEY === adminKey) {
      next();
    } else {
      res.status(403).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Get all users
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = userManager.getAllUsers();
    // Convert object to array for frontend consumption
    const usersArray = Object.values(users);
    res.json(usersArray);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system statistics
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const stats = userManager.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set admin privileges
router.post('/set-admin', requireAdmin, (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    userManager.setAdmin(userId, isAdmin);
    res.json({ success: true, message: `Admin privileges ${isAdmin ? 'granted' : 'revoked'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set user money
router.post('/set-money', requireAdmin, (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }
    
    userManager.setMoney(userId, amount);
    res.json({ success: true, message: 'Money updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details
router.get('/users/:userId', requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const user = userManager.getUser(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;