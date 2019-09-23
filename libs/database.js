MONGO.connect(DATABASE.url, DATABASE.options).catch(function(){})

var db = MONGO.connection

db.on('error', function(err){
	console.error(err.toString())
	mongoConnected = false
	setTimeout(() => {
		if(!mongoConnected) MONGO.connect(DATABASE.url, DATABASE.options).catch(function(){})
	}, 5000);
})

db.on('open', function(){
	mongoConnected = true
})

db.on('reconnected', function(){
	log('MongoDB reconnected!');
	mongoConnected = true
})

db.on('disconnected', function(){
	if(mongoConnected) log('MongoDB disconnected!');
	mongoConnected = false
})












/*MONGO.Promise = global.Promise;

MONGO.connect(DATABASE.url, DATABASE.options)


MONGO.connection.on('error', function(err){
	log("Can't connect to MongoDB.");
	mongoConnected = false;

	setTimeout(() => {
		MONGO.connect(DATABASE.url, DATABASE.options)
	}, 5000);
});

MONGO.connection.on('open', function(){
	MONGO_AUTO_IN.initialize(MONGO.connection);
	require(PATH.join(BASE_PATH, 'libs/routes.js'));
	mongoConnected = true;
});

MONGO.connection.on('connecting', function () {
	log('Connecting to MongoDB...');
});

MONGO.connection.on('reconnected', function () {
	log('MongoDB reconnected!');
	mongoConnected = true;
});

MONGO.connection.on('disconnected', function () {
	mongoConnected = false;
	log('MongoDB disconnected!');
});

MONGO.connection.on('joined', function () {

	log('MongoDB joined!');
});

MONGO.connection.on('left', function () {

	log('MongoDB left!');
});

MONGO.connection.on('fullsetup', function () {

	log('MongoDB full!');
});
*/
