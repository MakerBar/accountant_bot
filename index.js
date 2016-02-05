'use strict';

var http = require('http');

var AccountantBot = require('./accountant_bot');

var token = process.env.BOT_TOKEN;

var accountant_bot = new AccountantBot({
    token: token,
});

accountant_bot.run();

// silly http server to make heroku happy
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.send('it is running\n');
}).listen(process.env.PORT || 5000);
