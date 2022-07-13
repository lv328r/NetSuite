/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
 define(['N/search', 'N/record', 'N/xml', 'N/error'],
 /**
  * @param {search} search
  * @param {record} record
  */


 function (search, record, xml, error) {

     function doGet() {
         return "Hello World!!"
     }

     function doPut(requestBody) {

     }

     function doPost(requestBody) {
         /**jaggaer cannot provide clean xml, need to fix ampersand, hopefully nothing else dirt pops up*/
         var timeStamp = new Date();
         var bodyFixed = requestBody.replace(/&/g, '&amp;');
         var xmlDocument = xml.Parser.fromString({
             text : bodyFixed
         });

         /**setup main xml nodes*/
         try {
            var jagHeadNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Header'
            });
   
            var supplierNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceHeader/Supplier'
            });
   
            var headerNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceHeader'
            });
   
            var userprofileNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceHeader/InvoicedBy/UserProfile'
            });
   
            var termsNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceHeader/Terms'
            });
   
            var invoiceLineNode = xml.XPath.select({
                node : xmlDocument,
                xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceLine'
            });
               
            var splittableFieldIndexNode = xml.XPath.select({
               node : xmlDocument,
               xpath : '//BuyerInvoiceExportMessage/Invoice/InvoiceLine/SplittableFieldSetGroup/SplittableFieldIndexSet/SplittableFieldIndex/CustomeFieldValue'
           });

         } catch (error) {
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Error whilst assigning nodes.</StatusText></Status></Response></DocumentExportResponse>';
           
         }
         


         /**grab our values*/
         try{

            var jagMessId = jagHeadNode[0].getElementsByTagName({
                tagName: 'MessageId'
            })[0].textContent;
   
            var credit = false;
            if(headerNode[0].getElementsByTagName({
                tagName: 'InvoiceType'
            })[0].textContent === 'Credit memo'){
                credit = true;
            }
   
            var vendorTranid = headerNode[0].getElementsByTagName({
                tagName: 'SupplierInvoiceNo'
            })[0].textContent;
   
            var vendorCustbody1 = headerNode[0].getElementsByTagName({
                tagName: 'InvoiceNumber'
            })[0].textContent;
   
            var vendorEntity = supplierNode[0].getElementsByTagName({
                tagName: 'Name'
            })[0].textContent;
   
            var vendorCustbodysikrequestorF = userprofileNode[0].getElementsByTagName({
                tagName: 'FirstName'
            })[0].textContent;
   
            var vendorCustbodysikrequestorL = userprofileNode[0].getElementsByTagName({
                tagName: 'LastName'
            })[0].textContent;
   
            var vendorInvoicedate = headerNode[0].getElementsByTagName({
                tagName: 'InvoiceDate'
            })[0].textContent;
   
            var vendorPostingPeriod = headerNode[0].getElementsByTagName({
                tagName: 'AccountingDate'
            })[0].textContent;
   
            var vendorDueDate = headerNode[0].getElementsByTagName({
                tagName: 'DueDate'
            })[0].textContent;
   
            var vendorTerms = termsNode[0].getElementsByTagName({
                tagName: 'Type'
            })[0].textContent + ' ' + termsNode[0].getElementsByTagName({
                tagName: 'DaysAfter'
            })[0].textContent;

            var vendorCurrency = headerNode[0].getElementsByTagName({
                tagName: 'Currency'
            })[0].textContent;

         } catch(error){
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Error while setting base values.</StatusText></Status></Response></DocumentExportResponse>';
          }
        
          
          //filter/sort/fix data
         try{
            var invoiceDate = dateFormat(vendorInvoicedate);
            var invoiceDueDate = dateFormat(vendorDueDate);
            var postingDate = postingDateFormat(vendorPostingPeriod);
            var invoiceTerms = getTerms(vendorTerms);
            var invoiceCurrency = getCurrency(vendorCurrency);
         }catch(error){
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Data filter error.</StatusText></Status></Response></DocumentExportResponse>';
         }
         

         /**search for entity id by vendor name*/
         var entityId;
         const vendorSearchColInternalId = search.createColumn({ name: 'internalid' });
         const vendorSearchColName = search.createColumn({ name: 'entityid', sort: search.Sort.ASC });
         const vendorSearch = search.create({
             type: 'vendor',
             filters: [
                 ['entityid', 'is', String(vendorEntity)],
             ],
             columns: [
                 vendorSearchColInternalId,
                 vendorSearchColName,
             ],
         });

         vendorSearch.run().each(function(result) {
             const internalId = String(result.getValue(vendorSearchColInternalId));
             entityId = internalId;
         });

         //if no vendor found throw error
         if (typeof entityId === 'undefined'){
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Vendor is not in database.</StatusText></Status></Response></DocumentExportResponse>';
        };

         /**search for id by employee name*/
         var emplId;
         const employeeSearchColInternalId = search.createColumn({ name: 'internalid' });
         const employeeSearchColName = search.createColumn({ name: 'entityid', sort: search.Sort.ASC });
         const employeeSearch = search.create({
             type: 'employee',
             filters: [
                 ['firstname', 'is', String(vendorCustbodysikrequestorF)],
                 'AND',
                 ['lastname', 'is', String(vendorCustbodysikrequestorL)],
             ],
             columns: [
                 employeeSearchColInternalId,
                 employeeSearchColName,
             ],
         });

         employeeSearch.run().each(function(result) {
             const internalId = String(result.getValue(employeeSearchColInternalId));
             emplId = internalId;
         });

         //if no employee found throw error
         if (typeof emplId === 'undefined'){
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Affinivax employee is not in database.</StatusText></Status></Response></DocumentExportResponse>';
          };

          
         /**search for accounting period internalid*/
         var postPeriod
         const accountingperiodSearchColInternalId = search.createColumn({ name: 'internalid' });
         const accountingperiodSearchColName = search.createColumn({ name: 'periodname', sort: search.Sort.ASC });
         const accountingperiodSearch = search.create({
             type: 'accountingperiod',
             filters: [
                 ['periodname', 'is', postingDate],
             ],
             columns: [
                 accountingperiodSearchColInternalId,
                 accountingperiodSearchColName,
             ],
         });

         accountingperiodSearch.run().each(function(result) {
             const internalId = String(result.getValue(accountingperiodSearchColInternalId));
             postPeriod = internalId;
         });

      
         /**setup vendor bill/credit record*/
         var vendorBill;
         if(credit === true){
             vendorBill = record.create({
                 type: record.Type.VENDOR_CREDIT,
                 isDynamic: true
             });
         }else{
             vendorBill = record.create({
                 type: record.Type.VENDOR_BILL,
                 isDynamic: true
             });
         }

      
        
         //set base record values
         try{
            vendorBill.setValue({
                fieldId: 'entity',
                value: entityId
            }).setValue({
                fieldId: 'tranid',
                value: vendorTranid
            }).setValue({
                fieldId: 'custbody1',
                value: vendorCustbody1
            }).setValue({
               fieldId: 'account',
               value: '111'
           }).setValue({
                fieldId: 'custbody_sik_requestor',
                value: emplId
            }).setValue({
                fieldId: 'trandate',
                value: new Date(invoiceDate)
            }).setValue({
                fieldId: 'postingperiod',
                value: postPeriod
            }).setValue({
                fieldId: 'duedate',
                value: new Date(invoiceDueDate)
            }).setValue({
                fieldId: 'terms',
                value: invoiceTerms
            }).setValue({
                fieldId: 'memo',
                value: 'Vendor Bill/Credit From Jaggaer'
            }).setValue({
                fieldId: 'custbody_sik_cust_po_number',
                value: vendorCustbody1
            }).setValue({
                fieldId: 'department',
                value: 5
            }).setValue({
                fieldId: 'class',
                value: 18
            }).setValue({
                fieldId: 'custbody_cseg_sik_project',
                value: 4
            }).setValue({
               fieldId: 'custbody_jaggaerinvoice',
               value: vendorCustbody1
           }).setValue({
               fieldId: 'custbody_jaggaer_invoice',
               value: true
           });
         }catch(error){
            return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>400</StatusCode><StatusText>Error while creating main record.</StatusText></Status></Response></DocumentExportResponse>';
         }
         
        

         
         for (var i = 0; i < invoiceLineNode.length; i++) {

             var memo = invoiceLineNode[i].getElementsByTagName({tagName: 'Quantity'})[0].textContent; 

             var unitQty = invoiceLineNode[i].getElementsByTagName({tagName: 'Quantity'})[0].childNodes[0].nodeValue; 
             var unitPrice = Math.abs(invoiceLineNode[i].getElementsByTagName({tagName: 'UnitPrice'})[0].childNodes[0].nodeValue); 
             var unitAmmount = Math.abs(invoiceLineNode[i].getElementsByTagName({tagName: 'Quantity'})[0].textContent * invoiceLineNode[i].getElementsByTagName({tagName: 'UnitPrice'})[0].textContent);
             var PONumber = invoiceLineNode[i].getElementsByTagName({tagName: 'PONumber'})[0].textContent; 
             
             
            var itemLineTags = invoiceLineNode[i].getElementsByTagName('*');
            for (var k = 0; k < itemLineTags.length; k++) {
                if(itemLineTags[k].nodeName === 'Item'){
                    var itemCommodityCodeDescription =  itemLineTags[k].getElementsByTagName('CommodityCodeDescription')[0].textContent;
                    var itemDescription =  itemLineTags[k].getElementsByTagName('Description')[0].textContent;
                    var itemUnitOfMeasureDimension =  itemLineTags[k].getElementsByTagName('UnitOfMeasureDimension')[0].textContent;
                    //var itemUnitOfMeasureQuantity =  itemLineTags[k].getElementsByTagName('UnitOfMeasureQuantity')[0].textContent;
                    var itemProductType =  itemLineTags[k].getElementsByTagName('ProductType')[0].textContent;
                }

                if(itemLineTags[k].nodeName === 'SplittableFieldSetGroup'){
                    var splitFieldIndex = itemLineTags[k].getElementsByTagName('SplittableFieldIndex');
                    var splitLineTags = splitFieldIndex[0].getElementsByTagName('*');
                    
                    for (var j = 0; j < splitLineTags.length; j++) {
                        if (splitLineTags[j].getAttribute({name : 'name'}) === 'account'){
                            var itemAccountNum =  splitLineTags[j].getElementsByTagName('Value')[0].textContent;
                        }
                        if (splitLineTags[j].getAttribute({name : 'name'}) === 'Program'){
                            var itemProgramNum =  splitLineTags[j].getElementsByTagName('Value')[0].textContent;
                        }
                        if (splitLineTags[j].getAttribute({name : 'name'}) === 'Project'){
                            var itemProjectNum =  splitLineTags[j].getElementsByTagName('Value')[0].textContent;
                        }
                        if (splitLineTags[j].getAttribute({name : 'name'}) === 'Department'){
                            var itemDepartment =  splitLineTags[j].getElementsByTagName('Value')[0].textContent;
                        }
                    }
                }
            }
           
                        
             /**search for item account id */
             var itemNumber;
             const itemSearchColExternalId = search.createColumn({ name: 'externalid' });
             const itemSearchColName = search.createColumn({ name: 'itemid', sort: search.Sort.ASC });
             const itemSearchColInternalId = search.createColumn({ name: 'internalid' });
             const itemSearch = search.create({
               type: 'item',
               filters: [
                 ['custitem_item_account_number', 'is', String(itemAccountNum)],
               ],
               columns: [
                 itemSearchColExternalId,
                 itemSearchColName,
                 itemSearchColInternalId,
               ],
             });
    
             itemSearch.run().each(function(result) {
                const internalId = String(result.getValue(itemSearchColInternalId));
                itemNumber = internalId;
            });

            //search for coa id
            var coaId;
            const accountSearchColDisplayName = search.createColumn({ name: 'displayname' });
            const accountSearchColInternalId = search.createColumn({ name: 'internalid' });
            const accountSearch = search.create({
            type: 'account',
            filters: [
                ['number', 'is', String(itemAccountNum)],
            ],
            columns: [
                accountSearchColDisplayName,
                accountSearchColInternalId,
            ],
            });
            accountSearch.run().each(function(result) {
                const internalId = String(result.getValue(accountSearchColInternalId));
                coaId = internalId;
            });

            //search for program (class)
            var programID;
            const classificationSearchColName = search.createColumn({ name: 'name', sort: search.Sort.ASC });
            const classificationSearchColInternalId = search.createColumn({ name: 'internalid' });
            const classificationSearch = search.create({
              type: 'classification',
              filters: [
                ['name', 'contains', itemProgramNum],
              ],
              columns: [
                classificationSearchColName,
                classificationSearchColInternalId,
              ],
            });
            classificationSearch.run().each(function(result) {
                const internalId = String(result.getValue(accountSearchColInternalId));
                programID = internalId;
            });

            //if we do not have a program match then default to no project(18)
            if (typeof programID === 'undefined'){programID = '18'};

            var departmentID;
            const departmentSearchColName = search.createColumn({ name: 'name', sort: search.Sort.ASC });
            const departmentSearchColInternalId = search.createColumn({ name: 'internalid' });
            const departmentSearch = search.create({
            type: 'department',
            filters: [
                ['name', 'contains', itemDepartment],
            ],
            columns: [
                departmentSearchColName,
                departmentSearchColInternalId,
            ],
            });
            departmentSearch.run().each(function(result) {
                const internalId = String(result.getValue(departmentSearchColInternalId));
                departmentID = internalId;
            });

            //if we do not have a department match then default to no 000111 - No Department(5)
            if (typeof departmentID === 'undefined'){departmentID = '5'};

            
             vendorBill.selectNewLine({"sublistId": "item"});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "line", "value": i +1});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "item", "value": itemNumber});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "quantity", "value": unitQty});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "account", "value": coaId});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "rate", "value": unitPrice});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "memo", "value": memo});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "department", "value": departmentID});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "custbody_cseg_sik_project", "value": itemProjectNum.replace('Project ','')});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "class", "value": programID});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "custcol_po_line_number", "value": PONumber});
             vendorBill.setCurrentSublistValue({"sublistId": "item", "fieldId": "description", "value": itemCommodityCodeDescription});
             
             vendorBill.commitLine({"sublistId": "item"});
         }




         vendorBill.save({
             enableSourcing: true,
             ignoreMandatoryFields: false
         });


        
         var returnSuccess = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE DocumentExportResponse SYSTEM "https://integrations.sciquest.com/app_docs/dtd/documentExport/DocumentExport.dtd"><DocumentExportResponse version="1.0"><Header><MessageId>' + jagMessId + '</MessageId><Timestamp>' + timeStamp.toISOString() + '</Timestamp></Header><Response><Status><StatusCode>200</StatusCode><StatusText>successful</StatusText></Status></Response></DocumentExportResponse>';
         return returnSuccess;
        
     }

     function getTerms(term){
         const termAr = [
             ['Net 15',1],['Net 30',2],['Net 60',3],['Due on receipt',4],['1% 10 Net 30',5],['2% 10 Net 30',6],['Net 10',7],['Net 14',8],['Net 20',9],['Net 25',10],['Net 31',11],['Net 5',12],['Net 7',13],['Net 10 EOM',14],['NET 10-2% OR NET 30',15]
         ];

         for( var i = 0, len = termAr.length; i < len; i++ ) {
             if( termAr[i][0] === term ) {
                 return String(termAr[i][1]);
                 break;
             }
         }
         return 'not found';
     }

     function getCurrency(curr){
        const currAr = [
            ['USD',1],['GBP',2],['CAD',3],['EUR',4],['KRW',5]
        ];

        for( var i = 0, len = currAr.length; i < len; i++ ) {
            if( currAr[i][0] === curr ) {
                return String(currAr[i][1]);
                break;
            }
        }
        return 'not found';
    }

     function dateFormat(inputDate) {
         var pattern = /(\d{4})\-(\d{2})\-(\d{2})/;
         if (!inputDate || !inputDate.match(pattern)) {
             return null;
         }
         return inputDate.replace(pattern, '$2/$3/$1');
     }

     function postingDateFormat(inputDate) {
         var pattern = /(\d{4})\-(\d{2})\-(\d{2})/;
         if (!inputDate || !inputDate.match(pattern)) {
             return null;
         }
         const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
         ];
         var holdDate = new Date(inputDate.replace(pattern, '$2/$3/$1'));
         var month =  monthNames[holdDate.getMonth()];

         return String(month + ' ' + holdDate.getFullYear());
     }

     function errorCatch(eTitle, eMessage){
        var errorObj = error.create({
            name: eTitle,
            message: eMessage,
            notifyOff: true,
        })
        throw errorObj.name + ": " + errorObj.message
     }

     

     return {
         'get': doGet,
         'put': doPut,
         'post': doPost
     };

 });