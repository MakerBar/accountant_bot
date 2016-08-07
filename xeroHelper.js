'use strict';

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
    return fetchBT(1);
}

module.exports = {
    getBankTransactions
};
