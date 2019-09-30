
var PAYMENT = {}

PAYMENT.newTransfer = function(req, res, CB)
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

	if(self.data.premium==null){ self.send(); return; }
	else if(self.data.premium!='on'){ self.send(1, 'Akceptuj regulamin.'); return; }


	if(self.data.amount==null){ self.send(); return; }
	else if(!VALIDATOR.isFloat(self.data.amount)){ self.send(); return; }

/*	if(self.data.control==null){ self.send(); return; }
	else if(self.data.control.length<3){ self.send(); return; }

	if(self.data.signature==null){ self.send(); return; }
	else if(!VALIDATOR.isMD5(self.data.signature)){ self.send(); return; }*/

/*	var string = RUSHP_ID+RUSHP_HASH+self.data.amount;

	var md5sum = CRYPTO.createHash('md5').update(string).digest("hex");
	
	if(self.data.signature!=md5sum){ self.send(); return; }*/

	self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

/*	var kwota = (self.data.p24_amount/100).toFixed(2);
	console.log(kwota)*/

	var time = PREMIUM_TRANSFER_COST_TO_TIME[self.data.amount];
	if(!time){ self.send(); return; }

	var amount = parseFloat(self.data.amount);
	var crc = SHORT_ID.generate();
	var desc = 'Zakup konta premium - '+time+' dni';

	

	var string = `${RUSHP_HASH}|${RUSHP_ID}|${amount}|${crc}|${desc}|${req.INJECT_DATA.user_status.data.email}|${RUSHP_WYN_URL}|${RUSHP_POW_URL}|true`;
	var signature = CRYPTO.createHash('sha256').update(string).digest("hex");


	var query = {
		'shopId': RUSHP_ID,
		'price': amount,
		'control': crc,
		'description': desc,
		'email': req.INJECT_DATA.user_status.data.email,
		'notifyURL': RUSHP_WYN_URL,
		'returnUrlSuccess': RUSHP_POW_URL,
		'hideReceiver': true,
		'signature': signature,
	}

	paymentModel.countDocuments({crc: crc})
	.exec(function(err, len){
		if(err){ self.send(); return; }

		if(len>0){ self.send(1, 'Proszę odswieżyć stronę i spróbować ponownie.'); return; }

		requestPostJson('https', 'https://secure.rushpay.pl/api/v1/transfer/generate', query, function(err, answ){
			if(err){ self.send(); return; }
			if(answ.errorCode && answ.errorCode!=200){ self.send(1, 'Wystąpił błąd. Proszę spróbować później.'); return; }


			var tr_id = answ.transactionId;
			var redir = answ.url;

			var query2 = {
				_id : MONGO.Types.ObjectId(),
				user : MONGO.Types.ObjectId(self.data.user_id),
				cost : self.data.amount,
				crc : crc,
				tr_id : tr_id,
				paid: false,
				factured: false,
				type: 0, // 0 - transfer 1 - direct billing
			}
			
			paymentModel.create(query2, function(err, payment){
				if(err){ self.send(); return; }
				
				self.send(0, {url:redir});
			});
		});
	});
}

PAYMENT.postNewFacture = function(data, CB)
{
	var options = {
		host: 'api.infakt.pl',
		port: 443,
		path: '/v3/invoices.json',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(data)
		}
	};

	var body = '';

	var req = HTTPS.request(options, function(res){
		res.setEncoding('utf8');

		res.on('data', function(chunk){
			body+=chunk;
		});

		res.on('end', function(){
			if(res.statusCode==201) CB(false, body);
			else CB(true);
		});
	});
	req.on('error', function(err){
		CB(true);
	});
	req.write(data);
	req.end();
}

