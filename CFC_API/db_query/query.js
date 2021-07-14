'use strict';

module.exports = {
    searchQuery: function () {
        return {
            "selector": {
                "usertype": "individual"
            },
            "fields": [
                "_id", "name"
            ]
        };
    },
    getAllLocations: function () {
        return {
            "selector": {
            },
            "fields": [
                "_id","country", "city","zipcode","address","floor"
            ]
        };
    },

    getQuestionBasedLocations: function (city) {
        return {
            "selector": {
                "city": city
            },
        };
    },
    getSymptom: function (id) {
        return {
            "selector": {
                "_id": id
            },
            "fields": [
                "_id",
                "symptom"
            ]
        };
    },
     getUserName: function (id) {
        return {
            "selector": {
                "_id": id
            },
            "fields": [
                "_id",
                "name",
                "age",
                "gender",
                "otpRequestDetails",
                "mobileno",
            ]
        };
    },
    getEmail: function (emailId) {
        return {
            "selector": {
               "emailId": emailId
            }
        }
     },

     getSignInEmail: function (emailId, password){
        return {
            "selector": {
               "emailId": emailId,
               "password":password,
            },
            "fields": [
                "_id",
                "_rev",
                "name",
                "mobileno",
                "symptom",
                "isVerifiedUser",
                "isAppLock",
                "otpRequestDetails"
            ]
        }
     },
     getSigup: function (mobileno) {
        return {
            "selector": {
               "mobileno": mobileno,
            },
            "fields": [
                "_id",
                "_rev",
                "name",
                "age",
                "gender",
                "mobileno",
                "symptom",
                "isVerifiedUser",
                "isAppLock",
                "otpRequestDetails"
            ]
        }
     },

     getSignInWatson: function (userId) {
        return {
            "selector": {
               "_id": userId,
            },
            "fields": [
                        "_id",
                        "_rev",
                        "name",
                        "age",
                        "gender",
                        "password",
                        "mobileno",
                        "symptom",
                        "isVerifiedUser",
                        "isAppLock",
                        "otpRequestDetails"
            ]
        };
     },
     getSignIn: function (emailId, mobileno) {
        return {
            "selector": {
                "$or": [
                    { "emailId": emailId },
                    { "mobileno": mobileno }
                ],
            },
            "fields": [
                        "_id",
                        "_rev",
                        "name",
                        "age",
                        "gender",
                        "password",
                        "mobileno",
                        "symptom",
                        "isVerifiedUser",
                        "isAppLock",
                        "otpRequestDetails"
            ]
        };
     },
         getuserData: function (userId) {
            return {
                "selector": {
                   "_id": userId,
                },
            }
    },
    getuserDataWatson: function (userId) {
        return {
            "selector": {
               "_id": userId,
            }
    }
},
    getVerifiedUser: function (isVerifiedUser) {
        return {
            "selector": {
               "isVerifiedUser": isVerifiedUser
            }
        };
    },
    getUserDetails: function (archiveDbStamp) {
        return {
            "selector": {
               "archiveDbStamp": archiveDbStamp
            }
        }
    },
    
    checkDataInDb: function (userId,mobileno, emailId) {
        return {
            "selector": {
                "$or": [
                    { "mobileno": mobileno },
                    {"_id": userId},
                    { "emailId": emailId }
                   
                ],
            }
        };
    },
    getrequestScheduleList: function (id) {
        return {
            "selector": {
                "_id": id
            },
            "fields": [
                "_id",
                "symptom",
                "requestSchedule"
            ]
        };
    },

    getDeatils: function (id) {
        return {
            "selector": {
                "_id": id
            },
        }
    },
    notifactionQuery: function () {
        return {
            "selector": {
                "requestSchedule":{
                    "$elemMatch": {
                        "requestStatus":"Approved"
                    }},


                "symptom": {
                    "$elemMatch": {
                        "timestamp": {
                            "$gt": 100
                        }
                    }
             }
            },
        }
    },
    getcloudanB2Oschedules: function (locationId) {
        return {
            "selector": {
                "_id": locationId
            },
        };
    },
}