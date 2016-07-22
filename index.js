'use strict';

var http = require('http');

var AccountantBot = require('./accountant_bot');
var XeroAuth = require("./oauth");

var slack_token = process.env.BOT_TOKEN;
var xero_key = process.env.XERO_KEY;
var xero_secret = process.env.XERO_SECRET;

var xeroAuth = new XeroAuth(xero_key, xero_secret);
//xeroAuth.get('https://api.xero.com/api.xro/2.0/Users');

// var accountant_bot = new AccountantBot({
//     token: slack_token,
// });
//
// accountant_bot.run();

// silly http server to make heroku happy
http.createServer(function(req, res) {
    console.log("received http request: ", req.url);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    switch (req.url) {
        case "/xero/initauth":
            xeroAuth.genRequestToken(req, res);
            break;
        default:
            res.end('it is running\n');
    }
}).listen(process.env.PORT || process.env.NODE_PORT || 5000, process.env.NODE_IP || 'localhost');
