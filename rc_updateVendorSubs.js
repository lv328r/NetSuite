/**

*@NApiVersion 2.x

*@NScriptType UserEventScript

*/

define(['N/record', 'N/search'],

function(record, search) {

function afterSubmit(scriptContext) {
var newRecord = scriptContext.newRecord;
    

var recordId=scriptContext.newRecord.id;

var vendorRecord;
vendorRecord = record.load({
                type: record.Type.VENDOR,
                id: recordId,
                isDynamic: false
        });


var subPrimary=vendorRecord.getValue({fieldId: 'subsidiary'});        


var parentSub;
const subsidiaryParentSearchColName = search.createColumn({ name: 'name', sort: search.Sort.ASC });
const subsidiaryParentSearchColCmpanyidSubsidiary = search.createColumn({ name: 'custrecord_rc_cmpanyid' });
const subsidiaryParentSearch = search.create({
  type: 'subsidiary',
  filters: [
    ['internalidnumber', 'equalto', subPrimary],
  ],
  columns: [
    subsidiaryParentSearchColName,
    subsidiaryParentSearchColCmpanyidSubsidiary,
  ],
});
subsidiaryParentSearch.run().each(function(result) {
    const ParentId = String(result.getValue(subsidiaryParentSearchColCmpanyidSubsidiary));
    parentSub = ParentId;
});


var subsChildId = search.load({
    id: 'customsearch_entityportalvendorsubsearch',
    filters: [
      ['custrecord_rc_cmpanyid', 'contains', parentSub],
      'AND',
      ['custrecord_rc_cmpanyid', 'contains', '-'],
    ]
});

var subsChildIdResultSet = subsChildId.run();

var subsChildIdResultSet = subsChildIdResultSet.getRange({
    start: 0,
    end: 100
});

for (var i = 0; i < subsChildIdResultSet.length; i++) {
    var childSubId = subsChildIdResultSet[i].getValue({
        name:'internalId'
    });
    setChildSub(recordId,childSubId);
}


function setChildSub(entityID, subChildID){
    try {
        var csr = record.create({
            type: record.Type.VENDOR_SUBSIDIARY_RELATIONSHIP
        });
        csr.setValue({
            fieldId: 'entity',
            value: entityID
        });
        csr.setValue({
            fieldId: 'subsidiary',
            value: subChildID
        });
        var recId = csr.save();
      } catch (error) {
        log.debug('Tried to add child sub that was already attached, safe error to have');
      }
} 


}

return {

afterSubmit: afterSubmit

};

});