PAYMENT.setFacturePaid = function(date, id, CB)
{
	var data = JSON.stringify({
		api_key : INFAKT_API_KEY,
		paid_date : MOMENT(date).format('YYYY-MM-DD'),
	});

	var options = {
		host: 'api.infakt.pl',
		port: 443,
		path: '/v3/invoices/'+id+'/paid.json',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(data)
		}
	};

	var body = '';

	var req = HTTPS.request(options, function(res){
		res.setEncoding('utf8');

		res.on('data', function(chunk){
			body+=chunk;
		});

		res.on('end', function(){
			if(res.statusCode==204) CB(false, body);
			else CB(true);
		});
	});
	req.on('error', function(err){
		CB(true);
	});
	req.write(data);
	req.end();
}


PAYMENT.resTransfer = function(req, res, CB)
{
	//console.log(req.body)
	//console.log(getIP(req))
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

	if(self.data.transactionId==null){ self.send(); return; }
	else if(typeof self.data.transactionId!='string' && typeof self.data.status!='transactionId'){ self.send(); return; }
	if(self.data.control==null){ self.send(); return; }
	else if(typeof self.data.control!='string' && typeof self.data.control!='number'){ self.send(); return; }
	if(self.data.email==null){ self.send(); return; }
	else if(typeof self.data.email!='string' && typeof self.data.email!='number'){ self.send(); return; }
	if(self.data.amountPaid==null){ self.send(); return; }
	else if(typeof self.data.amountPaid!='string' && typeof self.data.amountPaid!='number'){ self.send(); return; }
	if(self.data.notificationAttempt==null){ self.send(); return; }
	else if(typeof self.data.notificationAttempt!='string' && typeof self.data.notificationAttempt!='number'){ self.send(); return; }
	if(self.data.paymentType==null){ self.send(); return; }
	else if(typeof self.data.paymentType!='string' && typeof self.data.paymentType!='number'){ self.send(); return; }
	if(self.data.apiVersion==null){ self.send(); return; }
	else if(typeof self.data.apiVersion!='string' && typeof self.data.apiVersion!='number'){ self.send(); return; }
	if(self.data.signature==null){ self.send(); return; }
	else if(typeof self.data.signature!='string' && typeof self.data.signature!='number'){ self.send(); return; }


	var transactionId = self.data.transactionId;
	var control = self.data.control;
	var email = self.data.email;
	var amountPaid = parseFloat(self.data.amountPaid);
	var notificationAttempt = parseInt(self.data.notificationAttempt);
	var paymentType = self.data.paymentType;
	var apiVersion = parseInt(self.data.apiVersion);
	var signatureReq = self.data.signature;

	var string = `${RUSHP_HASH}|${transactionId}|${control}|${email}|${amountPaid}|${notificationAttempt}|${paymentType}|${apiVersion}`;
	var signature = CRYPTO.createHash('sha256').update(string).digest("hex");


	if(signature!=signatureReq){
		err_log('przelew: signature nie jest takie samo');
		console.log(self.data);
		console.log(getIP(req));
		self.send();
		return;
	}

	
	paymentModel.find({crc: control})
	.limit(1)
	.lean()
	.exec(function(err, payment){
		if(err){ err_log('Payment: '+transactionId+' crc not found.'); self.send(); return; }
		if(!payment){ err_log('Payment: '+transactionId+' crc not found.'); self.send(); return; }
		if(payment.length==0){ err_log('Payment: '+transactionId+' crc not found.'); self.send(); return; }
		var payment = payment[0];

		if(payment.applied){ err_log('Payment: '+transactionId+' already applied.'); self.send(0); return; }
		if(payment.crc!=control){ err_log('Payment: '+transactionId+' crc not same. '+payment.crc+'!='+control); self.send(); return; }
		if(payment.tr_id!=transactionId){ err_log('Payment: '+transactionId+' transactionId not same. '+payment.tr_id+'!='+transactionId); self.send(); return; }

		if(parseFloat(payment.cost)!==amountPaid){
			var email_data = {
				from : 'noreply@'+HOSTNAME,
				to :  'sewadsa@hapz.pl',
				subject : 'Wystąpił problem z kwotą wpłaty',
				text  : 'Payment: '+transactionId+' '+payment.cost+'!='+amountPaid,
				html  : 'Payment: '+transactionId+' '+payment.cost+'!='+amountPaid,
			}

			SENDGRID.sendEmail(email_data, function(err){ });
			err_log('Payment: '+transactionId+' '+payment.cost+'!='+amountPaid);
		}

		var date = MOMENT();

		paymentModel.updateOne({crc: control}, { tr_date: date, paid: true }, function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

PAYMENT.checkPaymentPaid = function()
{
	paymentModel.find({ $and: [ {paid: true}, {applied: false} ]})
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: 'premium_expire premium_buy_times',
	})
	.exec(function(err, payments){
		if(err){ err_log('PAYMENT.checkPaymentPaid while get payments'); return; }
		if(!payments){ return; }
		if(payments.length==0){ return; }
		var payment = payments[0];

		var type = 0;
		if(payment.type && payment.type==1) type = 1;

		if(type==0) var time = PREMIUM_TRANSFER_COST_TO_TIME[payment.cost];
		else var time = PREMIUM_DIRECT_BILLING_COST_TO_TIME[payment.cost];

		if(!time){ err_log('PAYMENT.checkPaymentPaid time is undefined: '+payment._id); return; }

		var premium_expire = null;

		if(MOMENT().isAfter(payment.user.premium_expire)){
			premium_expire = MOMENT().add(time, 'd');
		}else{
			premium_expire = MOMENT(payment.user.premium_expire).add(time, 'd');
		}

		paymentModel.updateOne({_id: payment._id}, { applied: true }, function(err, updated_doc){
			if(err){ err_log('PAYMENT.checkPaymentPaid while set applied'); return; }
			if(updated_doc.n!=1 && updated_doc.nModified!=1 && updated_doc.ok!=1){ err_log('PAYMENT.checkPaymentPaid while set applied'); return; }

			userModel.updateOne({_id: payment.user._id}, { premium_expire: premium_expire, $inc: { premium_buy_times: 1 } }, function(err, updated_doc){
				if(err){ err_log('PAYMENT.checkPaymentPaid while set user premium_expire'); return; }
				if(updated_doc.n!=1 && updated_doc.nModified!=1 && updated_doc.ok!=1){ err_log('PAYMENT.checkPaymentPaid while set user premium_expire'); return; }
			});
		});
	});
}


PAYMENT.checkPaymentApplied = function(cb)
{
	paymentModel.find({ $and: [ {paid: true}, {applied: true}, {factured: false}, {type: 0} ]})
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: 'username email',
	})
	.exec(function(err, payments){
		if(err){ err_log('PAYMENT.checkPaymentApplied while get payments'); cb(); return; }
		if(!payments){ cb(); return; }
		if(payments.length==0){ cb(); return; }
		var payment = payments[0];

		var date = MOMENT();

		var time = PREMIUM_TRANSFER_COST_TO_TIME[payment.cost];

		var brutto = payment.cost;
		var netto = (brutto/1.23).toFixed(2);
		var netto_w_groszach = Math.round(netto*100);

		var facture_data = JSON.stringify({
			api_key : INFAKT_API_KEY,
			'invoice': {
				'notes': 'Rushpay: '+payment.tr_id,
				'kind': 'vat',
				'payment_method': 'transfer',
				'recipient_signature': payment.user.username,
				'seller_signature': 'Adam Sewastianiuk',
				//'invoice_date': date.format('YYYY-MM-DD'),
				'sale_date': date.format('YYYY-MM-DD'),
				'status': 'paid',
				'payment_date': date.format('YYYY-MM-DD'),
				'client_company_name': payment.user.email,
				'check_duplicate_number': true,
				'sale_type': 'service',
				'invoice_date_kind': 'service_date',
				'services': [
					{
						'name': 'Zakup konta premium - '+time+' dni',
						'tax_symbol': 23,
						'quantity': 1,
						"net_price": netto_w_groszach,
					}
				]
			}
		});

		PAYMENT.postNewFacture(facture_data, function(err, data){
			if(err){
				var email_data = {
					from : 'noreply@'+HOSTNAME,
					to :  'sewadsa@hapz.pl',
					subject : 'Wystąpił problem z fakturą',
					text  : 'Podczas dodawania faktury wystapił błąd. Numer transakcji: '+payment.tr_id,
					html  : 'Podczas dodawania faktury wystapił błąd. Numer transakcji: '+payment.tr_id,
				}

				SENDGRID.sendEmail(email_data, function(err){ });
				cb(); 
				return;
			}

			try{
				var arr = JSON.parse(data);
			}catch(e){
				var email_data = {
					from : 'noreply@'+HOSTNAME,
					to :  'sewadsa@hapz.pl',
					subject : 'Wystąpił problem z fakturą',
					text  : 'Podczas parsowania faktury wystąpił błąd.',
					html  : 'Podczas parsowania faktury wystąpił błąd.',
				}

				SENDGRID.sendEmail(email_data, function(err){ });
				cb(); 
				return;
			}


			var id = arr.id;
			var number = arr.number;

			PAYMENT.setFacturePaid(date.format('YYYY-MM-DD'), id, function(err, data){
/*				if(err){
					var email_data = {
						from : 'noreply@'+HOSTNAME,
						to :  'sewadsa@hapz.pl',
						subject : 'Wystąpił problem z fakturą',
						text  : 'Podczas ustawiania faktury jako zapłacona wystapił błąd. Numer faktury: '+number,
						html  : 'Podczas ustawiania faktury jako zapłacona wystapił błąd. Numer faktury: '+number,
					}

					SENDGRID.sendEmail(email_data, function(err){ });
					return;
				}*/

				paymentModel.updateOne({_id: payment._id}, { factured: true }, function(err, updated_doc){
					if(err){
						var email_data = {
							from : 'noreply@'+HOSTNAME,
							to :  'sewadsa@hapz.pl',
							subject : 'Wystąpił problem z fakturą',
							text  : 'Podczas ustawiania faktury jako zapłacona. Numer crc: '+payment.crc,
							html  : 'Podczas ustawiania faktury jako zapłacona. Numer crc: '+payment.crc,
						}

						SENDGRID.sendEmail(email_data, function(err){ });
						cb(); 
						return;
					}
					if(updated_doc.n!=1 && updated_doc.nModified!=1 && updated_doc.ok!=1){
						err_log('PAYMENT.checkPaymentPaid while set factured'); 
						var email_data = {
							from : 'noreply@'+HOSTNAME,
							to :  'sewadsa@hapz.pl',
							subject : 'Wystąpił problem z fakturą',
							text  : 'Podczas ustawiania faktury jako zapłacona. Numer crc: '+payment.crc,
							html  : 'Podczas ustawiania faktury jako zapłacona. Numer crc: '+payment.crc,
						}

						SENDGRID.sendEmail(email_data, function(err){ });
						cb(); 
						return;
					}else{
						console.log('Payment '+payment.tr_id+' facture: OK');
						cb(); 
					}
				});
			});
		});
	});
}



