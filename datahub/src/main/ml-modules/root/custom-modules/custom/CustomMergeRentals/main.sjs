/*
  Copyright 2012-2019 MarkLogic Corporation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/* Custom steps for data hub 5 are 'on rails' code execution within a single transaction, after which the output
   from these steps will create in-memory objects that will then be written in one single, isolated transaction.

   This is designed to run in QUERY (read-only) mode by default. If you need transactionally consistent updates or
   serializable read locking on documents, then you must upgrade to an UPDATE transaction either through an update
   (such as declareUpdate()) or by setting the value of 'stepUpdate' as true in the options and it will be
   executed in update mode.
 */
const DataHub = require("/data-hub/5/datahub.sjs");
const datahub = new DataHub();

function transformCustomer(inputDoc) {
  let doc = inputDoc.toObject()
  let newContent = doc;
  if ( doc && doc.envelope && doc.envelope.headers && doc.envelope.headers && doc.envelope.headers.merges ) {
    let allRentals=[]
    for ( const sourceDocUri of doc.envelope.headers.merges.map(x=>x["document-uri"]) ) {
      if ( sourceDocUri ) {
        const doc = cts.doc(sourceDocUri)
        if ( !fn.empty(doc)) {
          const rentals = doc.xpath("envelope/instance/Customer/rentals")
          for ( const rental of rentals || [] ) {
            allRentals.push(rental.toObject())
          }
        }
      }
    }
    xdmp.log(allRentals.length);
    newContent.envelope.instance.Customer.rentals = allRentals;
  }
  return newContent
}

function main(content, options) {
  let id = content.uri;
  content = {};
  // content.value seems not always filled so we need to reread it again.
  content.value = transformCustomer(cts.doc(id));
  content.uri = id;
  let collections=xdmp.documentGetCollections(id);
  collections.push("CustomMergeRentals");
  let context = {}
  context.collections = collections;
  content.context = context;
  return content;
}

module.exports = {
  main: main
};
