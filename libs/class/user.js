
var USER = {}

USER.getStatus = function(req, res, CB)
{	
	var self = {};

	self.answer = {
		code: 1, // 1 - not logged, 2 - internal error, 3 - logged
	}

	self.send = function()
	{
		CB(self.answer);
	};

	self.check = function()
	{
		var cookies = req.cookies;
		if(cookies==null){ self.send(); return; }

		var userID_crypted = cookies.log;
		if(userID_crypted==null){ self.send(); return; }

		var IP = getIP(req);

		try{
			var data = decrypt(userID_crypted);
			var arr = JSON.parse(data);

			var userID = arr[0]?arr[0]:null;

			
/*			if(IP!='79.124.78.99')
				if(res_ip!=IP){
					res.cookie('log', '', { maxAge: 0, httpOnly: true });
					self.send(); return;
				}*/

			if(!VALIDATOR.isMongoId(String(userID))){ self.send(); return; }

			userModel.find({ _id: userID })
			.limit(1)
			.select('_id username avatar type ban_expire premium_expire email fav_series fav_movies comments_captcha_expire prem_video_time premium_buy_times')
			.lean()
			.exec(function(err, user){
				if(err){ self.send(); self.answer.code=2; return; }

				if(user.length==0){
					res.cookie('log', '', { maxAge: 0, httpOnly: true });
					self.send(); return;
				}

				user = user[0];

				if(MOMENT().isBefore(user.ban_expire)){
					res.cookie('log', '', { maxAge: 0, httpOnly: true });
					self.send(); return;
				}

				userModel.updateOne({ _id: userID }, { last_activity: new Date().toISOString() }, function(err){});

				var premium = false;
				var prem_info_1 = true;

				if(user.premium_expire && PREMIUM){
					if(MOMENT(user.premium_expire).isAfter(MOMENT())){
						premium = true;
						if(cookies.prem_info_1){
							prem_info_1 = false;
						}
					}
				}

				var comment_captcha = false;
				if(user.comments_captcha_expire && MOMENT().isBefore(user.comments_captcha_expire)){
					comment_captcha = true;
				}

				var userInfo = {
					username: user.username,
					avatar: user.avatar,
					premium: premium,
					premium_expire: user.premium_expire,
					email: user.email,
					type: user.type,
					fav_series_count: user.fav_series?user.fav_series.length:0,
					fav_movies_count: user.fav_movies?user.fav_movies.length:0,
					_id: user._id,
				}

				if(premium){
					userInfo.prem_video_time = user.prem_video_time;
				}
				userInfo.premium_buy_times = user.premium_buy_times?user.premium_buy_times:0;
				if(comment_captcha) userInfo.comment_captcha = comment_captcha;

				self.answer = {
					code: 3,
					data: userInfo
				};

				self.send();
			});
		}catch(err){

		}
	}
	self.check();
}