PAYMENT.SMSCodeVerify = function(req, res, CB)
{
	var self = {};
	self.already_sent = false;
	self.send = function(type, data)
	{	
		if(self.already_sent) return;
		self.already_sent = true;
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

	if(self.data.code==null){ self.send(); return; }
	else if(self.data.code.length==0){ self.send(1, 'Uzupełnij kod zwrotny.'); return; }

	//if(self.data.number==null){ self.send(); return; }
	//else if(self.data.number!='7555' && self.data.number!='91455' && self.data.number!='92555'){ self.send(); return; }

	var user_id = req.INJECT_DATA.user_status.data._id;

	var dataz = {
		params: {
			auth: {
				key: '1ece21b2',
				secret: 'aa49684f31a21442038469d3071de9e1',
			},
			service_id: '2904',
			//number: self.data.number,
			code: self.data.code
		}
	}

	var post_data = JSON.stringify(dataz);

	var options = {
		host: 'simpay.pl',
		port: 443,
		method: 'POST',
		path: '/api/1/status',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(post_data)
		},
	};

	userModel.find({_id: MONGO.Types.ObjectId(user_id)})
	.limit(1)
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(user.length==0){ self.send(); return; }
		var user = user[0];

		var query = {
			_id : MONGO.Types.ObjectId(),
			user : MONGO.Types.ObjectId(user_id),
			sms_code : self.data.code,
			sms_num : 0,
		}

		paymentModel.create(query, function(err, payment){
			if(err){ self.send(); return; }

			var request = HTTPS.request(options, function(response) {
				response.setEncoding('utf8');
				response.on('error', function(err){
					self.send(); return;
				});
				response.on('data', function(data){
					try{
						var respo = JSON.parse(data);
					}catch(err){
						self.send(1, 'Wystąpił błąd spróbuj ponownie za kilka minut.');
						return;
					}

					if(respo.respond){
						var status = respo.respond.status;
						if(status=='OK'){
							var time = PREMIUM_SMS_NUMBER_TO_TIME[respo.respond.number];

							if(!time){ self.send(1, 'Wystąpił błąd krytyczny. Skontaktuj się z nami przez kontakt na dole strony w celu ręcznej aktywacji kodu. Prosimy podać kod, numer telefonu na który wysłano SMS oraz numer telefonu z którego wysłano SMS.'); return; }

							if(MOMENT().isAfter(user.premium_expire)){
								user.premium_expire = MOMENT().add(time, 'd');
							}else{
								user.premium_expire = MOMENT(user.premium_expire).add(time, 'd');
							}

							user.save(function(err){
								if(err){ self.send(1, 'Wystąpił błąd krytyczny. Skontaktuj się z nami przez kontakt na dole strony w celu ręcznej aktywacji kodu. Prosimy podać kod, numer telefonu na który wysłano SMS oraz numer telefonu z którego wysłano SMS.'); return; }

								payment.applied = true;
								payment.sms_num = respo.respond.number;
								payment.save(function(err){
									self.send(0);
								});
							});
						}else if(status=='USED'){
							self.send(1, 'Kod został już wykorzystany.');
						}
					}else if(respo.error && respo.error.length>0){
						var code = respo.error[0].error_code;

						switch(code)
						{
							case '404':
								self.send(1, 'Kod nie istnieje. Upewnij się, że wybrałeś poprawny numer.');
								break;
							case '405':
								self.send(1, 'Kod został już wykorzystany.');
								break;
							default:
								self.send(1, 'Wystąpił błąd spróbuj ponownie za kilka minut.');
								break;
						}
					}
				});
			});
			request.on('error', function(err){
				self.send(); return;

				//self.send(1, 'Brak połączenia z serwerem simpay.pl. Proszę spróbować później.'); return;
			});
			request.write(post_data);
			request.end();
		});
	});


