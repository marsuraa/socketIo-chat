var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;


/** client REDIS */
var redis = require('redis'),
    client = redis.createClient({
        port: 6379,
        host: '127.0.0.1',
});

/** client MONGODB */
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27021,localhost:27022,localhost:27023/?replicaSet=rs0';


/* reset le statut des users au démarrage du système*/
client.hkeys('users', function (err, users) {
    if (err) return console.log(err);

    //console.log(users)


    users.forEach(function (user) {
        //console.log(user)
        client.hset("users", user, "0");
    });
});




/** Insert les messages émis par les users dans la collection UserMessages */
function InsertUserMSG(message) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        currentDate = new Date(Date.now()).toISOString();
        //console.log(currentDate)
        let document = {
            'username': message.username,
            'text': message.text,
            'at_date': currentDate

        };
        var dbo = db.db("SocketIO_Chat");
        dbo.collection('UserMessages').insertOne(document, function (err, res) {
            if (err) throw err;
            db.close();
        });
    });
}

/** Insert les messages émis par les users dans la collection SysMessages */
function InsertSysMSG(message) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        currentDate = new Date(Date.now()).toISOString();
        //console.log(currentDate)
        let document = {
            'text': message.text,
            'type': message.type,
            'at_date': currentDate

        };
        var dbo = db.db("SocketIO_Chat");
        dbo.collection('SysMessages').insertOne(document, function (err, res) {
            if (err) throw err;
            db.close();
        });
    });
}


/** recherche tout les messages dans  UserMessages et tri par date croissante*/
function GetOldUserMessages(socket) {

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("SocketIO_Chat");
        dbo.collection('UserMessages').find().sort({ "at_date": 1 }).toArray(function (err, result) {
            if (err) throw err;
            for (oldMsg of result)
            {
                socket.emit('chat-old-message',oldMsg);
            }
            
            db.close();
            
        });
    });



}



function nbgetNbUserconnected(socket)
{
    var promises =[];
    var nbUserConnected = 0;
    
    promises.push( new Promise( function(resolve,reject) {
        client.hkeys('users',function (err, users) {
        
            if (err) return console.log(err);
            for (var user of users) {
                //console.log(user)
                client.hget("users", user,function (e, o) {
                    if (e) { console.log(e) }
                    if (o == "1") {
                        nbUserConnected = nbUserConnected + 1;
                        console.log("++");
                        console.log(nbUserConnected);
                        
                    }
                });
            };
            console.log(nbUserConnected+ "         ae,fdnjg")
            resolve (nbUserConnected);
        });
    } ) );
    
    Promise.all(promises).then( function(values) {
        socket.broadcast.emit('update-room-stats', values[0]);
    } ).catch();
    
    
    
}

function updateStats(socket) {

    nbgetNbUserconnected(socket);


    
    /*MongoClient.connect(url, function (err, db) {
        var usersBestScore = [];
        if (err) throw err;
        var dbo = db.db("SocketIO_Chat");

        var aggregatorOpts = [{
            $group:
                {
                _id: "$username",
                nbMessage :{$sum : 1}
                
                }
           }]
            dbo.collection('UserMessages').aggregate(aggregatorOpts).limit(3).toArray(function (err, result) {
            if (err) throw err;
            usersBestScore = result;
            db.close();

        });
        io.emit('update-users-stats', usersBestScore);
    });
    */
    

}


/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.use('/', express.static(__dirname + '/public'));


/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];

