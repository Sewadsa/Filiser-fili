
app.post('*', function(req, res, next){
	req.INJECT_DATA = {};
	req.INJECT_DATA.page_title = 'Fili.cc - filiser filmy i seriale online';
	req.INJECT_DATA.absolute_url = req.protocol+'://'+req.get('host')+req.originalUrl;
	req.INJECT_DATA.page_desc = DEFAULT_PAGE_DESC;
	req.INJECT_DATA.page_keywords = DEFAULT_PAGE_KEYWORDS;
	req.INJECT_DATA.page_image_url = '';

	req.INJECT_DATA.google_index = true;


	var referrer = req.get('Referrer');
	if(referrer!=null && referrer.length>0){
		if(VALIDATOR.isURL(referrer)){
			var parsed = URL.parse(referrer);
			if(parsed.hostname!=HOSTNAME) req.INJECT_DATA.badOrigin = true;
		}
	}

	if(MAINTAINCE){
		res.set('Cache-Control', 'public, no-cache');
		res.json({error: true, code: 1, msg: 'Przerwa techniczna. Zaraz wracamy.'});
		return;
	}

	for(var param in req.query){
		if(typeof req.query[param] == 'string'){
			if(req.query[param].length>0){
				var tgs = STRIP_TAGS(req.query[param]);
				if(tgs=='') req.query[param] = '';
				else req.query[param] = req.sanitize(tgs).trim();
			}
		}else{
			for(var i = 0; i < req.query[param].length; i++){
				if(req.query[param][i].length>0){
					var tgs = STRIP_TAGS(req.query[param][i]);
					if(tgs=='') req.query[param][i] = '';
					else req.query[param][i] = req.sanitize(tgs).trim();
				}
			}
		}
	}

	for(var param in req.body){
		if(typeof req.body[param] == 'string'){
			if(req.body[param].length>0){
				var tgs = STRIP_TAGS(req.body[param]);
				if(tgs=='') req.body[param] = '';
				else{ req.body[param] = req.sanitize(tgs).trim(); }
			}
		}else{
			for(var i = 0; i < req.body[param].length; i++){
				if(req.body[param][i].length>0) {
					var tgs = STRIP_TAGS(req.body[param][i]);
					if(tgs=='') req.body[param][i] = '';
					else req.body[param][i] = req.sanitize(tgs).trim();
				}
			}
		}
	}

	USER.getStatus(req, res, function(r){
		req.INJECT_DATA.user_status = r;

		for(var param in req.body){
			if(typeof req.body[param] == 'string')
				req.body[param] = req.body[param].trim();
		}
		
		next();
	});
});


app.post('/', function(req, res){
	console.log(req.body)
	res.send('OK');
});

app.post('/embed/ping2', function(req, res){
	if(!req.body.session_id){
		res.status(404).send(''); return;
	}else if(typeof req.body.session_id!='string'){
		res.status(400).send(''); return;
	}

	var session_id = req.body.session_id;

	watchQueueModel.update({ session_id: session_id }, { watch_tick: new Date().toISOString() }, function(err){
		if(err){ res.status(400).send(''); return; }

		res.status(200).send('');
	});
});

