export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { walletAddress } = req.body;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  try {
    const params = new URLSearchParams({ 
      'wallet_addresses[base]': walletAddress,
      'destination_networks[]': 'base' 
    });

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: params
    });

    const data = await response.json();
    
    if (data.client_secret) {
      return res.status(200).json({ clientSecret: data.client_secret });
    } else {
      console.error("Erreur Stripe:", data);
      return res.status(500).json({ error: data.error?.message || "Erreur Stripe" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
