const db = require('../config/db');

module.exports = {
  async preCharge(userId, estimatedTokens) {
    const cost = estimatedTokens * 0.0001;

    const [rows] = await db.execute('SELECT balance FROM users WHERE id=?', [userId]);

    if (!rows[0] || rows[0].balance < cost) {
      throw new Error('Insufficient balance');
    }

    await db.execute('UPDATE users SET balance = balance - ? WHERE id=?', [cost, userId]);

    return cost;
  },

  async refund(userId, amount) {
    await db.execute('UPDATE users SET balance = balance + ? WHERE id=?', [amount, userId]);
  },

  async chargeFinal(userId, actualTokens, preCost) {
    const realCost = actualTokens * 0.0001;
    const diff = realCost - preCost;

    if (diff > 0) {
      await db.execute('UPDATE users SET balance = balance - ? WHERE id=?', [diff, userId]);
    } else {
      await this.refund(userId, Math.abs(diff));
    }
  }
};
