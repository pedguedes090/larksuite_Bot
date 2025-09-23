import express from 'express';
import CommandHandler from '../modules/commandHandler.js';
import UserManager from '../modules/userManager.js';
import { requireAuth } from './auth.js';

const router = express.Router();
const userManager = UserManager.getInstance();

// Get command handler instance lazily
let commandHandler = null;

// Initialize command handler
const getCommandHandler = async () => {
  if (!commandHandler) {
    commandHandler = await new CommandHandler('!').init();
  }
  return commandHandler;
};

// Get available commands for user
router.get('/available', requireAuth, async (req, res) => {
  try {
    const handler = await getCommandHandler();
    
    const user = userManager.getUser(req.user.userId);
    const userRole = user.role || 0;
    
    const commands = handler.getCommands(userRole);
    
    // Format commands for frontend
    const formattedCommands = commands.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      aliases: cmd.aliases || [],
      adminOnly: cmd.adminOnly || false,
      usage: cmd.usage || `!${cmd.name}`,
      category: cmd.category || 'General'
    }));
    
    res.json({ commands: formattedCommands });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute command
router.post('/execute', requireAuth, async (req, res) => {
  try {
    const { command, args = [] } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    const handler = await getCommandHandler();
    
    // Build command text
    const commandText = `!${command} ${args.join(' ')}`.trim();
    
    // Execute command through command handler
    const result = await handler.handleMessage(
      commandText,
      req.user.userId,
      'web-interface', // chatId for web interface
      null // client not needed for most commands
    );
    
    // Log command execution
    console.log(`🌐 Web command executed: ${commandText} by ${req.user.userId}`);
    
    if (result === null) {
      return res.status(400).json({ 
        error: 'Command not found or invalid',
        suggestion: `Use !help to see available commands`
      });
    }
    
    res.json({ 
      success: true,
      result: result,
      command: commandText
    });
    
  } catch (error) {
    console.error('Command execution error:', error);
    res.status(500).json({ 
      error: 'Command execution failed',
      details: error.message 
    });
  }
});

// Get command statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const handler = await getCommandHandler();
    
    const stats = handler.getCommandStats();
    res.json({ stats });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get command history for user (simple implementation)
const commandHistory = new Map();

router.get('/history', requireAuth, (req, res) => {
  try {
    const userHistory = commandHistory.get(req.user.userId) || [];
    res.json({ history: userHistory.slice(-50) }); // Last 50 commands
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to log command history
router.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/execute' && req.user) {
    const originalSend = res.send;
    res.send = function(data) {
      // Log successful commands
      if (res.statusCode === 200) {
        const userHistory = commandHistory.get(req.user.userId) || [];
        userHistory.push({
          command: req.body.command,
          args: req.body.args,
          timestamp: new Date().toISOString(),
          result: typeof data === 'string' ? JSON.parse(data).result?.substring(0, 100) : 'Success'
        });
        
        // Keep only last 100 commands
        if (userHistory.length > 100) {
          userHistory.splice(0, userHistory.length - 100);
        }
        
        commandHistory.set(req.user.userId, userHistory);
      }
      
      originalSend.call(this, data);
    };
  }
  next();
});

export default router;