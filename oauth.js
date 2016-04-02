'use strict';

var OAuth = require('oauth');

class XeroAuth {
    constructor(key, secret) {
        this.oauth = new OAuth.OAuth(
            'https://api.xero.com/oauth/RequestToken',
            'https://api.xero.com/oauth/AccessToken',
            key,
            secret,
            '1.0A',
            null,
            'HMAC-SHA1'
        );
    }

    get(url, user_token, user_secret) {
        this.oauth.get(url, user_token, user_secret, function(err, data, res) {
            console.log(err);
            console.log("----------------------------------------------------");
            console.log(data);
            console.log("----------------------------------------------------");
            console.log(res);
        });
    }
}

module.exports = XeroAuth;
