
"use strict";

var async = require("async");
var Cloudant = require("@cloudant/cloudant");
const utility = require("../utility/utility");
const cloudantUrl = require("../cloudant_url_config");
const query = require("../db_query/query");
const weightageService = require("../service/service");
//const utility = require("../utility/utility");
const cloudant = new Cloudant({ url: cloudantUrl.cloudantBaseUrl, plugins: { iamauth: { iamApiKey: cloudantUrl.cloudantAppSecretKey } } });
var db = cloudant.db.use(cloudantUrl.cloudantEmployeeDbName);
var archive_db = cloudant.db.use(cloudantUrl.cloudantArchiveDbName);
var cloudantWatsonDb = cloudant.db.use(cloudantUrl.cloudantWatsonDbName);
var cloudantWatsonLocationDb = cloudant.db.use(cloudantUrl.cloudantWatsonlocationQuestion);
const dbSchedule = cloudant.db.use(cloudantUrl.cloudanB2Oschedules);


const Nexmo = require('nexmo');
var HashMap = require('hashmap');
var notification_request = require('request');


var db_hospital = cloudant.db.use(cloudantUrl.cloudandHospitalDbName);
var db_doctor = cloudant.db.use(cloudantUrl.cloudantDoctorDbName);
var db_DefaConfig = cloudant.db.use(cloudantUrl.cloudantDefaultDBName);
var db_location = cloudant.db.use(cloudantUrl.cloudantDefaultLocationDBName);
var db_location_Admin = cloudant.db.use(cloudantUrl.cloudantLocationDBName);

var doc = null;
const headerObj = require('..//hearderConfig/headerData');
const io = require('socket.io-client');
const socket = io(utility.monitoringBackendURL);
const { cat } = require("shelljs");
const { request } = require("express");
const moment= require('moment') 


var employeeDB = cloudant.db.use(cloudantUrl.cloudantEmployeeDbName);
var ldap = require('ldapjs');
const headerData = require("..//hearderConfig/headerData");
const { cloudantWatsonDbName } = require("../utility/utility");

