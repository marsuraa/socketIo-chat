# Socket.io : Chat
- La gestion des utilisateurs connectés grâce à Redis fonctionne
- Le stockage des messages utilisateurs sur MongoDB : ok
- Le stockage des messages Systeme sur MongoDB dans une autre collection : les messages log-out ne sont pas encore insérés
- les statistiques pour savoir quels sont les meilleurs utilisateurs du serveur en général et celles de la session en cours

Possibilité d'ajout :
- la gestion de salons.


IMPORTANT : Cliquez deux fois sur login quand vous avez renseigné votre pseudo si vous voulez accéder au chat. 
Cela doit être dû au fait que les requêtes REDIS sont en async donc certaines opérations se font avant le résulat des requêtes.

## Installation
```
npm install

"dependencies": {
    "express": "^4.17.1",
    "mongodb": "^3.5.6",
    "redis": "^3.0.2",
    "socket.io": "^1.7.4"
  }
```

## Démarrer les bases de données

```
Lancer redis sur le port 6379

Créer un replicaSet mongoDB de nom rs0 et de serveur en localhost 27021,27022,27023 :

1. Créer un dossier "data" avec comme sous dossier R0S1,R0S2, R0S3 et arbitre
2. Dans powershell : `mongod --port 27021 --replSet rs0 --dbpath "*path*\data\R0S1"`
3. Puis dans un autre invite de commande  `mongo --port 27021`, puis sur "rs0:PRIMARY", taper `rs.initiate()`
4. Idem pour les deux replicas :  `mongod --port 27022 --replSet rs0 --dbpath "*path*\data\R0S2"` and `mongod --port 27023 --replSet rs0 --dbpath "*path*\data\R0S3"`
5. Dans l'invite 'mongo --port 27021', toujours en PRIMARY, ajouter les réplicas :  `rs.add("localhost:27022")` et `rs.add("localhost:27023")`
6. Viens le tour de l'arbitre :  `mongod --port 30000 --replSet rs0 --dbpath "*path*\data\arbitre"`
7. Toujours sur l'invite client 27021 ; on ajoute l'arbitre : `rs.addArb("localhost:27020")`


*  Pour voir la BDD sur compass :`mongodb://localhost:27021,localhost:27022,localhost:27023/?replicaSet=rs0`
```

## Démarrer l'application

Pour démarrer l'application, exécutez la commande suivante depuis la racine du projet.
```
node server ou nodemon server
```

L'application est désormais accesssible à l'url **http://localhost:3000/**.

