'use strict';

var util = require('util');
var Bot = require('slackbots');
var formatReport = require('./reportformatter');
var xeroHelper = require('./xeroHelper');

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
    if (command.startsWith('balance sheet')) {
        console.log('sending balance sheet to', channel, 'for', user.name);
        getAuthToken(this, user).then(function(access_obj) {
            return ab.xeroAuth.get('api.xro/2.0/Reports/BalanceSheet', access_obj);
        }).then(bs => {
            ab.postMessage(msg.channel, '```' + formatReport(bs.Reports[0]) + '```');
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + JSON.stringify(err));
        });
    }
    if (command.startsWith('member report')) {
        console.log('sending member report to', channel, 'for', user.name);
        getAuthToken(this, user).then(function(access_obj) {
            return xeroHelper.getBankTransactions(ab.xeroAuth, access_obj);
        }).then(function(bank_trans) {
            let contact_trans = {};
            // transfers don't have contacts, so filter those out
            bank_trans.filter(t => t.Contact).forEach(function(t) {
                if (!contact_trans[t.Contact.ContactID]) {
                    contact_trans[t.Contact.ContactID] = [];
                }
                contact_trans[t.Contact.ContactID].push(t);
            });
            let report = 'Member Report\n\n';
            let account_summaries = {};
            Object.keys(contact_trans).forEach(function(contact_id) {
                let trans = contact_trans[contact_id];
                trans.forEach(function(tran) {
                    tran.LineItems.forEach(function(li) {
                        if (!account_summaries[li.AccountCode]) {
                            account_summaries[li.AccountCode] = {};
                        }
                        let acc_summ = account_summaries[li.AccountCode];
                        if (!acc_summ[contact_id]) {
                            acc_summ[contact_id] = {
                                amount: 0,
                                most_recent: new Date('1970')
                            };
                        }
                        let summ = acc_summ[contact_id];
                        summ.amount += li.LineAmount;
                        let t_time = new Date(tran.DateString);
                        if (t_time.getTime() > summ.most_recent) {
                            summ.most_recent = t_time;
                        }
                    });
                });
            });
            ['4730', '4731', '4732'].forEach(function(acc) {
                report += acc + '\n';
                report += Object.keys(account_summaries[acc]).map(function(contact_id) {
                    let contact_info = contact_trans[contact_id][0].Contact;
                    let summ = account_summaries[acc][contact_id];
                    return contact_info.Name + ' $' + summ.amount + ' ' + summ.most_recent.toISOString();
                }).join('\n');
                report += '\n';
            });
            ab.postMessage(msg.channel, '```' + report + '```');
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + String(err) + '\n' + JSON.stringify(err));
        });
    }
    if (command.startsWith('oauth request')) {
        console.log('testing oauth for', user.name);
        let path = msg.text.split(' ');
        getAuthToken(this, user).then(function(access_obj) {
            return ab.xeroAuth.get(path[2], access_obj);
        }).then(bs => {
            ab.postMessage(msg.channel, ```JSON.stringify(bs)```);
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
        // you can tell the type of message based on the first character of msg.channel
        // C = channel, D = direct, G = (private) group
        this.handleMessage(msg);
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
