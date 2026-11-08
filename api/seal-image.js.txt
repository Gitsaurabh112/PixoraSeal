// api/seal-image.js - PixoraSeal REAL C2PA Inject
// GitHub me api/ folder me is naam se daalo: api/seal-image.js
// Iske liye Vercel me 2 Env Vars chahiye: PIXORASEAL_PRIVATE_KEY, PIXORASEAL_CERT (tu daal chuka hai)

import { createC2pa, createTestSigner } from 'c2pa-node';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { imageBase64, fileName } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 missing' });

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Signer - Vercel Env Vars se
    const signer = await createTestSigner({
      privateKey: process.env.PIXORASEAL_PRIVATE_KEY,
      certificate: process.env.PIXORASEAL_CERT
    });

    const c2pa = createC2pa({ signer });

    const manifest = {
      claim_generator: 'PixoraSeal/1.0',
      claim_generator_info: { name: 'PixoraSeal', version: '1.0' },
      assertions: [
        { label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created' }, { action: 'c2pa.sealed', actor: 'PixoraSeal' }] } }
      ]
    };

    // Asli inject - photo ke andar JUMBF box daalo
    const sealedBuffer = await c2pa.sign(imageBuffer, manifest);

    // Sealed photo wapas bhejo
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', sealedBuffer.length);
    return res.status(200).send(sealedBuffer);
  } catch (err) {
    console.error('C2PA seal failed:', err);
    return res.status(500).json({ error: 'C2PA seal failed', detail: String(err) });
  }
}
