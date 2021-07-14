const WeightService = require('./weightage-calculation.service');

var SERVICE = {

    updatePatientScore: async (cloudant, patient, weightageData) => {
        console.log("weightage array "+weightageData)
        if (patient && (patient.symptom.length === 0)) {
            console.log('No symptom found! Therefore not calulating weightage.')
            return null;
        }
            try {
                const updatedFields = await SERVICE.getScore(patient,weightageData);

                // When no fields to update, then return
                if (updatedFields === null) {
                    return null;
                }

              //  await cloudant.updateCovidStatus(patient.id, updatedFields);
              
                console.log('Updated record for PatientId-"%s" successfully! \n', patient._id);
                return updatedFields;
            } catch (err) {
                console.error('ERROR: Something went wrong during updating Patient with id-"%s"', patient.id, err);
                console.log('\n');
                return null;
            }

    },

    getScore: function (patient,weightageData) {
        const data = patient;

        const latestSymptom = SERVICE.getLatestSymptomForMyself(data);
        if(latestSymptom === null) {
            console.log('No Symptom for PatientId-"%s". Therefore, not calculating it\'s score. \n', patient.id);
            return null;
        }

        let weightage = {};
        let updatedFields = {};

        var array = weightageData.weightage
        let score = 0;
        if(array.length>0){
            array.forEach(element => {
                var paramName = element.parameterName.trim().toLowerCase();
                if(latestSymptom[paramName]){
                    score = score + Number(WeightService.calculate_Weightage(element,latestSymptom[paramName],paramName));
                    console.log('Final Score',score);
                }                
            });
        }
        
        // Calculating status based on score
        updatedFields.healthstatus = score < 25 ? 'none'
                                    : ((score >= 25 && score < 75) ? 'Medium Risk'
                                    : 'High Risk');

        updatedFields.currentCovidScore = score;
        // if (updatedFields.healthstatus != 'none') { 
        //     updatedFields.qurantine = { isQurantine: true, started: Date.now(), end: Date.now() + 1.21e+9 }
        // }
        return updatedFields;
    },

    getLatestSymptomForMyself: function (data) {
        if (data && data.symptom && (data.symptom.length > 0)) {
            let symptoms = data.symptom;
            console.log("latest symptoms before called");
            console.log(symptoms);
            let latestSymptom = symptoms.filter(symptom => (symptom.family && symptom.family.toLowerCase()) === 'myself')
            console.log("latest symptoms after called");
            console.log(latestSymptom);
            if(latestSymptom.length === 0) {
                return null;
            }
            latestSymptom = latestSymptom.reduce((prev, current) => (prev.timestamp > current.timestamp) ? prev : current); // Finding latest symptom based on timestamp

            return latestSymptom;
        } else {
            return null;
        }
    }

};

module.exports = SERVICE;