app.post('/embed/ping3', function(req, res){
	if(!req.body.session_id){
		res.status(404).send(''); return;
	}else if(typeof req.body.session_id!='string'){
		res.status(400).send(''); return;
	}

	var session_id = req.body.session_id;

	watchQueueModel.update({ session_id: session_id }, { wait_tick: new Date().toISOString() }, async function(err){
		if(err){ res.status(400).send(''); return; }

		var getQueue = (type) => {
			return new Promise((resolve, reject) => {
				var date = MOMENT().subtract(60, 'seconds');
				var date2 = MOMENT().subtract(360, 'seconds');
				var q = { $or: [{wait_tick: { '$gte': date.toDate() }}, {watch_tick: { '$gte': date.toDate() }}] };
				if(type==1){
					q = {watch_tick: { '$gte': date2.toDate(), '$lt': date.toDate() }};
				}
				
				watchQueueModel.find(q)
				.lean()
				.sort({date: 1})
				.exec((err, data) => {
					if(err) reject();
					else resolve(data);
				});
			})
		};

		var queue = await getQueue(0).catch(() => { return null; });
		var queue_closed = await getQueue(1).catch(() => { return null; });
		
		var queue_sps = queue_closed.length/300;

		var wait_number = 0;
		var watch_number = 0;

		for(var i = 0, l = queue.length; i < l; i++){
			if(!queue[i].watch_tick) wait_number++;
			else watch_number++;
		}

		var queue_number = 0;

		for(var i = 0, l = queue.length; i < l; i++){
			if(!queue[i].watch_tick){
				queue_number++;
				if(queue[i].session_id==session_id){ break };
			}
		}

		var response = {};

		var remaining_seconds = 0;
		if(queue_number>0 && queue_sps>0){
			remaining_seconds = queue_number/queue_sps;
		}

		if(remaining_seconds>0 && watch_number>30){
			var to = MOMENT().add(remaining_seconds, 'seconds');
			var can_watch = to.format('YYYY-MM-DD HH:mm:ss');
			response.can_watch = can_watch;
		}

		if(watch_number>=MAX_WACHING_USERS){
			if(queue_number>0){
				response.queue_number = queue_number;
			}
		}else{
			if(queue_number==1){
				response.queue_number = 0;
			}else{
				response.queue_number = queue_number;
			}
		}

		res.status(200).json(response);
	});
});

app.post('/embed/ping', function(req, res){
	if(!req.body.page_type){
		res.status(404).send(''); return;
	}else if(req.body.page_type!='movie' && req.body.page_type!='episode'){
		res.status(400).send(''); return;
	}

	if(!req.body.code){
		res.status(404).send(''); return;
	}else if(!VALIDATOR.isMongoId(req.body.code)){
		res.status(400).send(''); return;
	}

	if(req.body.type=='episode'){
		if(!req.body.code2){
			res.status(404).send(''); return;
		}else if(!VALIDATOR.isMongoId(req.body.code2)){
			res.status(400).send(''); return;
		}
	}

	if(!req.body.time){
		res.status(404).send(''); return;
	}else if(!VALIDATOR.isNumeric(req.body.time)){
		res.status(400).send(''); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){ res.json({d: 2}); return; }
		
	var isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	if(!isPremiumUser){ res.json({d: 2}); return; }

	var page_type = req.body.page_type;
	var code = req.body.code;
	var code2 = req.body.code2;
	var time = req.body.time;

	var field = page_type=='movie'?'movie_id':'episode_id';
	var cody = page_type=='movie'?code:code2;

	userModel.find({_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id)})
	.limit(1)
	.select('prem_video_time')
	.exec(function(err, user){
		if(err){ res.json({d: 2}); return; }
		if(user.length==0){ res.json({d: 2}); return; }
		user = user[0];
		
		if(!user.prem_video_time){ user.prem_video_time = []; }

		var found_i = null;
		for(var i = 0; i < user.prem_video_time.length; i++){
			if(!user.prem_video_time[i][field]) continue;

			if(user.prem_video_time[i][field]==cody){
				found_i = i;
				break;
			}
		}

		if(found_i==null){
			var elm = {}
			elm[field] = cody;
			elm.time = parseInt(time);
			user.prem_video_time.push(elm);
		}else{
			user.prem_video_time.splice(found_i, 1);
			var elm = {}
			elm[field] = cody;
			elm.time = parseInt(time);
			user.prem_video_time.push(elm);
		}

		user.save(function(err){
			res.json({d: 0});
		})
	});
});

app.post('/premiumSMSCode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	PAYMENT.SMSCodeVerify(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/platnosc_wyn', function(req, res){
	PAYMENT.resTransfer(req, res, function(answer){
		if(answer.error){ res.send('FALSE'); }
		else{
			res.set('Content-Type', 'text/plain');
			res.status(200).end('OK');
		}
	});
});