USER.create = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==1){
			self.answer = { error: true, code: 1, msg: data }
			CB(self.answer);
		}else if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.create = function()
	{
		if(self.data.username==null){ self.send(); return; }
		else if(typeof self.data.username!='string'){ self.send(); return; }
		else if(self.data.username.length==0){ self.send(1, 'Uzupełnij nazwę użytkownika.'); return; }
		else if(self.data.username.length<5){ self.send(1, 'Nazwa użytkownika wymagane min. 5 znaków.'); return; }
		else if(self.data.username.length>25){ self.send(1, 'Nazwa użytkownika maksymalnie 25 znaków.'); return; }
		else if(VALIDATOR.isEmail(self.data.username)){ self.send(1, 'Nazwa użytkownika nie może być e-mailem.'); return; }

		if(self.data.email==null){ self.send(); return; }
		else if(typeof self.data.email!='string'){ self.send(); return; }
		else if(self.data.email.length==0){ self.send(1, 'Uzupełnij adres e-mail.'); return; }
		else if(!VALIDATOR.isEmail(self.data.email)){ self.send(1, 'Adres e-mail jest błędny.'); return; }
		else if(self.data.email.length<3){ self.send(1, 'Adres e-mail wymagane min. 3 znaki.'); return; }
		else if(self.data.email.length>80){ self.send(1, 'Adres e-mail maksymalnie 80 znaków.'); return; }

		//self.data.email = escapeForReagex(self.data.email);

		if(self.data['g-recaptcha-response']==null){ self.send(1, 'Wypełnij recaptcha.'); return; }
		else if(typeof self.data['g-recaptcha-response']!='string'){ self.send(); return; }
		else if(self.data['g-recaptcha-response'].length==0){ self.send(1, 'Wypełnij recaptcha.'); return; }


		var possible_marks = [
			'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
			'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z',
			'x', 'c', 'v', 'b', 'n', 'm', 'Q', 'W', 'E', 'R',
			'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F',
			'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B',
			'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7',
			'8', '9', 'ę', 'ó', 'ą', 'ś', 'ł', 'ż', 'ź', 'ć',
			'ń', 'Ę', 'Ó', 'Ą', 'Ś', 'Ł', 'Ż', 'Ź', 'Ć', 'Ń',
			'.', '_',
		]

		var isBadChar = false;
		for(var i = 0, len = self.data.username.length; i < len; i++) {
			if(possible_marks.indexOf(self.data.username[i])==-1){
				isBadChar = true;
				break;
			}
		}

		if(isBadChar){ self.send(1, 'Nazwa użytkownika zawiera zabronione znaki. Akceptowane to:  a-z, A-Z, 0-9, kropka, podkreślnik i polskie znaki.'); return; }

		for(var i = 0, len = usernameBlackList.length; i < len; i++){
			var value = usernameBlackList[i];
			if(self.data.username.indexOf(value)!=-1){
				if(self.data.username==value){ self.send(1, 'Nie możesz użyć samego słowa "'+value+'" w nazwie użytkownika.'); return; }
			}
		}

		for(var i = 0, len = usernameBlackList.length; i < len; i++){
			var value = usernameBlackList[i];
			if(self.data.username.indexOf(value)!=-1){
				if((self.data.username.length-value.length)<3){ self.send(1, 'Aby użyć słowa "'+value+'" w nazwie użytkownika musi być o 3 znaki dłuższa np. "login" -> "loginsek".'); return; }
			}
		}

		if(self.data.pass==null) { self.send(); return; }
		else if(typeof self.data.pass!='string'){ self.send(); return; }
		else if(self.data.pass.length==0){ self.send(1, 'Uzupełnij hasło.'); return; }
		else if(self.data.pass.length<5){ self.send(1, 'Hasło wymagane min. 5 znaków.'); return; }
		else if(self.data.pass.length>30){ self.send(1, 'Hasło maksymalnie 30 znaków.'); return; }

		if(self.data.reg==null) { self.send(1, 'Zaakceptuj regulamin.'); return; }

		var IP = getIP(req);

		var data = {
			secret : RECAPTCHA_SITE_SECRET,
			response : self.data['g-recaptcha-response']
		}

		requestPost('https', 'https://www.google.com/recaptcha/api/siteverify', data, function(err, answ){
			if(err){ self.send(); return; }
			if(answ.success==false){ self.send(); return; }

			userModel.countDocuments({email: { $regex: new RegExp('^'+escapeForReagex(self.data.email)+'$', "i") } }, function(err, user){
				if(err){ self.send(); return; }

				if(user>0){ self.send(1, 'Konto o podanym adresie e-mail już istnieje.'); return; }

				userModel.countDocuments({username: { $regex: new RegExp('^'+self.data.username+'$', "i") }}, function(err, user){
					if(err){ self.send(); return; }

					if(user>0){ self.send(1, 'Nazwa użytkownika jest już zajęta.'); return; }

					BCRYPT.genSalt(10, function(err, salt){
						if(err){ self.send(); return; }

						BCRYPT.hash(self.data.pass, salt, function(err, password){
							if(err){ self.send(); return; }

							var captcha_expire = MOMENT().add(7, 'day');

							var acc = {
								username : self.data.username,
								email : self.data.email,
								password : password,
								ip : IP,
								type : 'USER', // ADMIN, MODERATOR, USER
								active: true,
								comments_captcha_expire: captcha_expire.toISOString()
							}

							userModel.create(acc, function(err, user) {
								if(err){ self.send(); return; }

								var data = [
									user._id
								]

								var ify = JSON.stringify(data);
								res.cookie('log', encrypt(ify), { maxAge: 60*60*24*365*1000, httpOnly: true });

								self.send(0);
							});
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.create();
}

USER.activate = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==1){
			self.answer = { error: true, code: 1, msg: data }
			CB(self.answer);
		}else if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.activate = function()
	{
		if(typeof self.code!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.code)){ self.send(1, 'Link jest błędny.'); return; }

		userModel.find({ _id: self.code })
		.limit(1)
		.select('active')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(1, 'Link jest błędny.'); return; }
			user = user[0];

			if(user.active){ self.send(1, 'Konto jest już aktywne.'); return; }

			user.active = true;
			user.save(function(err) {
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.code = req.query.code;
	if(self.code==undefined) { self.send(); return; }
	self.activate();
}

USER.isLoginRecaptchaRequired = function(req, cb)
{
	var IP = getIP(req);
	var check = false;
	var now = MOMENT().unix();

	var country_code = ipToCountryCode(IP);

	if(country_code!='PL' && country_code!='UK' && country_code!='DE'){
		check = true;
		cb(check);
		return;
	}

	loginLogsModel.find({ ip: IP })
	.lean()
	.limit(1)
	.select('times first_get')
	.exec(function(err, login_logs){
		if(err){ self.send(); return; }
		if(login_logs.length==0) check = false;
		else{
			var login_log = login_logs[0];

			
			if(login_log.times>=2){
				if(now<MOMENT(login_log.first_get).add(7, 'day').unix()){
					check = true;
				}
			}
		}

		cb(check);
	});
}

USER.login = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==1){
			self.answer = { error: true, code: 1, msg: data }
			CB(self.answer);
		}else if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.logBadLogin = function()
	{
		var IP = getIP(req);
		var check = false;
		var now = MOMENT().unix();

		loginLogsModel.find({ ip: IP })
		.lean()
		.limit(1)
		.exec(function(err, login_logs){
			if(err){ console.error('USER.login::self.logBadLogin cant get list of login logs'); return; }
			if(login_logs.length==0){
				var query = {
					_id : MONGO.Types.ObjectId(),
					ip : IP
				}

				loginLogsModel.create(query, function(err, log){
					if(err){ console.error('USER.login::self.logBadLogin cant create login log'); return; }
				});
			}else{
				var login_log = login_logs[0];

				if(now>MOMENT(login_log.first_get).add(7, 'day').unix()){
					loginLogsModel.updateOne({ ip: IP }, { first_get: MOMENT().toISOString(), times: 1 }, function(err, doc){});
				}else{
					if(login_log.times<2){
						loginLogsModel.updateOne({ ip: IP }, { $inc: { times: 1 }}, function(err, doc){});
					}
				}
			}
		});
	}

	self.recaptcha = function(cb)
	{
		var IP = getIP(req);
		var check = false;
		var now = MOMENT().unix();

		var country_code = ipToCountryCode(IP);

		loginLogsModel.find({ ip: IP })
		.lean()
		.limit(1)
		.exec(function(err, login_logs){
			if(err){ self.send(); return; }
			if(login_logs.length==0){
				if(country_code!='PL' && country_code!='UK' && country_code!='DE') check = true;
			}else{
				var login_log = login_logs[0];

				
				if(login_log.times>=2){
					if(now<MOMENT(login_log.first_get).add(7, 'day').unix()){
						check = true;
					}
				}
			}

			if(!check){ cb(); return; }

			if(self.data['g-recaptcha-response']==null){ self.send(1, 'Wypełnij recaptcha.'); return; }
			else if(self.data['g-recaptcha-response'].length==0){ self.send(1, 'Wypełnij recaptcha.'); return; }

			var data = {
				secret : RECAPTCHA_SITE_SECRET,
				response : self.data['g-recaptcha-response']
			}

			requestPost('https', 'https://www.google.com/recaptcha/api/siteverify', data, function(err, answ){
				if(err){ self.send(); return; }
				if(answ.success==false){ self.send(); return; }
				cb();
			});
		});
	}

	self.login = function()
	{		
		if(self.data.username==null){ self.send(); return; }
		else if(typeof self.data.username!='string'){ self.send(); return; }
		else if(self.data.username.length==0){ self.send(1, 'Uzupełnij nazwę użytkownika.'); return; }
		
		if(self.data.pass==null){ self.send(); return; }
		else if(typeof self.data.pass!='string'){ self.send(); return; }
		else if(self.data.pass.length==0){ self.send(1, 'Uzupełnij hasło.'); return; }

		var remember = false;
		if(self.data.remember && self.data.remember=='on') remember = true;

		self.data.username = escapeForReagex(self.data.username);
		var IP = getIP(req);


		self.recaptcha(function(){
			userModel.find({ $or: [{username: { $regex: new RegExp('^'+self.data.username+'$', "i") }}, {email: { $regex: new RegExp('^'+self.data.username+'$', "i") }} ]})
			.limit(1)
			.select('active ban_expire login_logs password')
			.exec(function(err, user){
				if(err){ self.send(); return; }
				if(user.length==0){
					self.logBadLogin();
					self.send(1, 'Konto nie istnieje.');
					return;
				}
				
				user = user[0];

				if(user.password==''){ self.send(1, 'Hasło do twojego konta wymaga zmiany. Skorzystaj z przypomnienia hasła.'); return; }

				BCRYPT.compare(self.data.pass, user.password, function(err, valid){
					if(err){ self.send(); return; }
					if(!valid){ self.logBadLogin(); self.send(1, 'Nieprawidłowa nazwa użytkownika lub hasło.'); return; }

					if(!user.active){ self.send(1, 'Aktywuj swoje konto.'); return; }

					if(MOMENT().isBefore(user.ban_expire)){
						res.cookie('log', '', { maxAge: 0, httpOnly: true });
						self.send(1, 'Konto zablokowane.'); return;
					}

					var agent = req.get('User-Agent');
					
					var d = {
						date : new Date().toISOString(),
						ip : IP,
						agent : agent
					}
					user.login_logs.push(d);

					user.save(function(err){
						if(err){ self.send(); return; }

						var age = 60*60*2*1000;
						if(remember) age = 60*60*24*365*1000;

						var data = [
							user._id
						]

						var ify = JSON.stringify(data);
						res.cookie('log', encrypt(ify), { maxAge: age, httpOnly: true });
						//loginLogsModel.update({ ip: IP }, { first_get: MOMENT().toISOString(), times: 0 }, function(err, doc){});

						self.send(0);
					});
				});
			});
		});
	}

	self.data = req.body;
	self.login();
}


USER.remind = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==1){
			self.answer = { error: true, code: 1, msg: data }
			CB(self.answer);
		}else if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.remindStep1 = function()
	{		
		if(self.data.username==null){ self.send(); return; }
		else if(typeof self.data.username!='string'){ self.send(); return; }
		else if(self.data.username.length==0){ self.send(1, 'Uzupełnij adres e-mail.'); return; }
		else if(!VALIDATOR.isEmail(self.data.username)){ self.send(1, 'Adres e-mail jest błędny.'); return; }

		self.data.username = escapeForReagex(self.data.username);
		
		userModel.find({email: { $regex: new RegExp('^'+self.data.username+'$', "i") } })
		.limit(1)
		.select('pass_reset_code pass_reset_expire email ban_expire username')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(1, 'Konto nie istnieje.'); return; }
			user = user[0];

			if(MOMENT().isBefore(user.ban_expire)){
				res.cookie('log', '', { maxAge: 0, httpOnly: true });
				self.send(1, 'Konto zablokowane.'); return;
			}

			var code = SHORT_ID.generate();

			user.pass_reset_code = code;
			user.pass_reset_expire = +new Date() + 2*24*60*60*1000;
			user.save(function(err){
				if(err){ self.send(); return; }

				app.render('emails/pass_reset', {username: user.username, code: code, host: HOSTNAME, port: PORT}, function(err, html) {
					if(err){ self.send(); return; }
				
/*					var smtpConfig = {
						host: SMTP.host,
						secure: true,
					    auth: {
					        user: SMTP.user,
					        pass: SMTP.pass
					    }
					};*/

					//var transport = NODEMAILER.createTransport(smtpConfig);

					var data = {
						from : 'noreply@'+HOSTNAME,
						to :  user.email,
						subject : 'Zmiana hasła',
						text : html,
						html  : html,
					}

					SENDGRID.sendEmail(data, function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});

/*					transport.sendMail(data, function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});*/
				});
			});
		});
	}

	self.remindStep2 = function()
	{
		self.code = req.query.code;
		if(self.code==undefined) { self.send(); return; }
		else if(typeof self.code!='string'){ self.send(); return; }

		if(!SHORT_ID.isValid(self.code)) { self.send(1, 'Link jest błędny.'); return; }

		userModel.find({ pass_reset_code: self.code })
		.limit(1)
		.lean()
		.select('pass_reset_expire')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(1, 'Link jest błędny.'); return; }
			user = user[0];

			var expires = user.pass_reset_expire;
			var now = new Date();

			if(now.getTime()>expires.getTime()){ self.send(1, 'Link wygasł.'); return; }

			self.send(0, self.code);
		});
	}

	self.remindStep3 = function()
	{
		if(self.data.pass==undefined) { self.send(); return; }
		else if(typeof self.data.pass!='string'){ self.send(); return; }
		else if(self.data.pass.length==0){ self.send(1, 'Uzupełnij hasło.'); return; }
		else if(self.data.pass.length<5){ self.send(1, 'Hasło wymagane min. 5 znaków.'); return; }
		else if(self.data.pass.length>30){ self.send(1, 'Hasło maksymalnie 30 znaków.'); return; }

		if(self.data.pass_rpt==undefined) { self.send(); return; }
		else if(typeof self.data.pass_rpt!='string'){ self.send(); return; }
		else if(self.data.pass_rpt.length==0){ self.send(1, 'Powtórz swoje hasło.'); return; }
		else if(self.data.pass!=self.data.pass_rpt){ self.send(1, 'Hasła muszą być identyczne.'); return; }

		if(self.data.code==undefined) { self.send(); return; }
		if(!SHORT_ID.isValid(self.data.code)) { self.send(); return; }

		userModel.find({ pass_reset_code: self.data.code })
		.limit(1)
		.select('pass_reset_code password')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(); return; }
			user = user[0];

			user.pass_reset_code = '';

			BCRYPT.genSalt(10, function(err, salt){
				if(err){ self.send(); return; }

				BCRYPT.hash(self.data.pass, salt, function(err, password){
					if(err){ self.send(); return; }


					user.password = password;

					user.save(function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});
				});
			});
		});
	}

	self.data = req.body;
	if(req.STEP==1){
		self.remindStep1();
	}else if(req.STEP==2){
		self.remindStep2();
	}else if(req.STEP==3){
		self.remindStep3();
	}else self.send();
}