/*	paymentModel.find({crc: self.data.tr_crc})
	.limit(1)
	.populate({
		path: 'user',
	})
	.exec(function(err, payment){
		if(err){ self.send(); return; }
		if(!payment){ self.send(); return; }
		if(payment.length==0){ self.send(); return; }
		var payment = payment[0];

		if(payment.crc!=self.data.tr_crc){ self.send(); return; }

		payment.tr_date = MOMENT(self.data.tr_date);
		payment.tr_id = self.data.tr_id;

		var user = payment.user;

		var time = PREMIUM_TRANSFER_COST_TO_TIME[payment.cost];

		if(MOMENT().isAfter(user.premium_expire)){
			user.premium_expire = MOMENT().add(time, 'd');
		}else{
			user.premium_expire = MOMENT(user.premium_expire).add(time, 'd');
		}

		
		payment.save(function(err){
			if(err){ self.send(); return; }

			user.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	});*/
}


PAYMENT.newTransferDirectBilling = function(req, res, CB)
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

	if(self.data.premium==null){ self.send(); return; }
	else if(self.data.premium!='on'){ self.send(1, 'Akceptuj regulamin.'); return; }


	if(self.data.amount==null){ self.send(); return; }
	else if(!VALIDATOR.isFloat(self.data.amount)){ self.send(); return; }

	self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

	var time = PREMIUM_DIRECT_BILLING_COST_TO_TIME[self.data.amount];
	if(!time){ self.send(); return; }

	var amount = parseFloat(self.data.amount);
	var crc = SHORT_ID.generate();
	var desc = 'Zakup konta premium - '+time+' dni';

	var brutto = amount;
	var netto = (brutto/1.23).toFixed(2);
	var netto_w_groszach = Math.round(netto*100);

	

	var string = `${netto_w_groszach}|${desc}|${crc}|${RUSHP_HASH_DIRECT_BILLING}`;
	var signature = CRYPTO.createHash('sha256').update(string).digest("hex");


	var query = {
		'price': netto_w_groszach,
		'control': crc,
		'description': desc,
		'signature': signature,
	}


	paymentModel.countDocuments({crc: crc})
	.exec(function(err, len){
		if(err){ self.send(); return; }

		if(len>0){ self.send(1, 'Proszę odswieżyć stronę i spróbować ponownie.'); return; }


		var auth = 'Basic ' + Buffer.from(RUSHP_LOGIN_DIRECT_BILLING + ':' + RUSHP_PASS_DIRECT_BILLING).toString('base64');

		var add_headers = {
			'Authorization': auth,
		}

		requestPostJson('https', 'https://www.rushpay.pl/direct-biling/', query, function(err, answ){
			if(err){ self.send(); return; }
			if(answ.status=='error'){ console.error(answ.message); self.send(1, 'Wystąpił błąd. Proszę spróbować później.'); return; }
			else if(answ.status=='success' && answ.code==200){
				var clientURL = answ.clientURL

			//	var tr_id = answ.transactionId;

				var query2 = {
					_id : MONGO.Types.ObjectId(),
					user : MONGO.Types.ObjectId(self.data.user_id),
					cost : self.data.amount,
					crc : crc,
					//tr_id : tr_id,
					paid: false,
					applied: false,
					type: 1, // 0 - transfer 1 - direct billing
				}
				
				paymentModel.create(query2, function(err, payment){
					if(err){ self.send(); return; }
					
					self.send(0, {url:clientURL});
				});

			}
		}, add_headers);
	});
}


