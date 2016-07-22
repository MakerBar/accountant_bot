'use strict';

var OAuth = require('oauth');

var tokensecrets = {};
var authtokens = {};

class XeroAuth {
    constructor(key, secret, host) {
        this.oauth = new OAuth.OAuth(
            'https://api.xero.com/oauth/RequestToken',
            'https://api.xero.com/oauth/AccessToken',
            key,
            secret,
            '1.0A',
            'https://' + host + '/xero/authcallback',
            'HMAC-SHA1'
        );
        this.hostname = host;
    }

    genRequestToken(req, res) {
        var xa = this;
        new Promise(function(resolve, reject) {
            xa.oauth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
                if (err) {
                    reject(err);
                }
                if (results.error) {
                    reject(results.error);
                }
                tokensecrets[oAuthToken] = oAuthTokenSecret;
                resolve({oAuthToken, oAuthTokenSecret});
            });
        }).then(function(tok) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("https://api.xero.com/oauth/Authorize?oauth_token=" + tok.oAuthToken);
        }).catch(function(err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            console.log(err);
            res.end(err);
        });
    }

    verifyToken(req, res) {
        var xa = this;
        var token = req.query.oauth_token;
        var verifier = req.query.oauth_verifier;
        var org = req.query.org;
        var request_token_secret = tokensecrets[token];
        new Promise(function(resolve, reject) {
            xa.oauth.getOAuthAccessToken(token, request_token_secret, verifier,
                function(err, oAuthAccessToken, oAuthAccessTokenSecret, results) {
                if (err) {
                    reject(err);
                }
                if (results.error) {
                    reject(results.error);
                }
                // currently setting the token for 'me'. Should store a user name when requesting the token
                authtokens['me'] = {oAuthAccessToken, oAuthAccessTokenSecret, org};
                resolve(authtokens['me']);
            });
        }).then(function(tok) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("Verified :)\naccess token: " + tok.oAuthAccessToken);
        }).catch(function(err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            console.log(err);
            res.end(err);
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