USER.getUserByID = function(id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.search = function()
	{
		if(typeof id!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(id)){ self.send(); return; }

		userModel.find({ _id: id })
		.limit(1)
		.lean()
		.select('username')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(); return; }
			user = user[0];

			self.send(0, user.username);
		});
	}

	self.search();
}

USER.getUsersByIDs = function(listWidthIds, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.search = function()
	{
		var ids = [];
		for(var i = 0, len = listWidthIds.length; i < len; i++){
			if(typeof listWidthIds[i][0]!='string'){ self.send(); return; }
			ids.push(MONGO.Types.ObjectId(listWidthIds[i][0]));
		}

		userModel.find({_id: { $in: ids}})
		.select('username avatar')
		.lean()
		.exec(function(err, users){
			if(err){ self.send(); return; }

			if(users==null){ self.send(); return; }

			for(var i = 0, len = users.length; i < len; i++) {
				for(var j = 0, len2 = listWidthIds.length; j < len2; j++) {
					if(users[i]._id==listWidthIds[j][0]){
						listWidthIds[j][1] = users[i];
					}
				}
			}
			self.send(0, listWidthIds);
		});
	}

	self.search();
}


USER.getUserByName = function(name, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else if(type==1){
			self.answer = { error: true, code: 1 }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	if(typeof name!='string'){ self.send(1); return; }

	var possible_marks = [
		'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
		'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z',
		'x', 'c', 'v', 'b', 'n', 'm', 'Q', 'W', 'E', 'R',
		'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F',
		'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B',
		'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7',
		'8', '9', 'ę', 'ó', 'ą', 'ś', 'ł', 'ż', 'ź', 'ć',
		'ń', 'Ę', 'Ó', 'Ą', 'Ś', 'Ł', 'Ż', 'Ź', 'Ć', 'Ń',
		'.', '_',
	]

	var isBadChar = false;
	for(var i = 0, len = name.length; i < len; i++) {
		if(possible_marks.indexOf(name[i])==-1){
			isBadChar = true;
			break;
		}
	}

	if(isBadChar){ self.send(1); return; }

	userModel.find({username: { $regex: new RegExp('^'+name.toLowerCase()+'$', "i") }})
	.limit(1)
	.lean()
	.select('username avatar200 avatar last_activity type premium_expire')
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(user.length==0){ self.send(1); return; }
		user = user[0];

		self.send(0, user);
	});
}

