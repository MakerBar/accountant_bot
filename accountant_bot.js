'use strict';

var util = require('util');
var Bot = require('slackbots');

var AccountantBot = function Constructor(settings, xeroAuth) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'accountant_bot';
    this.user = null;
    this.db = null;
    this.xeroAuth = xeroAuth;
};

util.inherits(AccountantBot, Bot);

AccountantBot.prototype._onStart = function() {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name == self.settings.name;
    })[0];
};

function getAuthToken(ab, user) {
    // authorize user
    let proms = ab.xeroAuth.getAuthToken(user.id);
    proms.request_promise.then(function(url) {
        if (url) {
            ab.postMessageToUser(user.name, 'please go to ' + url + ' to authorize access to Xero');
        }
    });
    return proms.access_promise;
}

AccountantBot.prototype.handleMessage = function(msg) {
    let ab = this;
    var channel = this._getChannelById(msg.channel);
    var user = this._getUserById(msg.user);
    let command = msg.text.toLowerCase();
    if (command.startsWith('report')) {
        console.log('reporting to', channel, 'for', user.name);
        this.postMessage(msg.channel, "report .. report ... report...");
    }
    if (command.startsWith('balance sheet')) {
        console.log('sending balance sheet to', channel, 'for', user.name);
        getAuthToken(this, user).then(function(access_obj) {
            return ab.xeroAuth.get('api.xro/2.0/Reports/BalanceSheet', access_obj);
        }).then(bs => {
            ab.postMessage(msg.channel, JSON.stringify(bs));
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + JSON.stringify(err));
        });
    }
    if (command.startsWith('oauth request')) {
        console.log('testing oauth for', user.name);
        let path = msg.text.split(' ');
        getAuthToken(this, user).then(function(access_obj) {
            return ab.xeroAuth.get(path[2], access_obj);
        }).then(bs => {
            ab.postMessage(msg.channel, JSON.stringify(bs));
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + JSON.stringify(err));
        });
    }
};

AccountantBot.prototype._onMessage = function(msg) {
    // filter noise messages
    if (['hello', 'reconnect_url', 'presence_change', 'user_typing'].indexOf(msg.type) > -1) {
        return;
    }
    // filter our own messages
    if (msg.user == this.user.id ||
        msg.username == this.user.name) {
        return;
    }
    console.log(msg);
    console.log("-----------");
    if (msg.type == 'message') {
        if (msg.channel[0] == 'C') {
            this.handleMessage(msg);
        } else if (msg.channel[0] == 'D') {
            this.handleMessage(msg);
        }
    }
};

AccountantBot.prototype._getChannelById = function(channelId) {
    return this.channels.find(channel => channel.id === channelId);
};

AccountantBot.prototype._getUserById = function(uid) {
    return this.users.find(user => user.id == uid);
};

AccountantBot.prototype.run = function() {
    AccountantBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

module.exports = AccountantBot;
