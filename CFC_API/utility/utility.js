"use strict";
var uuid = require("uuid-random");

const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

let constants = {
  symptomEventType: {name : 'symptomEvent' , score : '2'},
  healthScoreEventHighType:  {name : 'healthScoreHighEvent' , score : '4'},
  healthScoreEventLowType: {name : 'healthScoreLowEvent' , score : '1'},
  SOSEventRaisedType:  {name : 'SOSEventRaised' , score : '4'},
  SOSEventCancelledType:  {name : 'SOSEventCancelled' , score : '2'},
  quarantineStartEventType: {name : 'quarantineStartEventType' , score : '3'},
  quarantineEndEventType: {name : 'quarantineEndEventType' , score : '1'},
  newPatientEventType: {name : 'newPatientEventType' , score : '4'},
  systemTimeOutEventType: {name : 'systemTimeOutEventType' , score : '2'},
};

const monitoringBackendURL  = "http://169.57.43.160:30444";
var passwordHash = require('password-hash');

module.exports = {
  createGUI: function () {
    var str = uuid();
    var matches1 = str.match(/\d+/g);
    var _Gid = matches1.join().replace(/,/g, "").substring(1, 10);
    return _Gid;
  },
  createPWD: function () {
    var pwd = uuid().substring(1, 8);
    return pwd;
  },

  // Nodejs encryption with CTR

  encryptPassword:(text)=>{
    var hashedPassword = passwordHash.generate(text);
    return hashedPassword;
  },

  verifyPassword:(userPassword, hashedPassword)=>{
    return passwordHash.verify(userPassword, hashedPassword);
  },


  convertStatustoTemperature: (temperature) => {
    switch (temperature) {
      case "normal":
        return 97;
        break;
      case "medium":
        return 100;
        break;
      case "fever":
        return 102;
        break;
      case "highfever":
        return 105;
        break;
      default:
        return 97;
    }
  },

  updateUserDetails: function (data, payload) {
    data["address"] = payload.address;
    data["city"] = payload.city;
    data["state"] = payload.state;
    data["pincode"] = payload.pincode;
    data["mobileno"] = payload.mobileno;
    data.officeAddress.country = payload.country;
    data.officeAddress.city = payload.officeCity;
    data.officeAddress.location = payload.officeLocation;
    data.officeAddress.floor = payload.floor;
    data.officeAddress.zipcode= payload.zipcode;
    data.officeAddress.locationId= payload.locationId;
    if (payload.imageUrl) {
      data["imageUrl"] = payload.imageUrl;
    }

    return data;
  },

  uniqueFileName: function (fileName) {
    var result = "";
    var length = 8;
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  getBase64Prefix: function () {
    return "data:image/jpeg;base64,";
  },

  updateOtpDetails: function (data, payload) {
    data.otpRequestDetails.code = payload.code;
    data.otpRequestDetails.timestampOtp = payload.timestampOtp;
    data.otpRequestDetails.timestampAppLock = payload.timestampAppLock;
    return data;
  },

  updateCount: function (data, payload) {
    data.otpRequestDetails.count = payload.count;
    data.otpRequestDetails.isSuccess = payload.isSuccess;
    data.otpRequestDetails.timestampAppLock = payload.timestampAppLock;
    data.isVerifiedUser = payload.isVerifiedUser;
    data.isAppLock= payload.isAppLock;
    return data;
  },
  
  checkUserEvent: function (data, eventObj) {
    
    var eventTypeScore = this.checkEventType(eventObj,data);
    if (data.userEvent === undefined) {
      var newRecord = {
        "lastEventScore": "0",
        "newEventScore": "0",
        "isProcessing" : false,
        "isSosRaised": data.isSosRaised,
        "eventRecords": [{
          eventType: eventObj,
          eventScore: eventTypeScore,
          timestamp: Date.now()
        }
        ]
      }
      if (eventObj === constants.SOSEventCancelledType.name){
        newRecord.eventRecords = [];
      }
      var calculateScore = this.calculateEventScore(newRecord,data.currentCovidScore)
      data["userEvent"] = calculateScore;
    
    } else {
      var newRecord = {
        eventType: eventObj,
        eventScore: eventTypeScore,
        timestamp: Date.now()
      }
      var lastArray = [];
      var lastEventRecord = data.userEvent;
      lastArray = lastEventRecord.eventRecords;
      if (eventObj !== constants.SOSEventCancelledType.name) {
        lastArray.push(newRecord);
      }
      lastEventRecord.eventRecords = lastArray;
      lastEventRecord.isSosRaised = data.isSosRaised;
      var calculateScore = this.calculateEventScore(lastEventRecord,data.currentCovidScore)
      data.userEvent = calculateScore;
    
    }
  },

  checkEventType: function (eventType,data) {
    if (eventType === constants.SOSEventRaisedType.name) {
      return constants.SOSEventRaisedType.score
    } else if (eventType === constants.SOSEventCancelledType.name) {
      var localArray = data.userEvent.eventRecords;
      var removeElement ;
      for(var count = localArray.length-1 ; count >= 0 ; count--){
          var item = localArray[count];
          if(item.eventType === constants.SOSEventRaisedType.name){
            removeElement  = item;
            break
          }
      }

      if (removeElement) {
        const index = data.userEvent.eventRecords.indexOf(removeElement);
        if (index > -1) {
          data.userEvent.eventRecords.splice(index, 1);
        }
      }

      return constants.SOSEventCancelledType.score
    } else if (eventType === constants.healthScoreEventHighType.name) {
      return constants.healthScoreEventHighType.score
    } else if (eventType === constants.healthScoreEventLowType.name) {
      return constants.healthScoreEventLowType.score
    } else if (eventType === constants.quarantineStartEventType.name) {
      return constants.quarantineStartEventType.score
    } else if (eventType === constants.quarantineEndEventType.name) {
      return constants.quarantineEndEventType.score
    } else if (eventType === constants.symptomEventType.name) {
      return constants.symptomEventType.score
    } else if (eventType === constants.newPatientEventType.name) {
      return constants.newPatientEventType.score
    } else if (eventType === constants.systemTimeOutEventType.name) {
      return constants.systemTimeOutEventType.score
    }
  },

  calculateEventScore: function(userEvent,currentStatusScore){
    console.log('calculate score ')
    console.log('old score '+userEvent.newEventScore)
    var eventArry = [];
    eventArry = userEvent.eventRecords;
    var score = 0;
    var currentTime = Date.now();
    eventArry.forEach(element => {
      var eventScore = Number(element.eventScore);
      score = score + ( eventScore * Number(currentTime - element.timestamp))
    });
    if(currentStatusScore){
      score = score + Number(currentStatusScore);
    }
    console.log("final new score "+score);
    userEvent.lastEventScore = userEvent.newEventScore;
    userEvent.newEventScore = score;
    userEvent.isProcessing = false;
    userEvent.timestamp = Date.now();
    return userEvent;
  },
  constants,
  monitoringBackendURL,
  cloudantBaseUrl: 'https://e9ee6666-e0eb-4a94-921a-6c556ff1a904-bluemix.cloudantnosqldb.appdomain.cloud',
  cloudantAppSecretKey:'hZ5igDxFRFZnNGDmjIUOW-A28lxOGPFLhV3p6EiDluJE',
  cloudantPatientDbName:'c4c_db',
  cloudandHospitalDbName:'c4c_hospital',
  cloudantDoctorDbName:'c4c_doctor',
  cloudantWatsonDbName:'c4c_watson',
  cloudantArchiveDbName:'archive_db',
  cloudantDefaultDBName:'b2o_defconfig',

  genrateId: function () {
   return Math.floor((Math.random() * 899999) + 100000)
  },
  genrateOtp: function () {
    return Math.floor(1000+ Math.random()*9000)
   },

   
   updateOfficeAddress: function (data, payload) {
    data.officeAddress.country = payload.officeAddress.country;
    data.officeAddress.city = payload.officeAddress.city;
    data.officeAddress.location = payload.officeAddress.location;
    data.officeAddress.floor = payload.officeAddress.floor;
    data.officeAddress.zipcode= payload.officeAddress.zipcode;
    data.officeAddress.locationId= payload.officeAddress.locationId;
    return data;
  },

};
