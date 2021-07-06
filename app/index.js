var mysql = require('mysql');
var express = require('express');

var app = express();
var port = process.env.PORT || 3000;
var responseStr = "MySQL Data:";

app.get('/api', (req, res) => {     
  res.send('Hello World, Welcome to Backend Application \n') 
})

app.get('/',function(req,res){
   
   var mysqlHost = 'mysql';
   var mysqlPort = process.env.MYSQL_PORT || '3306';
   var mysqlUser = process.env.MYSQL_USER || 'root';
   var mysqlPass = process.env.MYSQL_PASS || 'password';
   var mysqlDB   = process.env.MYSQL_DB   || 'node';

   var connectionOptions = {
     host: mysqlHost,
     port: mysqlPort,
     user: mysqlUser,
     password: mysqlPass,
     database: mysqlDB
   };

   console.log('MySQL Connection config:');
   console.log(connectionOptions);

   var connection = mysql.createConnection(connectionOptions);
   var sql = "CREATE TABLE IF NOT EXISTS MY_TABLE (MESSAGE VARCHAR(50) NOT NULL)"
   var queryStr = `SELECT * FROM MY_TABLE`;
   
   connection.connect();

   connection.query(sql, function (err, result) {
     if (err) throw err;
     console.log("Table created");
     });

   connection.query(queryStr, function (error, results, fields) {
     if (error) throw error;
     
     responseStr = '';

     results.forEach(function(data){
        responseStr += data.MESSAGE;
        console.log(data);
     });

     if(responseStr.length == 0)
        responseStr = 'No records found';

     console.log(responseStr);

     res.status(200).send(responseStr);
   });
    
   connection.end();
});


app.listen(port, function(){
    console.log('Sample mySQL app listening on port ' + port);
});
