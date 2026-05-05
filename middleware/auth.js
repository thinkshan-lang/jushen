const db = require('../config/db');

module.exports = async function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No API Key' });

  const apiKey = auth.replace('Bearer ', '');

  const [rows] = await db.execute('SELECT * FROM api_keys WHERE api_key=? AND status=1', [apiKey]);

  if (rows.length === 0) {
    return res.status(403).json({ error: 'Invalid API Key' });
  }

  req.user = { id: rows[0].user_id };
  next();
};
