db = db.getSiblingDB('kchap');
db.createUser(
    {
        user: 'kchap',
        pwd: "<SECRET>",
        roles: [ "readWrite" ]
    }
);
db.createCollection('session');
db.session.createIndex({"passport.user.id": 1});
db.session.createIndex( { "passport.user.id": 1, "passport.user.deviceId": 1 }, { unique: true } );