USER.getMoviesdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	movieModel.find({ $and: [{user: MONGO.Types.ObjectId(_id)}, { $where: 'this.links.length > 0' }, {status: 'PUBLIC'}]})
	.lean()
	.select('title title_org url poster num')
	.sort('-date')
	.limit(16)
	.exec(function(err, movies){
		if(err){ self.send(); return; }
		if(movies==null){ self.send(); return; }

		self.send(0, movies);
	});
}

USER.getSeriesdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	seriesModel.find({ $and: [{user: MONGO.Types.ObjectId(_id)}, { $where: 'this.episodes.length > 0' }, {status: 'PUBLIC'}]})
	.lean()
	.select('title title_org url poster num')
	.sort('-date')
	.limit(16)
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(series==null){ self.send(); return; }

		self.send(0, series);
	});
}

USER.countMoviesdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	movieModel.countDocuments({user: MONGO.Types.ObjectId(_id)})
	.exec(function(err, movies){
		if(err){ self.send(); return; }
		if(movies==null) movies = 0;

		self.send(0, movies);
	});
}

USER.countSeriesdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	seriesModel.countDocuments({user: MONGO.Types.ObjectId(_id)})
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(series==null) series = 0;

		self.send(0, series);
	});
}


USER.countEpisodesdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	episodeModel.countDocuments({user: MONGO.Types.ObjectId(_id)})
	.exec(function(err, episodes){
		if(err){ self.send(); return; }
		if(episodes==null) episodes = 0;

		self.send(0, episodes);
	});
}


