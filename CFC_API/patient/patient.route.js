const express = require("express");

var router = express.Router();
const headerObj = require('..//hearderConfig/headerData');

const PatientController = require('./patient.controller');


router.post('/addsymptom', function (req, res, next) {
    PatientController.addsymptom(req, res, next);
});
router.post('/findsymptom', function (req, res, next) {
    PatientController.findsymptom(req, res, next);
});

router.post('/updatesymptom', headerObj.checkHeader, function (req, res, next) {
    PatientController.updatesymptom(req, res, next);
});

router.post('/updateDeviceToken',function(req, res, next){
 PatientController.updateDeviceToken(req, res, next);
}
);


module.exports = router;