'use strict';

var xeroHelper = require('./xeroHelper');

function makeStatement(contact, bank_trans, accounts) {
    console.log("creating statement", contact);
    const contact_trans = xeroHelper.groupByContact(bank_trans);
    const trans = contact_trans[contact.ContactID];
    let result = "Statement of receipt from " + contact.Name + "\n\n";

    result += 'Transaction Detail\n\n';
    trans.sort(xeroHelper.transactionByDate).forEach(function(tran) {
        tran.LineItems.forEach(function(li) {
            let description = li.Tracking.map(t => {
                return t.Name + ": " + t.Option;
            }).join('\n');
            if (li.Description) {
                if (description.length > 0) {
                    description + ' - ';
                }
                description += li.Description;
            }
            result += tran.DateString.split('T')[0] + ' - ' +
                '$' + parseFloat(li.LineAmount).toFixed(2) + ' - ' +
                accounts[li.AccountCode].Name + ' - ' +
                description +
                '\n';
        });
    });

    result += '\n\nSummary By Account\n\n'

    const summary = xeroHelper.groupByTypeAndAccount(trans);
    for (const accountCode in summary.receive) {
        const sum = parseFloat(summary.receive[accountCode].sum).toFixed(2);
        result += accounts[accountCode].Name + ": " + sum + '\n';
    }

    return result;
}

module.exports = {
    makeStatement
}
