'use strict';

function getPagedResource(resourceName, xeroAuth, access_obj) {
    function fetchResource(page = 1) {
        return xeroAuth.get('api.xro/2.0/' + resourceName + '?page=' + String(page), access_obj)
        .then((items) => {
            let newItems = items[resourceName];
            if (newItems.length == 100) {
                return fetchResource(page + 1).then((moreItems) => {
                    return newItems.concat(moreItems);
                });
            } else {
                return newItems;
            }
        });
    }
    return fetchResource;
}

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
    return getPagedResource('BankTransactions', xeroAuth, access_obj)()
    .then((trans) => trans.filter(t => t.Status != 'DELETED'));
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

function getContactDetails(xeroAuth, access_obj) {
    return getPagedResource('Contacts', xeroAuth, access_obj)();
}

module.exports = {
    getAccountsByCode,
    getBankTransactions,
    groupByContact,
    groupByTypeAndAccount,
    transactionByDate,
    getContactDetails,
};
