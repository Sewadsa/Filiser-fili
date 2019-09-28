var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var helmet = require('helmet');
var device = require('express-device');
var expressSanitized = require('express-sanitizer');
var mongoStore = require('rate-limit-mongo');
var ip_reader = require('@maxmind/geoip2-node').Reader;

MONGO_AUTO_IN = require('mongoose-auto-increment');
MONGO = require('mongoose');
PATH = require('path');
VALIDATOR = require('validator');
URL = require('url');
SHORT_ID = require('shortid');
CRYPTO = require('crypto');
ENTITIES = require('html-entities').AllHtmlEntities;
NODEMAILER = require('nodemailer');
PUG = require('pug');
HTTP = require('http');
HTTPS = require('https');
FS = require('fs');
SHARP = require('sharp');
JPEGTRAN = require('jpegtran'),
QUERYSTRING = require('querystring');
MOMENT = require('moment');
MOMENT.locale('pl-PL');
ASYNC = require('async');
WINSTON = require('winston');
XML = require('xml');
CHEERIO = require('cheerio');
BCRYPT = require('bcrypt');
BYTES_FORMAT = require('bytes');
ip = require('ip');
STRIP_TAGS = require('striptags');
IP_GEO = null;
IP_GEO_CITY = null;

ip_reader.open(PATH.join(BASE_PATH, 'data/GeoCountry.mmdb'), {cache: {max: 12000}}).then(reader => {
	IP_GEO = reader;
});

ip_reader.open(PATH.join(BASE_PATH, 'data/GeoCity.mmdb'), {cache: {max: 12000}}).then(reader => {
	IP_GEO_CITY = reader;
});




global.mongoConnected = false;


//WINSTON.add(WINSTON.transports.File, { filename: PATH.join(BASE_PATH, 'app/logs/logs.txt') });
//WINSTON.remove(WINSTON.transports.Console);


require(PATH.join(BASE_PATH, 'libs/globals.js')); //GLOBALS



app = express();

app.use(bodyParser.urlencoded({'extended':'true', limit: '10mb'}));
app.use(bodyParser.json({limit: '10mb', type: '*/json', strict: false}));
app.use(expressSanitized());
app.use(cookieParser());
app.use(helmet({
	frameguard: false,
	hsts: false,
	noSniff: false,
	xssFilter: false,
}))
app.use(device.capture());

//app.enable('trust proxy', true);

app.set('views', PATH.join(BASE_PATH, 'libs/views'));
app.set('view engine', 'pug');

app.use(compress());
app.use(express.static(PUBLIC_PATH, { /*maxAge: 2592000000*/ }));

var ssl_private_key  = FS.readFileSync(PATH.join(BASE_PATH, 'data/ssl/server.pem'), 'utf8');
var ssl_cert = FS.readFileSync(PATH.join(BASE_PATH, 'data/ssl/server.crt'), 'utf8');


httpServer = HTTP.createServer(app);
httpsServer = HTTPS.createServer({key: ssl_private_key, cert: ssl_cert}, app)


app.use(function(req, res, next){
	//var requestedUrl = req.protocol + '://' + req.get('Host') + req.url;
	//console.log(requestedUrl)
	var host = req.get('host');

	if(host && host!=HOSTNAME && host!='static.fili.cc'){
		res.redirect(301, BASE_URL+req.url);
		return;
	}

	if(host && host.slice(0, 4)==='www.'){
		host = host.replace('www.', '');
		res.redirect(301, host+req.url);
		return;
	}

	if(!req.secure){
		var r = 'https://'+host+req.url;
		res.redirect(301, r);
		return;
	}

	var white_list = [
		'89.161.19.235',
		'31.186.87.53',
		'54.36.174.179',
	]

	if(is_dev_mode && !white_list.includes(getIP(req))){
		res.set('Cache-Control', 'public, no-cache')
		res.status(403).send('Forbidden')
	}else if(!mongoConnected){
		res.set('Cache-Control', 'public, no-cache')
		res.set('Refresh', '5')
		res.status(503).send('Wystąpił błąd. Zaraz wracamy [ERRNO 0001]')
	}else if(MAINTAINCE || SHUTTING_DOWN){
		res.set('Cache-Control', 'public, no-cache')
		res.status(503).send('Przerwa techniczna. Zaraz wracamy.')
	}else next();
});

require('./database.js')
MONGO_AUTO_IN.initialize(MONGO.connection);
require('./routes.js')
