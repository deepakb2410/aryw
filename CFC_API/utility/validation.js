"use strict";

module.exports = {

    checkEmail : function(email){
        var isValid = true;
        switch (true) {
        case email === '':
            isValid = false;
            break;
        case (!new RegExp(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,15}/g).test(email)):
            isValid = false;
            break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid email id.",statusCode : 400,success: false}
        }        
        return response;
    },
    checkName : function(param){
        var isValid = true;
        switch (true) {
        case param === '':
            isValid = false;
            break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid name.",statusCode : 400, success: false }
        }        
        return response;
    },
    checkID : function(param){
        var isValid = true;
        switch (true) {
            case param === '':
                isValid = false;
                break;
            case (!new RegExp(/[0-9]+$/g).test(param)):
                isValid = false;
                break;
            case param.length < 0 || param.length > 15:
                isValid = false;
                break
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid ID." ,statusCode : 400,success: false}
        }        
        return response;
    },
    checkPhoneNo : function(param){
        var isValid = true;
        switch (true) {
            case param === '':
                isValid = false;
                break;
            case (!new RegExp(/^[0-9+]+$/g).test(param)):
                isValid = false;
                break
            case param.length < 10 || param.length > 15:
                isValid = false;
                break
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid contact no." ,statusCode : 400,success: false}
        }        
        return response;
    },
    checkPassword : function(param){
        var isValid = true;
        switch (true) {
            case param === '':
                isValid = false;
                break;
            case !(new RegExp(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,30}$/g).test(param)):
                isValid = false;
                break;
            case (!new RegExp(/[A-Z]/g).test(param)):
                isValid = false;
                break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid passsword.",statusCode : 400,success: false }
        }        
        return response;
    },
    checkGender : function(param){
        var isValid = false;
        switch (true) {
            case param === 'male' || param === 'Male':
                isValid = true;
                break;
            case param === 'female' || param === 'Female':
                isValid = true;
                break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid gender.",statusCode : 400,success: false }
        }        
        return response;
    },
    checkUserType : function(param){
        var isValid = false;
        switch (true) {
            case param === 'doctor' || param === 'Doctor':
                isValid = true;
                break;
            case param === 'health assistant' || param === 'Health Assistant':
                isValid = true;
                break;
            case param === 'admin' || param === 'Admin':
                isValid = true;
                break;
            case param === 'operator' || param === 'Operator':
                isValid = true;
                break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid user type.",statusCode : 400,success: false }
        }        
        return response;
    },
    checkUserName : function(param){
        var isValid = true;
        switch (true) {
            case param === '' :
                isValid = false;
                break;
            case (!new RegExp(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*_#?&])[A-Za-z\d@$!%*_#?&]{8,}$/).test(param)):
                isValid = false;
                break;
        }
        let response;
        if(isValid){
            response = {isValid : isValid }
        } else {
            response = {isValid : isValid, msg : "please enter valid user name.",statusCode : 400,success: false }
        }        
        return response;
    },

}