io.on('connection', function (socket) {
    updateStats(socket);
    /**
     * Utilisateur connecté à la socket
     */
    var loggedUser;


    /**
     * Emission d'un événement "user-login" pour chaque utilisateur connecté
     */


    client.hkeys('users', function (err, users) {
        if (err) return console.log(err);

        //console.log(users)


        users.forEach(function (user) {
            //console.log(user)
            client.hget("users", user, function (e, o) {
                if (e) { console.log(e) }
                if (o == "1") {
                    console.log("user-login " + user)
                    socket.emit('user-login', user);

                }

            });
        });

    });

    /** 
     * Appel pour l'emission d'un événement "chat-message" pour chaque message de l'historique
     */
    GetOldUserMessages(socket);

    /**
     * Déconnexion d'un utilisateur
     */
    socket.on('disconnect', function () {

        if (loggedUser !== undefined) {
            // Broadcast d'un 'service-message'
            var serviceMessage = {
                text: 'User "' + loggedUser.username + '" disconnected',
                type: 'logout'
            };
            socket.broadcast.emit('service-message', serviceMessage);



            client.hset('users', loggedUser.username, "0", function (error, result) {
                if (error) {
                    console.log(error);
                    throw error;
                }
                console.log("deco " + result);
            });

            // Ajout du message à l'historique
            InsertSysMSG(serviceMessage)
            // Emission d'un 'user-logout' contenant le user
            io.emit('user-logout', loggedUser);
            // Si jamais il était en train de saisir un texte, on l'enlève de la liste
            var typingUserIndex = typingUsers.indexOf(loggedUser);
            if (typingUserIndex !== -1) {
                typingUsers.splice(typingUserIndex, 1);
            }
        }
        updateStats(socket)
    });

    /**
     * Connexion d'un utilisateur via le formulaire :
     */
    socket.on('user-login', function (user, callback) {


        client.hexists('users', user.username, function (err, reply) {
            if (reply === 1) {
                //console.log('exists');
                client.hget('users', user.username, function (error, result) {
                    if (error) {
                        console.log(error);
                        throw error;

                    }
                    if (result != "0") {
                        console.log('déjà co');
                        //console.log(result);
                        callback(false);
                    }
                    else {
                        client.hset('users', user.username, "1", function (error, result) {
                            if (error) {
                                console.log(error);
                                throw error;
                            }
                        });
                        loggedUser = user;
                    }

                });


            } else {
                console.log('doesn\'t exist');

                client.hset('users', user.username, "1", function (error, result) {
                    if (error) {
                        console.log(error);
                        throw error;
                    }
                    //console.log(result);
                    loggedUser = user;
                });
            }

            if (loggedUser !== undefined) { // S'il est bien nouveau
                // Envoi et sauvegarde des messages de service
                var userServiceMessage = {
                    text: 'You logged in as "' + loggedUser.username + '"',
                    type: 'login'
                };
                var broadcastedServiceMessage = {
                    text: 'User "' + loggedUser.username + '" logged in',
                    type: 'login'
                };
                socket.emit('service-message', userServiceMessage);
                socket.broadcast.emit('service-message', broadcastedServiceMessage);
                //messages.push(broadcastedServiceMessage);
                InsertSysMSG(broadcastedServiceMessage)
                // Emission de 'user-login' et appel du callback
                console.log("user-login emit " + loggedUser.username)
                io.emit('user-login', loggedUser.username);
                callback(true);
            }
            else {
                callback(false);
            }
        });
        updateStats(socket)
    });

    /**
     * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
     */
    socket.on('chat-message', function (message) {
        // On ajoute le username au message et on émet l'événement
        message.username = loggedUser.username;
        io.emit('chat-message', message);
        // Sauvegarde du message
        InsertUserMSG(message)

        updateStats(socket)
    });


    /**
     * Réception de l'événement 'chat-old-message' et réémission vers tous les utilisateurs
     * idem que 'chat-message' mais en ne sauvegardant pas dans mongo car les messages sont déjà existants
     */
    socket.on('chat-old-message', function (message) {
        // On ajoute le username au message et on émet l'événement
        message.username = loggedUser.username;
        io.emit('chat-old-message', message);
    });

    /**
     * Réception de l'événement 'start-typing'
     * L'utilisateur commence à saisir son message
     */
    socket.on('start-typing', function () {
        // Ajout du user à la liste des utilisateurs en cours de saisie
        if (typingUsers.indexOf(loggedUser) === -1) {
            typingUsers.push(loggedUser);
        }
        io.emit('update-typing', typingUsers);
    });

    /**
     * Réception de l'événement 'stop-typing'
     * L'utilisateur a arrêter de saisir son message
     */
    socket.on('stop-typing', function () {
        var typingUserIndex = typingUsers.indexOf(loggedUser);
        if (typingUserIndex !== -1) {
            typingUsers.splice(typingUserIndex, 1);
        }
        io.emit('update-typing', typingUsers);
    });
});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port 3000
 */
http.listen(3000, function () {
    console.log('Server is listening on *:3000');
});







/*
client.hkeys('test', function (err, users) {
  if (err) return console.log(err);
  console.log(users)

});

client.hget('test','michel', function (error, result) {
  if (error) {
      console.log(error);
      throw error;
  }
  console.log(result);
});
*/
/*client.hgetall('users',function (err, users) {
  for(var i = 0, len = users.length; i < len; i++) {
    console.log(users[i]);
  }
});*/