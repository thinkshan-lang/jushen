const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const chatRoute = require('./routes/chat');

const app = express();
app.use(bodyParser.json());

app.use('/v1/chat/completions', chatRoute);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
