/**

*@NApiVersion 2.1

*@NScriptType UserEventScript

*/

define(['N/record', 'N/error', 'N/ui/dialog'],

    function (record, error, dialog) {
        var exports = {};

        function beforeSubmit(scriptContext) {
            var currentRecord = scriptContext.newRecord;

            if (isVwrOrderChecked(currentRecord) && !hasValidAddress(currentRecord)) {
                var errorObj = error.create({
                    "name": " Ship to address is not valid: ",
                    "message": "Cannot ship to PO Box",
                    "notifyOff": true
                });

                throw errorObj.name + errorObj.message;
            }
        }
    
    
        function isVwrOrderChecked(currentRecord) {
            return (currentRecord.getValue({"fieldId" : "custbody_vwr_order"}));
        }
    
        function hasValidAddress(currentRecord) {
            const poArray = ['PO BOX', 'P.O. BOX', 'P.O BOX', 'PO. BOX', 'POSTAL BOX', 'POBOX', 'PBOX', 'PO OX', 'P BOX', 'POB', 'P.O.B', 'P.O.B.'];

            var shipaddrSubrecord = currentRecord.getSubrecord({ fieldId: 'shippingaddress' });
            var shipAddressL1 = shipaddrSubrecord.getValue('addr1').toUpperCase();
            var shipAddressL2 = shipaddrSubrecord.getValue('addr2').toUpperCase();

            if (poArray.some(v => shipAddressL1.includes(v))) {
                log.debug({ title: 'regex', details: 'Match on line1: ' + shipAddressL1 });
                return (false);
            }

            if (poArray.some(v => shipAddressL2.includes(v))) {
                log.debug({ title: 'regex', details: 'Match on line2: ' + shipAddressL2 });
                return (false);
            }
          
            return (true);
        }
    
        exports.beforeSubmit = beforeSubmit;
        return exports;

    });
