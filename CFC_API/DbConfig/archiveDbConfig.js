'use strict';
const utility = require("../utility/utility");
const cloudantUrl = require("../cloudant_url_config");

var Cloudant = require("@cloudant/cloudant");
const query = require("../db_query/query");
const cloudant = new Cloudant({ url: cloudantUrl.cloudantBaseUrl, plugins: { iamauth: { iamApiKey: cloudantUrl.cloudantAppSecretKey } } });
var db = cloudant.db.use(cloudantUrl.cloudantPatientDbName);
var archive_db = cloudant.db.use(cloudantUrl.cloudantArchiveDbName);
var db_hospital = cloudant.db.use(cloudantUrl.cloudandHospitalDbName);

module.exports = {

    moveToArchiveDb:(request, callback)=>{
        var archiveDbDays ="";
        db_hospital.list({ include_docs: true }, function (err, data) {
          if(data){
            var res = data.rows[0].doc;
             archiveDbDays= res.archiveDbStamp;
        
       db.list({ include_docs: true }, function (err, result) {
          if(result)
          {
          
            for(var i=0;i<result.rows.length;i++)
            {
              var timestamp = result.rows[i].doc.lastEvent;
              var d = new Date(timestamp);
              var currentDate = new Date();
              const diffTime = Math.abs(currentDate - d);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              if(archiveDbDays!='')
              {
              if(diffDays>= archiveDbDays)
              {
                var rev_id = result.rows[i].doc._rev;
                var payload = result.rows[i].doc;
                payload.doctorId ="";
                payload.currentAssign="";
                delete result.rows[i].doc._rev;
                archive_db.insert(payload, function (err, data1) {
                  console.log("insert sucessfully", data1, err);
                
                });
                var userId = result.rows[i].doc._id;
                db.destroy(userId,rev_id, function (err, data1) {
                  console.log("destroy sucessfully", data1, err);
                  callback(err, data1);
              });
              }
            }
              else{
                callback("", "Not moved into Archive DB")
              }
            }
          }
          else{
            callback("", "No user found")
          }
        })
      }
  })
},
    
      moveToPatientDb: async (request ,res,next)=>{
        var req = "";
        if(request.params.userId)
        {
          req= request.params;
        }
        else{
          req= request.body;
        }
        if(request.body.id != undefined)
        {
          req.mobileno=request.body.id;
        }

        
        if(request.body.user_id != undefined){
          var user_id = request.body.user_id.toString();
          if(!user_id.includes("+")){
            var plus = "+";
            user_id = plus.concat(user_id);
            req.mobileno= user_id;  
        }
        else{
          req.mobileno= user_id;
        }   
        }

        
        db.find(query.checkDataInDb(req.userId, req.mobileno, req.emailId))
        .then((result) => {
         
          if (result.docs.length > 0 ) {
            res.success = true;
            next();
          }else{
            archive_db.find(query.checkDataInDb(req.userId, req.mobileno, req.emailId))
            .then((result)=>{
            
              if (result.docs.length > 0 ) {
                let userId = result.docs[0]._id;
                var rev_id = result.docs[0]._rev;
                var payload =result.docs[0];
                payload.lastEvent = Date.now();
                delete result.docs[0]._rev;
                db.insert(payload, function (err, data1) {
                  console.log("insert into patient Db", data1, err);
                 });
                archive_db.destroy(userId,rev_id, function (err, data) {
                 console.log("destroy fromArchive Db", data, err);
                  res.success = true;
                  next();
                });
               
              }
              else{
                res.success = false;
                next();
              }
            })
        }
        })
        .catch((err) => {
          console.log("catch error", err);
          callback(err);
        });
      },

}