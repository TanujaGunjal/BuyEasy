const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

// POST /api/agent/chat
// Auth: requires valid JWT (authenticated user only)
router.post('/chat', protect, agentController.chat);

module.exports = router;