PAYMENT.resTransferDirectBilling = function(req, res, CB)
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

	if(self.data.status==null){ self.send(); return; }
	else if(typeof self.data.status!='string' && typeof self.data.status!='number'){ self.send(); return; }
	if(self.data.userid==null){ self.send(); return; }
	else if(typeof self.data.userid!='string' && typeof self.data.userid!='number'){ self.send(); return; }
	if(self.data.shopid==null){ self.send(); return; }
	else if(typeof self.data.shopid!='string' && typeof self.data.shopid!='number'){ self.send(); return; }
	if(self.data.pid==null){ self.send(); return; }
	else if(typeof self.data.pid!='string' && typeof self.data.pid!='number'){ self.send(); return; }
	if(self.data.price==null){ self.send(); return; }
	else if(typeof self.data.price!='string' && typeof self.data.price!='number'){ self.send(); return; }
	if(self.data.control==null){ self.send(); return; }
	else if(typeof self.data.control!='string' && typeof self.data.control!='number'){ self.send(); return; }
	if(self.data.description==null){ self.send(); return; }
	else if(typeof self.data.description!='string' && typeof self.data.description!='number'){ self.send(); return; }
	if(self.data.date_pay==null){ self.send(); return; }
	else if(typeof self.data.date_pay!='string' && typeof self.data.date_pay!='number'){ self.send(); return; }
	if(self.data.commission==null){ self.send(); return; }
	else if(typeof self.data.commission!='string' && typeof self.data.commission!='number'){ self.send(); return; }
	if(self.data.carrierID==null){ self.send(); return; }
	else if(typeof self.data.carrierID!='string' && typeof self.data.carrierID!='number'){ self.send(); return; }
	if(self.data.signature==null){ self.send(); return; }
	else if(typeof self.data.signature!='string' && typeof self.data.signature!='number'){ self.send(); return; }


	var status = self.data.status;
	var userid = self.data.userid;
	var shopid = self.data.shopid;
	var pid = self.data.pid;
	var price = self.data.price;
	var control = self.data.control;
	
	var date_pay = decodeURIComponent(String(self.data.date_pay)).replace('+', ' ');
	var commission = self.data.commission;
	var carrierID = self.data.carrierID;
	var signatureReq = self.data.signature;

	var netto = price;
	var brutto = parseFloat((netto*1.23/100).toFixed(2));

	var time = PREMIUM_DIRECT_BILLING_COST_TO_TIME[brutto];
	if(!time){ self.send(); return; }

	var description = 'Zakup konta premium - '+time+' dni';


	/*var amountPaid = parseFloat(self.data.amountPaid);
	var notificationAttempt = parseInt(self.data.notificationAttempt);
	var paymentType = self.data.paymentType;
	var apiVersion = parseInt(self.data.apiVersion);
	var signatureReq = self.data.signature;*/

	var string = `${RUSHP_HASH_DIRECT_BILLING}|${status}|${'895'}|${RUSHP_ID_DIRECT_BILLING}|${pid}|${price}|${control}|${description}|${date_pay}|${commission}|${carrierID}`;
	var signature = CRYPTO.createHash('sha256').update(string).digest("hex");

	if(signature!=signatureReq){
		err_log('direct-billing: signature nie jest takie samo');
		console.log(self.data);
		console.log(getIP(req));
		self.send();
		return;
	}

	
	paymentModel.find({crc: control})
	.limit(1)
	.lean()
	.exec(function(err, payment){
		if(err){ err_log('Payment: '+pid+' crc not found.'); self.send(); return; }
		if(!payment){ err_log('Payment: '+pid+' crc not found.'); self.send(); return; }
		if(payment.length==0){ err_log('Payment: '+pid+' crc not found.'); self.send(); return; }
		var payment = payment[0];

		if(payment.applied){ err_log('Payment: '+pid+' already applied.'); self.send(0); return; }
		if(payment.crc!=control){ err_log('Payment: '+pid+' crc not same. '+payment.crc+'!='+control); self.send(); return; }

		if(status!='AUTHORIZED'){ err_log('Payment: '+pid+' not AUTHORIZED status.'); self.send(0); return; }

		if(parseFloat(payment.cost)!==brutto){
			var email_data = {
				from : 'noreply@'+HOSTNAME,
				to :  'sewadsa@hapz.pl',
				subject : 'Wystąpił problem z kwotą wpłaty',
				text  : 'Payment: '+pid+' '+payment.cost+'!='+price,
				html : 'Payment: '+pid+' '+payment.cost+'!='+price,
			}

			SENDGRID.sendEmail(email_data, function(err){ });
			err_log('Payment: '+pid+' '+payment.cost+'!='+price);
		}

		var date = MOMENT();

		paymentModel.updateOne({crc: control}, { tr_id: pid, tr_date: date, paid: true }, function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}


module.exports = PAYMENT;