USER.countLinksdAddedByUser = function(_id, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	linkModel.countDocuments({user: MONGO.Types.ObjectId(_id)})
	.exec(function(err, links){
		if(err){ self.send(); return; }
		if(links==null) links = 0;

		self.send(0, links);
	});
}

USER.changeAvatar = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==1){
			self.answer = { error: true, code: 1, msg: data }
			CB(self.answer);
		}else if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.data = req.body;

	if(self.data.data==null){ self.send(); return; }
	else if(self.data.data.length==0){ self.send(); return; }

	var fileTypes = ['jpg', 'jpeg', 'png', 'gif'];

	if(self.data.ext==null){ self.send(); return; }
	else if(self.data.ext.length==0){ self.send(); return; }
	else if(fileTypes.indexOf(self.data.ext)==-1){ self.send(); return; }

	if(self.data.ext=='jpg') self.data.ext = 'jpeg';


	var user_id = req.INJECT_DATA.user_status.data._id;

	userModel.findById(user_id)
	.select('avatar')
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(!user){ self.send(); return; }

		var base64ImageArray = self.data.data.split('data:image/'+self.data.ext+';base64,');
		if(base64ImageArray.length!=2){ self.send(); return; }

		var base64Image = base64ImageArray.pop();
		var imageBuffer = new Buffer(base64Image, 'base64');

		var tmp_filename = 'tmp_'+SHORT_ID.generate()+'.'+self.data.ext;
		var tmp_path = PATH.join(PUBLIC_PATH, 'uploads/tmp/'+tmp_filename);

		FS.writeFile(tmp_path, imageBuffer, function(err){
			if(err){ self.send(); return; }

			ASYNC.series([
				function(cb){
					var filename = SHORT_ID.generate()+'_uncompressed.jpg';
					var path = PATH.join(PUBLIC_PATH, 'uploads/avatars/'+filename);

					SHARP(tmp_path)
					.resize(100, 100)
					.toFile(path, function(err){
						if(err){ self.send(); return; }
						
						var filename2 = SHORT_ID.generate()+'.jpg';
						var path2 = PATH.join(PUBLIC_PATH, 'uploads/avatars/'+filename2);

						translator = new JPEGTRAN(['-optimize']);
						var read = FS.createReadStream(path);
						var write = FS.createWriteStream(path2);

						translator.on('end', function(){
							FS.unlinkSync(path);

							var old_av = user.avatar;

							if(old_av && old_av.length>0){
								var path3 = PATH.join(PUBLIC_PATH, old_av);
								FS.unlinkSync(path3);
							}

							user.avatar = '/uploads/avatars/'+filename2,
							user.save(function(err){
								if(err){ cb(true); FS.unlinkSync(path2); return; }
								cb(null, user.avatar)
							});
						});

						translator.on('error', function(){
							FS.unlinkSync(path);
							cb(true);
						});

						read.pipe(translator).pipe(write);
					});
				},
				function(cb){
					var filename = SHORT_ID.generate()+'_uncompressed.jpg';
					var path = PATH.join(PUBLIC_PATH, 'uploads/avatars/'+filename);

					SHARP(tmp_path)
					.resize(200, 200)
					.toFile(path, function(err){
						if(err){ self.send(); return; }

						var filename2 = SHORT_ID.generate()+'.jpg';
						var path2 = PATH.join(PUBLIC_PATH, 'uploads/avatars/'+filename2);

						FS.unlinkSync(tmp_path);

						translator = new JPEGTRAN(['-optimize']);
						var read = FS.createReadStream(path);
						var write = FS.createWriteStream(path2);

						translator.on('end', function(){
							FS.unlinkSync(path);

							var old_av = user.avatar200;

							if(old_av && old_av.length>0){
								var path3 = PATH.join(PUBLIC_PATH, old_av);
								FS.unlinkSync(path3);
							}

							user.avatar200 = '/uploads/avatars/'+filename2,
							user.save(function(err){
								if(err){ cb(true); FS.unlinkSync(path2); return; }
								cb(null, user.avatar200)
							});
						});

						translator.on('error', function(){
							FS.unlinkSync(path);
							cb(true);
						});

						read.pipe(translator).pipe(write);
					});
				}
			],
			function(err, results){
				if(err){ self.send(); return; }
				self.send(0, results[0]);
			});
		});
	});
}



