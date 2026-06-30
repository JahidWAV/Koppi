export default async function handler(req, res) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  // Log pour debuguer si la clé est bien chargée
  console.log("Clé Stripe présente ?", !!STRIPE_SECRET_KEY);

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY non configurée dans Vercel" });
  }

  // ... reste de ton code
}