module.exports = {
  // create a document
  createDocument: function (payloadData, callback) {
    //var pwd = utility.createPWD();
    var encryptedPwd = utility.encryptPassword(payloadData.password);
    var qurantineData = { isQurantine: false, started: 0, end: 0 };
    var sosAssignData = { id: "", comments: "", name: "", timestamp: null };
    var lastEvent = Date.now();
    //new Date();
    var payloadData = {
      _id: utility.createGUI(),
      name: payloadData.name,
      gender: payloadData.gender,
      emailId: payloadData.emailId,
      emergencyContactNumber: "",
      age: payloadData.age,
      mobileno: payloadData.mobileno,
      location: payloadData.location,
      currentAssign: "none",
      comorbidity: "none",
      isTestPerformed: true,
      password: encryptedPwd,
      symptom: [],
      iscovid: false,
      healthstatus: "none",
      history: [],
      timestamp: Date.now(),
      doctorId: "",
      manager:'',
      assignedByOperator: {},
      assignedByDoctor: {},
      usertype: "individual",
      qurantine: qurantineData,
      currentCovidScore: "",
      isSosRaised: false,
      doctorscreening: [],
      isVerifiedUser: false,
      isAppLock: false,
      lastEvent: lastEvent,
      requestSchedule: [],
    };

    db.insert(payloadData, function (err, data) {
      var response = {};
      var tokenRes = {};
      if (data) {
        response["success"] = true;
        response["userId"] = data.id;
        response["mobileno"] = payloadData.mobileno;
        tokenRes["_id"] = data.id;
        tokenRes["mobileno"] = payloadData.mobileno;
        tokenRes["success"] = true;
        response["accessToken"] = headerObj.genAccessToken(tokenRes, "");
      } else {
        response["success"] = false;
      }
      callback(err, response);
    });
  },

  // read a document
  readDocument: (userId, callback) => {
    if (userId != undefined && userId != null) {
      db.get(userId, async function (err, data) {
        if (data !== undefined) {
          data["userId"] = data._id.toString();
          if (data.imageUrl) {
            data.imageUrl = utility.getBase64Prefix() + data.imageUrl;
          }

          delete data._id;
          delete data._rev;
          db_hospital.list({ include_docs: true }, function (err, data1) {
            if (!data1) {
              callback(err, data);
              return;
            }
            var res = data1.rows[0].doc;
            var hospital = {
              hospitalName: res.hospitalName,
              positiveStatus: res.positiveStatus,
              possibleStatus: res.possibleStatus,
              noneStatus: res.noneStatus,
            };
            data["hospital"] = hospital;

            if (data.doctorId) {
              db_doctor.get(data.doctorId, function (errror, response) {
                if (response) {
                  var doctorDetails = {
                    id: response._id,
                    name: response.name,
                  };
                  data["doctor_details"] = doctorDetails;
                }
                callback(errror, data);
                return;
              });
            } else {
              callback(err, data);
              return;
            }
          });
        } else {
          callback(err, { msg: "no records found !!! " });
        }
      });
    }
  },

  updateDocument: (userId, payload, callback) => {
    var response = { success: false };
    var err = null;
    if (userId != undefined && userId != null) {
      db.get(userId, async function (err, data) {
        if (data !== undefined) {
          data = utility.updateUserDetails(data, payload);
          data.lastEvent = Date.now();
          db.insert(data, function (err, data) {
            if (data) {
              response["success"] = true;
              callback(err, data);
            } else {
              callback(err, response);
            }
          });
        } else {
          callback(err, { msg: "no records found !!! " });
        }
      });
    }
  },

  updateOtpDetails: (callback) => {
    var response = { success: false };
    var err = null;
    db_DefaConfig.list({ include_docs: true }, function (err, data1) {
      if (!data1) {
        callback(err, data1);
        return;
      }
      var res = data1.rows[0].doc;
      var otpDetails = {
        otpExpiryTime: res.resendOtpTime,
        maxOtpAttempts: res.maxOtpAttempts,
        otpAppLockTime: res.otpAppLockTime,
        otpLockhelplineNum: res.otpLockhelplineNum,
        helpLineData: res.helpLineData,
      };
      var hospital = {
        hospitalName: res.hospitalName,
        positiveStatus: res.positiveStatus,
        possibleStatus: res.possibleStatus,
        noneStatus: res.noneStatus,
        //URL's
        watsonChatUrl: res.watsonCloudantUrl,
        scheduleEndDate: res.scheduleEndDate,
      };
      var defaultDate = res.scheduleEndDate;
      callback(err, otpDetails, hospital, defaultDate);
    });
  },

  // updateOtpDetailsDB: function(userId,payload, callback){
  //   if (userId != undefined && userId != null) {
  //     db.get(userId, async function (err, data) {
  //       if (data !== undefined) {
  //         if(data.otpRequestDetails){

  //           data = utility.updateOtpDetails(data, payload);
  //         }
  //         else{
  //           var otpRequestDetails = { "request_id": payload.request_id, "count":0,"error_text_gen":payload.error_text_gen,
  //            "isSuccess": false,"timestampAppLock":payload.timestampAppLock,"timestampOtp":payload.timestampOtp };
  //           data ["otpRequestDetails"] = otpRequestDetails;
  //         }
  //         db.insert(data, function (err, data) {
  //           if(data)
  //           {

  //             callback("",data);
  //           }
  //          else{

  //            callback(err, {msg: "something went wrong !!!" });
  //          }
  //        });

  //       }
  //     });
  //   }

  // },

  updateOtpDetailsDB: function (userId, payload, callback) {
    if (userId != undefined && userId != null) {
      db.get(userId, async function (err, data) {
        if (data !== undefined) {
          if (data.otpRequestDetails) {
            data = utility.updateOtpDetails(data, payload);
          } else {
            var otpRequestDetails = {
              count: 0,
              code: payload.code,
              timestampOtp: payload.timestampOtp,
              timestampAppLock: payload.timestampAppLock,
            };
            data["otpRequestDetails"] = otpRequestDetails;
          }
          data.lastEvent = Date.now();
          db.insert(data, function (err, data) {
            if (data) {
              callback("", data);
            } else {
              callback(err, { msg: "something went wrong !!!" });
            }
          });
        } else {
          callback(err, { msg: "data not found !!!" });
        }
      });
    }
  },
  signupUser: function (
    email,
    id,
    callback,
    searchResponse,
    tokenExpiryTime,
    otpAppLockTime
  ) {
    const db = employeeDB;
    let dbquery = query.getEmail(email);
    db.find(dbquery, function (err, data) {
      var token = headerData.genAccessToken(searchResponse[0], tokenExpiryTime);
      if (data && data.docs && data.docs.length <= 0) {
        var payloadData = {
          _id: id,
          name: searchResponse[0].cn + " " + searchResponse[0].sn,
          gender: searchResponse[0].gender ? searchResponse[0].gender : "",
          age: searchResponse[0].age ? searchResponse[0].age : "",
          mobileno: searchResponse[0].telephoneNumber
            ? searchResponse[0].telephoneNumber
            : "",
          address: "",
          state: "",
          city: "",
          pincode: "",
          doctorscreening: [],
          timestamp: Date.now(),
          emailId: email,
          isTestPerformed: true,
          symptom: [],
          iscovid: false,
          healthstatus: "none",
          healthScore: 0,
          history: [],
          requestSchedule: [],
          notification: { employee: [], manager: [], hr: [] },
          isFirstTimeLogin: true,
        };
        db.insert(payloadData, function (error, data1) {
          payloadData["LDAP_DATA"] = searchResponse;
          payloadData["userId"] = payloadData._id;
          delete payloadData._id;

          var res = {
            isFirstTimeLogin: true,
            data: payloadData,
            accessToken: token,
            msg: "success",
            success: true,
          };
          callback.statusCode = 200;
          callback.send(res);
        });
      } else {
        var payload = data.docs[0];
        if (payload.otpRequestDetails) {
          var timestamp = payload.otpRequestDetails.timestampAppLock;
          var dt1 = new Date(timestamp);
          var dt2 = new Date();
          var diff = (dt2.getTime() - dt1.getTime()) / 1000;
          diff /= 60;
          diff = Math.abs(Math.round(diff));
          if (diff >= otpAppLockTime) {
            payload.isAppLock = false;
            payload.otpRequestDetails.count = 0;
            payload.otpRequestDetails.timestampAppLock = 0;
            db.insert(payload, function (error, data1) {});
            if (data && data.docs && data.docs.length > 0) {
              var response = data.docs[0];
              response["LDAP_DATA"] = searchResponse;
              response["userId"] = response._id;
              delete response._id;
              delete response._rev;

              var res = {
                isFirstTimeLogin: data.docs[0].isFirstTimeLogin,
                data: response,
                accessToken: token,
                msg: "success",
                success: true,
              };
              callback.statusCode = 200;
              callback.send(res);
            }
          }
        } else {
          if (data && data.docs && data.docs.length > 0) {
            var response = data.docs[0];
            response["LDAP_DATA"] = searchResponse;
            console.log(response);
            response["userId"] = response._id;
            delete response._id;
            delete response._rev;

            var res = {
              isFirstTimeLogin: data.docs[0].isFirstTimeLogin,
              data: response,
              accessToken: token,
              msg: "success",
              success: true,
            };
            callback.statusCode = 200;
            callback.send(res);
          }
        }
      }
    });
  },

  //user login

  authLdapUser: async function (
    email,
    userName,
    password,
    callback,
    searchResponse,
    client,
    tokenExpiryTime,
    otpAppLockTime
  ) {
    client.bind(userName, password, function (err, data) {
      if (err) {
        var res = {
          msg: "user record not found, please enter valid credentials",
          success: false,
        };
        client.unbind();
        callback.statusCode = 400;
        callback.send(res);
      } else {
        var id = searchResponse[0].uid;

        module.exports.signupUser(
          email,
          id,
          callback,
          searchResponse,
          tokenExpiryTime,
          otpAppLockTime
        );
        client.unbind();
      }
    });
  },

  //get user dn
  getUserDN: async function (userName, password, callback) {
    var opts = {
      filter: "&(email=" + userName + ")",
      scope: "sub",
      attributes: [
        "sn",
        "cn",
        "uid",
        "dn",
        "email",
        "telephoneNumber",
        "givenName",
        "ou",
      ],
    };

    var searchResponse = [];
    db_hospital.list({ include_docs: true }, async function (err, data1) {
      if (data1 && data1.rows && data1.rows[0] && data1.rows[0].doc) {
        var res = data1.rows[0].doc;
        var tokenExpiryTime = res.jwtTokenExpiryTime;
        var otpAppLockTime = res.otpAppLockTime;
        var client = ldap.createClient({
          url: res.ldapServerUrl,
        });

        client.search(res.rootDN, opts, function (err, res) {
          if (err) {
            client.unbind();
            callback.statusCode = 400;
            callback.send("authentication failed");
          } else {
            var response = {};
            res.on("searchEntry", function (entry) {
              var jsonResponse = entry.object;
              searchResponse.push(jsonResponse);
            });

            res.on("error", function (err) {
              console.error("error: " + err.message);
              response.success = false;
              client.unbind();
              callback(response, "");
            });
            res.on("end", function (result) {
              if (searchResponse.length > 0) {
                var name = searchResponse[0].dn;
                searchResponse[0]["gender"] = searchResponse[0]["givenName"]
                  ? searchResponse[0]["givenName"]
                  : "";
                searchResponse[0]["age"] = searchResponse[0]["ou"]
                  ? searchResponse[0]["ou"]
                  : "";
                delete searchResponse[0]["ou"];
                delete searchResponse[0]["givenName"];
                delete searchResponse[0]["dn"];
                delete searchResponse[0]["controls"];
                module.exports.authLdapUser(
                  userName,
                  name,
                  password,
                  callback,
                  searchResponse,
                  client,
                  tokenExpiryTime,
                  otpAppLockTime
                );
              } else {
                var res = {
                  msg: "user record not found, please enter valid credentials",
                  success: false,
                };
                client.unbind();
                callback.statusCode = 400;
                callback.send(res);
              }
            });
          }
        });
      } else {
        callback.statusCode = 400;
        callback.send("server internal error failed");
      }
    });
  },

  updateUserRecord: function (param, callback) {
    console.log("update details called ");
    if (param.id) {
      const db = employeeDB;
      db.get(param.id, async function (err, data) {
        if (data != undefined) {
          data.mobileno = param.mobileno;
          data.address = param.address;
          data.state = param.state;
          data.city = param.city;
          data.pincode = param.pincode;
          if (data.officeAddress) {
            data = utility.updateOfficeAddress(data, param);
          } else {
            var officeAddress = {
    country: param.officeAddress.country,
    city: param.officeAddress.city,
    location:param.officeAddress.location,
    floor: param.officeAddress.floor,
    zipcode: param.officeAddress.zipcode,
    locationId: param.officeAddress.locationId,
            };
            data ["officeAddress"] = officeAddress;
          }
          (data.timestamp = Date.now()), (data.isFirstTimeLogin = false);

          db.insert(data, function (err, data1) {
            if (data1) {
              var res = {
                success: true,
                data: data,
              };
              callback.statusCode = 200;
              callback.send(JSON.stringify(res));
              callback.end();
            } else {
              callback.statusCode = 400;
              callback.send(JSON.stringify(data1));
              callback.end();
            }
          });
        }
      });
    } else {
      callback.statusCode = 400;
      var res = { msg: "invalid user id", success: false };
      callback.send(res);
      callback.end();
    }
  },

  getUserDataMobile: function (userId, callback) {
    db.find(query.getuserData(userId)).then((result) => {
      if (result.docs.length > 0) {
        var data = result.docs[0];
        // data = result.docs;
        data["userId"] = data._id.toString();
        if (data.imageUrl) {
          data.imageUrl = utility.getBase64Prefix() + data.imageUrl;
        }

        delete data._id;
        delete data.password;
        delete data._rev;
        callback("", data);
      } else {
        callback(false);
      }
    });
  },

  getUserName: (payload, callback) => {
    db.find(query.getUserName(payload.id))
      .then((result) => {
        if (result.docs.length > 0) {
          callback("", {
            sucess: "true",
            userName: result.docs[0].name,
            userId: result.docs[0]._id,
            age: result.docs[0].age,
            gender: result.docs[0].gender,
            otpRequestDetails: result.docs[0].otpRequestDetails,
          });
        } else {
          callback(false);
        }
      })
      .catch((err) => {
        callback(err);
      });
  },

  findDataDb: function (userId, payload, callback) {
    var response = { success: false };
    var err = null;
    if (userId != undefined && userId != null) {
      db.get(userId, async function (err, data) {
        if (data != undefined) {
          data["isAppLock"] = payload.isAppLock;
          data.otpRequestDetails.count = payload.count;
          data.otpRequestDetails.timestampAppLock = payload.timestampAppLock;
        }
        db.insert(data, function (err, data) {
          if (data) {
            response["success"] = true;
            callback(err, response);
          } else {
            callback(err, response);
          }
        });
      });
    } else {
      return false;
      //callback(err, { msg: "no records found !!! " });
    }
  },

  UpdateDataintoDB: function (userId, payload, callback) {
    var response = { success: false };
    var err = null;
    if (userId != undefined && userId != null) {
      db.get(userId, async function (err, data) {
        if (data !== undefined) {
          data["isAppLock"] = payload.isAppLock;
          data.otpRequestDetails.count = payload.count;
          data.name = payload.name;
          data.age = payload.age;
          data.gender = payload.gender;
          data.location = payload.location;
        }
        db.insert(data, function (err, data) {
          if (data) {
            response["success"] = true;
            callback(err, response);
          } else {
            callback(err, response);
          }
        });
      });
    } else {
      callback(err, { msg: "no records found !!! " });
    }
  },

  checkEmailId: function (checkEmailId, callback) {
    db.find(query.getEmail(checkEmailId)).then((result) => {
      if (result.docs.length > 0) {
        callback("", {
          message: "EmailId Already Exist.Please try with another Email Id.",
          success: false,
          isVerifiedUser: result.docs[0].isVerifiedUser,
          userId: result.docs[0]._id,
        });
      } else {
        callback("", {
          success: true,
        });
      }
    });
  },

  //for sigup user
  checkUser: function (mobileno, callback) {
    db.find(query.getSigup(mobileno))
      .then((result) => {
        if (result.docs.length > 0) {
          if (!(typeof result.docs[0].otpRequestDetails === "undefined")) {
            var timestamp = result.docs[0].otpRequestDetails.timestampAppLock;
            var isAppLock = result.docs[0].isAppLock;
            var dt1 = new Date(timestamp);
            var dt2 = new Date();
            var diff = (dt2.getTime() - dt1.getTime()) / 1000;
            diff /= 60;
            diff = Math.abs(Math.round(diff));
            db_hospital.list(
              { include_docs: true },
              async function (err, data1) {
                if (data1) {
                  var res = data1.rows[0].doc;
                  var otpAppLockTime;
                  otpAppLockTime = res.otpAppLockTime;

                  if (diff >= otpAppLockTime) {
                    isAppLock = false;
                    var userId = result.docs[0]._id;

                    module.exports.findDataDb(
                      userId,
                      { isAppLock: false, count: 0, timestampAppLock: 0 },
                      function (err, data) {
                        if (data) {
                        }
                      }
                    );
                  }
                } else {
                }

                callback("", {
                  message: "User Already Exist.Please try with another number.",
                  success: false,
                  userId: result.docs[0]._id,
                  mobileno: result.docs[0].mobileno,
                  isVerifiedUser: result.docs[0].isVerifiedUser,
                  isAppLock: isAppLock,
                });
              }
            );
          } else {
            callback("", {
              message: "User Already Exist.Please try with another number.",
              success: false,
              userId: result.docs[0]._id,
              mobileno: result.docs[0].mobileno,
              isVerifiedUser: result.docs[0].isVerifiedUser,
              isAppLock: isAppLock,
            });
          }
        } else {
          callback("", {
            success: true,
          });
        }
      })
      .catch((err) => {
        callback(err);
      });
  },

  getConfigureDetails: (callback) => {
    db_hospital.list({ include_docs: true }, function (err, data1) {
      if (data1) {
        var res = data1.rows[0].doc;
        var otpDetails = {
          otpExpiryTime: res.resendOtpTime,
          maxOtpAttempts: res.maxOtpAttempts,
          otpAppLockTime: res.otpAppLockTime,
          otpLockhelplineNum: res.otpLockhelplineNum,
          otpDefaultExpiryTime: res.otpDefaultExpiryTime,
          helpLineData: res.helpLineData,
          apiKey: res.apiKey,
          apiSecret: res.apiSecret,
        };
        callback("", otpDetails);
      } else {
        callback(err);
      }
    });
  },
  
  deleteUnVerifiedUser: (request, callback) => {
    db.find(query.getVerifiedUser(request))
      .then((result) => {
        if (result.docs.length > 0) {
          for (var i = 0; i < result.docs.length; i++) {
            var userId = result.docs[i]._id;
            var rev_id = result.docs[i]._rev;
            db.destroy(userId, rev_id, function (err, data) {
              callback(err, data);
            });
          }
        } else {
          callback("", "No Unverified user found");
        }
      })
      .catch((err) => {
        callback(err);
      });
  },

  updateDetailsData: function (payload, callback) {
    db.find(query.getSigup(payload.mobileno)).then((result) => {
      if (result.docs.length > 0 && result.docs[0].isVerifiedUser == false) {
        var userId = result.docs[0]._id;
        let password = "";
        if (payload.password) {
          password = utility.encryptPassword(payload.password);
        }

        db.get(userId, async function (err, data) {
          if (data !== undefined) {
            data.password = password;
            data.name = payload.name;
            data.age = payload.age;
            data.gender = payload.gender;
            data.location = payload.location;
            data.emailId = payload.emailId;
            db.insert(data, function (err, data) {});
          }
        });
      }
    });
  },

  isLogingetDetails: (callback) => {
    db_hospital.list({ include_docs: true }, function (err, data1) {
      if (data1) {
        var res = data1.rows[0].doc;
        var loginDetails = {
          sucess: "true",
          isMobileLogin: res.isMobileLogin,
          isEmaillLogin: res.isEmaillLogin,
          isbothLogin: res.isbothLogin,
        };
        callback("", loginDetails);
      } else {
        callback(err, "");
      }
    });
  },

  getLocationConfigurationDetails: (callback) => {
    let dbquery = query.getAllLocations();
    var final = {};
    db_location.find(dbquery, function (err, res){
        if (res) {
          if(res.docs.length>0)
          {
            for (var i =0; i<res.docs.length; i++)
            {
              if(res.docs[i].country)
              {
                final[res.docs[i].country]={
                }
                var cityList = res.docs[i].city;
                for (var j =0; j<cityList.length; j++){
                  final[res.docs[i].country] [cityList[j].name]={
                   
                    
                  }
                  var locationList = cityList[j].location_details;
                  for (var n =0; n<locationList.length; n++){
                    final[res.docs[i].country] [cityList[j].name][locationList[n].premsis]={
                      "locationId":locationList[n].id,
                      "floor":locationList[n].floor,
                      "zipcode":locationList[n].zipcode,
                      
                    }
                  }
                }
              }
            }
          }
          callback("", final);
        } else {
          callback(err, "");
        }
      })
  },

  getConfigureOtpDetails: (request, callback) => {
    db.get(request.userId, async function (err, result) {
      if (result) {
        let isAppLock = result.isAppLock;
        let isAppLockValue = result.isAppLock;
        var code = result.otpRequestDetails.code;
        var timestampOtp = result.otpRequestDetails.timestampOtp;
        var count = result.otpRequestDetails.count;
        var dt1 = new Date(timestampOtp);
        var dt2 = new Date();
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        diff = Math.abs(Math.round(diff));
        db_hospital.list({ include_docs: true }, async function (err, data1) {
          if (data1) {
            var res = data1.rows[0].doc;
            var otpDefaultExpiryTime = res.otpDefaultExpiryTime;
            var maxCount = res.maxOtpAttempts;
            var payload = {
              isVerifiedUser: true,
              isSuccess: true,
              isAppLock: false,
              count: 0,
            };
            if (code == request.code && diff < otpDefaultExpiryTime) {
              payload.count = 0;
              payload.isSuccess = true;
              payload.timestampAppLock = 0;
              var userData = utility.updateCount(result, payload);

              db.insert(userData, function (err, res) {});
              callback("", {
                success: true,
                isAppLock: isAppLock,
              });
            } else {
              var countIcr = count + 1;
              if (maxCount <= countIcr) {
                payload.isAppLock = true;
                isAppLockValue = true;
                payload.timestampAppLock = Date.now();
              }

              if (!request.isLoginTrue) {
                payload.isVerifiedUser = false;
              }
              payload.isSuccess = false;
              payload.count = countIcr;
              var userData = utility.updateCount(result, payload);
              userData.lastEvent = Date.now();
              db.insert(userData, function (err, res) {});
              callback("", {
                success: false,
                isAppLock: isAppLockValue,
              });
            }
          } else {
            callback("", {
              success: true,
              msg: "No user found 1",
            });
          }
        });
      } else {
        callback("", {
          success: false,
          msg: "No user found",
        });
      }
    });
  },

  sendOTPEmail: (request, callback) => {
    let name = "";
    let dbpass = "";
    let emailClientId = "";
    let emailClientSecret = "";
    let emailRefreshToken = "";
    db_hospital.list({ include_docs: true }, function (err, res) {
      if (res) {
        var data = res.rows[0].doc;
        if (data) {
          name = data.email;
          dbpass = Buffer.from(data.password, "base64").toString("ascii");
          emailClientId = data.emailClientId;
          emailClientSecret = data.emailClientSecret;
          emailRefreshToken = data.emailRefreshToken;
        }
      }
    });

    db.find(query.getUserName(request.userId)).then((result) => {
      if (result.docs.length > 0) {
        var respData = result.docs[0];
        var userEmail = request.emailId;
        let userName = respData.name;
        var nodemailer = require("nodemailer");
        var htm =
          "<p>Dear " +
          userName +
          "</p>" +
          "<p>Please verify your login.</p>" +
          "<p>Below is your one time password.</p>" +
          "<p>" +
          request.otp +
          "</p>" +
          "<p>Please note, you cannot reply to this e-mail address.</p> " +
          "<p>This communication is confidential and intended solely for the addressee(s). Any unauthorized review, use, disclosure or " +
          "distribution is prohibited.If you believe this message has been sent to you in error, please notify the sender by replying " +
          "to this transmission and delete the message without disclosing it. Thank you.</p>" +
          "<p>E-mail including attachments is susceptible to data corruption, interception, unauthorized amendment, tampering and viruses," +
          " and we only send and receive emails on the basis that we are not liable for any such corruption, interception, amendment, " +
          "tampering or viruses or any consequences thereof.</p><br>";

        var transporter = nodemailer.createTransport({
          //service: 'gmail',
          host: "smtp.gmail.com",
          auth: {
            user: name,
            //pass: dbpass
            type: "OAuth2",
            clientId: emailClientId,
            clientSecret: emailClientSecret,
            refreshToken: emailRefreshToken,
          },
        });

        var mailOptions = {
          from: "no-reply <" + name + ">",
          to: userEmail,
          subject: "One Time Password",
          text: "",
          html: htm,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            callback(null, data);
          }
        });
      } else {
        var mess = {
          ERROR: "error message",
        };
        callback(mess, null);
      }
    });
  },

  sendOTPMobile: (request, callback) => {
    db_hospital.list({ include_docs: true }, function (err, data) {
      if (data) {
        var res = data.rows[0].doc;
        let otpExpiry = res.otpDefaultExpiryTime;
        let apiSecret = res.apiSecret;
        let apiKey = res.apiKey;
        const nexmo = new Nexmo({
          apiKey: apiKey,
          apiSecret: apiSecret,
        });
        const from = "Vonage APIs";
        const to = request.mobileNum;
        const text =
          "AYWA-Covid code: " +
          request.otp +
          " valid for " +
          otpExpiry +
          " minutes";
        nexmo.message.sendSms(from, to, text);
      }
    });
  },

  updateLastEvent: (userId, callback) => {
    db.get(userId, async function (err, data) {
      if (data !== undefined) {
        data.lastEvent = Date.now();
        //new Date();
        db.insert(data, function (err, data) {
          if (data) {
            console.log("last event update sucessfully");
          }
        });
      } else {
        console.log("user not found", +err);
      }
    });
  },

  updateuserRequestDetails: (userId, payload, callback) => {
    db.get(userId, async function (err, data) {
      if (data) {
        if (data.requestSchedule.length == 0) {
          var payloadData = {
            comment:
              "Raised a Back to Office request for " + payload.scheduleType,
            subComment: "",
            timestamp: Date.now(),
          };
          var notificationPayloadEmployee = {
            message: "new Back to Office request by " + data.name,
            timestamp: Date.now(),
            isRead: false,
          };
          var payloadDataForEmp = {
            message:
              "Your request for Back to Office for " +
              payload.scheduleType +
              "is sent for approval",
              isRead: false,
            timestamp: Date.now(),
          };
          var list = module.exports.getrequestScheduleTypeDateList(payload);
          payload.date = list.data;
          data.notification.employee.push(payloadDataForEmp);
          data.notification.manager.push(notificationPayloadEmployee);
          data.requestSchedule.push(payload);
          data.history.push(payloadData);

          var locationQuery = query.getDeatils(data.officeAddress.locationId.toString());
          db_location_Admin.find(locationQuery, function (error, response) {
            if (response) {
              var floorDetails = [];
              if (response && response.docs && response.docs.length > 0) {
                var floorArray = response.docs[0].floor;
                floorDetails = floorArray.filter(item => {
                  return item.name.toString() === data.officeAddress.floor;
                })
              }

              dbSchedule.find(locationQuery, function (errors, locationResponse) {
                var dateArray = [];
                var startDate = new Date(payload.scheduleStartDate);
                var endDate = new Date(payload.scheduleEndDate);
                var formatedDate;
                while (startDate <= endDate) {
                  formatedDate = moment(startDate).format('YYYY-MM-DD'); //2021-01-13
                  const dateObject = {
                    date: formatedDate,
                    totalApproved: 0
                  }
                  dateArray.push(dateObject);
                  startDate.setDate(startDate.getDate() + 1);
                }

                var floorNo = 0;
                var allowCapacity;
                var floorTotalCapacity;

                if (floorDetails.length > 0) {
                  floorNo = floorDetails[0].name
                  allowCapacity = floorDetails[0].allowedCapacity
                  floorTotalCapacity = floorDetails[0].totalCapacity
                }

                if (locationResponse && locationResponse.docs && locationResponse.docs.length > 0) {
                  var floorArray = locationResponse.docs[0].premesis.floor
                  var isFloorPresent = false;

                  var newDateArray = [];
                  for (let index = 0; index < floorArray.length; index++) {
                    const element = floorArray[index];
                    if (element.floorNo.toString() === floorNo.toString()) {
                      isFloorPresent = true;
                      var scheduleArray = element.schedules;
                      var ids = new Set(scheduleArray.map(d => d.date));
                      newDateArray = [...scheduleArray, ...dateArray.filter(d => !ids.has(d.date))];
                      
                    }
                    if (isFloorPresent) {
                      element.maxFloorCapacity = allowCapacity;
                      element.floorTotalCapacity = floorTotalCapacity;
                      element.schedules = newDateArray;
                      locationResponse.docs[0].premesis.floor = floorArray;
                    }
                  }
                  if (!isFloorPresent) {
                    var floorDetail = {
                      "floorNo": floorNo.toString(),
                      maxFloorCapacity: allowCapacity,
                      floorTotalCapacity: floorTotalCapacity,
                      schedules: dateArray
                    }
                    
                    locationResponse.docs[0].premesis.floor.push(floorDetail);
                  }
                  dbSchedule.insert(locationResponse.docs[0], function (err, res) {
                    console.log("record inserted already data available ", res)
                    db.insert(data, function (err, data1) {
                      if (data1) {
                        data1["requestId"] = payload.requestId;
                        callback(data1);
                      } else {
                        callback(err);
                      }
                    });
                  })
                } else {

                  var floorDetail = {
                    "floorNo": floorNo.toString(),
                    maxFloorCapacity: allowCapacity,
                    floorTotalCapacity: floorTotalCapacity,
                    schedules: dateArray
                  }
                  var premesis = {
                    "id": data.officeAddress.locationId.toString(),
                    "floor": [floorDetail],
                    "city" : data.officeAddress.city,
                    "country" : data.officeAddress.country,
                  }
                  var payloadSchedule = {
                    "_id": data.officeAddress.locationId.toString(),
                    "premesis": premesis
                  }
                  dbSchedule.insert(payloadSchedule, function (err, res) {
                    console.log("record inserted ", res)
                    db.insert(data, function (err, data1) {
                      if (data1) {
                        data1["requestId"] = payload.requestId;
                        callback(data1);
                      } else {
                        callback(err);
                      }
                    });
                  })
                }
              })
            }
          })
        } else
         {
          let requestSchedule = data.requestSchedule;
          let lastRecord = requestSchedule[requestSchedule.length - 1];
          let status = lastRecord.requestStatus;
          if (status != "Active") {
            var payloadData = {
              comment:
                "Raised a Back to Office request for " + payload.scheduleType,
              subComment: "",
              timestamp: Date.now(),
            };
            var list = module.exports.getrequestScheduleTypeDateList(payload);
            payload.date = list.data;
            data.history.push(payloadData);
            data.requestSchedule.push(payload);

            var notificationPayloadEmployee = {
              message: "new Back to Office request by " + data.name,
              timestamp: Date.now(),
              isRead: false,
            };
            var payloadDataForEmp = {
              comment:
                "Your request for Back to Office for " +
                payload.scheduleType +
                "is sent for approval",
              subComment: "",
              timestamp: Date.now(),
            };
            data.notification.employee.push(payloadDataForEmp);
            data.notification.manager.push(notificationPayloadEmployee);

            var locationQuery = query.getDeatils(data.officeAddress.locationId.toString());
            db_location_Admin.find(locationQuery, function (error , response) {
              if(response){                
                var floorDetails = [];
                if(response && response.docs && response.docs.length > 0){
                  var floorArray = response.docs[0].floor;
                  floorDetails = floorArray.filter(item => {
                   return item.name.toString() === data.officeAddress.floor;
                  })
                }
                
              dbSchedule.find(locationQuery, function (errors , locationResponse) {
                var dateArray = [];
                var startDate = new Date(payload.scheduleStartDate);
                var endDate = new Date(payload.scheduleEndDate);
                var formatedDate;
                while (startDate <= endDate) {
                    formatedDate = moment(startDate).format('YYYY-MM-DD'); //2021-01-13
                    const dateObject = {  
                      date:formatedDate,
                      totalApproved:0 
                  } 
                    dateArray.push(dateObject);
                    startDate.setDate(startDate.getDate() + 1);
                }

                var floorNo = 0;
                var allowCapacity;
                var floorTotalCapacity;

                if(floorDetails.length>0){
                  floorNo = floorDetails[0].name
                  allowCapacity = floorDetails[0].allowedCapacity
                  floorTotalCapacity = floorDetails[0].totalCapacity
                }

                if(locationResponse && locationResponse.docs && locationResponse.docs.length>0){
                  var floorArray = locationResponse.docs[0].premesis.floor
                  var isFloorPresent = false;

                  var newDateArray = [];
                  for (let index = 0; index < floorArray.length; index++) {
                    const element = floorArray[index];
                    if(element.floorNo.toString() === floorNo.toString()){
                      isFloorPresent = true;
                      var scheduleArray = element.schedules;
                      var ids = new Set(scheduleArray.map(d => d.date));
                      newDateArray = [...scheduleArray, ...dateArray.filter(d => !ids.has(d.date))];
                      
                    }
                    if(isFloorPresent){
                      element.schedules = newDateArray;
                      element.maxFloorCapacity = allowCapacity;
                      element.floorTotalCapacity = floorTotalCapacity;
                      locationResponse.docs[0].premesis.floor = floorArray;
                    }
                  }
                  if(!isFloorPresent){
                    var floorDetail = {
                      "floorNo" : floorNo.toString(),
                      maxFloorCapacity : allowCapacity,
                      floorTotalCapacity : floorTotalCapacity,
                      schedules : dateArray
                    }
                    
                    locationResponse.docs[0].premesis.floor.push(floorDetail);
                  } 
                  dbSchedule.insert(locationResponse.docs[0], function (err, res) {
                    console.log("record inserted already data available ",res)
                    db.insert(data, function (err, data1) {
                      if (data1) {
                        data1["requestId"] = payload.requestId;
                        callback(data1);
                      } else {
                        callback(err);
                      }
                    });
                  })
                } else {
                  
                  var floorDetail = {
                    "floorNo" : floorNo.toString(),
                    maxFloorCapacity : allowCapacity,
                    floorTotalCapacity : floorTotalCapacity,
                    schedules : dateArray
                  }
                  var premesis = {
                    "id" : data.officeAddress.locationId.toString(),
                    "floor":[floorDetail],
                    "city" : data.officeAddress.city,
                    "country" : data.officeAddress.country,
                  }
                  var payloadSchedule ={
                    "_id" : data.officeAddress.locationId.toString(),
                    "premesis" : premesis
                  }
                  dbSchedule.insert(payloadSchedule, function (err, res) {
                    console.log("record inserted ",res)
                    db.insert(data, function (err, data1) {
                      if (data1) {
                        data1["requestId"] = payload.requestId;
                        callback(data1);
                      } else {
                        callback(err);
                      }
                    });
                  })
                }
              })
            }
            })
          } else {
            callback(err, { msg: "Already raised a request !!! " });
          }
        }
      } else {
        callback(false);
      }
    });
  },
  authentication: function (payload, callback) {
    db.find(query.getSignIn(payload.emailId, payload.id))
      .then((result) => {
        if (result.docs.length > 0) {
          if (payload.password) {
            let hashPassword = result.docs[0].password;
            let encryptedPwd = utility.verifyPassword(
              payload.password,
              hashPassword
            );
            console.log("encryy", encryptedPwd);
            if (encryptedPwd) {
              console.log("password matched sucrefully");
              module.exports.updateLastEvent(result.docs[0]._id);

              db_hospital.list(
                { include_docs: true },
                async function (err, data1) {
                  var token;
                  if (data1) {
                    var res = data1.rows[0].doc;
                    token = headerObj.genAccessToken(
                      result.docs[0],
                      res.jwtTokenExpiryTime
                    );
                  }
                  callback("", {
                    success: true,
                    userId: result.docs[0]._id,
                    mobileno: result.docs[0].mobileno,
                    symptomDataLen: result.docs[0].symptom.length,
                    isVerifiedUser: result.docs[0].isVerifiedUser,
                    accessToken: token,
                  });
                }
              );
            } else {
              callback("", { message: "incorrect password", success: "false" });
              console.log("pasword not macthed");
            }
          } else {
            if (!(typeof result.docs[0].otpRequestDetails === "undefined")) {
              var timestamp = result.docs[0].otpRequestDetails.timestampAppLock;
              var isAppLock = result.docs[0].isAppLock;
              var dt1 = new Date(timestamp);
              var dt2 = new Date();
              var diff = (dt2.getTime() - dt1.getTime()) / 1000;
              diff /= 60;
              diff = Math.abs(Math.round(diff));
              db_hospital.list(
                { include_docs: true },
                async function (err, data1) {
                  var time = "";
                  if (data1) {
                    var res = data1.rows[0].doc;
                    time = res.jwtTokenExpiryTime;
                    var otpAppLockTime;
                    otpAppLockTime = res.otpAppLockTime;

                    if (diff >= otpAppLockTime) {
                      isAppLock = false;
                      var userId = result.docs[0]._id;

                      module.exports.findDataDb(
                        userId,
                        { isAppLock: false, count: 0, timestampAppLock: 0 },
                        function (err, data) {
                          if (data) {
                          }
                        }
                      );
                    }
                  }
                  var token = headerObj.genAccessToken(result.docs[0], time);
                  console.log("1");
                  callback("", {
                    userId: result.docs[0]._id,
                    mobileno: result.docs[0].mobileno,
                    success: true,
                    symptomDataLen: result.docs[0].symptom.length,
                    isVerifiedUser: result.docs[0].isVerifiedUser,
                    isAppLock: isAppLock,
                    accessToken: token,
                  });
                }
              );
            } else {
              callback("", {
                userId: result.docs[0]._id,
                mobileno: result.docs[0].mobileno,
                success: true,
                symptomDataLen: result.docs[0].symptom.length,
                isVerifiedUser: result.docs[0].isVerifiedUser,
                accessToken: token,
              });
            }
          }
        } else {
          callback("", { message: "User does not exist.", success: false });
        }
      })
      .catch((err) => {
        callback(err, { userId: err, success: false });
      });
  },

  getrequestScheduleTypeDateList:(scheduleRequest)=>{
    var dateArray = new Array();
    var lastRecord = scheduleRequest;
    if (lastRecord.scheduleType == "Daily") {
      let startDate = lastRecord.scheduleStartDate;
      let endDate = lastRecord.scheduleEndDate;
      let id = lastRecord.requestId;
      dateArray = module.exports.getDailyList(
        id,
        startDate,
        endDate,
        lastRecord.requestStatus,
        lastRecord.scheduleType
      );
    } else if (lastRecord.scheduleType == "Alternate day") {
      let startDate = lastRecord.scheduleStartDate;
      let endDate = lastRecord.scheduleEndDate;
      let id = lastRecord.requestId;
      dateArray = module.exports.getAlternateyDaList(
        id,
        startDate,
        endDate,
        lastRecord.requestStatus,
        lastRecord.scheduleType
      );
    }
    console.log("list of data", dateArray);
    return dateArray;

  },

  getrequestScheduleData: (userId, callback) => {
    db.find(query.getrequestScheduleList(userId))
      .then((result) => {
        if (
          result.docs.length > 0 &&
          result.docs[0].requestSchedule.length > 0
        ) {
          var data = result.docs[0].requestSchedule;
          var obj = {};
          console.log(data); 
          var lastRecord = data[data.length - 1];
          var empRequestStatus = lastRecord.requestStatus;
          var lastRecordObj = lastRecord.date;
          if(Object.keys(lastRecordObj).length >0){
            var requestKeyList = (Object.keys(lastRecordObj)); 
          console.log(requestKeyList);
          for (var i=0; i<requestKeyList.length;i++)
          {
            var data = lastRecordObj[requestKeyList[i]];
            if(empRequestStatus=="Approved" && data.requestStatus==="Confirmed"){
              data.requestStatus =data.requestStatus
            }
            else{
              data.requestStatus =empRequestStatus;
            }
            obj[requestKeyList[i]] = data;
          }
          }
          callback("", obj);
        } else {
          callback(false);
        }
      })
      .catch((err) => {
        callback(err);
      });
  },

  getDailyList: function (id, startDate, endDate, requestStatus, scheduleType) {
    const format2 = "YYYY-MM-DD";
    var end = new Date(endDate);
    var final = {};

    var dt = new Date(startDate);
    var map = new HashMap();
    let dateTime2 = "";
    while (dt <= end) {
      dateTime2 = moment(dt).format(format2);
      final[dateTime2] = {
        id: id,
        //date: dateTime2,
        requestStatus: requestStatus,
        scheduleType: scheduleType,
      };
      dt.setDate(dt.getDate() + 1);
    }
    var object = { data: final };
    return object;
  },
  getAlternateyDaList: function (
    id,
    startDate,
    endDate,
    requestStatus,
    scheduleType
  ) {
    const format2 = "YYYY-MM-DD";
    var end = new Date(endDate);
    var final = {};

    var dt = new Date(startDate);
    var map = new HashMap();
    let dateTime2 = "";
    while (dt <= end) {
      dateTime2 = moment(dt).format(format2);
      final[dateTime2] = {
        id: id,
       // date: dateTime2,
        requestStatus: requestStatus,
        scheduleType: scheduleType,
      };
      dt.setDate(dt.getDate() + 2);
    }
    var object = { data: final };
    return object;
  },

  //cancle schedule request
  cancleScheduleRequest: (userId, payload, callback) => {
    db.get(userId, async function (err, data) {
      if (data && data.requestSchedule.length > 0) {
        var requestSch = data.requestSchedule;
        var mess = null;
        var requestType = "";
        for (var m = 0; m < requestSch.length; m++) {
          if (
            requestSch[m].requestId == payload.requestId &&
            requestSch[m].requestStatus === "Active"
          ) {
            data.requestSchedule[m].requestStatus = "cancel";
            requestType = data.requestSchedule[m].scheduleType;
            mess = null;
          } else {
            mess = { ERROR: "Same request already cancel." };
          }
        }
        var payloadData = {
          comment: "Cancel a Back to Office request for " + requestType,
          subComment: "",
          timestamp: Date.now(),
        };
        data.history.push(payloadData);
        db.insert(data, function (err, data1) {
          if (mess) {
            callback(mess, "");
          } else {
            callback("", data1);
          }
        });
      } else {
        var mess = {
          ERROR: "No record found.",
        };
        callback(mess);
      }
    });
  },

  cancelEmployeeNotifaction: (userId, callback) => {
    db.get(userId, async function (err, data) {
      if (data && data.notification.employee.length > 0) {
        var employeeNotifaction = data.notification.employee;
        for (var i = 0; i < employeeNotifaction.length; i++) {
          employeeNotifaction[i].isRead = true;
        }

        db.insert(data, function (err, empdata) {
          if (err) {
            callback(err, "");
          } else {
            callback("", empdata);
          }
        });
      } else {
        var err = {
          ERROR: "No record found.",
        };
        callback(err);
      }
    });
  },


