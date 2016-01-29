'use strict';

var util = require('util');
var Bot = require('slackbots');

var AccountantBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'accountant_bot';
    this.user = null;
    this.db = null;
};

util.inherits(AccountantBot, Bot);

AccountantBot.prototype._onStart = function() {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name == self.settings.name;
    })[0];
    
    this.postMessageToUser('bert', 'I\'m awake!');
};

AccountantBot.prototype.handlePublicMessage = function(msg) {
    if (msg.text == 'report') {
        let channel = this._getChannelById(msg.channel);
        console.log('reporting to', channel);
        this.postMessageToChannel(channel.name, "report .. report ... report...");
    }
};

AccountantBot.prototype.handlePrivateMessage = function(msg) {
    if (msg.text == 'report') {
        let channel = this._getChannelById(msg.channel);
        console.log('reporting to', channel);
        this.postMessageToChannel(channel.name, "report .. report ... report...");
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
            this.handlePublicMessage(msg);
        } else if (msg.channel[0] == 'D') {
            this.handlePrivateMessage(msg);
        }
    }
};

AccountantBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

AccountantBot.prototype.run = function() {
    AccountantBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

module.exports = AccountantBot;
