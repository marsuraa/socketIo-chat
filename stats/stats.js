var redis = require('redis'),
client = redis.createClient({
  port : 6379,               
  host : '127.0.0.1',        
});


/* reset le statut des users au démarrage du système*/
client.hkeys('users', function (err, users) {
  if (err) return console.log(err);
  
  console.log(users)
});

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27021,localhost:27022,localhost:27023/?replicaSet=rs0';