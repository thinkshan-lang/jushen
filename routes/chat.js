const express = require('express');

const auth = require('../middleware/auth');
const billing = require('../services/billing');
const adapter = require('../services/adapter');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  let preCost = 0;

  try {
    const { messages } = req.body;
    const estimatedTokens = JSON.stringify(messages).length / 4;

    preCost = await billing.preCharge(req.user.id, estimatedTokens);

    const result = await adapter.openai(messages);

    const totalTokens = (result.usage && result.usage.total_tokens) || 50;

    await billing.chargeFinal(req.user.id, totalTokens, preCost);

    res.json(result);
  } catch (err) {
    if (preCost > 0 && req.user && req.user.id) {
      await billing.refund(req.user.id, preCost);
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
