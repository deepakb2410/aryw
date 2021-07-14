'use strict';
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = "secretkey_are_u_well_app_backToOffice"+Date.now()
const FIFTEEN_MINUTES_IN_SECOND = 3 * 60;
module.exports = {
    genAccessToken: function (user,time) {
        const userId = user.uid;
        const type = 'access';
        if(!time){
            time = '7 days'
        }
        const tokenPayload = { type, userId };
        const accessToken = jwt.sign(
            tokenPayload,
            JWT_SECRET_KEY
            ,{ expiresIn: time }
        );
        
        return accessToken;
    },

    isVerifyToken : function(token){
        try {
            const tokenPayload = jwt.verify(token, JWT_SECRET_KEY);
            if (tokenPayload.type !== 'access'){ 
                throw new Error('wrong token type')
            }
            return tokenPayload.type === 'access'
          } catch (error) {
              console.log("token verify error "+error);
          }
          return false;
    },

    checkHeader : function(req ,res,next){
        let token = '';
        if(req && req.headers){
            token = req.headers.token
        }
        
        if(token && module.exports.isVerifyToken(token)){
            res.statusCode = 200;
            res.ok = true;
            res.success = true;
            next();
        } else {
            res.ok = false;
            res.success = false;
            res.responseCode = 'ERROR';
            var error = {
                "error" : "Unauthorized: Access is denied due to invalid user.",
                "responseCode":"ERROR",
                "statusCode" : 401
            }
            res.statusCode = 401
            res.end(JSON.stringify(error));
        }
    }

}