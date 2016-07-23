'use strict';

var OAuth = require('oauth');

var tokensecrets = {};

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

    getAuthToken() {
        var xa = this;
        var access_resolve, access_reject;
        var access_promise = new Promise(function(resolve, reject) {
            access_resolve = resolve;
            access_reject = reject;
        });
        var request_promise = new Promise(function(resolve, reject) {
            xa.oauth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
                if (err) {
                    reject(err);
                }
                if (results.error) {
                    reject(results.error);
                }
                tokensecrets[oAuthToken] = {oAuthTokenSecret, prom: {resolve: access_resolve, reject: access_reject}};
                resolve("https://api.xero.com/oauth/Authorize?oauth_token=" + oAuthToken);
            });
        });
        return {request_promise, access_promise};
    }

    genRequestToken(req, res) {
        var xa = this;
        this.getAuthToken().request_promise.then(function(url) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(url);
        }).catch(function(err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            console.log(err);
            res.end(err);
        });
    }

    verifyToken(req, res, params) {
        var xa = this;
        var token = params.oauth_token;
        var verifier = params.oauth_verifier;
        var org = params.org;
        var request_token_secret = tokensecrets[token].oAuthTokenSecret;
        new Promise(function(resolve, reject) {
            xa.oauth.getOAuthAccessToken(token, request_token_secret, verifier,
                function(err, oAuthAccessToken, oAuthAccessTokenSecret, results) {
                if (err) {
                    reject(err);
                }
                if (results.error) {
                    reject(results.error);
                }
                tokensecrets[token].prom.resolve({oAuthAccessToken, oAuthAccessTokenSecret, org});
                resolve();
            });
        }).then(function(tok) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("Thank you for verifying");
        }).catch(function(err) {
            tokensecrets[token].prom.reject(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            console.log("error in verifyToken", err);
            res.end(err);
        });
    }

    get(path, auth) {
        return new Promise((resolve, reject) => {
            this.oauth.get('https://api.xero.com/' + path, auth.oAuthAccessToken, auth.oAuthAccessTokenSecret, function(err, data, res) {
                if (err) {
                    reject(err);
                }
                if (res.error) {
                    reject(res.error);
                }
                console.log("got", typeof(data), 'back from Xero');
                resolve(data);
            });
        });
    }
}

module.exports = XeroAuth;