app.post('/platnosc_wyn2', function(req, res){
	PAYMENT.resTransferDirectBilling(req, res, function(answer){
		if(answer.error){ res.send('FALSE'); }
		else{
			res.set('Content-Type', 'text/plain');
			res.status(200).end('OK');
		}
	});
});

app.post('/createNewPayment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	PAYMENT.newTransfer(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/createNewPaymentDirectBilling', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	PAYMENT.newTransferDirectBilling(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/user/create', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}
	
	new USER.create(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/user/login', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}
	
	new USER.login(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/user/remind', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}
	
	req.STEP = 1;

	new USER.remind(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/user/remindStep2', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}
	
	req.STEP = 3;

	new USER.remind(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/dodaj-film-serial', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	req.INJECT_DATA.page_title = 'Dodajesz film lub serial - '+req.INJECT_DATA.page_title;

	var value = req.body.name==null?'':req.body.name;

	if(typeof value!='string'){
		req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
		res.render('errors/not_expected_error', req.INJECT_DATA);
		return;
	}

	this.nnn = function(){
		FILMWEB.search(value, 0, function(err, data){
			if(err){
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}

			var movies_id = [];
			var series_id = [];

			if(data.length==0){
				req.INJECT_DATA.result = data;
				res.render('add_movie_series_step_1.pug', req.INJECT_DATA);
				return;
			}

			for(var i = 0, len = data.length; i < len; i++){
				if(data[i].type=='f') movies_id.push(parseInt(data[i].id));
				else series_id.push(parseInt(data[i].id));
			}

			ASYNC.parallel([
				function(cb){
					movieModel.find({ filmweb_id: { $in: movies_id }})
					.lean()
					.select('filmweb_id url num status')
					.exec(function(err, movies_r){
						if(err){ cb(true); return; }
						if(!movies_r){ cb(true); return; }

						if(movies_r.length>0)
							for(var i = 0, len = data.length; i < len; i++){
								for(var j = 0, len2 = movies_r.length; j < len2; j++){
									if(parseInt(data[i].id)==parseInt(movies_r[j].filmweb_id)){
										if(movies_r[j].status=='PREMIUM'){
											data[i].ban = true;
											break;
										}
										data[i].added = true;
										data[i].url = '/film/'+movies_r[j].url+'/'+movies_r[j].num;
										break;
									}
								}
							}
						cb(null);
					});
				},
				function(cb){
					seriesModel.find({ filmweb_id: { $in: series_id }})
					.lean()
					.select('filmweb_id url num status')
					.exec(function(err, series_r){
						if(err){ cb(true); return; }
						if(!series_r){ cb(true); return; }

						if(series_r.length>0)
							for(var i = 0, len = data.length; i < len; i++){
								for(var j = 0, len2 = series_r.length; j < len2; j++){
									if(parseInt(data[i].id)==parseInt(series_r[j].filmweb_id)){
										if(series_r[j].status=='PREMIUM'){
											data[i].ban = true;
											break;
										}
										data[i].added = true;
										data[i].url = '/serial/'+series_r[j].url+'/'+series_r[j].num;
										break;
									}
								}
							}
						cb(null);
					});
				},
			], function(err){
				if(err){
					req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
					res.render('errors/not_expected_error', req.INJECT_DATA);
					return;
				}
				req.INJECT_DATA.result = data;
				res.render('add_movie_series_step_1.pug', req.INJECT_DATA);
			});
		});
	}

	if(value.length>0 && VALIDATOR.isURL(value)){
			var parsed = URL.parse(value);
			if(parsed.hostname && parsed.hostname.indexOf('filmweb')!=-1){
				var splited = parsed.pathname.split('-');
				if(splited.length>0){
					var filmweb_id = splited[splited.length-1];
					if(!isNaN(filmweb_id)){
						seriesModel.find({filmweb_id: filmweb_id})
						.lean()
						.select('url status num')
						.exec(function(err, series){
							if(err){
								req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
								res.render('errors/not_expected_error', req.INJECT_DATA);
								return;
							}

							if(series.length>0){
								var series = series[0];
								if(series.status=='PUBLIC' || series.status=='WAIT' || series.status=='COPY')
									res.redirect(302, '/serial/'+series.url+'/'+series.num);
								else{
									res.render('add_movie_series_step_1_not_found', req.INJECT_DATA);
								}
							}else{
								movieModel.find({filmweb_id: filmweb_id})
								.lean()
								.select('url status num')
								.exec(function(err, movie){
									if(err){
										req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
										res.render('errors/not_expected_error', req.INJECT_DATA);
										return;
									}

									if(movie.length>0){
										var movie = movie[0];
										if(movie.status=='PUBLIC' || movie.status=='WAIT' || movie.status=='COPY')
											res.redirect(302, '/film/'+movie.url+'/'+movie.num);
										else{
											res.render('add_movie_series_step_1_not_found', req.INJECT_DATA);
										}
									}else res.redirect(302, '/dodaj-film-serial/'+filmweb_id);
								});
							}
						});
					}else this.nnn();
				}else this.nnn();
			}else this.nnn();
	}else this.nnn();
});



app.post('/user/add-movie-series', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}
	
	var type = req.body.type;
	if(type==null){
		res.json(respon); return;
	}else if(type==0){
		new MOVIE.add(req, res, function(answer){
			res.json(answer);
		});
	}else if(type==1){
		new SERIES.add(req, res, function(answer){
			res.json(answer);
		});
	}else{
		res.json(respon); return;
	}
});

app.post('/user/add-video', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}
	
	new VIDEO.add(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/user/check-video-link', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}
	
	new VIDEO.checkLink(req, res, function(answer){
		res.json(answer);
	});
});





app.post('/movie/add-links', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	MOVIE.addLink(req, res, function(answer){
		res.json(answer)
	});
});

