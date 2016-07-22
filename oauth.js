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

    genRequestToken(req, res) {
        let xa = this;
        let get_token = new Promise(function(resolve, reject) {
            xa.oauth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
                if (err) {
                    reject(err);
                }
                if (results.error) {
                    reject(results.error)
                }
                resolve({oAuthToken, oAuthTokenSecret});
            });
        });
        get_token.then(function(tok) {
            res.end("https://api.xero.com/oauth/Authorize?oauth_token=" + tok.oAuthToken);
        }).catch(function(err) {
            console.log(err);
        });
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