USER.setFavSeries = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.data = req.body;

	if(self.data.code==null){ self.send(); return; }
	else if(typeof self.data.code!='string'){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.type==null){ self.send(); return; }
	else if(self.data.type!=-1 && self.data.type!=1){ self.send(); return; }

	var user_id = req.INJECT_DATA.user_status.data._id;

	userModel.find({ _id: MONGO.Types.ObjectId(user_id)})
	.limit(1)
	.select('fav_series')
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(user.length==0){ self.send(); return; }
		var user = user[0];

		seriesModel.find({ _id: MONGO.Types.ObjectId(self.data.code)})
		.limit(1)
		.select('fav_users')
		.exec(function(err, series){
			if(err){ self.send(); return; }
			if(series.length==0){ self.send(); return; }
			var series = series[0];

			if(self.data.type==1){
				ASYNC.series([
					function(callback){
						if(user.fav_series.indexOf(MONGO.Types.ObjectId(self.data.code))!=-1){
							callback(null); return;
						}

						user.fav_series.push(MONGO.Types.ObjectId(self.data.code));
						user.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					},
					function(callback){
						if(series.fav_users.indexOf(MONGO.Types.ObjectId(user_id))!=-1){
							callback(null); return;
						}

						series.fav_users.push(MONGO.Types.ObjectId(user_id));
						series.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					}
				],
				function(err){
					if(err){ self.send(); return; }
					self.send(0);
				});
			}else{
				ASYNC.series([
					function(callback){
						var index = user.fav_series.indexOf(MONGO.Types.ObjectId(self.data.code));

						if(index==-1){
							self.send(0); return;
						}

						user.fav_series.splice(index, 1);
						user.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					},
					function(callback){
						var index = series.fav_users.indexOf(MONGO.Types.ObjectId(user_id));

						if(index==-1){
							self.send(0); return;
						}

						series.fav_users.splice(index, 1);
						series.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					}
				],
				function(err){
					if(err){ self.send(); return; }
					self.send(0);
				});
			}
		});
	});
}

