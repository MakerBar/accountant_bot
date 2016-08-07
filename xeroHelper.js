'use strict';

function getBankTransactions(xeroAuth, access_obj) {
    // TODO: load all pages
    return xeroAuth.get('api.xro/2.0/BankTransactions?page=1').then(function(bt) {
        return bt.BankTransactions;
    });
}

module.exports = {
    getBankTransactions
};
