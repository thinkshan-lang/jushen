const axios = require('axios');
const keyPool = require('./keyPool');

module.exports = {
  async openai(messages) {
    const apiKey = await keyPool.getKey('openai');

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    return res.data;
  }
};
