

// Copyright © 2015, 2017 IBM Corp. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict';


// load the Cloudant library
var async = require('async');
var Cloudant = require('@cloudant/cloudant');
const utility = require("../utility/utility");
const cloudantUrl = require("../cloudant_url_config");
const weightageService = require("../service/service");
const query = require("../db_query/query");
const moment= require('moment') 
const io = require('socket.io-client');
const socket = io(utility.monitoringBackendURL);
var notification_request = require('request');

//var cloudant = Cloudant({url: process.env.CLOUDANT_URL});
const cloudant = new Cloudant({ url:cloudantUrl.cloudantBaseUrl, plugins: { iamauth: { iamApiKey:cloudantUrl.cloudantAppSecretKey  } } });
var db = cloudant.db.use(cloudantUrl.cloudantEmployeeDbName);;
var db_hosp = cloudant.db.use(cloudantUrl.cloudandHospitalDbName);
var doc = null;

var hourDiffPositive = 4;
var hourDiffPossible = 8;
var hourDiffNone     = 24;

module.exports = {
    // create a document
    createDocument: function (payloadData, callback) {
        var payloadData = {
            _id: utility.createGUI(), name: payloadData.name, gender: payloadData.gender, symptom: [],
            mobileno: payloadData.mobileno, location: payloadData.location, temprature: payloadData.temprature,
            iscovid: false, healthstatus: "none", doctorscreen: [],manager:'', timestamp: Date.now(), doctorId: "", assignedByOperationId: ""
        };
        // we are specifying the id of the document so we can update and delete it later
        db.insert(payloadData, function (err, data) {
            callback(err, data);
        });
    },

    // read a document
    readDocument: function (id, callback) {
        db.get(id, function (err, data) {
            doc = data;
            callback(err, data);
        });
    },

    // update a document
    updateDocument: (payload, callback) => {
        var response = { success: false };
        var err = null;
        var userId = payload.user_id.toString();
        // payload.temperature = utility.convertStatustoTemperature(payload.temperature);
        payload["timestamp"] = Date.now();
        delete payload["user_id"];
        var emailId="";
        let healthStatus="";
        // make a change to the document, using the copy we kept from reading it back
        db.find(query.getuserDataWatson(userId)).then(async (respData) => {// db.get(uid, async (err, data) =>{
            var data = respData.docs[0];
            console.log("get user data called inside update document");
            console.log(data);
            if (data) {
                healthStatus = data.healthstatus;
                data.symptom.push(payload);
                var lastStatusType = 0;
                if (data.healthstatus) {
                    if (data.healthstatus === 'High Risk') {
                        lastStatusType = 2;
                    } else if (data.healthstatus === 'Medium Risk') {
                        lastStatusType = 1;
                    } 
                }
                db_hosp.list({include_docs:true},async function (err, dataHospital) {
                var updatedField = await weightageService.updatePatientScore(null, data,dataHospital.rows[0].doc);
                if (updatedField != null) {
                    data.healthstatus = updatedField.healthstatus;
                    data.currentCovidScore = updatedField.currentCovidScore;
                    if (updatedField.qurantine != undefined)
                        data.qurantine = updatedField.qurantine;
                }

                    data.lastEvent = Date.now();
                    if(healthStatus === "none" && updatedField.healthstatus != "none" && data.requestSchedule.length)
                    {
                     var requ =data.requestSchedule;
                     var lastRecord = requ[requ.length - 1];
                     lastRecord.requestStatus = "cancel"
                     var payloadData={
                         comment: "due to Health status changed, schedule request has been cancelled.",
                         subComment: "",
                         timestamp: Date.now(),}
                     var payload = {
                         message: "due to Health status changed, schedule request has been cancelled.",
                         timestamp: Date.now(),
                         isRead: false,
                     }
                    
                     data.notification.employee.push(payload);
                     data.history.push(payloadData);
                     let payloadForEmploye = payload;
                     payloadForEmploye.message = "due to Health status changed,"+data.name+ " schedule request has been cancelled."
                     data.notification.manager.push(payloadForEmploye);
                     console.log("user Id value",data._id);
                    let dataPass = {
                     message:"due to Health status changed,"+data.name+ "schedule request has been cancelled.",
                     userId: data._id,
                     "title": "Scheduled Request",}
                     if(lastRecord.scheduleState == "Hr")
                     {
                         data.notification.hr.push(payload);
                         socket.emit('manager_approve_request', dataPass);
                     }
                     socket.emit('employee_schedule', dataPass);
                     var notificationRequest = {

                    title: "Scheduled Request",
                  body:  "due to Health status changed,"+data.name+ " schedule request has been cancelled.",
                     deviceToken: data.deviceToken,
                    }
                    module.exports.sendNPushNotificatonToPatient(notificationRequest,null);
                }

               console.log("get insert dataaaa called inside update document");
               data = module.exports.updateConfirmedStatus(data);
               console.log(data);
                db.insert(data, function (err, data1) {
                    console.log("insert data final called inside update document");
                    console.log(data1);
                    if (data1) {
                        console.log("sucefully symptoms add", data1);
                        response["success"] = true;
                       
                        callback(err, response);
                    }
                    else {
                        callback(err, response);
                    }
                });
            });
            }
            else {
                callback(err, response);
            }

        });
    },


    //update confirm status
    updateConfirmedStatus:(data)=>{
     var currentDate =  module.exports.getCurrentTime();
     if(data.requestSchedule.length>0)
     {
           var requestSche= data.requestSchedule;
           var list =requestSche[requestSche.length - 1];
           if(list.requestStatus=== "Approved")
           {
            list.date[currentDate].requestStatus = "Confirmed";
            return data;
           }
           else{
            return data;
           }
     }
     return data;

    },

    //get current Date format
    getCurrentTime:()=>{
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        today = yyyy + '-' + mm + '-' + dd;
        return today;
       },
    // deleting a document
    deleteDocument: function (callback) {
        // supply the id and revision to be deleted
        db.destroy(doc._id, doc._rev, function (err, data) {
            //   console.log('Error:', err);
            // console.log('Data:', data);
            callback(err, data);
        });
    },
    findsymptom: function (id, callback) {
        db.find(query.getSymptom(id)).then((result) => {
            if (result.docs.length > 0 && result.docs[0].symptom.length > 0) {
                callback(true);
            }
            else {
                callback(false);
            }
        }).catch(err => {
            callback(err);
        });
    },
    getUserName: (id, callback) => {
        db.find(query.getSignInWatson("",id)).then((result) => {
            console.log("Response for get User Name function =>" + JSON.stringify(result));
            if (result.docs.length > 0) {
                callback("", { "sucess": "true", userName: result.docs[0].name, userId: result.docs[0]._id, age: result.docs[0].age, gender: result.docs[0].gender  });
            }
            else {
                callback("", { "sucess": "false" });
            }
        }).catch(err => {
            callback(err, { "sucess": "false" });
        });
    },
    updateSOS: (obj,response, callback) => {
        
        if (!obj.sosStatus && obj.data.isSosRaised) {
            response.statusCode = 400;
            var res = { "success": false, "msg": "SOS already Raised" };
            response.send(res)
            return;
        } else if (obj.sosStatus && !obj.data.isSosRaised) {
            response.statusCode = 400;
            var res = { "success": false, "msg": "SOS already either cancelled or attended" };
            response.send(res)
            return;
        }
        
        if(!obj.sosStatus){
            obj.data.isSosRaised = true;
            obj.data.history.push({comment:'SOS Raised',subComment:obj.reason,timestamp:Date.now(),user:'',patientId: obj.data._id});
            utility.checkUserEvent(obj.data,utility.constants.SOSEventRaisedType.name)
        }else{
            obj.data.isSosRaised = false;
            utility.checkUserEvent(obj.data,utility.constants.SOSEventCancelledType.name)
            obj.data.history.push({comment:'SOS Cancelled',subComment:obj.reason,timestamp:Date.now(),user:'',patientId: obj.data._id});
        }
        obj.data.lastEvent = Date.now();
        db.insert(obj.data, function (err, data) {
            if (data) {
                var message = !obj.sosStatus ? "SOS Raised successfully." : "SOS either cancelled or attended successfully";
                callback({ "success": true, "msg": message });
                var resData = {
                    "id" : obj.data._id,
                    "lastEventScore": obj.data.userEvent.lastEventScore,
                    "newEventScore": obj.data.userEvent.newEventScore,
                    "isProcessing" : false,
                    "eventRecords" : obj.data.userEvent.eventRecords,
                    "currentCovidScore": obj.data.currentCovidScore,
                    "healthstatus": obj.data.healthstatus,
                    "isSosRaised": obj.data.isSosRaised
                }
                socket.emit("user_event",resData)
            }
            else {
                callback({ "success": false, "msg": "Internal server error. please try again later." });
            }
        });
    },
    updateDeviceToken: (obj, callback) => {
        if(obj.data){
            obj.data.deviceToken = obj.deviceToken;
        }
        db.insert(obj.data, function (err, data) {
            if (data) {
                callback({ "success": true, "msg": "Update SOS Api called" });
            }
            else {
                callback({ "success": false, "msg": "Update SOS Api not called" });
            }
        });
    },

    // update a document
updateUserSymptom: (payload, callback) => {
    var response = { success: false };
    var err = null;
    var mobno = payload.user_id.toString();
    var emailId="";
    
    // make a change to the document, using the copy we kept from reading it back
    db.find(query.getuserDataWatson(mobno)).then(async (respData) => {
        var data=respData.docs[0];
        if (data) {
            var lastData = data.symptom.pop(); 
            var times = lastData.timestamp;
            var temperature ,heartRate ;
            if(payload.isAddBodyTemp){
                temperature =  payload.bodyTemp.toString();
                heartRate = lastData.heart_rate;
            }else{
                temperature = lastData.temperature;
                heartRate = payload.bodyTemp.toString();
            }

            require("moment-duration-format");
            var extend = require('util')._extend;

            var now = new Date();
            var then = new Date(times);

            var dateDiff = moment(now,"DD/MM/YYYY hh:mm:ss").diff(moment(then,"DD/MM/YYYY hh:mm:ss"));
            var hourDiff = moment.duration(dateDiff).format("hh");

            var isUpdate = false;
            var lastStatusType = 0;
            if(data.healthstatus ==='High Risk'){
                lastStatusType = 2;
                isUpdate = hourDiff >= hourDiffPositive ? false : true;
            }else if (data.healthstatus ==='Medium Risk') {
                lastStatusType = 1;
                isUpdate = hourDiff >= hourDiffPossible ? false : true; 
            } else if(data.healthstatus ==='none'){
                isUpdate = hourDiff >= hourDiffNone ? false : true;
            }

            if(isUpdate){
                lastData.temperature = temperature;
                lastData.heart_rate = heartRate;
                lastData.timestamp = Date.now();
                data.symptom.push(lastData);
            }else{
                if(payload.isAddBodyTemp){
                    heartRate = "0";
                } else {
                    temperature = "0";
                }
                var recentData =  JSON.parse(JSON.stringify(lastData));
                data.symptom.push(lastData);                
                recentData.timestamp = Date.now();
                recentData.temperature = temperature;
                recentData.heart_rate = heartRate;
                data.symptom.push(recentData);
            }

            db_hosp.list({include_docs:true},async function (err, dataHospital) {
                
               var updatedField = await weightageService.updatePatientScore(null, data,dataHospital.rows[0].doc);
               console.log("updated field "+updatedField)
                if (updatedField != null) {
                    data.healthstatus = updatedField.healthstatus;
                    data.currentCovidScore = updatedField.currentCovidScore;
                    if(updatedField.qurantine != undefined)
                      data.qurantine = updatedField.qurantine;
                }

                data.lastEvent = Date.now();
                db.insert(data, function (err, data1) {
                if (data1) {
                    response = {
                        success: true
                    }
                    callback(err, response);
                }
                else {
                    callback(err, response);
                }
            });
               
              });
            
        }
        else {
            callback(err, response);
        }
     });
},

    readFromHospitalConfigDb: (callback)=> {
        console.log("called hospital db ")
        db_hosp.list({include_docs:true}, function (err, data) {
            console.log("hospital db ")
            callback(err, data.rows[0].doc);
          });
    },

sendNPushNotificatonToPatient:function(request,callback) {
    db_hosp.list({include_docs:true}, function (err, responseData) {
        if (responseData ) {
            var res = responseData.rows[0].doc; 
            request["apiKey"] = res.firebaseApiKey
         const message = {
              registration_ids: [
                  request.deviceToken
              ],
              notification: {
                title: request.title,
                body: request.body,
                vibrate: 1,
                sound: 1,
                show_in_foreground: true,
                priority: "high",
                content_available: true,
              },
              data: {
                title: request.title,
                body: request.body,
                score: 50,
                wicket: 1,
              },
            }
            notification_request({
      url: res.firebaseServerUrl,
      method: 'POST',
      headers: {
        'Content-Type' :' application/json',
        'Authorization': 'key=' + request.apiKey,
      },
      body: JSON.stringify(
        message            
      )
    }, function(error, response, body) {
        console.log(error);
      if (error) { 
        console.error(error, response, body); 
      }
      else if (response.statusCode >= 400) { 
        console.error('HTTP Error: '+response.statusCode+' - '+response.statusMessage+'\n'+body); 
      }
      else {
        console.log('Done!')
      }
    });
}})
},
};
