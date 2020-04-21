
var redis = require('redis'),
    client = redis.createClient({
        port: 6379,
        host: '127.0.0.1',
    });



var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27021,localhost:27022,localhost:27023/?replicaSet=rs0';


/**
 * Connexion d'un nouvel utilisateur
 */


client.hkeys('users', function (err, users) {
    if (err) return console.log(err);
    users.forEach(function (user) {
        $('#users').append($('<li class="' + user + '">').html(user));
        console.log("ajout à la liste de " + user)

    });

});


