'use strict';

function getAccountDetails(xeroAuth, access_obj) {
    return xeroAuth.get('api.xro/2.0/Accounts', access_obj)
    .then((acRes) => acRes.Accounts);
}

function getAccountsByCode(xeroAuth, access_obj) {
    return getAccountDetails(xeroAuth, access_obj)
    .then((accounts) => {
        return accounts.reduce((idxObj, account) => {
            if (account.Code) {
                idxObj[account.Code] = account;
            }
            return idxObj;
        }, {});
    });
}

function getBankTransactions(xeroAuth, access_obj) {
    function fetchBT(page) {
        return xeroAuth.get('api.xro/2.0/BankTransactions?page=' + String(page), access_obj).then(function(bt) {
            let new_trans = bt.BankTransactions;
            if (new_trans.length == 100) {
                return fetchBT(page + 1).then(function(trans) {
                    return new_trans.concat(trans);
                });
            } else {
                return new_trans;
            }
        });
    }
    return fetchBT(1).then((trans) => {
        return trans.filter(t => t.Status != 'DELETED');
    });
}

function groupByContact(bank_trans) {
    let contact_trans = {};
    // transfers don't have contacts, so filter those out
    bank_trans.filter(t => t.Contact).forEach(function(t) {
        if (!contact_trans[t.Contact.ContactID]) {
            contact_trans[t.Contact.ContactID] = [];
        }
        contact_trans[t.Contact.ContactID].push(t);
    });
    return contact_trans;
}

function groupByTypeAndAccount(trans) {
    const res = {
        spend: {},
        receive: {}
    };
    trans.forEach((tran) => {
        tran.LineItems.forEach((li) => {
            if (!res[tran.Type.toLowerCase()][li.AccountCode]) {
                res[tran.Type.toLowerCase()][li.AccountCode] = {
                    sum: 0,
                    transactions: []
                };
            }
            if (res[tran.Type.toLowerCase()][li.AccountCode].transactions.indexOf(tran) === -1) {
                res[tran.Type.toLowerCase()][li.AccountCode].transactions.push(tran);
            }
            res[tran.Type.toLowerCase()][li.AccountCode].sum += li.LineAmount;
        });
    });
    return res;
}

function transactionByDate(a, b) {
    const aDate = new Date(a.DateString);
    const bDate = new Date(b.DateString);
    if (aDate < bDate) {
        return -1;
    } else if (aDate > bDate) {
        return 1;
    }
    return 0;
}

module.exports = {
    getAccountsByCode,
    getBankTransactions,
    groupByContact,
    groupByTypeAndAccount,
    transactionByDate,
};
