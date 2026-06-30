export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { walletAddress } = req.body;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!walletAddress) {
    return res.status(400).json({ error: "L'adresse du wallet est manquante" });
  }

  try {
    // On utilise URLSearchParams car Stripe veut du x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('wallet_addresses[base]', walletAddress);
    params.append('destination_networks[]', 'base');

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: params.toString()
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
