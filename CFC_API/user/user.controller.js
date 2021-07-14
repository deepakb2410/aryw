const user = require("./user.model");
const querystring = require("querystring");
var multer = require("multer");

var multiparty = require("multiparty");
const http = require("http");
const path = require("path");
const fs = require("fs");
const utility = require("../utility/utility");
const imageThumbnail = require('image-thumbnail');
const Nexmo = require('nexmo');
const { request } = require("https");
const { response } = require("../app");
const validation = require("../utility/validation");

module.exports = {
  deleteUser: (request, response) => {},

  addUser: (request, response) => {
    var reqParam ;
    
    if(request.headers.body){
      reqParam = JSON.parse(request.headers.body);
    } else {
      reqParam = request.body;
    }
    var payloadData = {
      name: reqParam.name,
      gender:reqParam .gender,
      age: reqParam.age,
      mobileno: reqParam.mobileno,
      location: reqParam.location,
      emailId:reqParam.emailId,
      password:reqParam.password,
    };
    if(reqParam.isCheckEmail && reqParam.emailId)
    {
      user.checkEmailId(reqParam.emailId, function(err, data){
        if(data)
        {
          response.send(data);
        }

      })
    }
    else{
      if(reqParam.name && reqParam.gender && reqParam.age && reqParam.mobileno && reqParam.location && reqParam.emailId && reqParam.password){
      user.checkUser(reqParam.mobileno,function(err, data1)
      {
        if(data1.success== true)
        {
          user.createDocument(payloadData, function (err, data) {
            response.send(data);
          });
        }
        else{
          user.updateDetailsData(payloadData, function (err, data) {
           
          });
          response.send(data1);
        }
      });
    }
    else{
      response.send("data can't be empty");
    }
  }
  
  },

  updateUser: async (request, response, next) => {
    var userId = request.params.userId;
    var photo = request.file;
    var filename = "";
    var isSuccessFile = false;
    var obj = JSON.parse(request.body.data);
    if (photo) {
      let options = {percentage: 25,responseType: 'base64' }
      const tempPath = request.file.path;
      var ext = path.extname(request.file.originalname).toLowerCase();
      if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        try {
        filename = await imageThumbnail(tempPath, options);
        } catch (err) {
          err = {msg: "Something went wrong!"};
          response.send(err);
        }
    }
    else{
      err = {msg: "Invalid file format"};
      response.send(err);
    }
}
    var payloadData = {
      name: obj.name,
      mobileno: obj.mobileno,
      address : obj.address,
      state: obj.state,
      city: obj.city,
      pincode: obj.pincode,
      country: obj.officeAddress.country,
      officeCity:obj.officeAddress.city,
      officeLocation:obj.officeAddress.location,
      floor:obj.officeAddress.floor,
      zipcode:obj.officeAddress.zipcode,
      locationId:obj.officeAddress.locationId,
    };
   if (filename) {
      payloadData["imageUrl"] = filename;
    }
    user.updateDocument(userId, payloadData, function (err, data) {
      if (data) response.send(data);
      else response.send(err);
    });
  },

  getUser: (request, response, next) => {
    var userId = request.params.userId;
    user.readDocument(userId, function (err, data) {
      if (data) {
       user.updateOtpDetails( function (err1, otpDetails, healthstatus) {
        if (otpDetails) {
          data["otpDetails"] = otpDetails;
          data["healthStatus"]= healthstatus;
          response.send(data);
          next();
      }
      });
     
    }
      else response.send(err);
    });
  },

  updateUserRecord: (request, response) =>{
    var reqParam ;
    if(request.headers.body){
      reqParam = JSON.parse(request.headers.body);
    } else {
      reqParam = request.body;
    }
    var mobileNo = validation.checkPhoneNo(reqParam.mobileno);
    if (!mobileNo.isValid) {
      mobileNo.msg = "Please enter valid mobile number."
      response.statusCode = 400;
      response.send(mobileNo);
      return;
    }

    var id = validation.checkID(reqParam.id);
    if (!id.isValid) {
      id.msg = "Please enter user id."
      response.statusCode = 400;
      response.send(id);
      return;
    }
    user.updateUserRecord(reqParam , response);

  },

  signIn: (request, response, next) => {
    
    //var mobileNum = "+";
    //var id = mobileNum.concat(request.body.id);
    var reqParam ;
    
    if(request.headers.body){
      reqParam = JSON.parse(request.headers.body);
    } else {
      reqParam = request.body;
    }
    
    let emailId= reqParam.username;
    let password = reqParam.password;

      if (emailId && password) {
        user.getUserDN(emailId,password,response);
      } else {
        response.send("invalid request");
      }
  },

  ///get user name against userId
  getUserName: (request, response, next) => {
    var payloadData = {
      id: request.body.id,
    };
    user.getUserName(payloadData, function (err, data) {
      response.send(data);
    });
  },

  //upload image
  uploadImage: (request, response, next) => {
    var payload = {
      image: request.body.image,
    };
  },
  download: (request, upload, callback) => {
    var url = request.url;
    request.head(url, (err, res, body) => {
      request(url).pipe(fs.createWriteStream(path)).on("close", callback);
    
    });
  },

  generateOtpMobile: async (request, response, next) =>{
    var reqParam ;
    if(request.headers.body){
      reqParam = JSON.parse(request.headers.body);
    } else {
      reqParam = request.body;
    }
    var userId = reqParam.userId;
     if(userId){
       let Otp = utility.genrateOtp();
       console.log("otp,", Otp);
       if(reqParam.mobile)
       {
        var obj={
          userId:reqParam.userId,
          otp:Otp,
          mobileNum:reqParam.mobile
        }
        user.sendOTPMobile(obj);

       }
      
       
       let genrateOtpTimestamp =  Date.now()
       var payload = {
              code:Otp,
              timestampOtp:genrateOtpTimestamp,
              timestampAppLock:0,
            };

        user.updateOtpDetailsDB(userId, payload, function(err, data){
          if(data)
          {
            response.send(data);
          }
          else{
            response.send(err);
          }
        });
     }
  },

  //otp validation
    otpValidation: (request, response, next) =>{
      var reqParam ;
      if(request.headers.body){
        reqParam = JSON.parse(request.headers.body);
      } else {
        reqParam = request.body;
      }
      var userId = reqParam.userId;
      var userObj={
        userId: reqParam.userId,
        isLoginTrue: reqParam.isLoginTrue,
        code:reqParam.code,
       // mobileNum:reqParam.mobileNum
      }
        user.getConfigureOtpDetails(userObj,function(err, data){
      if(data){
        response.send(data);
      }
      else{
        response.send(err);
      }
  
    })
  },
  
  getLocationConfiguration:(request, response, next) => {
     user.getLocationConfigurationDetails(function(error, data){
       if(data){
         response.send(data);
       }else{
        response.send(error);
       }
     })
  },
  getUserbyMobileNum:(request, response, next) =>{
    var reqParam ;
    if(request.headers.body){
      reqParam = JSON.parse(request.headers.body);
    } else {
      reqParam = request.body;
    }
    var userId = reqParam.userId;
   if(reqParam){
      user.getUserDataMobile(userId,function (err, data) {
        if (data) {
          user.updateOtpDetails( function (err1, otpDetails) {
           if (otpDetails) {
             data["otpDetails"] = otpDetails;
             response.send(data);
           
         }
         });
        
       }
       else{
         response.send(err);
       }
      
      });
    }
  },
   //delete unVerified User 
   deleteUnVerifiedUser:(request,response, next)=>{
    console.info('cron job start');
     var isVerifiedUser =false;
      user.deleteUnVerifiedUser(isVerifiedUser, function (err, data) {
        if (data) {
        response.send(data);
        
       }
       else{
         response.send(err);
       }
      
      });
    },
    

    getLoginDetails:(request,response, next)=>{
        user.isLogingetDetails(function (err, data) {
          if (data) {
            response.send(data);
         }
         else{
           response.send(err);
         }
        
        });
      },

      updateRequestSchedule:(request,response, next)=>{
        var userId = request.params.userId;
        if(userId && request.body.scheduleType && request.body.scheduleStartDate )
        {
          let id = utility.genrateId();
          var payloadData = {
            requestId:id,
            requestStatus:'Active',
            scheduleState:"Manager",
            managerActionDate:"",
            hrActionDate:"",
            managerAction:"",
            hrAction:"",
            scheduleType: request.body.scheduleType,
            scheduleStartDate:request.body.scheduleStartDate,
            scheduleEndDate:request.body.scheduleEndDate,
            message:request.body.message,
            commuteType:request.body.commuteType,
            timestamp: Date.now(),
          };
          user.updateuserRequestDetails(userId, payloadData, function (err, data) {
            if (data) {
              response.send(data);
            }
            else{
              response.send(err)
            }
          });

        }
        else{
          let err = {msg: "Something went wrong!"};
          response.send(err);
        }
      },

      getrequestSchedule:(request,response, next)=>{
        var userId = request.params.userId;
        if(userId)
        {
         user.getrequestScheduleData(userId, function (err, data) {
            if(data){
              response.send(data);
            }
            else{
              response.send(err);
            }
           
          });
        }

},
cancleScheduleRequest:(request,response, next)=>{
  var userId = request.params.userId;
  if(userId)
  {
    var payload={
      requestId:request.body.requestId,
    }
    user.cancleScheduleRequest(userId,payload, function (err, data) {
      if(data){
        response.send(data);
      }
      else{
        response.send(err);
      }
     
    });
  }

},
  
deleteNotificationUser:(request,response, next)=>{
  var userId = request.params.userId;
  if(userId)
  {
    user.cancelEmployeeNotifaction(userId, function (err, data) {
      if(data){
        response.send(data);
      }
      else{
        response.send(err);
      }
     
    });

  }
},

   checkRequestSchedule:(request,response, next)=>{
    var userId = request.params.userId;
    if(userId)
    {
      user.checkRequestScheduleEmployee(userId, function (err, data) {
        if(data){
          response.send(data);
        }
        else{
          response.send(err);
        }
       
      });
  
    }
  },

  getFormDataQuestions:(request,response, next)=>{
    var userId = request.params.userId;
    if(userId)
    {
      var payload={
        requestId:request.body.requestId,
      }
      user.getEmployeeFormDataQuestions(userId,payload, function (err, data) {
        if(data){
          response.send(data);
        }
        else{
          response.send(err);
        }
      })
  }
},
deleteUsertoken:(request,response, next)=>{
    var userId = request.params.userId;
    if(userId)
    {
      user.deleteUsertoken(userId, function (err, data) {
        if(data){
          response.send(data);
        }
        else{
          response.send(err);
        }
      })
  }
},

  
     };
