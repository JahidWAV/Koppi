export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  try {
    // On crée simplement la session. 
    // On ne passe plus wallet_addresses ici, car on utilisera 
    // registerWalletAddress dans le frontend comme indiqué dans la doc.
    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: new URLSearchParams({
        'transaction_details[destination_currency]': 'usdc',
        'transaction_details[destination_network]': 'base'
      }).toString()
    });

    const data = await response.json();
    
    if (data.client_secret) {
      return res.status(200).json({ clientSecret: data.client_secret });
    } else {
      console.error("Erreur API Stripe:", data);
      return res.status(500).json({ error: data.error?.message || "Erreur lors de la création de la session" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