USER.getFavSeries = function(req, CB)
{
	var user_id = req.INJECT_DATA.user_status.data._id;

	userModel.find({ _id: MONGO.Types.ObjectId(user_id)})
	.limit(1)
	.lean()
	.select('fav_series')
	.exec(function(err, user){
		if(err){ CB(true); return; }
		if(user.length==0){ CB(true); return; }
		var user = user[0];

		if(!user.fav_series){ CB(null, []); return; }

		var fav_series_ids = [];

		for(var i = 0, len = user.fav_series.length; i < len; i++){
			if(user.fav_series[i])
				fav_series_ids.push(MONGO.Types.ObjectId(user.fav_series[i]));
		}

		var isPremiumUser = req.INJECT_DATA.user_status.data.premium;

		var q_status = { $or: [{ status: 'PUBLIC' }] }
		if(isPremiumUser){
			q_status = { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] }
		}

		seriesModel.find({ $and: [{ _id: { $in: fav_series_ids }}, q_status ]})
		.lean()
		.sort({update_date: -1})
		.select('title title_org poster url num new_status update_date')
		.populate({
			path: 'new_status.episode',
			select: 'episode_num season_num url num episode_num_alter'
		})
		.exec(function(err, fav_series){
			if(err){ CB(true); return; }
			CB(null, fav_series);
		});
	});
}



