/**
 * Copyright 2016 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * Licensed Materials - Property of IBM
 * © Copyright IBM Corp. 2016
 */

var test = require('tape');
var hfc = require('../..');
var path = require('path');
var execSync = require('child_process').execSync;
var utils = require('../../lib/utils.js');

var grpc = require('grpc');
var _fabricProto = grpc.load("../../lib/protos/fabric.proto").protos;
var _chaincodeProto = grpc.load("../../lib/protos/chaincode.proto").protos;

// FileKeyValueStore tests /////////////
var FileKeyValueStore = require('../../lib/FileKeyValueStore.js');
var keyValStorePath = "/tmp/keyValStore";
var testKey = "keyValFileStoreKey";
var testValue = "secretKeyValue";
var store1 = "";
// End: FileKeyValueStore tests ////////

// Chain tests /////////////
var Chain = require('../../lib/Chain.js');
var chainName = "testChain";
var keyValStorePath2 = keyValStorePath + "2";
var store2 = "";
var chain = null;
// End: Chain tests ////////

// Peer tests ////////
// var Peer = require('../../lib/Peer.js');
// var EventEmitter = require('events');
// End: Peer tests ////////


//
// Run the FileKeyValueStore test
//
test('FileKeyValueStore constructor test', function(t) {
    cleanupFileKeyValueStore(keyValStorePath);
    
    store1 = new FileKeyValueStore(keyValStorePath);
    var exists = utils.exists(getAbsolutePath(keyValStorePath));
    if (exists)
        t.pass("FileKeyValueStore constructor test:  Successfully created new directory");
    else         
        t.fail("FileKeyValueStore constructor test:  Failed to create new directory: " + keyValStorePath);

    t.end();
})

test('FileKeyValueStore setValue test', function(t) {
    store1.setValue(testKey, testValue)
    .then(function(result) {
        if (result) {
            t.pass("FileKeyValueStore setValue test:  Successfully set value");
        
            var exists = utils.exists(getAbsolutePath(keyValStorePath), testKey);
            if (exists) {
                t.pass("FileKeyValueStore setValue test:  Verified the file for key " + testKey + " does exist");
            } else {
                t.fail("FileKeyValueStore setValue test:  Failed to create file for key " + testKey + "");
            }
        } else {
            t.fail("FileKeyValueStore setValue test:  Failed to set value");            
        }
    });

    t.end();
})
    
test('FileKeyValueStore getValue test', function(t) {
    store1.getValue(testKey)
    .then(
        // Log the fulfillment value
        function(val) {
            if (val != testValue) {
                t.fail("FileKeyValueStore getValue test:  "+ val + " does not equal testValue of " + testValue + "for FileKeyValueStore read and write test");
            } else {
                t.pass("FileKeyValueStore getValue test:  Successfully retrieved value");
            }
        })
    .catch(
        // Log the rejection reason
        function(reason) {
            t.fail(reason);
        });

    t.end();

});

test('Chain setKeyValueStore test', function(t) {
    cleanupFileKeyValueStore(keyValStorePath2);

    chain = new Chain(chainName);
    chain.setKeyValueStore(hfc.newKeyValueStore(keyValStorePath2));

    var exists = utils.exists(getAbsolutePath(keyValStorePath2));
    if (exists)
        t.pass("Chain setKeyValueStore test:  Successfully created new directory");
    else 
        t.fail("Chain setKeyValueStore test:  Failed to create new directory: " + keyValStorePath2);
    
    t.end();
});

test('Chain getKeyValueStore test', function(t) {
    store2 = chain.getKeyValueStore();

    store2.setValue(testKey, testValue)
    .then(function(result) {
        if (result) {
            t.pass("Chain getKeyValueStore test:  Successfully set value");

            var exists = utils.exists(getAbsolutePath(keyValStorePath2), testKey);
            if (exists)
                t.pass("Chain getKeyValueStore test:  Verified the file for key " + testKey + " does exist");
            else {
                t.fail("Chain getKeyValueStore test:  Failed to create file for key " + testKey + "");
            }
        } else {
            t.fail("Chain getKeyValueStore test:  Failed to set value");
        }
    });
    t.end();
});

test('Chain KeyValueStore getValue test', function(t) {
    store2.getValue(testKey)
    .then(
        // Log the fulfillment value
        function(val) {
            if (val != testValue) {
                t.fail("Chain KeyValueStore getValue test:  " + val + " does not equal testValue of " + testValue + "");
            } else 
                t.pass("Chain KeyValueStore getValue test:  Successfully retrieved value");
        })
    .catch(
        // Log the rejection reason
        function(reason) {
            t.fail(reason);
        });
    t.end();
});

// test('Peer test', function(t) {
//     var peer = new Peer("grpc://localhost:7051");

//     var emitter = new EventEmitter();
//     emitter.on("submitted", function(data) {
//         t.pass("Successfully submitted transaction. " + data);
//         t.end();
//     });
//     emitter.on("error", function(err) {
//         t.fail("ERROR! " + err);
//         t.end();
//     });

//     peer.sendTransaction(
//         newDevModeDeployTransaction({
//             chaincodeName: "mycc",
//             fcn: "init",
//             args: ["a", "100", "b", "200"]
//         }), 
//         emitter);
// });

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/**
 * request: {
 *      chaincodeName: string,
 *      fcn: string,
 *      args: string[],
 * }
 */
function newDevModeDeployTransaction(request) {

    var tx = new _fabricProto.Transaction();
    tx.setType(_fabricProto.Transaction.Type.CHAINCODE_DEPLOY);

    // Set the chaincodeID
    var chaincodeID = new _chaincodeProto.ChaincodeID();
    chaincodeID.setName(request.chaincodeName);
    tx.setChaincodeID(chaincodeID.toBuffer());

    // Construct the ChaincodeSpec
    var chaincodeSpec = new _chaincodeProto.ChaincodeSpec();
    // Set Type -- GOLANG is the only chaincode language supported at this time
    chaincodeSpec.setType(_chaincodeProto.ChaincodeSpec.Type.GOLANG);
    // Set chaincodeID
    chaincodeSpec.setChaincodeID(chaincodeID);
    // Set ctorMsg
    var chaincodeInput = new _chaincodeProto.ChaincodeInput();
    chaincodeInput.setArgs(prepend(request.fcn, request.args));
    chaincodeSpec.setCtorMsg(chaincodeInput);

    // Construct the ChaincodeDeploymentSpec (i.e. the payload)
    var chaincodeDeploymentSpec = new _chaincodeProto.ChaincodeDeploymentSpec();
    chaincodeDeploymentSpec.setChaincodeSpec(chaincodeSpec);
    tx.setPayload(chaincodeDeploymentSpec.toBuffer());

    // Set the transaction UUID
    tx.setTxid(request.chaincodeName);

    // Set the transaction timestamp
    tx.setTimestamp(utils.GenerateTimestamp());

    tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.PUBLIC);

    return {
        pb: tx, 
        chaincodeID: request.chaincodeName
    };
}

function prepend(item, list) {
    var l = list.slice();
    l.unshift(item);
    return l.map(function(x) { return new Buffer(x) });
}

function cleanupFileKeyValueStore(keyValStorePath) {
    var absPath = getAbsolutePath(keyValStorePath);
    var exists = utils.exists(absPath);
    if (exists) {
        execSync('rm -rf ' + absPath);
    }
}

// prepend absolute path where this test is running, then join to the relative path
function getAbsolutePath(pathStr) {
    return path.join(__dirname, utils.getRelativeFilePath(pathStr));
};

