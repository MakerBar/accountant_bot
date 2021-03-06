'use strict';

var util = require('util');
var Bot = require('slackbots');
var formatReport = require('./reportformatter');
var xeroHelper = require('./xeroHelper');
var {makeStatement} = require('./statement.js');

const snippetEscape = (str) => '```\n' + str + '\n```';

var AccountantBot = function(settings, xeroAuth) {
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
            ab.postMessage(msg.channel, snippetEscape(formatReport(bs.Reports[0])));
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + JSON.stringify(err));
        });
    }
    if (command.startsWith('member report')) {
        console.log('sending member report to', channel, 'for', user.name);
        getAuthToken(this, user).then(function(access_obj) {
            return xeroHelper.getBankTransactions(ab.xeroAuth, access_obj);
        }).then(function(bank_trans) {
            let contact_trans = xeroHelper.groupByContact(bank_trans);
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
            ['4730', '4732', '4731'].forEach(function(acc) {
                report += acc + '\n';
                report += Object.keys(account_summaries[acc])
                .sort(function(id_a, id_b) {
                    let contact_a = contact_trans[id_a][0].Contact;
                    let contact_b = contact_trans[id_b][0].Contact;
                    if (contact_a.Name < contact_b.Name) {
                        return -1;
                    } else if (contact_a.Name > contact_b.Name) {
                        return 1;
                    }
                    return 0;
                }).map(function(contact_id) {
                    let contact_info = contact_trans[contact_id][0].Contact;
                    let summ = account_summaries[acc][contact_id];
                    return contact_info.Name + ' $' + summ.amount + ' ' + summ.most_recent.toISOString();
                }).join('\n');
                report += '\n';
            });
            ab.postMessage(msg.channel, snippetEscape(report));
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + String(err) + '\n' + JSON.stringify(err));
        });
    }
    if (command.startsWith('statement')) {
        const prefix = 'statement ';
        const query = command.slice(prefix.length).trim();
        if (!query) {
            ab.postMessage(msg.channel, "Sorry, I need to know who you want a statement for.");
            return;
        }
        console.log('sending statement to', channel, 'for', user.name);
        getAuthToken(this, user).then(function(access_obj) {
            return Promise.all([
                xeroHelper.getBankTransactions(ab.xeroAuth, access_obj),
                xeroHelper.getAccountsByCode(ab.xeroAuth, access_obj)
            ]);
        }).then(([bank_trans, accounts]) => {
            bank_trans = bank_trans.filter(t => t.Type == 'RECEIVE'); // filter out spends
            const contact_trans = xeroHelper.groupByContact(bank_trans);
            const contacts = Object.keys(contact_trans).map(id => contact_trans[id][0].Contact);
            let matching_contacts = contacts.filter(c => {
                if (!c.Name) {
                    console.log(c);
                }
                return c.Name && c.Name.toLowerCase().indexOf(query.toLowerCase()) > -1;
            });
            if (matching_contacts.length === 0) {
                throw "Sorry, no contacts found for " + query;
            } else if (matching_contacts.length === 1) {
                const result = makeStatement(matching_contacts[0], bank_trans, accounts);
                ab.postMessage(msg.channel, snippetEscape(result));
            } else {
                let result = "Found multiple contacts for: " + query + "\nWho did you mean?\n";
                matching_contacts.forEach(c => {result += c.Name + '\n';});
                throw result;
            }
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + String(err) + '\n' + JSON.stringify(err));
        });
    }
    if (command.startsWith('annual statements')) {
        getAuthToken(this, user).then((access_obj) => {
            return Promise.all([
                xeroHelper.getContactDetails(this.xeroAuth, access_obj),
                xeroHelper.getBankTransactions(ab.xeroAuth, access_obj),
                xeroHelper.getAccountsByCode(ab.xeroAuth, access_obj)
            ]);
        }).then(([contacts, bankTrans, accounts]) => {
            bankTrans = bankTrans.filter(t => t.Type == 'RECEIVE'); // filter out spends
            // filter to just 2017
            bankTrans = bankTrans.filter(t => (new Date(t.DateString)).getTime() >= Date.UTC(2017,0,1));
            bankTrans = bankTrans.filter(t => (new Date(t.DateString)).getTime() < Date.UTC(2018,0,1));
            contacts.forEach(contact => {
                const result = makeStatement(contact, bankTrans, accounts);
                if (result) {
                    ab.postMessage(msg.channel, snippetEscape(result));
                }
            })
        }).catch(err => {
            ab.postMessage(msg.channel, "Sorry, an error occurred: " + String(err) + '\n' + JSON.stringify(err));
        });
    }
    if (command.startsWith('oauth request')) {
        console.log('testing oauth for', user.name);
        let path = msg.text.split(' ');
        getAuthToken(this, user).then(function(access_obj) {
            return ab.xeroAuth.get(path[2], access_obj);
        }).then(result => {
            console.log(result);
            ab.postMessage(msg.channel, snippetEscape(JSON.stringify(result)));
        }).catch(err => {
            console.log(String(err), err);
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