app.post('/viewed', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	var cookies = req.cookies;
/*	var adbdotc = cookies.adbdotc;
	if(adbdotc==null){
		res.cookie('adbdotc', 1, { maxAge: 60*60*24*365*1000, httpOnly: true });
	}else{
		var value = parseInt(adbdotc, 10) || 0;
		value++;
		res.cookie('adbdotc', value, { maxAge: 60*60*24*365*1000, httpOnly: true });
	}*/

	if(req.body.code2==''){
		MOVIE.countView(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.countView(req, res, function(answer){
			res.json(answer);
		});
	}
});

app.post('/viewed/movie_episode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(!req.body.code2){
		MOVIE.setViewed(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.setViewed(req, res, function(answer){
			res.json(answer);
		});
	}
});


app.post('/user/fav-series', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	USER.setFavSeries(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/user/fav-movie', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	USER.setFavMovie(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/acceptLinkSeriesMovie', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.acceptLink(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/api/edit-poster', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.editPoster(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/report-link', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(!req.body && req.body.type2){ res.json(respon); return; }
	if(req.body.type2==0){
		MOVIE.reportLink(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.reportLink(req, res, function(answer){
			res.json(answer);
		});
	}
});


app.post('/edit-link', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	if(!req.body && req.body.type2){ res.json(respon); return; }
	if(req.body.type2==0){
		MOVIE.editLink(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.editLink(req, res, function(answer){
			res.json(answer);
		});
	}
});

app.post('/edit-name-episode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.editNameEpisode(req, res, function(answer){
		res.json(answer);
	});
});



app.post('/series/addEpisode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	SERIES.addEpisode(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/series/report-episode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	SERIES.reportEpisode(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/series/add-links', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	SERIES.addLink(req, res, function(answer){
		res.json(answer)
	});
});


app.post('/series/add-links-import', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.o_login && req.INJECT_DATA.user_status.data.o_key){
		SERIES.addLinkIMPORT(req, res, function(answer){
			res.json(answer)
		});
	}else{
		SERIES.addLink(req, res, function(answer){
			res.json(answer)
		});
	}
});

