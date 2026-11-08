const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, message: "PixoraSeal seal-image is alive" });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: "Use POST" });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const dataUrl = body.image || body.data || "";
    if (!dataUrl) return res.status(400).json({ ok: false, error: "No image" });

    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const buf = Buffer.from(base64, 'base64');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const claim = "PS-2026-" + hash.slice(0, 4).toUpperCase();
    const issuedAt = new Date().toISOString();

    let signature = null;
    try {
      const key = (process.env.PIXORASEAL_PRIVATE_KEY || "").replace(/\\n/g, '\n');
      if (key) {
        const s = crypto.createSign('SHA256');
        s.update(hash);
        s.end();
        signature = s.sign(key, 'base64');
      }
    } catch (e) {}

    const manifest = {
      claim_generator: "PixoraSeal 1.0",
      claim: claim,
      issuer: "PixoraSeal",
      hash_sha256: hash,
      filename: body.filename || "image.jpg",
      size_bytes: buf.length,
      issued_at: issuedAt,
      signature_base64: signature
    };

    return res.status(200).json({ ok: true, claim, hash, filename: manifest.filename, size: buf.length, issuedAt, signature, manifest });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
