'use strict';

var AccountantBot = require('./accountant_bot');

var token = process.env.BOT_TOKEN;

var accountant_bot = new AccountantBot({
    token: token,
});

accountant_bot.run();