app.post('/series/add-links-mass', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		respon.code=1;
		respon.msg='Zapytanie wykonane ze złej domeny.';
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	SERIES.addLinksMass(req, res, function(answer){
		res.json(answer)
	});
});


app.post('/delLink', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.delLink(req, res, function(answer){
		res.json(answer);
	});

});



app.post('/addComment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.body.type=='episode'){
		SERIES.addComment(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type=='movie'){
		MOVIE.addComment(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type=='video'){
		VIDEO.addComment(req, res, function(answer){
			res.json(answer);
		});
	}else{
		res.json(respon); return;
	}
});


app.post('/vote-comment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.body.type2=='episode'){
		SERIES.voteComment(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type2=='movie'){
		MOVIE.voteComment(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type2=='video'){
		VIDEO.voteComment(req, res, function(answer){
			res.json(answer);
		});
	}else{
		res.json(respon); return;
	}
});


app.post('/search', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	UTILS.searchMoviesSeries(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/api/change-desc', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	if(!req.body.type){ res.json(respon); return; }

	if(req.body.type==0){
		MOVIE.changeDesc(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type==1){
		SERIES.changeDesc(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type==2){
		SERIES.changeEpisodeDesc(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type==3){
		VIDEO.changeDesc(req, res, function(answer){
			res.json(answer);
		});
	}else res.json(respon); return;
});

app.post('/api/change-title', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	if(req.body.type==0){
		MOVIE.changeTitle(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.changeTitle(req, res, function(answer){
			res.json(answer);
		});
	}
});

app.post('/api/lock-movie', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	MOVIE.lock(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/api/change-title-org', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	if(req.body.type==0){
		MOVIE.changeTitleOrg(req, res, function(answer){
			res.json(answer);
		});
	}else{
		SERIES.changeTitleOrg(req, res, function(answer){
			res.json(answer);
		});
	}
});

app.post('/panel/delete-links-by-user', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.deleteLinksByUser(req, res, function(answer){
		res.json(answer);
	});

});

app.post('/panel/accept-movie', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	MOVIE.accept(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/delete-movie', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	MOVIE.delete(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/set-series-premium', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.setPremium(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/set-movie-premium', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	MOVIE.setPremium(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/accept-video', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	VIDEO.accept(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/delete-video', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}


	VIDEO.delete(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/panel/accept-series', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.accept(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/delete-series', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.delete(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/panel/accept-episode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.acceptEpisode(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/delete-episode', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.deleteEpisode(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/accept-link', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.acceptLink(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/delete-link', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.deleteLink(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/api/hidePremiumMessage1', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	UTILS.hidePremiumMessage1(req, res, function(answer){
		res.json(answer);
	});
});



app.post('/panel/change-link-type', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.changeLinkType(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/change-link-quality', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.changeLinkQuality(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/accept-comment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.acceptComment(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/panel/delete-comment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.deleteComment(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/panel/flag-comment', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.flagComment(req, res, function(answer){
		res.json(answer);
	});
});


app.post('/change-avatar', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	USER.changeAvatar(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/embed', function(req, res){
	if(req.body.sckey==null){ res.status(400).send('Wystapił błąd.'); return; }
	if(req.body.scvalue==null){ res.status(400).send('Wystapił błąd.'); return; }
	if(req.body.scvalue2==null){ res.status(400).send('Wystapił błąd.'); return; }

	var IP = getIP(req);

	sweetcaptcha.api('check', {sckey: req.body.sckey, scvalue: req.body.scvalue}, function(err, response){
		if(err){ res.status(400).send('Wystapił błąd.'); return; }

		if(response === 'true'){
			linkLogsModel.find({ ip: IP })
			.limit(1)
			.exec(function(err, log){
				if(err){ res.status(400).send('Wystapił błąd.'); return; }
				if(log.length==0){ res.status(400).send('Wystapił błąd.'); return; }

				log = log[0];

				log.captcha = false;
				log.times = 0;
				log.first_get = new Date().toISOString();
				log.save(function(err){
					if(err){ res.status(400).send('Wystapił błąd.'); return; }
					res.redirect(req.get('referer'));
				});
			});
			return;
		}

		res.redirect(req.get('referer'));
	});
});

app.post('/captchaResponse', function(req, res){
	var respon = { error: true, code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.body.response==null){ res.json(respon); return; }

	var post_data = QUERYSTRING.stringify({
		secret : RECAPTCHA_SITE_SECRET,
		response : req.body.response
	});

	var post_options = {
		host: 'www.google.com',
		path: '/recaptcha/api/siteverify',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	}

	var IP = getIP(req);

	var post_req = HTTPS.request(post_options, function(answer) {
		answer.setEncoding('utf8');
		answer.on('error', function(err){
			res.json(respon); return;
		});
		answer.on('data', function(chunk){
			var respo = JSON.parse(chunk);

			if(!respo.success){ res.json(respon); return; }
			
			linkLogsModel.find({ ip: IP })
			.limit(1)
			.exec(function(err, log){
				if(err){ res.json(respon); return; }
				if(log.length==0){
					var respon = { error: false }
					res.json(respon);
					return;
				}
				log = log[0];

				log.captcha = false;
				log.times = 0;
				log.first_get = new Date().toISOString();
				log.save(function(err){
					if(err){ res.json(respon); return; }
					var respon = { error: false}
					res.json(respon);
				});
			});
		});
	});
	post_req.on('error', function(err){
		var respon = { error: true, code: 2, msg: 'Nie możemy połączyć się z google recaptcha. Spróbuj ponownie za kilka minut.' }
		res.json(respon); return;
	});
	post_req.write(post_data);
  	post_req.end();
});

app.post('/filmweb/getEpisodes', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	var url = req.body.url;

	if(url==null){
		var respon = { code: 1, error: true, msg: 'Uzupełnij link' }
		res.json(respon); return;
	}

	if(!VALIDATOR.isURL(url)){
		var respon = { code: 1, error: true, msg: 'Link nie jest poprawany!' }
		res.json(respon); return;
	}

	FILMWEB.getEpisodes(url, function(err, data){
		if(err){ res.json(respon); return; }

		//data.reverse();

		respon = { error: false, data: data }

		res.json(respon);
	});
});

app.post('/panel/import/getEpisodes', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.getEpisodesImport(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/panel/import/getLinks', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	UTILS.getLinksImport2(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/series/addEpisodesFilmweb', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		var respon = { code: 1, error: true, msg: 'Brak uprawnień!' }
		res.json(respon); return;
	}

	SERIES.addEpisodesFilmweb(req, res, function(answer){
		res.json(answer);
	});
});

app.post('/user/vote', function(req, res){
	var respon = { code: 2, msg: 'Wystąpił błąd.' }
	if(req.INJECT_DATA.badOrigin){
		res.json(respon); return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		var respon = { code: 3, error: true }
		res.json(respon); return;
	}

	if(req.body.type=='series'){
		SERIES.voteStar(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type=='movie'){
		MOVIE.voteStar(req, res, function(answer){
			res.json(answer);
		});
	}else if(req.body.type=='video'){
		VIDEO.voteStar(req, res, function(answer){
			res.json(answer);
		});
	}else{
		res.json(respon); return;
	}
});

app.post('/api/add-links-upload', function(req, res){
	var IP = getIP(req);
	
	if(IP!='54.36.109.213'){ res.status(401).end('Uunauthorized'); return; }

	let links = req.body;

	let usersList = [
		'5b626ac3d134574cc877b611', //Mercy
		'5b626af9d134574cc877b613', //Kattatol
		'5b626b23d134574cc877b618', //Hum9921
		'5b626b99cfaef94cd8e0402f', //10Szum
		'5b626bb6151bb94cdea6d829', //Crank
	]

	let selectedUser = usersList[Math.floor(Math.random()*(usersList.length))];

	if(links.length==0){ res.json({status: 'ERROR', msg: '0 links'}); return; }

	ASYNC.eachSeries(links, (link, cb) => {
		if(link.hosting=='rapidvideo') selectedUser = '5d43444bfaf1393c73b64545';

		if(link.video_type=='episode'){
			episodeModel.find({_id: MONGO.Types.ObjectId(link._id)})
			.populate({
				path: 'links',
				select: 'quality hosting type',
			})
			.select('links series_id')
			.exec(function(err, episode){
				if(err){ cb('Internal Error'); return; }
				if(episode.length==0){ cb('Episode Not Found'); return; }
				episode = episode[0];

				linkModel.countDocuments({ $and: [{video_id: link.video_id}, {hosting: link.hosting}] })
				.exec(function(err, num){
					if(err){ cb('Internal Error'); return; }
					if(num>0){ cb('Link already exist'); return; }

					var premk = false;
					if(link.hosting=='premium') premk = true;
					if(link.hosting=='rapidvideo') premk = true;

					var query = {
						_id : MONGO.Types.ObjectId(),
						type : link.type,
						quality : link.quality,
						hosting : link.hosting,
						video_id : link.video_id,
						status : 'PUBLIC',
						user : MONGO.Types.ObjectId(selectedUser),
						ip : '217.182.200.143',
						premium : premk,
						last_check : MOMENT("2000-01-01T00:00").toISOString(),
						series_id : MONGO.Types.ObjectId(episode.series_id),
						episode_id : MONGO.Types.ObjectId(episode._id),
					}

					linkModel.create(query, function(err, list){
						if(err){ cb('Internal Error'); return; }
						
						if(!episode.links) episode.links = [];

						var en_link_id = list._id;

						episode.links.push(MONGO.Types.ObjectId(en_link_id));

						episode.save(function(err){
							if(err){ cb('Internal Error'); return; }

							userModel.update({ _id: MONGO.Types.ObjectId(selectedUser) }, { last_activity: new Date().toISOString() }, function(err){});
							
							cb();
						});
					});
				});
			});
		}else if(link.video_type=='movie'){
			movieModel.find({_id: MONGO.Types.ObjectId(link._id)})
			.populate({
				path: 'links',
				select: 'quality hosting type',
			})
			.select('links')
			.exec(function(err, movie){
				if(err){ cb('Internal Error'); return; }
				if(movie.length==0){ cb('Movie Not Found'); return; }
				movie = movie[0];

				linkModel.countDocuments({ $and: [{video_id: link.video_id}, {hosting: link.hosting}] })
				.exec(function(err, num){
					if(err){ cb('Internal Error'); return; }
					if(num>0){ cb('Link already exist'); return; }

					var premk = false;
					if(link.hosting=='premium') premk = true;
					if(link.hosting=='rapidvideo') premk = true;

					var query = {
						_id : MONGO.Types.ObjectId(),
						type : link.type,
						quality : link.quality,
						hosting : link.hosting,
						video_id : link.video_id,
						status : 'PUBLIC',
						user : MONGO.Types.ObjectId(selectedUser),
						ip : '217.182.200.143',
						premium : premk,
						last_check : MOMENT("2000-01-01T00:00").toISOString(),
						movie_id : MONGO.Types.ObjectId(movie._id),
					}

					/*if(premk){
						query.report_desc = 'Nowy link premium.';
						query.report = 'OTHER';
					}*/

					linkModel.create(query, function(err, list){
						if(err){ cb('Internal Error'); return; }
						
						if(!movie.links) movie.links = [];

						var en_link_id = list._id;

						movie.links.push(MONGO.Types.ObjectId(en_link_id));

						movie.save(function(err){
							if(err){ cb('Internal Error'); return; }

							userModel.update({ _id: MONGO.Types.ObjectId(selectedUser) }, { last_activity: new Date().toISOString() }, function(err){});

							cb();
						});
					});
				});
			});
		}else cb();
	}, function(err){
		if(err){ res.json(err); return; }
		res.json({status: 'OK'});
	});
});









