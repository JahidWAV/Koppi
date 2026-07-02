import { SignJWT } from 'jose';
import crypto from 'crypto';

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET; // base64 brut, ex: "Ml3vT9pT..."
const REQUEST_HOST = 'api.developer.coinbase.com';
const REQUEST_PATH = '/onramp/v1/token';

function buildEd25519KeyObject(base64Secret) {
  const keyBuffer = Buffer.from(base64Secret, 'base64');
  // Les clés CDP Ed25519 exportées contiennent souvent seed+public (64 bytes) ; on garde les 32 premiers (seed)
  const seed = keyBuffer.length === 64 ? keyBuffer.subarray(0, 32) : keyBuffer;

  const derPrefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const der = Buffer.concat([derPrefix, seed]);

  return crypto.createPrivateKey({
    key: der,
    format: 'der',
    type: 'pkcs8'
  });
}

async function generateJWT() {
  const keyObject = buildEd25519KeyObject(CDP_API_KEY_SECRET);
  const uri = `POST ${REQUEST_HOST}${REQUEST_PATH}`;

  const jwt = await new SignJWT({
    sub: CDP_API_KEY_ID,
    iss: 'cdp',
    aud: [REQUEST_HOST],
    uris: [uri]
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: CDP_API_KEY_ID, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('2m')
    .setNotBefore(new Date())
    .sign(keyObject);

  return jwt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress requis' });
    }

    const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress || '0.0.0.0';
    const jwt = await generateJWT();

    const response = await fetch(`https://${REQUEST_HOST}${REQUEST_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addresses: [{ address: walletAddress, blockchains: ['base'] }],
        assets: ['USDC'],
        clientIp
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json({ sessionToken: data.token });
  } catch (error) {
    console.error('Erreur complète:', error);
    return res.status(500).json({ error: error.message });
  }
}
