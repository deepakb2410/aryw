const express = require("express");

var router = express.Router();

const userController = require('./user.controller');
const multer = require('multer');
const upload = multer({dest: __dirname + '/../images/'});
const cron = require("node-cron");
const dbConfig = require('..///DbConfig/archiveDbConfig');
const headerObj = require('..//hearderConfig/headerData');


router.post('/signup', function(req, res, next) {
    userController.addUser(req, res, next);
});
router.post('/signin',  function(req, res, next) {
    userController.signIn(req, res, next);
});
router.post('/username', function(req, res, next) {
    userController.getUserName(req, res, next);
});

//validate OTP for MobileNumber
router.post('/verifyOtp', function(req, res, next) {
    userController.otpValidation(req, res, next);
 });
 
 

 //requestschedule
 router.post('/requestSchedule/:userId', function(req, res, next) {
    userController.updateRequestSchedule(req, res, next);
 });

 router.post('/getFormDataQuestions/:userId', function(req, res, next) {
    userController.getFormDataQuestions(req, res, next);
 });

 //cancle schedule request 
 router.post('/cancleScheduleRequest/:userId', function(req, res, next) {
    userController.cancleScheduleRequest(req, res, next);
 });


 //get schedule deatils
router.post('/getrequestScheduleList/:userId', userController.getrequestSchedule);
 router.post('/updateUserRecord',headerObj.checkHeader, function(req, res, next) {
    userController.updateUserRecord(req, res, next);
 });

//get user details Api

router.post('/getdetails', userController.getUserbyMobileNum);

//get Location Details
router.post('/getLocationConfiguration', userController.getLocationConfiguration);
router.post('/deleteUserToken/:userId', userController.deleteUsertoken);

router.post('/deleteUnverifiedUser/', userController.deleteUnVerifiedUser);
router.post('/deleteNotificationUser/:userId', userController.deleteNotificationUser);
router.post('/getlogindetails', userController.getLoginDetails);
router.post('/checkRequestSchedule/:userId', userController.checkRequestSchedule);
//router.post('/getAllNotification/:userId', userController.getAllNotification);

router.post('/generateOtp', function(req, res, next){
    userController.generateOtpMobile(req, res, next);
});



router.get('/:userId',headerObj.checkHeader, userController.getUser);
router.delete('/:userId', userController.deleteUser);

//update user
router.post('/:userId',headerObj.checkHeader, upload.single('profile'), function(req, res, next) {
    userController.updateUser(req, res, next);
});

module.exports = router; 


