export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { walletAddress } = req.body;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  try {
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
    
    // LOG DÉTAILLÉ : On veut voir ce qui bloque dans les logs Vercel
    if (!response.ok) {
        console.error("Erreur Stripe brute:", JSON.stringify(data));
        return res.status(response.status).json({ error: data.error.message });
    }

    return res.status(200).json({ clientSecret: data.client_secret });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
