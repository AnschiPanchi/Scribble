const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Purchase Item
router.post('/buy', async (req, res) => {
    try {
        const { userId, itemName, price } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Operator not found.' });
        
        if (user.coins < price) {
            return res.status(400).json({ error: 'Insufficient IC (Ink-Coins).' });
        }

        user.coins -= price;
        if (!user.purchasedItems.includes(itemName)) {
            user.purchasedItems.push(itemName);
        }
        user.activeGear = itemName; // Automatically equip last bought item
        await user.save();

        res.status(200).json({ user: { 
            coins: user.coins, 
            purchasedItems: user.purchasedItems, 
            activeGear: user.activeGear 
        }, message: `Successfully equipped ${itemName}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
