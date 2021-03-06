'use strict';

var http = require('http');

var AccountantBot = require('./accountant_bot');
var XeroAuth = require("./oauth");
var querystring = require('querystring');

var slack_token = process.env.BOT_TOKEN;
var xero_key = process.env.XERO_KEY;
var xero_secret = process.env.XERO_SECRET;
var host = process.env.FQDN;

var xeroAuth = new XeroAuth(xero_key, xero_secret, host);

var accountant_bot = new AccountantBot({
    token: slack_token,
}, xeroAuth);

accountant_bot.run();

http.createServer(function(req, res) {
    console.log("received http request: ", req.url);
    var spl = req.url.split('?');
    var path = spl[0];
    var params = querystring.parse(spl[1]);
    switch (path) {
        case "/xero/initauth":
            xeroAuth.genRequestToken(req, res);
            break;
        case "/xero/authcallback":
            xeroAuth.verifyToken(req, res, params);
            break;
        default:
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('it is running\n');
    }
}).listen(process.env.PORT || process.env.NODE_PORT || 5000, process.env.NODE_IP);
