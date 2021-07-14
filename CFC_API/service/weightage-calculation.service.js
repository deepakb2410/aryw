module.exports = {

    singleCondition(number1, value,operator1){
        var isResult = false;
        if(operator1 == '<'){
          isResult = number1 < value;
        }else if(operator1 == '<='){
            isResult = number1 <= value;
        }else if(operator1 == '>'){
            isResult = number1 > value;
        }else if(operator1 == '>='){
            isResult = number1 >= value;
        }else if(operator1 == '=='){
            isResult = number1 == value;
        }
        return isResult;
    },

    getAge: function (name,ageValue) {
        var arr = [...name];

        var isStartwithOperator = false;
        var operator1 = '';
        var operator2 = '';
        var operator3 = '';
        var number1 = '';
        var number2 = '';
        var number3 = '';
        var isOperator2 = false;
        var isOperator1 = false;
        var isOperator3 = false;
        var isNum2 = false;
        var isNum3 = false;
        arr.forEach((item, index) => {
            if (item >= '0' && item <= '9') {
                if (operator2) {
                    isOperator3 = true
                } else if (operator1) {
                    isOperator2 = true
                } else {
                    isOperator1 = true
                }

                if (!isNum2) {
                    number1 = number1 + item;
                } else if (!isNum3) {
                    number2 = number2 + item;
                } else {
                    number3 = number3 + item;
                }

            } else if (item == "<" || item == ">" || item == "=") {
                if (index === 0) {
                    isStartwithOperator = true;
                }
                if (isOperator3) {
                    operator3 = operator3 + item;
                } else if (isOperator2) {
                    operator2 = operator2 + item;
                } else {
                    operator1 = operator1 + item;
                }

                if (number2) {
                    isNum3 = true;
                }else if (number1) {
                    isNum2 = true;
                }

            } else {  
                if (number2) {
                    isNum3 = true;
                }else if (number1) {
                    isNum2 = true;
                }

                if (operator2) {
                    isOperator3 = true;
                }else if (operator1) {
                    isOperator2 = true;
                }
               
            }
        });

        var firstValue = this.singleCondition(number1 ,ageValue,operator1)
        var secondValue = true;
        if(number2 && operator2){
             secondValue = this.singleCondition(ageValue ,number2,operator2);
        }
        
        if(firstValue && secondValue){
            return true;
        }else{
            return false;
        }

    },

    getTemperature : function(value){
        if (!isNaN(Number(value))) {
            let temp = Number(value);
            var response = temp <= 98.6 ? 'normal'
                : temp > 98.6 && temp <= 99.5 ? 'medium'
                    : temp > 99.5 && temp <= 102 ? 'high'
                        : 'very high';         
              return response          
        }
    },

    getHeartRate : function (value){
        if (!isNaN(Number(value))) {
            let temp = Number(value);
            var heart_rate = temp <= 90 ? 'normal'
                : temp > 90 && temp <= 120 ? 'medium'
                    : temp > 120 && temp <= 150 ? 'high'
                        : 'very high';

            return heart_rate
        }
    },

    calculate_Weightage: function(weightageData , symptomValue , paramName){
        if(weightageData.subParameter){
            var weightageResponse = 0;
            weightageData.subParameter.forEach(element =>{
                var name = element.name;
                var value = element.weightageValue;
                if(name.includes("<") || name.includes(">") || name.includes("=")){
                   if (this.getAge(name,symptomValue)){
                        weightageResponse = Number (weightageData.totalWeightage) * Number(value)
                        return weightageResponse;
                   }
                } else {
                    if( !isNaN(Number(symptomValue) && paramName.includes('temperature'))){
                        symptomValue = this.getTemperature(symptomValue);
                    }
                    if( !isNaN(Number(symptomValue) && paramName.includes('heart'))){
                        symptomValue = this.getHeartRate(symptomValue);
                    }
                    if(typeof symptomValue === 'object'){
                        weightageResponse = 0;
                        var counter = 0;
                        weightageData.subParameter.forEach(elementItem => {
                            var filterValue = symptomValue.some((element)=> element == elementItem.name);
                            if(filterValue == true){
                                counter = Number(elementItem.weightageValue) + counter;
                            }
                        });
                        weightageResponse = Number (weightageData.totalWeightage) * Number(counter)
                        return weightageResponse;
                    }
                    else if (name && name.trim().toLowerCase() === symptomValue.toLowerCase()) {
                        weightageResponse = Number (weightageData.totalWeightage) * Number(value)
                        return weightageResponse;
                    }                    
                }                
            });

            return weightageResponse;
        }
    },

    getAgeWeightage: function (data, weightageArray) {
        let ageWeightage = 0;

        var ageArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'age'){
                return item;
            }
        });

        var valueArray ;

        if(ageArray.length>0){
            valueArray= ageArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return ageWeightage;
        }
        
        var params = valueArray.filter(item => {
         if(this.getAge(item.name,data.age)){
            return item;
         }
        });

        if (params.length > 0) {
            ageWeightage = params[0].weightageValue;
        }
        ageWeightage = ageWeightage * 5;
        return ageWeightage;
    },

    genderWeightage: function (data, weightageArray) {
        let genderWeightage = 0;

        var genderArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'gender'){
                return item;
            }
        });

        var valueArray ;

        if(genderArray.length>0){
            valueArray= genderArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return genderWeightage;
        }

        let value = data.gender ? data.gender.trim().toLowerCase() : '';
        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            genderWeightage = params[0].weightageValue;
        }
        
        genderWeightage = genderWeightage * 3;
        return genderWeightage;
    },

    morbidityWeightage: function (data, weightageArray) {
        let morbidityWeightage = 0;

        var morbidityArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'comorbidity'){
                return item;
            }
        });

        var valueArray ;

        if(morbidityArray.length>0){
            valueArray= morbidityArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return morbidityWeightage;
        }

        let value = data.comorbidity ? data.comorbidity.trim().toLowerCase() : '';

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            var par = params[0];
            morbidityWeightage = par.weightageValue;
        }
        
        morbidityWeightage = morbidityWeightage * 6;
        return morbidityWeightage;
    },

    symptomWeightage: function (symptom, weightageArray) {
        // If no symptom, then return weightage as zero;
        if (symptom === null) {
            return 0;
        }

        let symptomWeightage = 0;
        let value = symptom.experience ? symptom.experience.trim().toLowerCase() : '';

        var symptomArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'symptom'){
                return item;
            }
        });

        var valueArray ;

        if(symptomArray.length>0){
            valueArray= symptomArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return symptomWeightage;
        }

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            symptomWeightage = params[0].weightageValue;
        }
        
        symptomWeightage = symptomWeightage * 7;
        return symptomWeightage;
    },

    temperatureWeightage: function (symptom, weightageArray) {
        // If no symptom, then return weightage as zero;
        if (symptom === null) {
            return 0;
        }


        //////////////////////////////////////////////////////////
        // FIX: Temperature value in Number/String both take care.
        //////////////////////////////////////////////////////////
        var lastTemperature;
        if (symptom && symptom.temperature) {
            if (!isNaN(Number(symptom.temperature))) {
                let temp = Number(symptom.temperature);
                lastTemperature = temp;
                symptom.temperature = temp <= 98.6 ? 'normal'
                    : temp > 98.6 && temp <= 99.5 ? 'medium'
                        : temp > 99.5 && temp <= 102 ? 'high'
                            : 'very high';
            }
        }
        //////////////////////////////////////////////////////////

        let temperatureWeightage = 0;
        let value = symptom.temperature ? symptom.temperature.trim().toLowerCase() : '';
        if (lastTemperature) {
            symptom.temperature = lastTemperature.toString();
        }

        var temperatureArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'temperature'){
                return item;
            }
        });

        var valueArray ;

        if(temperatureArray.length>0){
            valueArray= temperatureArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return temperatureWeightage;
        }

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            temperatureWeightage = params[0].weightageValue;
        }
        temperatureWeightage = temperatureWeightage * 2;
        return temperatureWeightage;
    },

    pulseWeightage: function (symptom, weightageArray) {
        // If no symptom, then return weightage as zero;
        if (symptom === null) {
            return 0;
        }

        //////////////////////////////////////////////////////////
        // FIX: Heart rate value in Number/String both take care.
        //////////////////////////////////////////////////////////
        var lastHeartRate;
        if (symptom && symptom.heart_rate) {
            if (!isNaN(Number(symptom.heart_rate))) {
                let temp = Number(symptom.heart_rate);
                lastHeartRate = temp;
                symptom.heart_rate = temp <= 90 ? 'normal'
                    : temp > 90 && temp <= 120 ? 'medium'
                        : temp > 120 && temp <= 150 ? 'high'
                            : 'very high';
            }
        }
        //////////////////////////////////////////////////////////

        let pulseWeightage = 0;
        let value = symptom.heart_rate ? symptom.heart_rate.trim().toLowerCase() : '';
        if (lastHeartRate) {
            symptom.heart_rate = lastHeartRate.toString();
        }

        var heart_rateArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'heart rate'){
                return item;
            }
        });

        var valueArray ;

        if(heart_rateArray.length>0){
            valueArray= heart_rateArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return pulseWeightage;
        }

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            pulseWeightage = params[0].weightageValue;
        }

        pulseWeightage = pulseWeightage * 1;
        return pulseWeightage;
    },

    breathingWeightage: function (symptom, weightageArray) {
        // If no symptom, then return weightage as zero;
        if (symptom === null) {
            return 0;
        }

        let breathingWeightage = 0;
        let value = symptom.breathing_rate ? symptom.breathing_rate.trim().toLowerCase() : '';

        var breathArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'breath rate'){
                return item;
            }
        });

        var valueArray ;

        if(breathArray.length>0){
            valueArray= breathArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return breathingWeightage;
        }

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            breathingWeightage = params[0].weightageValue;
        }

        breathingWeightage = breathingWeightage * 4;
        return breathingWeightage;
    },

    bloodWeightage: function (symptom, weightageArray) {
        // If no symptom, then return weightage as zero;
        if (symptom === null) {
            return 0;
        }

        let bloodWeightage = 0;
        let value = symptom.blood ? symptom.blood.trim().toLowerCase() : '';

        var bloodArray = weightageArray.filter( item =>{
            if(item.parameterName && item.parameterName.trim().toLowerCase() === 'blood'){
                return item;
            }
        });

        var valueArray ;

        if(bloodArray.length>0){
            valueArray= bloodArray[0].subParameter;
        }

        if(!valueArray || valueArray.length <= 0){
            return bloodWeightage;
        }

        var params = valueArray.filter(item => {
            if (item.name && item.name.trim().toLowerCase() === value) {
                return item;
            }
        });
        if (params.length > 0) {
            bloodWeightage = params[0].weightageValue;
        }

        bloodWeightage = bloodWeightage * 1;
        return bloodWeightage;
    }

};
