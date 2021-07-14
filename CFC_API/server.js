const http = require('http');
const userRoutes = require('./user/user.model');

const app = require('./app');
var cron = require('node-cron');
const dbConfig = require('./DbConfig/archiveDbConfig');


//cron job
cron.schedule("0 16-20 * * *", function() {
 console.log("running a task in morning 8");
 userRoutes.sendNotifactionToEmployee(false, function (err, data) {
      if (data) {
      console.log("cron job pass");
     }
     else{
      console.log("cron job fail");
     }
});
})
var server  = http.createServer(app);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost'
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
