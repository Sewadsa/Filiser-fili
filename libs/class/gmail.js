var GMAIL = {};
var self = this;

var google = require('googleapis');
var googleAuth = require('google-auth-library');
var readline = require('readline');
var oauth2 = null;

var SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
var TOKEN_PATH = PATH.join(BASE_PATH, 'libs/class/gmail/credentials.json');

FS.readFile(PATH.join(BASE_PATH, 'libs/class/gmail/secret.json'), function(err, content){
	if(err){ throw 'Can\'t find secret.json'; }

	self.authorize(JSON.parse(content), function(oauth2Client){
		oauth2 = oauth2Client;
	});
});

self.authorize = function(credentials, cb)
{
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];

	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	FS.readFile(TOKEN_PATH, function(err, token){
		if(err){
			self.getNewToken(oauth2Client, cb);
			return;
		}

		oauth2Client.credentials = JSON.parse(token);
		cb(oauth2Client);
	});
}

self.getNewToken = function(oauth2Client, cb)
{
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});

	console.log(authUrl);

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question('Enter the code from that page here: ', function(code){
		rl.close();

		oauth2Client.getToken(code, function(err, token){
			if(err){ throw 'Error while trying to retrieve access token'; }

			oauth2Client.credentials = token;
			self.storeToken(token);
			cb(oauth2Client);
		});
	});
}


self.storeToken = function(token)
{
	FS.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

self.makeBody = function(data, message)
{
	var str = ['Content-Type: text/html; charset=UTF-8\n',
	"MIME-Version: 1.0\n",
	"to: ", data.to, "\n",
	"from: ", data.from, "\n",
	"subject: ", "=?UTF-8?B?"+new Buffer(data.subject).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')+"?=", "\n\n",
	data.message
	].join('');

	var encodedMail = new Buffer(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
	return encodedMail;
}


GMAIL.sendEmail = function(data, cb)
{
	if(!oauth2){
		setTimeout(function(){ GMAIL.sendEmail(data, cb); }, 1000);
		return;
	}

	var raw = self.makeBody(data);

	var gmail = google.gmail('v1');
	gmail.users.messages.send({
		auth: oauth2,
		userId: 'me',
		resource: {
			raw: raw
		}
	}, function(err, response) {
		if(err){ cb(true); return; }
		cb(false);
	});
}





module.exports = GMAIL;