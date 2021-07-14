const patient = require("./patient.model");
const cloudant = require('@cloudant/cloudant');
var uuid = require('uuid-random');
const { response } = require("express");

module.exports = {

    updatePatients: (request, response, next) =>{
        

    },

    readPatient: (request, response, next) => {
        var patientid = request.params.patientid;
        patient.readDocument(patientid, function (err, data) {
            response.send(data);
        });
    },
    addsymptom: (request, response, next) => {
        var payload = request.body;
        console.log("RequestData for Add Symptom => "+JSON.stringify(request.body));
        if (payload["isverified"] == undefined) {
            patient.updateDocument(payload, function (err, data) {
                response.send(data);
            });
        }
        else {
            var id = request.body.user_id.toString();
            console.log("id=" + id);

            patient.getUserName(id, function (err, data) {
                {
                    response.send(data);
                }
            });
        }
    },

    updatesymptom: (request, response, next) => {
        var payload = request.body;
        console.log("RequestData for update Symptom => "+JSON.stringify(request.body));
        if (payload["isverified"] == undefined) {
            
            patient.updateUserSymptom(payload, function (err, data) {
                response.send(data);
            });
        }
        else {
            var id = request.body.user_id.toString();
            console.log(JSON.stringify(request.body));
            patient.getUserName(id, function (err, data) {
                {
                    response.send(data);
                }
            });
        }
    },

    findsymptom: (request, response) => {
        
        var userId = request.body.id;
        var result = patient.findsymptom(userId, function (result) {
            response.send({ "success": result });
        });

    },
    updateDeviceToken: (request, response) => {
        patient.readDocument(request.body.userId, function (err, data) {
            if (data) {
                    let obj = { data: data, deviceToken: request.body.deviceToken}
                    patient.updateDeviceToken(obj, function (result) {
                        response.send({ "res": result });
                    })
            }
            else response.send(err);
        });
    },
};
