const db = require('../config/db');

module.exports = {
  async getKey(provider) {
    const [rows] = await db.execute(
      'SELECT * FROM provider_keys WHERE provider=? AND status=1 ORDER BY usage_count ASC LIMIT 1',
      [provider]
    );

    if (rows.length === 0) throw new Error('No available key');

    const key = rows[0];

    await db.execute('UPDATE provider_keys SET usage_count = usage_count + 1 WHERE id=?', [key.id]);

    return key.api_key;
  }
};
