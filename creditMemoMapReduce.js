/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/error',
    'N/record',
    'N/runtime',
    'N/search'],
    /**
    * @param {email} email
    * @param {error} error
    * @param {record} record
    * @param {runtime} runtime
    * @param {search} search
    */
    function (error, record, runtime, search) {

        /**
        * Map/Reduce Script:
        * Sample Map/Reduce script for blog post.  
        */


        /**
        *
        * @typedef {Object} ObjectRef
        * @property {number} id - Internal ID of the record instance
        * @property {string} type - Record type id
        *
        * @return {Array|Object|Search|RecordRef} inputSummary
        * @since 2015.1
        */
        function getInputData() {
            
            return search.create({
                'type': 'creditmemo',
                'filters': [
                    ['type', 'anyof', 'CustCred'],
                    'AND',
                    ['status', 'anyof', 'CustCred:A'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'onorafter', '3/1/2022'],
                ],
                'columns': [
                    'internalid',
                    'custbody_bcg_so_shopify_order_number',
                    'entity',
                    'account',
                    'amount',
                    'createdfrom',
                    search.createColumn({
                        'name': 'trandate',
                        'sort': search.Sort.DESC
                    })
                ]
            });
        }

        /**
        * 
        *
        * @param {MapSummary} context 
        * @since 2015.1
        */
        function map(context) {
            var invoiceID = '';
            var invoiceTotal;
            var creditMemoTotal = 0.0;

            //log.debug('context', context.value);

            var rowJson = JSON.parse(context.value);
            //log.debug('script', '#' + rowJson.values['custbody_bcg_so_shopify_order_number'])


            const invoiceSearch = search.create({
                'type': 'invoice',
                'filters': [
                    ['type', 'anyof', 'CustInvc'],
                    'AND',
                    ['custbodyshopify_order_tags', 'is', '#' + rowJson.values['custbody_bcg_so_shopify_order_number']],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['status', 'anyof', 'CustInvc:A'],
                  ],
                'columns': [
                    'internalid',
                    'tranid',
                    'account',
                    'amount'
                ]
            });

            var resultSet = invoiceSearch.run();
            resultSet.each(function (result) {
                invoiceID = result.getValue('internalid');
                invoiceTotal = result.getValue('amount');
                return true;
            });

            if(invoiceID !== ''){
                const creditMemoLineSearch = search.create({
                    'type': 'creditmemo',
                    'filters': [
                        ['type', 'anyof', 'CustCred'],
                        'AND',
                        ['internalidnumber', 'equalto', rowJson.values['internalid'].value],
                        'AND',
                        ['cogs', 'is', 'F'],
                        'AND',
                        ['shipping', 'is', 'F'],
                      ],
                    'columns': [
                        'trandate',
                        'postingperiod',
                        'type',
                        'tranid',
                        'entity',
                        'account',
                        'memo',
                        'amount',
                        'custbody_bcg_so_shopify_order_number',
                        'itemtype'
                    ]
                });
    
                var resultSetCml = creditMemoLineSearch.run();
                resultSetCml.each(function (resultCml) {
                    var lineAmount = 0.0;
                    if(resultCml.getValue('itemtype') === 'Assembly' || resultCml.getValue('itemtype') === 'TaxItem' || resultCml.getValue('itemtype') === 'Discount' || resultCml.getValue('itemtype') === 'ShipItem'){
                        lineAmount = resultCml.getValue('amount');
                    }
                    
                    creditMemoTotal = +creditMemoTotal + +lineAmount;
                    return true;
                });
    
                //log.debug('script', invoiceID);
                
                if(creditMemoTotal <= invoiceTotal){
                    //log.debug('script','Apply credit');
                    var creditPaymtRec = record.transform({
                        fromType : record.Type.INVOICE,
                        fromId : invoiceID,
                        toType : record.Type.CUSTOMER_PAYMENT,
                        isDynamic : true
                    });

                    creditPaymtRec.selectLine('credit', '0');
			        creditPaymtRec.setCurrentSublistValue('credit', 'apply', true);
			        creditPaymtRec.commitLine('credit');

                    var creditCustPaymtId = creditPaymtRec.save({
                        enableSourcing : true,
                        ignoreMandatoryFields : true
                    });

                }else{
                    log.debug('script','Credit is greater than invoice total: ' + invoiceTotal + ' / ' + creditMemoTotal);
                }

            }else{
                log.debug('script', 'No Matched Open Invoices');
            }

            
            log.debug('script', 'Finished');
        }

        /**
        * 
        *
        * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
        * @since 2015.1
        */
        function summarize(summary) {
            
            //Grab Map errors
            summary.mapSummary.errors.iterator().each(function (key, value) {
                log.error(key, 'ERROR String: ' + value);


                return true;
            });

        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };

    });