getEmployeeFormDataQuestions: (userId,payload, callback) => {
  var list =[];
  db.get(userId, async function (err, data) {
    if(data.officeAddress.location){
      var location =data.officeAddress.city;
      let dbquery = query.getQuestionBasedLocations(location);
      cloudantWatsonLocationDb.find(dbquery, function (err, response){
        if (response.docs.length>0 && response.docs[0].city && response.docs[0].city ===location) {
          var data = response.docs[0];
              var questionList = data.questions;
              for (var j=0;j<questionList.length;j++){
                if(questionList[j].isEnabled === true)
                {
                  var pay={
                    "category":questionList[j].category,
                    "questionText":questionList[j].questionText,
                    "multiselect":questionList[j].multiselect,
                    "priority":questionList[j].priority,
                    "possibleAnswers":questionList[j].possibleAnswers,

                  }
                  list.push(pay);
                }
            }
              list.sort( function(a , b){
            return a.priority - b.priority;
         })
          callback("", list);
          return;
          }
          else{
            cloudantWatsonDb.list({ include_docs: true }, function (err, resp) {
              if(resp){
                 for(var i = 0; i<resp.rows.length;i++)
                 {
                   var res = resp.rows[i].doc;
                   if(res.isEnabled === true)
                   {
                    var pay={
                      "category":res.category,
                      "questionText":res.questionText,
                      "multiselect":res.multiselect,
                      "priority":res.priority,
                      "possibleAnswers":res.possibleAnswers,
  
                    }
                    list.push(pay);
                   }
                 }
                 list.sort( function(a , b){
                  return a.priority - b.priority; })
            
                 }
                 callback("", list);
                 return;
            })
          }

        })
     
    }
    else {
      var mess = {
        "ERROR": "No record found."
    }
    callback(mess);
    }
})
},

  checkRequestScheduleEmployee: (userId, callback) => {
  let dbquery = query.getAllLocations();
    db.get(userId, async function (err, data) {
      if (data.officeAddress) {
        var response ={};
        var address = data.officeAddress.location;
        var floor = data.officeAddress.floor;
        db_location_Admin.find(dbquery, function (err, res){
            if(res.docs.length>0)
            {
              for(var i =0;i<res.docs.length;i++)
              {
               if(res.docs[i].address  === address)
               {
                 for(var j=0; j<res.docs[i].floor.length;j++)
                 {
                   if(res.docs[i].floor[j].name.toString()=== floor){ 
                   if(res.docs[i].floor[j].allowedCapacity< res.docs[i].floor[j].totalCapacity ){
                    response["success"] = true;
                   }
                   else{
                    response["success"] = false;
                   }
                  }
                   else{
                   
                   }
                 }
               }
              }
              callback("", response); 
  }
  else{
    response["success"] = false;
    callback("", response);
  }
})
      }
    })
  },

  sendNotifactionToEmployee: (userId, callback) => {
    let dbquery = query.notifactionQuery();
    var response={};
    var ListNotification = [];
    var currentDate =  module.exports.getCurrentTime();
           db.find(dbquery, function (err, res){
            if( res && res.docs.length>0){
               for(var i=0; i<res.docs.length;i++)
               {
                 var data = res.docs[i];
                 var requestSche= data.requestSchedule;
                 var list =requestSche[requestSche.length - 1];
                 if(list.requestStatus === "Approved")
                 {
                 var symptoms  = data.symptom;
                 var sympData = symptoms[symptoms.length - 1];
                 var timeStamp = sympData.timestamp;
                 var symptomDate = moment(timeStamp).format("YYYY-MM-DD");
                 console.log("", symptomDate);
                 if( list.date[currentDate] &&  symptomDate != currentDate)
                 {
                  var notificationRequest = {

                    title: "Mandatory health check",
                  body:  "Dear "+data.name+ ", you haven\'t uploaded your health data. Please upload it. ",
                     deviceToken: data.deviceToken,
                    }
                    ListNotification.push(notificationRequest);
                   }
               }
              }
               if(ListNotification.length>0)
               {
                 for(var j =0;j<ListNotification.length;j++)
                 {
                    socket.emit('employee_schedule', ListNotification[j]);
                     module.exports.sendNPushNotificatonToPatient(ListNotification[j],null);
                 }
               }
              callback(err, ListNotification); 
            }
            else{
              response["success"] = false;
              callback(response,"");
            }
           

   })
     },

     getCurrentTime:()=>{
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();
      today = yyyy + '-' + mm + '-' + dd;
      return today;
     },
     sendNPushNotificatonToPatient:function(request,callback) {
      db_hospital.list({include_docs:true}, function (err, responseData) {
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

  deleteUsertoken:function(userId,callback) {
    db.get(userId, async function (err, data) {
      if(data && data.deviceToken)
      {
        data.deviceToken ="";
        db.insert(data, function (err, resp) {
          callback(err, resp);
        })
        
      }else{
        callback(err, "");
      }

    })      
},
};


