const express = require('express');
const router = express.Router();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

router.post('/session', async (req, res) => {
  const { walletAddress } = req.body;
  const params = new URLSearchParams({ 
    'wallet_addresses[base]': walletAddress,
    'destination_networks[]': 'base' 
  });
  
  const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const data = await response.json();
  res.json({ clientSecret: data.client_secret });
});

module.exports = router;