USER.setFavMovie = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	self.data = req.body;

	if(self.data.code==null){ self.send(); return; }
	else if(typeof self.data.code!='string'){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.type==null){ self.send(); return; }
	else if(self.data.type!=-1 && self.data.type!=1){ self.send(); return; }

	var user_id = req.INJECT_DATA.user_status.data._id;

	userModel.find({ _id: MONGO.Types.ObjectId(user_id)})
	.limit(1)
	.select('fav_movies')
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(user.length==0){ self.send(); return; }
		var user = user[0];

		movieModel.find({ _id: MONGO.Types.ObjectId(self.data.code)})
		.limit(1)
		.select('fav_users')
		.exec(function(err, movie){
			if(err){ self.send(); return; }
			if(movie.length==0){ self.send(); return; }
			var movie = movie[0];

			if(self.data.type==1){
				ASYNC.series([
					function(callback){
						if(user.fav_movies.indexOf(MONGO.Types.ObjectId(self.data.code))!=-1){
							callback(null); return;
						}

						user.fav_movies.push(MONGO.Types.ObjectId(self.data.code));
						user.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					},
					function(callback){
						if(movie.fav_users.indexOf(MONGO.Types.ObjectId(user_id))!=-1){
							callback(null); return;
						}

						movie.fav_users.push(MONGO.Types.ObjectId(user_id));
						movie.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					}
				],
				function(err){
					if(err){ self.send(); return; }
					self.send(0);
				});
			}else{
				ASYNC.series([
					function(callback){
						var index = user.fav_movies.indexOf(MONGO.Types.ObjectId(self.data.code));

						if(index==-1){
							self.send(0); return;
						}

						user.fav_movies.splice(index, 1);
						user.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					},
					function(callback){
						var index = movie.fav_users.indexOf(MONGO.Types.ObjectId(user_id));

						if(index==-1){
							self.send(0); return;
						}

						movie.fav_users.splice(index, 1);
						movie.save(function(err){
							if(err){ callback(true); return; }
							callback(null); return;
						});
					}
				],
				function(err){
					if(err){ self.send(); return; }
					self.send(0);
				});
			}
		});
	});
}


USER.getFavMovies = function(req, CB)
{
	var user_id = req.INJECT_DATA.user_status.data._id;

	userModel.find({ _id: MONGO.Types.ObjectId(user_id)})
	.limit(1)
	.lean()
	.select('fav_movies')
	.exec(function(err, user){
		if(err){ CB(true); return; }
		if(user.length==0){ CB(true); return; }
		var user = user[0];

		if(!user.fav_movies){ CB(null, []); return; }

		var fav_movies_ids = [];

		for(var i = 0, len = user.fav_movies.length; i < len; i++){
			if(user.fav_movies[i])
				fav_movies_ids.push(MONGO.Types.ObjectId(user.fav_movies[i]));
		}

		var isPremiumUser = req.INJECT_DATA.user_status.data.premium;

		var q_status = { $or: [{ status: 'PUBLIC' }] }
		if(isPremiumUser){
			q_status = { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] }
		}

		movieModel.find({ $and: [{ _id: { $in: fav_movies_ids }}, q_status ]})
		.lean()
		.sort({update_date: -1})
		.select('title title_org poster url num new_status update_date')
		.exec(function(err, fav_movies){
			if(err){ CB(true); return; }
			CB(null, fav_movies);
		});
	});
}


module.exports = USER;