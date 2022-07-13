/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define(['N/record','N/search', 'N/log'], function(record,search, log) {
    function onAction(scriptContext){
       var newRecord = scriptContext.newRecord;

       var recordID = newRecord.getValue({
            fieldId: 'id'
       });

        log.debug({
            title: 'Start Script',
            details: recordID
        });
        

        var updateRecord;
        updateRecord = record.load({
                type: record.Type.EMPLOYEE,
                id: String(recordID),
                isDynamic: true
        });

        //updateRecord.setValue({ fieldId: 'comments', value: 'Global Permissions Updated' });

        updateRecord.selectNewLine({ "sublistId": "empperms" });
        updateRecord.setCurrentSublistValue({ "sublistId": "empperms", "fieldId": "line", "value": 1 });
        updateRecord.setCurrentSublistValue({ "sublistId": "empperms", "fieldId": "permkey1", "value": 'ADMI_ALLOWNONGLCHANGES' });
        updateRecord.setCurrentSublistValue({ "sublistId": "empperms", "fieldId": "permlevel1", "value": '4' });
        updateRecord.setCurrentSublistValue({ "sublistId": "empperms", "fieldId": "permlevel1_display", "value": 'Full' });

        updateRecord.commitLine({ "sublistId": "empperms" });
      

        updateRecord.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });

        
        return 1;
    }
    return {
        onAction: onAction
    }
}); 