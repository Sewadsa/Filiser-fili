var show404 = function(req, res){
	if(req.url.indexOf('/assets/')!=-1 || req.url.indexOf('/uploads/')!=-1){
		res.status(404).send('Not Found');
		return;
	}

	req.INJECT_DATA.page_title = 'Ops... Strona nie została znaleziona - filiser filmy i seriale online';
	res.status(404).render('errors/404', req.INJECT_DATA);
}

var show410 = function(req, res){
	req.INJECT_DATA.page_title = 'Ops... Strona została usunięta lub przeniesiona - filiser filmy i seriale online';
	res.status(410).render('errors/410', req.INJECT_DATA);
}

var show400 = function(req, res){
	req.INJECT_DATA.page_title = 'Ops... Wystąpił błąd - filiser filmy i seriale online';
	res.status(400).render('errors/400', req.INJECT_DATA);
}

var show401 = function(req, res){
	req.INJECT_DATA.page_title = 'Ops... Wystąpił błąd - filiser filmy i seriale online';
	res.status(401).render('errors/401', req.INJECT_DATA);
}

app.get('*', function(req, res, next){
	req.INJECT_DATA = {};
	req.INJECT_DATA.page_title = 'Fili.cc - filiser filmy i seriale online';
	req.INJECT_DATA.absolute_url = req.protocol+'://'+req.get('host')+req.originalUrl;
	req.INJECT_DATA.page_desc = DEFAULT_PAGE_DESC;
	req.INJECT_DATA.page_keywords = DEFAULT_PAGE_KEYWORDS;
	req.INJECT_DATA.page_image_url = '';

	req.INJECT_DATA.google_index = true;

	req.INJECT_DATA.isBot = false;
	var agent = req.get('User-Agent');
	if(agent){
		for(var i = 0, len = CRAWLER_LIST.length; i < len; i++){
			if(agent.indexOf(CRAWLER_LIST[i])!=-1){
				req.INJECT_DATA.isBot = true;
				break;
			}
		}
	}


	if(MAINTAINCE){
		res.set('Cache-Control', 'public, no-cache');
		res.status(503).send('Przerwa techniczna. Zaraz wracamy.');
		return;
	}

	if(!mongoConnected){
		res.set('Cache-Control', 'public, no-cache');
		res.status(503).send('Wystąpił problem z bazą danych. Zaraz wracamy.');
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

	if(req.query.modal){
		req.INJECT_DATA.open_modal = req.query.modal;
	}

	var cookies = req.cookies;
	var speed = cookies.speed;

	if(!speed){
		req.INJECT_DATA.speed_test = true;
	}

	req.INJECT_DATA.device = null;

	if(req.url.indexOf('/assets/')==0 || req.url.indexOf('/uploads/')==0 || req.url.indexOf('/ads/')==0){
		req.INJECT_DATA.user_status = {code: 1};
		next();
	}else{
		req.INJECT_DATA.ali = false;

		var ali = req.cookies.ali;
		
		if(!ali){
			res.cookie('ali', true, { maxAge: 60*60*24*7*1*1000, httpOnly: true });
			req.INJECT_DATA.ali = true;
		}
		
		req.INJECT_DATA.device = req.device.type;
		req.INJECT_DATA.is_mobile = req.INJECT_DATA.device=='phone' || req.INJECT_DATA.device=='tablet';

		if(req.INJECT_DATA.device=='bot'){
			var usr_agent = req.get('User-Agent');
			if(usr_agent && usr_agent.indexOf('Android')!=-1){
				req.INJECT_DATA.is_mobile = true;
			}
		}

		var ipz = getIP(req);

		USER.getStatus(req, res, function(r){
			req.INJECT_DATA.user_status = r;

			var isPremiumUser = false;
			var isModAdmin = false;
			if(req.INJECT_DATA.user_status.code==3){
				isPremiumUser = req.INJECT_DATA.user_status.data.premium;
				isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
			}


			if(!isModAdmin && !isPremiumUser && req.INJECT_DATA.device!='bot' && IP_GEO!=null){
				var code = ipToCountryCode(ipz);

				req.INJECT_DATA.country_code = code;

				if(RESTRICTED_COUNTRIES.indexOf(code)!=-1){ res.render('restriction', req.INJECT_DATA); return; }
				else next();
			}else next();
		});
	}
});


app.get('/', function(req, res){
	var isPremiumUser = false;
	if(req.INJECT_DATA.user_status.code==3){
		isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	}

	var isModAdmin = false;
	if(req.INJECT_DATA.user_status.code==3){
		isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
	}

	var q = { $or: [{ status: 'PUBLIC' }] }
	if(isPremiumUser || isModAdmin){
		q = { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] }
	}

	ASYNC.parallel({
		new_movies: function(cb){
			movieModel.find({ $and: [q, { links: { $ne: [] } }, { ver: { $gt: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(12)
			.sort({ update_date: -1 })
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				cb(null, movies);
			});
		},
		new_series: function(cb){
			seriesModel.find({ $and: [q, { episodes: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(12)
			.sort({ update_date: -1 })
			.populate({
				path: 'new_status.episode',
				select: 'episode_num season_num url num episode_num_alter'
			})
			.exec(function(err, series){
				if(err){ cb(true); return; }
				cb(null, series);
			});
		},
/*		fav_series: function(cb){
			if(req.INJECT_DATA.user_status.code==3){
				USER.getFavSeries(req, function(err, fav_series){
					if(err){ cb(true); return; }
					cb(null, fav_series);
				});
			}else cb(null, []);
		},*/
		random_series: function(cb){
			seriesModel.find({ $and: [q, { episodes: { $ne: [] } }] })
			.lean()
			.select('num title title_org poster date url')
			.limit(4)
			.sort({ drawn_num: -1 })
			.exec(function(err, series){
				if(err){ cb(true); return; }
				cb(null, series);
			});
		},
		random_movies: function(cb){
			movieModel.find({ $and: [q, { links: { $ne: [] } }] })
			.lean()
			.select('num title title_org poster date url')
			.limit(9)
			.sort({ drawn_num: -1 })
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				cb(null, movies);
			});
		},
		popular_movies_day: function(cb){
			movieModel.find({ $and: [q, { links: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(32)
			.sort({ viewed_day: -1 })
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				cb(null, movies);
			});
		},
		popular_movies_week: function(cb){
			movieModel.find({ $and: [q, { links: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(20)
			.sort({ viewed_week: -1 })
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				cb(null, movies);
			});
		},
		popular_movies_month: function(cb){
			movieModel.find({ $and: [q, { links: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(10)
			.sort({ viewed_month: -1 })
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				cb(null, movies);
			});
		},
		popular_series_day: function(cb){
			seriesModel.find({ $and: [q, { episodes: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(32)
			.sort({ viewed_day: -1 })
			.populate({
				path: 'new_status.episode',
				select: 'episode_num season_num url num episode_num_alter'
			})
			.exec(function(err, series){
				if(err){ cb(true); return; }
				cb(null, series);
			});
		},
		popular_series_week: function(cb){
			seriesModel.find({ $and: [q, { episodes: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(20)
			.sort({ viewed_week: -1 })
			.populate({
				path: 'new_status.episode',
				select: 'episode_num season_num url num episode_num_alter'
			})
			.exec(function(err, series){
				if(err){ cb(true); return; }
				cb(null, series);
			});
		},
		popular_series_month: function(cb){
			seriesModel.find({ $and: [q, { episodes: { $ne: [] } }] })
			.lean()
			.select('num title title_org year rate poster url new_status update_date date genres')
			.limit(10)
			.sort({ viewed_month: -1 })
			.populate({
				path: 'new_status.episode',
				select: 'episode_num season_num url num episode_num_alter'
			})
			.exec(function(err, series){
				if(err){ cb(true); return; }
				cb(null, series);
			});
		},
	}, function(err, results){
		if(err){ res.status(500).render('errors/not_expected_error', req.INJECT_DATA); return; }

		if(req.query.status&&req.query.orderID){
			req.INJECT_DATA.pay_result = req.query.status;
		}
		req.INJECT_DATA.new_movies = results.new_movies;
		req.INJECT_DATA.new_series = results.new_series;
		req.INJECT_DATA.random_series = results.random_series;
		req.INJECT_DATA.random_movies = results.random_movies


		var popular_movies_day = results.popular_movies_day;
		var popular_movies_week = results.popular_movies_week;
		var popular_movies_month = results.popular_movies_month;

		for(var i = 0; i < popular_movies_month.length; i++){
			for(var j = 0; j < popular_movies_week.length; j++){
				if(String(popular_movies_month[i]._id)==String(popular_movies_week[j]._id)){
					popular_movies_week.splice(j, 1);
					j--;
				}
			}

			for(var j = 0; j < popular_movies_day.length; j++){
				if(String(popular_movies_month[i]._id)==String(popular_movies_day[j]._id)){
					popular_movies_day.splice(j, 1);
					j--;
				}
			}
		}

		for(var i = 0; i < popular_movies_week.length; i++){
			for(var j = 0; j < popular_movies_day.length; j++){
				if(String(popular_movies_week[i]._id)==String(popular_movies_day[j]._id)){
					popular_movies_day.splice(j, 1);
					j--;
				}
			}
		}

		var hpm = [
			['day1', popular_movies_day.slice(0, 10)],
			['day7', popular_movies_week.slice(0, 10)],
			['day30', popular_movies_month.slice(0, 10)],
		]

		req.INJECT_DATA.hpm = hpm;

		var popular_series_day = results.popular_series_day;
		var popular_series_week = results.popular_series_week;
		var popular_series_month = results.popular_series_month;

		for(var i = 0; i < popular_series_month.length; i++){
			for(var j = 0; j < popular_series_week.length; j++){
				if(String(popular_series_month[i]._id)==String(popular_series_week[j]._id)){
					popular_series_week.splice(j, 1);
					j--;
				}
			}

			for(var j = 0; j < popular_series_day.length; j++){
				if(String(popular_series_month[i]._id)==String(popular_series_day[j]._id)){
					popular_series_day.splice(j, 1);
					j--;
				}
			}
		}

		for(var i = 0; i < popular_series_week.length; i++){
			for(var j = 0; j < popular_series_day.length; j++){
				if(String(popular_series_week[i]._id)==String(popular_series_day[j]._id)){
					popular_series_day.splice(j, 1);
					j--;
				}
			}
		}


		var hps = [
			['day1', popular_series_day.slice(0, 10)],
			['day7', popular_series_week.slice(0, 10)],
			['day30', popular_series_month.slice(0, 10)],
		]

		req.INJECT_DATA.hps = hps;
		
		res.render('home', req.INJECT_DATA);
	});
});

app.get('/filmiki', function(req, res){
	show404(req, res);
	return;
	req.INJECT_DATA.page_title = 'Filmiki - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz wszystkie filmiki dostępne w fili.cc, które możesz sortować według daty dodania, wyświetleń oraz oceny.';

	VIDEO.getBy(req, res, function(answer){
		if(answer.error){
			if(answer.code==2){
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}else{
				if(answer.data) res.redirect(302, answer.data);
				else res.redirect(302, '/filmiki');
				return;
			}
		}

		req.INJECT_DATA.videos = answer.data.videos;
		req.INJECT_DATA.status = answer.data.status;
		res.render('videos', req.INJECT_DATA);
	});
});

app.get('/filmy', function(req, res){
	req.INJECT_DATA.page_title = 'Filmy - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz wszystkie filmy dostępne w fili.cc, które możesz sortować według daty dodania, wyświetleń oraz oceny.';

	MOVIE.getBy(req, res, function(answer){
		if(answer.error){
			if(answer.code==2){
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}else{
				if(answer.data) res.redirect(302, answer.data);
				else res.redirect(302, '/filmy');
				return;
			}
		}

		var movies = answer.data.movies;

		req.INJECT_DATA.movies = movies;
		req.INJECT_DATA.status = answer.data.status;
		res.render('movies', req.INJECT_DATA);
	});
});

app.get('/seriale', function(req, res){
	req.INJECT_DATA.page_title = 'Seriale - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz wszystkie seriale dostępne w fili.cc, które możesz sortować według daty dodania, wyświetleń oraz oceny.';

	SERIES.getBy(req, res, function(answer){
		if(answer.error){
			if(answer.code==2){
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}else{
				if(answer.data) res.redirect(302, answer.data);
				else res.redirect(302, '/wszystkie-seriale');
				return;
			}
		}

		var series = answer.data.series;

		req.INJECT_DATA.series = series;
		req.INJECT_DATA.status = answer.data.status;
		res.render('series2', req.INJECT_DATA);
	});
});

app.get('/premium', function(req, res, next){
	req.INJECT_DATA.google_index = false;
	if(req.INJECT_DATA.user_status.code!=3){
		res.render('premium_not_logged', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}
	
	res.render('premium', req.INJECT_DATA);
});

app.get('/anime', function(req, res){
	req.INJECT_DATA.page_title = 'Anime - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz wszystkie anime dostępne w fili.cc, które możesz sortować według daty dodania, wyświetleń oraz oceny.';
	show404(req, res);
});


app.get('/faq', function(req, res){
	req.INJECT_DATA.page_title = 'Często zadawane pytania - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz odpowiedzi na najczęsciej zadawane pytania.';

	res.render('faq', req.INJECT_DATA);
});

app.get('/search.xml', function(req, res){

	var obj = {
		OpenSearchDescription: [
			{ _attr: { xmlns: 'http://a9.com/-/spec/opensearch/1.1/', 'xmlns:moz': 'http://www.mozilla.org/2006/browser/search/' } },
			{ ShortName: HOSTNAME },
			{ Description: 'baza filmów, filmików i seriali online' },
			{ InputEncoding: 'UTF-8' },
			{ ShortName: HOSTNAME },
			{
				Image: [ { _attr: { width: '16', height: '16', type: 'image/x-icon' } }, BASE_URL+'/assets/img/favicon/favicon-96x96.png' ]
			},
			{
				Url: [ { _attr: { type: 'application/x-suggestions+json', method: 'GET', template: 'http://suggestqueries.google.com/complete/search?output=firefox&amp;q={searchTerms}' } } ]
			},
			{
				Url: [ { _attr: { type: 'text/html', method: 'GET', template: BASE_URL+'/szukaj?q={searchTerms}' } } ]
			},
			{ SearchForm: BASE_URL },
		]
	}

	res.send(XML(obj));
});

app.get('/szukaj', function(req, res){
	req.INJECT_DATA.page_title = req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz wszystkie filmy oraz seriale dostępne w fili.cc. Wystarczy wpisać interesującą Cię fraze, aby odnaleść to czego szukasz.';

	if(!req.query){
		res.redirect(302, '/');
		return;
	}

	if(!req.query.q){
		res.redirect(302, '/');
		return;
	}

	UTILS.searchMoviesSeries(req, res, function(answer){
		if(answer.error){
			req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
			res.render('errors/not_expected_error', req.INJECT_DATA);
			return;
		}
		req.INJECT_DATA.data = answer.data;
		res.render('search_results', req.INJECT_DATA);
	});
});

app.get('/ulubione', function(req, res){
	req.INJECT_DATA.page_title = req.INJECT_DATA.page_title;
	req.INJECT_DATA.page_desc = 'Na tej stronie znajdziesz twoje ulubione filmy i seriale.';


	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	ASYNC.parallel({
		series: function(cb){
			USER.getFavSeries(req, function(err, fav_series){
				if(err){ cb(true); return; }
				cb(null, fav_series);
			});
		},
		movies: function(cb){
			USER.getFavMovies(req, function(err, fav_movies){
				if(err){ cb(true); return; }
				cb(null, fav_movies);
			});
		},
	}, function(err, results){
		if(err){
			req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
			res.render('errors/not_expected_error', req.INJECT_DATA);
			return;
		}

		req.INJECT_DATA.fav_series = results.series;
		req.INJECT_DATA.fav_movies = results.movies;
		res.render('fav_series_movies', req.INJECT_DATA);

	});
});


app.get('/user/:name', function(req, res){
	var name = req.params.name;

	USER.getUserByName(name, function(answer){
		if(answer.error){
			if(answer.code==1){
				res.redirect(302, '/'); return;
			}else{
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}
		}

		var user = answer.data;

		req.INJECT_DATA.page_title = ENTITIES.decode(user.username)+' - '+req.INJECT_DATA.page_title;
		req.INJECT_DATA.page_desc = 'Profil użytkownika '+ENTITIES.decode(user.username);
		req.INJECT_DATA.page_keywords = DEFAULT_PAGE_KEYWORDS+',użytkownik,user,'+ENTITIES.decode(user.username);

		var avatar_url = user.avatar200==''?BASE_URL+'/assets/img/default_avatar.jpg':BASE_URL+user.avatar200;
		req.INJECT_DATA.page_image_url = avatar_url;

		ASYNC.parallel({
			movies: function(cb){
				USER.getMoviesdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
			series: function(cb){
				USER.getSeriesdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
			movies_count: function(cb){
				USER.countMoviesdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
			series_count: function(cb){
				USER.countSeriesdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
			episodes_count: function(cb){
				USER.countEpisodesdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
			links_count: function(cb){
				USER.countLinksdAddedByUser(user._id, function(answer){
					if(answer.error){
						cb(true); return;
					}
					cb(null, answer.data);
				});
			},
		}, function(err, result){
			if(err){
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
				return;
			}
			req.INJECT_DATA.user = user;
			req.INJECT_DATA.movies = result.movies;
			req.INJECT_DATA.series = result.series;
			req.INJECT_DATA.movies_count = result.movies_count;
			req.INJECT_DATA.series_count = result.series_count;
			req.INJECT_DATA.episodes_count = result.episodes_count;
			req.INJECT_DATA.links_count = result.links_count;
			res.render('user', req.INJECT_DATA);
		});
	});
});

app.get('/edit-poster', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}
	
	var _id = req.query.id;
	var type = req.query.type;

	req.INJECT_DATA._id = _id;
	req.INJECT_DATA.type = type;

	res.render('edit_poster', req.INJECT_DATA);
});

app.get('/aktywacja', function(req, res){
	req.INJECT_DATA.page_title = 'Aktywacja konta - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	
	new USER.activate(req, res, function(answer){
		req.INJECT_DATA.data = answer;
		res.render('activate', req.INJECT_DATA);
	});
});

app.get('/zmiana-hasla', function(req, res){
	req.INJECT_DATA.page_title = 'Zmiana hasła - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.data = { error: false }

	req.STEP = 2;

	new USER.remind(req, res, function(answer){
		req.INJECT_DATA.data = answer;
		res.render('remind_step_2', req.INJECT_DATA);
	});
});

app.get('/wyloguj', function(req, res){
	res.cookie('log', '', { maxAge: 0, httpOnly: true });
	res.redirect('/');
});


app.get('/dmca', function(req, res){
	req.INJECT_DATA.page_title = 'DMCA - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	res.render('infringements', req.INJECT_DATA);
});

app.get('/polityka-prywatnosci', function(req, res){
	req.INJECT_DATA.page_title = 'Polityka Prywatności - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	res.render('privacy_policy', req.INJECT_DATA);
});

app.get('/regulamin', function(req, res){
	req.INJECT_DATA.page_title = 'Regulamin - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	res.render('rules', req.INJECT_DATA);
});

app.get('/kontakt', function(req, res){
	req.INJECT_DATA.page_title = 'Kontakt - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	res.render('contact', req.INJECT_DATA);
});

app.get('/hostingi', function(req, res){
	req.INJECT_DATA.page_title = 'Obsługiwane hostingi - '+req.INJECT_DATA.page_title;
	req.INJECT_DATA.google_index = false;
	res.render('hosts', req.INJECT_DATA);
});


app.get('/dodaj-filmik', function(req, res){
	show404(req, res);
	return;
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	res.render('add_video', req.INJECT_DATA);
});


app.get('/dodaj-film-serial/:id', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	FILMWEB.getFullInfoById(req.params.id, function(err, data){
		if(err){
			req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
			res.render('errors/not_expected_error', req.INJECT_DATA);
			return;
		}
		req.INJECT_DATA.result = data;
		//req.INJECT_DATA.zepto = true;



		if(data.imagePath!=''){
			var ext = PATH.extname(data.imagePath);
			var name = SHORT_ID.generate();
			var filename = name+ext;

			downloadImage(data.imagePath, PATH.join(PUBLIC_PATH, 'uploads/tmp/'+filename), function(answer){
				if(answer){
					req.INJECT_DATA.result.imagePathDown = '/uploads/tmp/'+filename;
				}
				res.render('add_movie_series_step_2', req.INJECT_DATA);
			}, true);
		}else res.render('add_movie_series_step_2', req.INJECT_DATA);
	});
});

app.get('/dodaj-film-recznie', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}
	req.INJECT_DATA.type = 0;
	//req.INJECT_DATA.zepto = true;
	res.render('add_movie_series_manual', req.INJECT_DATA);
});

app.get('/dodaj-serial-recznie', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}
	req.INJECT_DATA.type = 1;
	//req.INJECT_DATA.zepto = true;
	res.render('add_movie_series_manual', req.INJECT_DATA);
});


app.get('/film/:url/:num', function(req, res){
	MOVIE.getByUrl(req, res, function(answer){
		if(answer.error){
			if(answer.code==3){
				res.redirect(301, answer.data);
			}else if(answer.code==4){
				show410(req, res);
			}else if(answer.code==5){
				show404(req, res);
			}else{
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
			}
			return;
		}

		var movie = answer.data[0];
		var movies = answer.data[1]?answer.data[1]:[];

		if(movie.votes_count && movie.votes_count>30){
			req.INJECT_DATA.aggregateRatingRate = Math.round(movie.rate * 10)/10;
			req.INJECT_DATA.aggregateRatingRateCount = movie.votes_count;

			var name = '';

			if(movie.title==movie.title_org) name = movie.title;
			else name = movie.title+' / '+movie.title_org;

			req.INJECT_DATA.aggregateRatingName = name;
			req.INJECT_DATA.aggregateRatingPoster = BASE_URL+movie.poster;
		}

		req.INJECT_DATA.movies = movies;

		if(movie.title==movie.title_org){
			req.INJECT_DATA.page_title = ENTITIES.decode(movie.title+' ('+movie.year+') - '+req.INJECT_DATA.page_title);
		}else{
			req.INJECT_DATA.page_title = ENTITIES.decode(movie.title+' / '+movie.title_org+' ('+movie.year+') - '+req.INJECT_DATA.page_title);
		}

		req.INJECT_DATA.page_desc = movie.desc;
		req.INJECT_DATA.page_keywords = movie.keywords?ENTITIES.decode(movie.keywords.join(',')):req.INJECT_DATA.page_keywords;
		req.INJECT_DATA.page_image_url = BASE_URL+movie.poster;

		var linkByType = {};

		var linksNotSorted = null;
		var links = [];

		var count = 0;

		var isModAdmin = false;

		if(req.INJECT_DATA.user_status.code==3)
			isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR"

		if(movie.links)
			count = movie.links.length;

		var commentsCount = 0;
		isOwnComment = false;

		for(var i = 0; i < movie.comments.length; i++){
			if(req.INJECT_DATA.user_status.code==3 && movie.comments[i]){
				isOwnComment = String(movie.comments[i].user._id) == String(req.INJECT_DATA.user_status.data._id);
			}
			if((movie.comments[i] && movie.comments[i].status!='HIDE_WAIT') || isModAdmin || isOwnComment) commentsCount++;
			else{
				movie.comments.splice(i, 1);
				i--;
			}
		}

		movie.comments.sort(function(a, b) { return b.date - a.date });

		req.INJECT_DATA.commentsCount = commentsCount;

		if(req.INJECT_DATA.user_status.code==3){
			if(movie.fav_users){

				for(var i = 0, len = movie.fav_users.length; i < len; i++){
					if(String(movie.fav_users[i])==String(req.INJECT_DATA.user_status.data._id)){
						req.INJECT_DATA.isMovieFav = true;
						break;
					}
				}
			}
		}
	
		if(count>0){
			var isPremiumUser = false;
			if(req.INJECT_DATA.user_status.code==3){
				isPremiumUser = req.INJECT_DATA.user_status.data.premium;
			}

			let usersList = [
				'59d171998447c35808cc3ada', // YUIUMI
				'5b626ac3d134574cc877b611', //Mercy
				'5b626af9d134574cc877b613', //Kattatol
				'5b626b23d134574cc877b618', //Hum9921
				'5b626b99cfaef94cd8e0402f', //10Szum
				'5b626bb6151bb94cdea6d829', //Crank
			]

			linksNotSorted = movie.links;

			for(var j = 0, len2 = linksNotSorted.length; j < len2; j++){

				var downl_data = {
					video_type: 'movie',
					_id: movie._id,
					title_org: movie.title_org,
					year: movie.year,
					quality: linksNotSorted[j].quality,
					type: linksNotSorted[j].type,
					hosting: linksNotSorted[j].hosting,
					video_id: linksNotSorted[j].video_id,
				}
				var zr = JSON.stringify(downl_data);
				linksNotSorted[j].downl_data = zr;
			}

			for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++){
				for(var j = 0, len2 = linksNotSorted.length; j < len2; j++){
					if(VIDEO_QUALITY_LIST[i][0]==linksNotSorted[j].quality){
						links.push(linksNotSorted[j]);
					}
				}
			}

			/*var adminLinks = [];
			for(var i = 0; i < links.length; i++){
				if(usersList.includes(String(links[i].user._id)) && links[i].quality=='HIGH'){
					adminLinks.push(links[i]);
					links.splice(i, 1);
					i--;
				}
			}
			for(var i = 0; i < adminLinks.length; i++){
				links.unshift(adminLinks[i]);
			}*/

			var prem = [];
			for(var i = 0; i < links.length; i++){
				if(links[i].premium && links[i].hosting=='premium'){
					var nue = JSON.parse(JSON.stringify(links[i]));
					var nue2 = JSON.parse(JSON.stringify(links[i]));
					links[i]._id = 's1_'+links[i]._id;
					links[i].server = 's1 ';
					
					if(isPremiumUser || isModAdmin){
						nue._id = 's2_'+nue._id
						nue.server = 's2 ';
						

						nue2._id = 's3_'+nue2._id
						nue2.server = 's3 ';
						prem.push(nue2);
						prem.push(nue);
					}
					prem.push(links[i]);
					links.splice(i, 1);
					i--;
				}else if(links[i].premium && links[i].hosting=='rapidvideo'){
					links[i]._id = 's4_'+links[i]._id;
					links[i].server = 's4 ';
					links[i].hosting = 'premium';
					if(prem.length>0) prem.unshift(links[i]);
					else prem.push(links[i]);
					links.splice(i, 1);
					i--;
				}
			}

			for(var i = 0; i < prem.length; i++){
				links.unshift(prem[i]);
			}

			var newCount = 0;

			var from = MOMENT('19:00:00', 'hh:mm:ss');
			var to = MOMENT('23:59:59', 'hh:mm:ss');

			var premiumPromo = false;
			if(MOMENT().isBetween(from, to)){
				premiumPromo = true;
			}

			if(req.INJECT_DATA.user_status.code==3){
				premiumPromo = true;
			}

			for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
				for(var j = 0, len2 = links.length; j < len2; j++){
					if(VIDEO_TYPES_LIST[i][0]==links[j].type){
						var isOwnLink = false;
						if(req.INJECT_DATA.user_status.code==3)
							isOwnLink = String(req.INJECT_DATA.user_status.data._id)==String(links[j].user._id);

						if(PREMIUM_NO_ADS.indexOf(links[j].hosting)!=-1) links[j].ads = 'NO';
						else if(PREMIUM_NO_BAD_ADS.indexOf(links[j].hosting)!=-1) links[j].ads = 'NORM';
						else links[j].ads = 'BAD';

						//if(links[j].hosting=='rapidvideo' && !isModAdmin && !isOwnLink) continue;

						//if(!links[j].status=='PUBLIC' && !isModAdmin && !isOwnLink) continue;
						if(links[j].status=='WAIT' || (links[j].status=='WAIT_HIDDEN' && (isOwnLink || isModAdmin))){
							if(!linkByType['W_ROOM']){
								linkByType['W_ROOM'] = [];
							}
							newCount++;
							linkByType['W_ROOM'].push(links[j]);
						}else if(links[j].status=='PUBLIC'){
							if(links[j].premium && !premiumPromo && !isPremiumUser && !isModAdmin) continue;

							if(!linkByType[VIDEO_TYPES_LIST[i][0]]){
								linkByType[VIDEO_TYPES_LIST[i][0]] = [];
							}
							newCount++;
							linkByType[VIDEO_TYPES_LIST[i][0]].push(links[j]);
						}
					}
				}
			}

			movie.links = linkByType;
			movie.linksCount = newCount;

			req.INJECT_DATA.movie = movie;
			res.render('movie', req.INJECT_DATA);
		
		}else{
			movie.links = linkByType;
			movie.linksCount = count;

			req.INJECT_DATA.movie = movie;
			res.render('movie', req.INJECT_DATA);
		}
	});
});

app.get('/filmik/:url/:num', function(req, res){
	show404(req, res);
	return;
	VIDEO.getByUrl(req, res, function(answer){
		if(answer.error){
			if(answer.code==3){
				res.redirect(301, answer.data);
			}else if(answer.code==4){
				show410(req, res);
			}else if(answer.code==5){
				show404(req, res);
			}else{
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
			}
			return;
		}

		var video = answer.data[0];
		var videos = answer.data[1];

		req.INJECT_DATA.videos = videos;

		req.INJECT_DATA.page_title = ENTITIES.decode(video.title+' - '+req.INJECT_DATA.page_title);

		req.INJECT_DATA.page_image_url = BASE_URL+video.poster;
		req.INJECT_DATA.page_desc = video.desc;


		var isModAdmin = false;

		if(req.INJECT_DATA.user_status.code==3)
			isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR"


		var commentsCount = 0;
		isOwnComment = false;

		for(var i = 0, len = video.comments.length; i < len; i++){
			if(req.INJECT_DATA.user_status.code==3 && video.comments[i]){
				isOwnComment = String(video.comments[i].user._id) == String(req.INJECT_DATA.user_status.data._id);
			}
			if((video.comments[i] && video.comments[i].status!='HIDE_WAIT') || isModAdmin || isOwnComment) commentsCount++;
			else video.comments.splice(i, 1);
		}

		video.comments.sort(function(a, b) { return b.date - a.date });

		req.INJECT_DATA.commentsCount = commentsCount;

		req.INJECT_DATA.video = video;
		res.render('video', req.INJECT_DATA);
	});
});

app.get('/serial/:url/:num', function(req, res){
	SERIES.getByUrl(req, res, function(answer){
		if(answer.error){
			if(answer.code==3){
				res.redirect(301, answer.data);
			}else if(answer.code==4){
				show410(req, res);
			}else{
				show404(req, res);
			}
			return;
		}

		var series = answer.data;

		if(series.votes_count && series.votes_count>30){
			req.INJECT_DATA.aggregateRatingRate = Math.round(series.rate * 10)/10;
			req.INJECT_DATA.aggregateRatingRateCount = series.votes_count;

			var name = '';

			if(series.title==series.title_org) name = series.title;
			else name = series.title+' / '+series.title_org;

			req.INJECT_DATA.aggregateRatingName = name;
			req.INJECT_DATA.aggregateRatingPoster = BASE_URL+series.poster;
		}

		if(series.title==series.title_org){
			req.INJECT_DATA.page_title = ENTITIES.decode(series.title+' - '+req.INJECT_DATA.page_title);
		}else{
			req.INJECT_DATA.page_title = ENTITIES.decode(series.title+' / '+series.title_org+' - '+req.INJECT_DATA.page_title);
		}

		req.INJECT_DATA.page_desc = series.desc;
		req.INJECT_DATA.page_keywords = series.keywords?ENTITIES.decode(series.keywords.join(',')):req.INJECT_DATA.page_keywords;
		req.INJECT_DATA.page_image_url = BASE_URL+series.poster;

		if(req.INJECT_DATA.user_status.code==3){
			if(series.fav_users){

				for(var i = 0, len = series.fav_users.length; i < len; i++){
					if(String(series.fav_users[i])==String(req.INJECT_DATA.user_status.data._id)){
						req.INJECT_DATA.isSeriesFav = true;
						break;
					}
				}
			}
		}

		

		var seasons = [];

		if(series.episodes.length>0)
		{
			for(var i = 0, len = series.episodes.length; i < len; i++){
				var season_exist = false;
				for(var j = 0, len2 = seasons.length; j < len2; j++){
					if(series.episodes[i].season_num==seasons[j].season_num){
						season_exist = true;
						break;
					}
				}
				if(!season_exist){
					seasons.push({season_num: series.episodes[i].season_num});
				}
			}

			for(var i = 0, len = series.episodes.length; i < len; i++){
				for(var j = 0, len2 = seasons.length; j < len2; j++){
					if(series.episodes[i].season_num==seasons[j].season_num){
						if(!seasons[j].episodes) seasons[j].episodes = [];
						seasons[j].episodes.push(series.episodes[i]);
					}
				}
			}
		}
		for(var j = 0, len2 = seasons.length; j < len2; j++){
			seasons[j].episodes.sort(function(a, b) { return a.episode_num - b.episode_num });
		}

		req.INJECT_DATA.series = series;
		req.INJECT_DATA.series.seasons = seasons;
		
		res.render('series', req.INJECT_DATA);
	});
});

app.get('/serial/:url/:num/:url2/:num2', function(req, res){
	SERIES.getByUrlEpi(req, res, function(answer){
		if(answer.error){
			if(answer.code==3){
				res.redirect(301, answer.data);
			}else if(answer.code==4){
				show410(req, res);
			}else if(answer.code==5){
				show404(req, res);
			}else{
				req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
				res.render('errors/not_expected_error', req.INJECT_DATA);
			}
			return;
		}

		var series = answer.data.series;
		var episodes = answer.data.episodes;
		var episode = answer.data.episode;
		var season_num = answer.data.season_num;
		var seriess = answer.data.seriess;

		req.INJECT_DATA.seriess = seriess;

		episodes.sort(function(a, b) { return a.episode_num - b.episode_num });

		var other_season = [];

		var is_lower_season = false;
		var is_higher_season = false;

		var lower_episode = null;
		var higher_episode = null;

		for(var i = 0; i < episodes.length; i++){
			if(episodes[i] && episodes[i].season_num){
				if(episodes[i].season_num!=season_num){
					var s_num = episodes[i].season_num;
					if(s_num>season_num) is_higher_season = true;
					else if(s_num<season_num) is_lower_season = true;
					other_season.push(episodes[i]);
					episodes.splice(i, 1);
					i--;
				}
			}
		}

		other_season.sort(function(a, b) {
			var s = a.season_num - b.season_num;
			if(s!=0) return s;
			return a.episode_num - b.episode_num;
		});

		if(is_lower_season){
			for(var i = 0, len = other_season.length; i < len; i++){
				if(lower_episode && lower_episode.season_num==other_season[i].season_num){
					lower_episode = other_season[i];
				}else if(other_season[i].season_num<season_num){
					lower_episode = other_season[i];
				}
			}
		}

		if(is_higher_season){
			for(var i = 0, len = other_season.length; i < len; i++){
				if(other_season[i].season_num>season_num){
					higher_episode = other_season[i];
					break;
				}
			}
		}

		req.INJECT_DATA.is_lower = is_lower_season;
		req.INJECT_DATA.is_higher = is_higher_season;

		req.INJECT_DATA.lower_episode = lower_episode;
		req.INJECT_DATA.higher_episode = higher_episode;

		if(series.title==series.title_org){
			req.INJECT_DATA.page_title = ENTITIES.decode('[s'+pad(season_num)+'e'+pad(episode.episode_num)+(episode.episode_num_alter?'-e'+pad(episode.episode_num_alter):'')+'] '+episode.title+' - '+series.title+' - '+req.INJECT_DATA.page_title);
		}else{
			req.INJECT_DATA.page_title = ENTITIES.decode('[s'+pad(season_num)+'e'+pad(episode.episode_num)+(episode.episode_num_alter?'-e'+pad(episode.episode_num_alter):'')+'] '+episode.title+' - '+series.title+' / '+series.title_org+' - '+req.INJECT_DATA.page_title);
		}

		req.INJECT_DATA.page_desc = /*episode.desc?episode.desc:*/series.desc;

		if(episode.keywords){
			episode.keywords = episode.keywords.concat(desc_to_keywords(ENTITIES.decode(series.title)));
			episode.keywords = episode.keywords.concat(desc_to_keywords(ENTITIES.decode(series.title_org)));

			episode.keywords = episode.keywords.filter(function(elem, index, self) {
				return index == self.indexOf(elem);
			});
		}

		req.INJECT_DATA.page_keywords = episode.keywords?episode.keywords.join(','):series.keywords?ENTITIES.decode(series.keywords.join(',')):req.INJECT_DATA.page_keywords;
		req.INJECT_DATA.page_image_url = BASE_URL+series.poster;

		var linkByType = {};

		var linksNotSorted = null;
		var links = [];

		var count = 0;

		if(req.INJECT_DATA.user_status.code==3)
			var isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR"

		if(episode.links)
			count = episode.links.length;

		
		var commentsCount = 0;
		var isOwnComment = false;

		for(var i = 0; i < episode.comments.length; i++){
			if(req.INJECT_DATA.user_status.code==3 && episode.comments[i])
				isOwnComment = String(episode.comments[i].user._id) == String(req.INJECT_DATA.user_status.data._id);
			if((episode.comments[i] && episode.comments[i].status!='HIDE_WAIT') || isModAdmin || isOwnComment) commentsCount++;
			else{
				episode.comments.splice(i, 1);
				i--
			}
		}

		episode.comments.sort(function(a, b) { return b.date - a.date });

		req.INJECT_DATA.commentsCount = commentsCount;

		var episode_index = 0;

		for(var i = 0, len = episodes.length; i < len; i++){
			if(episodes[i].episode_num==episode.episode_num){
				episode_index = i;
				break;
			}
		}

		req.INJECT_DATA.episode_index = episode_index;

		if(req.INJECT_DATA.user_status.code==3){
			if(series.fav_users){

				for(var i = 0, len = series.fav_users.length; i < len; i++){
					if(String(series.fav_users[i])==String(req.INJECT_DATA.user_status.data._id)){
						req.INJECT_DATA.isSeriesFav = true;
						break;
					}
				}
			}
		}

		if(count>0){
			var isPremiumUser = false;
			if(req.INJECT_DATA.user_status.code==3){
				isPremiumUser = req.INJECT_DATA.user_status.data.premium;
			}

			let usersList = [
				'59d171998447c35808cc3ada', // YUIUMI
				'5b626ac3d134574cc877b611', //Mercy
				'5b626af9d134574cc877b613', //Kattatol
				'5b626b23d134574cc877b618', //Hum9921
				'5b626b99cfaef94cd8e0402f', //10Szum
				'5b626bb6151bb94cdea6d829', //Crank
			]

			linksNotSorted = episode.links;

			for(var j = 0, len2 = linksNotSorted.length; j < len2; j++){

				var downl_data = {
					video_type: 'episode',
					_id: episode._id,
					title_org: series.title_org,
					season_num: episode.season_num,
					episode_num: episode.episode_num,
					quality: linksNotSorted[j].quality,
					type: linksNotSorted[j].type,
					hosting: linksNotSorted[j].hosting,
					video_id: linksNotSorted[j].video_id,
				}
				var zr = JSON.stringify(downl_data);
				linksNotSorted[j].downl_data = zr;
			}


			for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++){
				for(var j = 0, len2 = linksNotSorted.length; j < len2; j++){
					if(VIDEO_QUALITY_LIST[i][0]==linksNotSorted[j].quality){
						links.push(linksNotSorted[j]);
					}
				}
			}
			
			/*var adminLinks = [];
			for(var i = 0; i < links.length; i++){
				if(usersList.includes(String(links[i].user._id)) && links[i].quality=='HIGH'){
					adminLinks.push(links[i]);
					links.splice(i, 1);
					i--;
				}
			}
			for(var i = 0; i < adminLinks.length; i++){
				links.unshift(adminLinks[i]);
			}*/


			var bluesquadLinks = [];
			for(var i = 0; i < links.length; i++){
				if(String(links[i].user._id)=='5c96129fadac6a2957df7543' && links[i].quality=='HIGH'){
					bluesquadLinks.push(links[i]);
					links.splice(i, 1);
					i--;
				}
			}
			for(var i = 0; i < bluesquadLinks.length; i++){
				links.unshift(bluesquadLinks[i]);
			}


			var prem = [];
			for(var i = 0; i < links.length; i++){
				if(links[i].premium && links[i].hosting=='premium'){
					var nue = JSON.parse(JSON.stringify(links[i]));
					var nue2 = JSON.parse(JSON.stringify(links[i]));
					links[i]._id = 's1_'+links[i]._id;
					links[i].server = 's1 ';
					
					if(isPremiumUser || isModAdmin){
						nue._id = 's2_'+nue._id
						nue.server = 's2 ';
						

						nue2._id = 's3_'+nue2._id
						nue2.server = 's3 ';
						prem.push(nue2);
						prem.push(nue);
					}
					prem.push(links[i]);
					links.splice(i, 1);
					i--;
				}else if(links[i].premium && links[i].hosting=='rapidvideo'){
					links[i]._id = 's4_'+links[i]._id;
					links[i].server = 's4 ';
					links[i].hosting = 'premium';
					if(prem.length>0) prem.unshift(links[i]);
					else prem.push(links[i]);
					links.splice(i, 1);
					i--;
				}
			}

			for(var i = 0; i < prem.length; i++){
				links.unshift(prem[i]);
			}

			var from = MOMENT('19:00:00', 'hh:mm:ss');
			var to = MOMENT('23:59:59', 'hh:mm:ss');

			var premiumPromo = false;
			if(MOMENT().isBetween(from, to)){
				premiumPromo = true;
			}

			if(req.INJECT_DATA.user_status.code==3){
				premiumPromo = true;
			}

			var newCount = 0;

			for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
				for(var j = 0, len2 = links.length; j < len2; j++){
					if(VIDEO_TYPES_LIST[i][0]==links[j].type){
						var isOwnLink = false;
						if(req.INJECT_DATA.user_status.code==3)
							isOwnLink = String(req.INJECT_DATA.user_status.data._id)==String(links[j].user._id);

						if(PREMIUM_NO_ADS.indexOf(links[j].hosting)!=-1) links[j].ads = 'NO';
						else if(PREMIUM_NO_BAD_ADS.indexOf(links[j].hosting)!=-1) links[j].ads = 'NORM';
						else links[j].ads = 'BAD';

						//if(links[j].hosting=='rapidvideo' && !isModAdmin && !isOwnLink) continue;

						//if(!links[j].status=='PUBLIC' && !isModAdmin && !isOwnLink) continue;
						if(links[j].status=='WAIT' || (links[j].status=='WAIT_HIDDEN' && (isOwnLink || isModAdmin))){
							if(!linkByType['W_ROOM']){
								linkByType['W_ROOM'] = [];
							}
							newCount++;
							linkByType['W_ROOM'].push(links[j]);
						}else if(links[j].status=='PUBLIC'){
							if(links[j].premium && !premiumPromo && !isPremiumUser && !isModAdmin) continue;

							if(!linkByType[VIDEO_TYPES_LIST[i][0]]){
								linkByType[VIDEO_TYPES_LIST[i][0]] = [];
							}
							newCount++;
							linkByType[VIDEO_TYPES_LIST[i][0]].push(links[j]);
						}
					}
				}
			}

			episode.links = linkByType;
			episode.linksCount = newCount;

			req.INJECT_DATA.series = series;
			req.INJECT_DATA.episodes = episodes;
			req.INJECT_DATA.season_num = season_num;
			req.INJECT_DATA.episode = episode;

			res.render('episode', req.INJECT_DATA);
		}else{
			req.INJECT_DATA.series = series;
			req.INJECT_DATA.episodes = episodes;
			req.INJECT_DATA.season_num = season_num;
			
			episode.linksCount = count;

			req.INJECT_DATA.episode = episode;
			res.render('episode', req.INJECT_DATA);
		}
	});
});

app.get('/adv_log', function(req, res){
	var IP = getIP(req);

	linkLogsModel.find({ ip: IP })
	.limit(1)
	.select('advertising_last advertising_ended')
	.exec(function(err, log){
		if(err || log.length==0){
			res.status(500).send('Błąd wewnętrzny.');
			return;
		}

		log = log[0];
		log.advertising_ended = true;
		log.save(function(err){
			if(err){ res.status(500).send('Błąd wewnętrzny.'); return; }
			res.status(200).end();
		});
	});
});

app.get('/pembed', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	if(!req.query.em){
		req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
		res.render('errors/not_expected_error', req.INJECT_DATA);
	}

	var em = req.query.em;
	var host = req.query.host;
	req.INJECT_DATA.em = em;
	req.INJECT_DATA.host = host;
	res.render('pembed', req.INJECT_DATA);
});

app.get('/speed_test', function(req, res){
	if(!req.query.speed){
		res.status(404).end(''); return;
	}

	var speed = req.query.speed;

	if(!VALIDATOR.isInt(speed)){ res.status(404).end(''); return; }

	if(speed>200){ res.cookie('speed', true, { maxAge: 60*60*4*1000, httpOnly: true }); res.status(200).end(''); return; }

	if(req.INJECT_DATA.user_status.code!=3){ res.send(); return; }
		
	var isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	if(!isPremiumUser){ res.send(); return; }

	userModel.find({_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id)})
	.limit(1)
	.select('internet_speed')
	.exec(function(err, user){
		if(err){ res.send(); return; }
		if(user.length==0){ res.send(); return; }
		user = user[0];
		
		if(!user.internet_speed){ user.internet_speed = []; }

		var elm = {}
		elm.date = MOMENT().toISOString();
		elm.speed = speed;
		user.internet_speed.push(elm);

		user.save(function(err){

			res.cookie('speed', true, { maxAge: 60*60*12*1000, httpOnly: true });
			res.send();
		})
	});
});

app.get('/embed', function(req, res){
	req.INJECT_DATA.google_index = false;

	if(!req.query){
		res.status(400).send('Wystapił błąd.'); return;
	}

	if(!req.query.salt){
		res.status(404).send('Link usunięty.'); return;
	}

	if(!req.query.type){
		res.status(404).send('Link usunięty.'); return;
	}else if(req.query.type!='movie' && req.query.type!='episode'){
		res.status(400).send('Wystapił błąd.'); return;
	}

	if(!req.query.code){
		res.status(404).send('Link usunięty.'); return;
	}else if(!VALIDATOR.isMongoId(req.query.code)){
		res.status(400).send('Wystapił błąd.'); return;
	}

	if(req.query.type=='episode'){
		if(!req.query.code2){
			res.status(404).send('Link usunięty.'); return;
		}else if(!VALIDATOR.isMongoId(req.query.code2)){
			res.status(400).send('Wystapił błąd.'); return;
		}
	}

	req.INJECT_DATA.pmode = 'old';

	if(req.query.pmode){
		if(req.query.pmode=='new'){
			req.INJECT_DATA.pmode = 'new';
			res.cookie('pmode_ck', 'new', { maxAge: 60*60*24*365*1000, httpOnly: true });
		}else if(req.query.pmode=='old'){
			req.INJECT_DATA.pmode = 'old';
			res.cookie('pmode_ck', 'old', { maxAge: 60*60*24*365*1000, httpOnly: true });
		}else if(req.query.pmode=='raw'){
			req.INJECT_DATA.pmode = 'raw';
			res.cookie('pmode_ck', 'raw', { maxAge: 60*60*24*365*1000, httpOnly: true });
		}
	}else{
		var cookies = req.cookies;
		if(cookies){
			var pmode_ck = cookies.pmode_ck;
			if(pmode_ck && (pmode_ck=='new' || pmode_ck=='old' || pmode_ck=='raw')){
				req.INJECT_DATA.pmode = pmode_ck;
			}
		}
	}

	var isPremiumUser = false;
	var isModAdmin = false;
	if(req.INJECT_DATA.user_status.code==3){
		isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
		isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	}

	req.INJECT_DATA.isPremiumUser = isPremiumUser;
	req.INJECT_DATA.isModAdmin = isModAdmin;

	var salt = req.query.salt;
	var page_type = req.query.type;
	var code = req.query.code;
	var code2 = req.query.code2;

	var server = '';

	var saltArr = salt.split('_');
	if(saltArr.length>1){
		salt = saltArr[1];
		server = saltArr[0];
		if(server!='s1' && server!='s2' && server!='s3' && server!='s4') server = '';
	}

	if(!VALIDATOR.isMongoId(salt)){
		res.status(400).send('Wystapił błąd.'); return;
	}

	req.INJECT_DATA.code = code;
	req.INJECT_DATA.code2 = code2;

	linkModel.find({_id: MONGO.Types.ObjectId(salt)})
	.select('_id hosting video_id premium type quality user')
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: 'username'
	})
	.exec(function(err, link){
		if(err){ res.status(400).send('Wystapił błąd.'); return; }
		if(link.length!=1){ res.status(404).send('Link usunięty.'); return; }
		var link = link[0];

		req.INJECT_DATA.own_username = link.user.username;

		req.INJECT_DATA.advertise = false;
		req.INJECT_DATA.allow_origin = false;

		if(link.premium && (!isPremiumUser && !isModAdmin)){ res.status(403).send('Brak dostępu lub link usunięty.'); return; }

		if(link.type=='NAPISY_PL' || link.type=='NAPISY_ENG' || link.hosting=='streamango' || link.hosting=='openload' || link.hosting=='vidoza'){
			req.INJECT_DATA.allow_origin = true;
		}

		var embed = null;

		for(var i = 0, len = VIDEO_HOSTING_LIST.length; i < len; i++){
			if(VIDEO_HOSTING_LIST[i].name==link.hosting){
				embed = VIDEO_HOSTING_LIST[i].embed_code;
				break;
			}
		}

		if(!embed){ res.status(400).send('Wystapił błąd.'); return; }

		if(link.hosting=='cda'){
			var q = '';
			switch(link.quality){
				case 'VERY_HIGHT':
					q = '1080p'; break;
				case 'HIGH':
					q = '720p'; break;
			}

			embed += '?wersja='+q;
		}

		embed = embed.replace('#ID', link.video_id);
		req.INJECT_DATA.url = embed;

		var IP = getIP(req);

		req.INJECT_DATA.hosting = link.hosting;
		req.INJECT_DATA.link_premium = link.premium;

		if(isPremiumUser || isModAdmin){
			var mdl = movieModel;
			var mdl_id = code;
			var mdl_select = 'title title_org';
			var mld_populate = '';
			if(page_type=='episode'){
				mdl = episodeModel;
				mdl_id = code2;
				mdl_select = 'title episode_num episode_num_alter season_num';
				mld_populate = {
					path: 'series_id',
					select: 'title title_org'
				};
			}

			mdl.find({_id: MONGO.Types.ObjectId(mdl_id)})
			.lean()
			.limit(1)
			.select(mdl_select)
			.populate(mld_populate)
			.exec(function(err, result){
				if(err){ res.status(400).send('Wystapił błąd.'); return; }
				if(result.length!=1){ res.status(404).send('Link usunięty.'); return; }
				var result = result[0];
				
				if(page_type=='movie'){
					var title = result.title;
					var title2 = result.title_org;
					if(title==title2) title2 = '';
				}else{
					var episode_title = result.title;
					var season_num = result.season_num;
					var episode_num = result.episode_num;
					var episode_num_alter = result.episode_num_alter;
					var series_id = result.series_id;
					if(!series_id){ res.status(400).send('Wystapił błąd.'); return; }
					if(series_id.title==series_id.title_org) var title = series_id.title;
					else var title = series_id.title+' / '+series_id.title_org;
					var title2 = `[s${pad(season_num)}e${pad(episode_num)}${episode_num_alter?'e'+pad(episode_num_alter):''}]`+' '+episode_title;
				}

				if(link.premium && link.hosting=='premium'){
					var hosts_list = ['zgdat02', 'zgdat08', 'zgdat09']
					var rand = Math.floor(Math.random() * hosts_list.length);
					var dm = hosts_list[rand];

					requestGet('https', 'https://'+dm+'.fili.cc/getSession/'+link.video_id+'?ip='+IP, function(err, body, head){
						if(err){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie.'); return; }

						var prev_time = req.INJECT_DATA.user_status.data.prem_video_time;

						var time = null;

						if(prev_time){

							for(var i = 0; i < prev_time.length; i++){
								if(prev_time[i].episode_id && code2 && prev_time[i].episode_id==code2){
									time = prev_time[i].time;
									break;
								}else if(prev_time[i].movie_id && code && prev_time[i].movie_id==code){
									time = prev_time[i].time;
									break;
								}
							}
						}

						body.video_url = body.video_url.replace(dm, 'zgdat01');

						if(server=='s1'){
							var server_list = [
								//{ name: 'zgdat07', norm_speed: 120, burst_speed: 120, time_start: '17:00:00', time_end: '23:59:59' },
								{ name: 'zgdat08', norm_speed: 10, burst_speed: 70, time_start: '18:30:00', time_end: '23:59:59' },
								{ name: 'zgdat09', norm_speed: 10, burst_speed: 110, time_start: '18:00:00', time_end: '23:59:59' },
								//{ name: 'zgdat10', norm_speed: 120, burst_speed: 120, time_start: '18:00:00', time_end: '23:59:59' },
								//{ name: 'zgdat11', norm_speed: 100, burst_speed: 100, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat01', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat02', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								//{ name: 'xdat03', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat04', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat06', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat07', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
								{ name: 'xdat08', norm_speed: 120, burst_speed: 120, time_start: '19:30:00', time_end: '23:59:59' },
							];

							var max_speed = 0;
							for (var i = 0; i < server_list.length; i++){
								if(!server_list[i].time_start){
									max_speed+=server_list[i].norm_speed;
									server_list[i].actual_speed=server_list[i].norm_speed;
								}else{
									var from = MOMENT(server_list[i].time_start, 'hh:mm:ss');
									var to = MOMENT(server_list[i].time_end, 'hh:mm:ss');

									if(MOMENT().isBetween(from, to)){
										max_speed+=server_list[i].burst_speed;
										server_list[i].actual_speed=server_list[i].burst_speed;
									}else{
										max_speed+=server_list[i].norm_speed;
										server_list[i].actual_speed=server_list[i].norm_speed;
									}
								}
							}

							var chance_matrix = [];
							var last_shares = 0;

							for(var i = 0; i < server_list.length; i++){
								var speed = server_list[i].actual_speed;
								var shares = Math.round(speed/max_speed * 100) / 100

								chance_matrix.push(Math.round((shares+last_shares) * 100) / 100);
								last_shares = shares+last_shares;
							}

							

							var rand = Math.random();
							for (var i = 0; i < chance_matrix.length; i++){
								var chance = chance_matrix[i];
								if(rand<=chance){
									body.video_url = body.video_url.replace('zgdat01', server_list[i].name);
									break;
								}
							}
						}else if(server=='s2'){
							var rns = Math.random();
							if(rns>0.3){
								body.video_url = body.video_url.replace('zgdat01', 'xdat05');
							}else{
								body.video_url = body.video_url.replace('zgdat01', 'zgdat02');
							}
						}else if(server=='s3') body.video_url = body.video_url.replace('zgdat01', 'zgdat06');

						req.INJECT_DATA.url = body.video_url;
						req.INJECT_DATA.subtitle_url = body.subtitle_url;
						req.INJECT_DATA.page_type = page_type;
						req.INJECT_DATA.title = title;
						req.INJECT_DATA.title2 = title2;
						req.INJECT_DATA.start_time = time;
						res.render('embed', req.INJECT_DATA);
					});
					return;
				}else if(link.premium && link.hosting=='rapidvideo'){
					requestGet('https', 'https://api.rapidvideo.com/v2/file/hotlink?login=tRWeOwHwlCQ4DLOi&key=314fc8e45aa26810604d0c9873f6e51e5f4c53c6df7af8577fed36dc69f6eb31&file='+link.video_id+'&ip='+IP, function(err, body, head){
						if(err){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie.'); return; }

						var prev_time = req.INJECT_DATA.user_status.data.prem_video_time;

						var time = null;

						if(prev_time){
							for(var i = 0; i < prev_time.length; i++){
								if(prev_time[i].episode_id==code2 || prev_time[i].movie_id==code){
									time = prev_time[i].time;
									break;
								}
							}
						}

						try{
							body = JSON.parse(body);
						}catch(err){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie później.120'); return; }


						if(body.status!=200){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie później.'); return; }
						var file_id = body.result[link.video_id];
						if(!file_id){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie później.'); return; }
						if(file_id.status!=200){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie później.'); return; }
						var sources = file_id.result;
						if(!sources){ res.status(500).send('Wystąpił błąd. Spróbuj ponownie później.'); return; }
						var u480p = sources[480];
						var u720p = sources[720];
						var u1080p = sources[1080];
						if(!u480p && !u720p && !u1080p){ res.status(500).send('Ten link nie jest jeszcze dostępny. Wybierz inny.'); return; }
						var source480p = null;
						var source720p = null;
						if(u480p) source480p = u480p.file;
						if(u720p) source720p = u720p.file;
						if(u1080p && !source720p) source720p = u1080p.file;


						req.INJECT_DATA.url = source720p;
						req.INJECT_DATA.url480 = source480p;
						req.INJECT_DATA.subtitle_url = body.subtitle_url;
						req.INJECT_DATA.page_type = page_type;
						req.INJECT_DATA.title = title;
						req.INJECT_DATA.title2 = title2;
						req.INJECT_DATA.start_time = time;
						res.render('embed', req.INJECT_DATA);
					});
					return;
				}
			

				var cookies = req.cookies;
				if(cookies){
					var adult_warning = cookies.adult_warning;
					if(!adult_warning){
						res.render('embed_adult_warning', req.INJECT_DATA);
						return;
					}
				}

				res.render('embed', req.INJECT_DATA);
				return;
			});
			return;
		}

		if(isModAdmin/* || req.INJECT_DATA.device=='bot'*/){
			res.render('embed', req.INJECT_DATA);
			return;
		}

		var now = new MOMENT();
		var date = now.subtract(24, 'h');

		viewedModel.find({ $and: [{ip: IP}, /*{adb: true},*/ { 'date': { '$gte': date.toDate() } }] })
		.lean()
		.select('date episode_id movie_id')
		.exec(function(err, vieweds){
			if(err){ res.status(400).send('Wystapił błąd.'); return; }

			vieweds.sort(function (left, right) {
				return MOMENT.utc(left.date).diff(MOMENT.utc(right.date))
			});

			var num_block = 2;
			var viewedsCount = vieweds.length;

			var need_check = true;

			for(var i = 0, len = viewedsCount; i < len; i++){
				if(vieweds[i].episode_id){
					if(vieweds[i].episode_id==code2){
						need_check = false;
						break;
					}
				}else if(vieweds[i].movie_id){
					if(vieweds[i].movie_id==code){
						need_check = false;
						break;
					}
				}
			}

			var from = MOMENT('18:00:00', 'hh:mm:ss');
			var to = MOMENT('23:59:59', 'hh:mm:ss');

			var premiumPromo = false;
			if(MOMENT().isBetween(from, to)){
				premiumPromo = true;
			}

			if(need_check && viewedsCount>=num_block && premiumPromo){
				//var index = viewedsCount-num_block<0?0:viewedsCount-num_block;

				/*var date = MOMENT(vieweds[index].date);
				date.add(1, 'day');*/

				req.INJECT_DATA.can_watch = to.format('YYYY-MM-DD HH:mm:ss');

				res.render('embed_prem', req.INJECT_DATA);
				return;
			}

			var cookies = req.cookies;
			if(cookies){
				var adult_warning = cookies.adult_warning;
				if(!adult_warning){
					res.render('embed_adult_warning', req.INJECT_DATA);
					return;
				}
			}


			var timeRestrict = 60;
			var timesRestrict = 18;

			if(req.INJECT_DATA.country_code!='PL' && req.INJECT_DATA.country_code!='UK' && req.INJECT_DATA.country_code!='DE'){
				timeRestrict = 60;
				timesRestrict = 8;
			}


			linkLogsModel.find({ ip: IP})
			.limit(1)
			.select('captcha first_get times advertising_last advertising_ended')
			.exec(function(err, log){
				if(err){ res.status(400).send('Wystapił błąd.'); return; }

				if(log.length==0){
					var query = {
						_id : MONGO.Types.ObjectId(),
						ip : IP
					}
					linkLogsModel.create(query, function(err, log){
						if(err){ res.status(400).send('Wystapił błąd.'); return; }
						req.INJECT_DATA.advertise = false; // was true
						res.render('embed', req.INJECT_DATA);
					});
					return;
				}

				log = log[0];

				if(log.captcha){
					req.INJECT_DATA.captcha = true;
					res.render('embed', req.INJECT_DATA);
					return;
				}

				if(MOMENT().subtract(timeRestrict, 'minutes').isSameOrBefore(log.first_get)){
					if((log.times+1)>=timesRestrict){
						log.captcha = true;
						req.INJECT_DATA.captcha = true;

						res.render('embed', req.INJECT_DATA);
						return;
					}else{
						log.times++;
					}
				}else{
					log.times = 1;
					log.first_get = MOMENT().toDate();
				}

				if(MOMENT().subtract(8, 'hours').isSameOrBefore(log.advertising_last)){
					if(!log.advertising_ended){
						req.INJECT_DATA.advertise = false; // was true
					}
				}else{
					req.INJECT_DATA.advertise = false; // was true
					log.advertising_last = MOMENT().toDate();
					log.advertising_ended = false;
				}

				log.save(function(err){
					if(err){ res.status(400).send('Wystapił błąd.'); return; }
					res.render('embed', req.INJECT_DATA);
				});
			});
		});
	});
});

app.get('/panel/weryfikacja', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	ASYNC.series({
		movies: function(cb){
			movieModel.find({status: 'WAIT'})
			.lean()
			.populate({
				path: 'user',
				select: 'username'
			})
			.select('_id title title_org filmweb_id year rate poster desc url user genres num')
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				if(!movies){ cb(true); return; }
				cb(null, movies);
			});
		},
		series: function(cb){
			seriesModel.find({status: 'WAIT'})
			.lean()
			.populate({
				path: 'user',
				select: 'username'
			})
			.select('_id title title_org filmweb_id year rate poster desc url user genres episodes num')
			.exec(function(err, series){
				if(err){ cb(true); return; }
				if(!series){ cb(true); return; }
				cb(null, series);
			});
		},
		episodes: function(cb){
			episodeModel.find({ $or: [{status: 'WAIT'}, { $where: 'this.report.length>0' } ]})
			.lean()
			.populate({
				path: 'user',
				select: 'username'
			})
			.populate({
				path: 'series_id',
				select: 'title title_org poster filmweb_id url year'
			})
			.select('_id title user season_num episode_num series_id url num report report_desc')
			.exec(function(err, episodes){
				if(err){ cb(true); return; }
				if(!episodes){ cb(true); return; }
				cb(null, episodes);
			});
		},
		links: function(cb){
			linkModel.find({ $or: [{status: 'WAIT'}, {status: 'WAIT_HIDDEN'}, { $where: 'this.report.length>0' } ]})
			.lean()
			.select('_id')
			.exec(function(err, links){
				var linksCount = links?links.length:0;
				var linIds = [];
				for(var i = 0, len = links.length; i < len; i++){
					linIds.push(MONGO.Types.ObjectId(links[i]._id));
				}
				
				episodeModel.find({links: { $in: linIds }})
				.lean()
				.populate({
					path: 'series_id',
					select: '_id title title_org poster filmweb_id url year'
				})
				.populate({
					path: 'links',
					select: '_id type quality hosting video_id user report report_desc file_size',
					match: { $or: [{status: 'WAIT'}, {status: 'WAIT_HIDDEN'}, { $where: 'this.report.length>0' } ]},
					populate: {
						path: 'user',
						select: 'username'
					}
				})
				.select('_id title user season_num episode_num series_id url links num')
				.exec(function(err, links){
					var episode_links = links;

					movieModel.find({links: { $in: linIds }})
					.lean()
					.populate({
						path: 'links',
						select: '_id type quality hosting video_id user report report_desc file_size',
						match: { $or: [{status: 'WAIT'}, {status: 'WAIT_HIDDEN'}, { $where: 'this.report.length>0' } ]},
						populate: {
							path: 'user',
							select: 'username'
						}
					})
					.select('_id title title_org poster filmweb_id url links num year')
					.exec(function(err, links){
						var movie_links = links;

						if(err){ cb(true); return; }
						if(!links){ cb(true); return; }
						cb(null, [episode_links, movie_links, linksCount]);
					});
				});
			});
		},
		comments: function(cb){
			commentModel.find({ $or: [{status: 'WAIT'}, {status: 'HIDE_WAIT'}]})
			.lean()
			.select('_id')
			.exec(function(err, comments){
				var commentsCount = comments?comments.length:0;
				var linIds = [];
				for(var i = 0, len = comments.length; i < len; i++){
					linIds.push(MONGO.Types.ObjectId(comments[i]._id));
				}
				
				episodeModel.find({comments: { $in: linIds }})
				.lean()
				.populate({
					path: 'series_id',
					select: 'title title_org poster filmweb_id url year'
				})
				.populate({
					path: 'comments',
					select: '_id message user date',
					match: { $or: [{status: 'WAIT'}, {status: 'HIDE_WAIT'}]},
					populate: {
						path: 'user',
						select: 'username'
					}
				})
				.select('_id title user season_num episode_num series_id url comments num')
				.exec(function(err, comments){
					var episode_comments = comments;

					movieModel.find({comments: { $in: linIds }})
					.lean()
					.populate({
						path: 'comments',
						select: '_id message user date',
						match: { $or: [{status: 'WAIT'}, {status: 'HIDE_WAIT'}]},
						populate: {
							path: 'user',
							select: 'username'
						}
					})
					.select('_id title title_org poster filmweb_id url comments num video_id')
					.exec(function(err, comments){
						var movie_comments = comments;

						videoModel.find({comments: { $in: linIds }})
						.lean()
						.populate({
							path: 'comments',
							select: '_id message user date',
							match: { $or: [{status: 'WAIT'}, {status: 'HIDE_WAIT'}]},
							populate: {
								path: 'user',
								select: 'username'
							}
						})
						.select('_id title poster url comments num')
						.exec(function(err, comments){
							var video_comments = comments;

							if(err){ cb(true); return; }
							if(!comments){ cb(true); return; }
							cb(null, [episode_comments, movie_comments, video_comments, commentsCount]);
						});
					});
				});
			});
		},
		videos: function(cb){
			videoModel.find({status: 'WAIT'})
			.lean()
			.select('_id poster title genres url num video_id desc')
			.exec(function(err, videos){
				cb(null, videos);
			});
		},
	}, function(err, result){
		req.INJECT_DATA.movies = result.movies;
		req.INJECT_DATA.series = result.series;
		req.INJECT_DATA.episodes = result.episodes;
		req.INJECT_DATA.videos = result.videos;
		req.INJECT_DATA.episode_links = result.links[0];
		req.INJECT_DATA.movie_links = result.links[1];
		req.INJECT_DATA.linksCount = result.links[2];

		req.INJECT_DATA.episode_comments = result.comments[0];
		req.INJECT_DATA.movie_comments = result.comments[1];
		req.INJECT_DATA.video_comments = result.comments[2];
		req.INJECT_DATA.commentsCount = result.comments[3];
	
		res.render('panel', req.INJECT_DATA);
	});
});

app.get('/import-odcinki/:series_num', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	var num = req.params.series_num;

	seriesModel.find({num: num})
	.limit(1)
	.select('title title_org')
	.exec(function(err, series){
		if(err){
			req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
			res.render('errors/not_expected_error', req.INJECT_DATA);
			return;
		}

		if(series.length==0){
			req.INJECT_DATA.page_title = 'Wystąpił błąd - '+req.INJECT_DATA.page_title;
			res.render('errors/not_expected_error', req.INJECT_DATA);
			return;
		}

		var series = series[0];
		req.INJECT_DATA.series = series;
		res.render('import_filmweb', req.INJECT_DATA);
	});
});

app.get('/import/:series_id/:season', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	res.render('import_series', req.INJECT_DATA);
});

app.get('/import/:movie_id', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	res.render('import_movie', req.INJECT_DATA);
});

app.get('/dodaj-linki-masowo/:series_id/:season', function(req, res){
	if(req.INJECT_DATA.user_status.code!=3){
		req.INJECT_DATA.page_title = 'Wymagane zalogowanie - '+req.INJECT_DATA.page_title;
		res.render('errors/login_required', req.INJECT_DATA);
		return;
	}

	if(req.INJECT_DATA.user_status.data.type=='USER'){
		req.INJECT_DATA.page_title = 'Brak uprawnień - '+req.INJECT_DATA.page_title;
		res.render('errors/no_permission', req.INJECT_DATA);
		return;
	}

	var series_id = req.params.series_id;
	var season = req.params.season;

	req.body._id = series_id;
	req.body.season = season;

	SERIES.getEpisodesImport(req, res, function(answer){
		if(answer.error){ show401(req, res); return; }

		var episodes = answer.data;
		req.INJECT_DATA.season = season;
		req.INJECT_DATA.series_id = series_id;
		req.INJECT_DATA.episodes = episodes;
		res.render('add_links_mass', req.INJECT_DATA);
	});
});


app.get('/api/get-list-no-prem-mov', function(req, res){
	var ip = getIP(req);

	if(ip!='31.186.87.53' && ip!='54.36.109.213'){
		res.status(403).send('Forbidden');
		return;
	}
	
	movieModel.find({ $pr: [{status: 'PUBLIC'}, {status: 'PREMIUM'}] })
	.select('links num url viewed')
	.populate({
		path: 'links',
		select: 'type hosting premium',
	})
	.sort({viewed: -1})
	.lean()
	.exec((err, movies) => {
		if(err){ res.send('ERROR'); return; }
		if(movies.length==0){ res.send('0 movies'); return; }

		var new_list = [];

		for(var i = 0; i < movies.length; i++){
			var links = movies[i].links;
			if(links.length==0) continue; 

			var foundDownloable = false;
			for(var j = 0; j < links.length; j++){
				if(links[j].premium){
					foundDownloable = false;
					break;
				} 
				if(links[j].type=='NAPISY_PL'){
					foundDownloable = true;
				}
			}

			if(foundDownloable){
				var url = BASE_URL+'/film/'+movies[i].url+'/'+movies[i].num;
				new_list.push(url);
			}
		}

		res.json(new_list);
	});
});


app.get('/api/get-need-download', function(req, res){
	var ip = getIP(req);

	if(ip!='31.186.87.53' && ip!='54.36.109.213'){
		res.status(403).send('Forbidden');
		return;
	}
	
	movieModel.find({ $or: [{status: 'PUBLIC'}, {status: 'PREMIUM'}] })
	.select('links title_org year')
	.populate({
		path: 'links',
		select: 'type hosting premium quality date video_id status',
	})
	.sort({viewed: -1})
	.lean()
	.exec((err, movies) => {
		if(err){ res.json([]); return; }
		if(movies.length==0){ res.json([]); return; }


		var data = [];
		for(var i = 0; i < movies.length; i++){
			var linksNotSorted = movies[i].links;
			if(linksNotSorted.length==0) continue; 

			linksNotSorted.sort(function(a,b){
				return new Date(a.date) - new Date(b.date);
			});

			var links = [];
			var linkByType = {};

			for(var j = 0, len = VIDEO_QUALITY_LIST.length; j < len; j++){
				for(var k = 0, len2 = linksNotSorted.length; k < len2; k++){
					if(VIDEO_QUALITY_LIST[j][0]==linksNotSorted[k].quality && linksNotSorted[k].status=='PUBLIC'){
						links.push(linksNotSorted[k]);
					}
				}
			}

			for(var j = 0, len = VIDEO_TYPES_LIST.length; j < len; j++){
				for(var k = 0, len2 = links.length; k < len2; k++){
					if(VIDEO_TYPES_LIST[j][0]==links[k].type){
						if(!linkByType[VIDEO_TYPES_LIST[j][0]]){
							linkByType[VIDEO_TYPES_LIST[j][0]] = [];
						}
						linkByType[VIDEO_TYPES_LIST[j][0]].push(links[k]);
					}
				}
			}

			var added = 0;
			var allLinksToDownload = [];
			for(prop in linkByType){
				if(prop=='LEKTOR_AMATOR' || prop=='NAPISY_ENG' || prop=='OTHER') continue;

				var typeLinks = linkByType[prop];
				var foundPremium = null;


				// first round search premium
				for(var j = 0; j < typeLinks.length; j++){
					if(typeLinks[j].premium==true){
						foundPremium = typeLinks[j];
						break;
					}
				}

				if(foundPremium){ added++; continue; } //:TODO after found, check possible quality updates
				if(added>0 && prop=='ENG') continue;
				if(prop=='NAPISY_PL') continue;

				var linkToDownload = null;

				// select link
				for(var j = 0; j < typeLinks.length; j++){
					if(typeLinks[j].premium==true) continue;

					if(typeLinks[j].hosting=='openload' || typeLinks[j].hosting=='streamango'){
						if(linkToDownload){
							if(linkToDownload.quality==typeLinks[j].quality){
								linkToDownload = typeLinks[j];
								break;
							}
						}else{
							linkToDownload = typeLinks[j];
							break;
						}
					}else if(typeLinks[j].hosting=='verystream'){
						if(!linkToDownload) linkToDownload = typeLinks[j];
					}else if(typeLinks[j].hosting=='cda'){
						if(!linkToDownload) linkToDownload = typeLinks[j];
					}else if(typeLinks[j].hosting=='vidoza'){
						if(!linkToDownload) linkToDownload = typeLinks[j];
					}/*else if(typeLinks[j].hosting=='rapidvideo'){
						if(!linkToDownload) linkToDownload = typeLinks[j];
					}*/else if(typeLinks[j].hosting=='gounlimited'){
						if(!linkToDownload) linkToDownload = typeLinks[j];
					} //:TODO check possible quality updates in other hosts
				}

				if(!linkToDownload) continue;
				added++;
				linkToDownload.premium = undefined;
				linkToDownload.date = undefined;
				linkToDownload._id = undefined;
				allLinksToDownload.push(linkToDownload);
			}

			if(allLinksToDownload.length>0){
				movies[i].title_org = movies[i].title_org.replace('&amp;', 'and');
				movies[i].title_org = movies[i].title_org.replace('#', '');
				movies[i].title_org = movies[i].title_org.replace('&', 'and');

				var eli = {
					movie_id: movies[i]._id,
					title: movies[i].title_org,
					year: movies[i].year,
					links: allLinksToDownload,
				}
				data.push(eli);
			}
		}

		res.json(data);
	});
});


app.get('/api/get-need-upload', function(req, res){
	var ip = getIP(req);

	if(ip!='109.231.11.141' && ip!='54.36.109.213' && ip!='89.161.19.235'){
		res.status(403).send('Forbidden');
		return;
	}

	var hosting = req.query.hosting;
	if(!hosting){ res.status(403).end('Hosting query required.'); return; }
	
	var series_id = req.query.series_id;
	var s_id = null;

	if(series_id && series_id.length>0){
		if(typeof series_id != 'string'){ res.status(500).end('Internal Server Error'); return; }
		else if(!VALIDATOR.isMongoId(series_id)){ res.status(500).end('Internal Server Error'); return; }

		s_id = series_id;
	}
	

	let usersList = [ // check added links
		'59d171998447c35808cc3ada', // YUIUMI
		'5b626ac3d134574cc877b611', //Mercy
		'5b626af9d134574cc877b613', //Kattatol
		'5b626b23d134574cc877b618', //Hum9921
		'5b626b99cfaef94cd8e0402f', //10Szum
		'5b626bb6151bb94cdea6d829', //Crank
	]

	if(hosting=='rapidvideo'){
		usersList = [
			'5d43444bfaf1393c73b64545', // Presili
		]
	}

/*	var IP = getIP(req);
	
	if(IP!='54.36.174.60'){ res.status(401).end('Uunauthorized'); return; }*/

	var episodesArrOpenload = [];
	var episodesArrRapidvideo = [];
	var episodesArrStreamango = [];
	var episodesArrGounlimited = [];
	var episodesArrVidoza = [];
	var episodesArrVeryStream = [];

	var moviesArrOpenload = [];
	var moviesArrRapidvideo = [];
	var moviesArrStreamango = [];
	var moviesArrGounlimited = [];
	var moviesArrVidoza = [];
	var moviesArrVeryStream = [];

	var epiPages = (page, cb) => {
		var q = {};
		if(s_id){
			q.series_id = s_id;
		}

		episodeModel.find(q)
		.select('links series_id season_num episode_num')
		.populate({
			path: 'links',
			select: 'type quality hosting premium video_id user',
		})
		.populate({
			path: 'series_id',
			select: 'title_org',
		})
		//.limit(100)
		.lean()
		.sort({date: -1})
		.exec((err, episodes) => {
			if(err){ cb(true); return; }
			if(episodes.length==0){ cb(false); return; }


			if(hosting=='openload'){
				// openload
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isOpenloadLink = links.find(el => {
							return el.hosting=='openload' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

	/*					var isOpenloadLinkLow = links.find(el => {
							return el.hosting=='openload' && el.quality=='LOW' && el.type==premLink.type && usersList.includes(String(el.user));
						});*/

						var hosts = [];

						if(!isOpenloadLink/* || !isOpenloadLinkLow*/) hosts.push('openload');
						
						/*if(!isOpenloadLinkLow){
							var prm = {
								"type": premLink.type,
								"quality": 'LOW',
								"video_id": premLink.video_id,
								'conv_need': true,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}*/


						if(!isOpenloadLink){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrOpenload.push(epi);
					}
				}
			}

			if(hosting=='rapidvideo'){
				//rapidvideo
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isRapidvideoLink = links.find(el => {
							return el.hosting=='rapidvideo' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isRapidvideoLink) hosts.push('rapidvideo');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrRapidvideo.push(epi);
					}
				}
			}


			if(hosting=='streamango'){
				// streamango
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isStreamangoLink = links.find(el => {
							return el.hosting=='streamango' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isStreamangoLink) hosts.push('streamango');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrStreamango.push(epi);
					}
				}
			}

			if(hosting=='gounlimited'){
				// gounlimited
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isGounlimitedLink = links.find(el => {
							return el.hosting=='gounlimited' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isGounlimitedLink) hosts.push('gounlimited');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrGounlimited.push(epi);
					}
				}
			}


			if(hosting=='vidoza'){
				// vidoza
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isVidozaLink = links.find(el => {
							return el.hosting=='vidoza' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isVidozaLink) hosts.push('vidoza');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrVidoza.push(epi);
					}
				}
			}


			if(hosting=='verystream'){
				// verystream
				for(var i = 0; i < episodes.length; i++){
					if(!episodes[i].links || episodes[i].links.length==0) continue;

					var epi = {};
					epi.items = [];

					var links = episodes[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					epi._id = episodes[i]._id;
					epi.title = episodes[i].series_id.title_org+' s'+pad(episodes[i].season_num)+'e'+pad(episodes[i].episode_num);
					epi.type = 'episode';

					isPremiumLink.forEach(premLink => {
						var isVerystreamLink = links.find(el => {
							return el.hosting=='verystream' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isVerystreamLink) hosts.push('verystream');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							epi.items.push(item);
						}
					});
					if(epi.items.length>0){
						episodesArrVeryStream.push(epi);
					}
				}
			}

			cb(false);
		});
	}

	var movPages = (page, cb) => {
		if(s_id){ cb(false); return; }

		movieModel.find()
		.select('links title_org year')
		.populate({
			path: 'links',
			select: 'type quality hosting premium video_id user',
		})
		//.limit(100)
		.lean()
		.sort({date: -1})
		.exec((err, movies) => {
			if(err){ cb(true); return; }
			if(movies.length==0){ cb(false); return; }

			if(hosting=='openload'){
				// openload
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isOpenloadLink = links.find(el => {
							return el.hosting=='openload' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isOpenloadLink) hosts.push('openload');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrOpenload.push(mov);
					}
				}
			}


			if(hosting=='rapidvideo'){
				// rapidvideo
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isRapidvideoLink = links.find(el => {
							return el.hosting=='rapidvideo' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isRapidvideoLink) hosts.push('rapidvideo');


						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrRapidvideo.push(mov);
					}
				}
			}


			if(hosting=='streamango'){
				// streamango
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isStreamangoLink = links.find(el => {
							return el.hosting=='streamango' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isStreamangoLink) hosts.push('streamango');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrStreamango.push(mov);
					}
				}
			}


			if(hosting=='gounlimited'){
				// gounlimited
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isGounlimitedLink = links.find(el => {
							return el.hosting=='gounlimited' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isGounlimitedLink) hosts.push('gounlimited');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrGounlimited.push(mov);
					}
				}
			}


			if(hosting=='vidoza'){
				// vidoza
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isVidozaLink = links.find(el => {
							return el.hosting=='vidoza' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isVidozaLink) hosts.push('vidoza');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrVidoza.push(mov);
					}
				}
			}


			if(hosting=='verystream'){
				// verystream
				for(var i = 0; i < movies.length; i++){
					if(!movies[i].links || movies[i].links.length==0) continue;

					var mov = {};
					mov.items = [];

					var links = movies[i].links;

					var isPremiumLink = links.filter(el => {
						return el.premium && el.hosting=='premium';
					});

					if(isPremiumLink.length==0) continue;

					mov._id = movies[i]._id;
					mov.title = movies[i].title_org+' '+movies[i].year;
					mov.type = 'movie';

					isPremiumLink.forEach(premLink => {
						var isVerystreamLink = links.find(el => {
							return el.hosting=='verystream' && el.quality==premLink.quality && el.type==premLink.type && usersList.includes(String(el.user));
						});

						var hosts = [];

						if(!isVerystreamLink) hosts.push('verystream');
						

						if(hosts.length>0){
							var prm = {
								"type": premLink.type,
								"quality": premLink.quality,
								"video_id": premLink.video_id,
							}
							
							
							var item = {
								hosts: hosts,
								source: prm
							}
							mov.items.push(item);
						}
					});
					if(mov.items.length>0){
						moviesArrVeryStream.push(mov);
					}
				}
			}

			cb(false);
		});
	}
	
	

	ASYNC.waterfall([
	(cb2) => {
		epiPages(0, (err) =>{
			if(err){ cb2(true); return; }

			cb2(null);
		});
	},
	(cb2) => {
		movPages(0, (err) =>{
			if(err){ cb2(true); return; }

			cb2(null);
		});
	},
	], (err) => {
		if(err){ res.status(500).end('Internal Server Error'); return; }


		res.json({
			openload: {
				episodes: episodesArrOpenload,
				movies: moviesArrOpenload,
			},
			rapidvideo: {
				episodes: episodesArrRapidvideo,
				movies: moviesArrRapidvideo,
			},
			streamango: {
				episodes: episodesArrStreamango,
				movies: moviesArrStreamango,
			},
			gounlimited: {
				episodes: episodesArrGounlimited,
				movies: moviesArrGounlimited,
			},
			vidoza: {
				episodes: episodesArrVidoza,
				movies: moviesArrVidoza,
			},
			verystream: {
				episodes: episodesArrVeryStream,
				movies: moviesArrVeryStream,
			},

		});
	});
});

/*app.get('/xD', function(req, res){


UTILS.getPopularWeek(function(list){
	res.json(list);
})
	
});*/

app.get('/api/get-links-to-download', function(req, res){
	var ip = getIP(req);

	if(ip!='31.186.87.53' && ip!='54.36.109.213'){
		res.status(403).send('Forbidden');
		return;
	}

	linkModel.find({ $and: [{download_req: true}, {hosting: { $nin: [ 'anyfiles', 'premium', 'streamango' ] }}]})
	.lean()
	.select('hosting video_id date quality')
	.sort({date: -1})
	.limit(1)
	.exec(function(err, links){
		if(err){ res.status(500).end('Internal Server Error'); return; }

		for (var j = 0; j < links.length; j++) {
			var embed = null;

			for(var i = 0, len = VIDEO_HOSTING_LIST.length; i < len; i++){
				if(VIDEO_HOSTING_LIST[i].name==links[j].hosting){
					embed = VIDEO_HOSTING_LIST[i].embed_code;
					break;
				}
			}

			embed = embed.replace('#ID', links[j].video_id);
			embed = embed.replace('#WIDTH', '1280');
			embed = embed.replace('#HEIGHT', '720');

			if(links[j].hosting=='cda'){
				var q = '';
				switch(links[j].quality){
					case 'VERY_HIGHT':
						q = '1080p'; break;
					case 'HIGH':
						q = '720p'; break;
				}

				embed += '?wersja='+q;
			}



			links[j].embed = embed;
		}


		res.json(links);
	});
});

/*app.get('/download/file2', function(req, res){
	var link_id = req.query.file_id;

	if(link_id==null){ res.status(500).end('500 Internal Server Error'); return; }
	else if(!VALIDATOR.isMongoId(link_id)){ res.status(500).end('500 Internal Server Error'); return; }

	linkModel.find({_id: MONGO.Types.ObjectId(link_id)})
	.lean()
	.select()
	.exec(function(err, link){
		if(err){ res.status(500).end('500 Internal Server Error'); return; }
		if(link.length==0){ res.status(200).end('Link nie istnieje.'); return; }
		link = link[0];

		var embed_code = '';
		for(var i = 0; i < VIDEO_HOSTING_LIST.length; i++) {
			if(VIDEO_HOSTING_LIST[i].name==link.hosting){
				embed_code = VIDEO_HOSTING_LIST[i].embed_code;
				break;
			}
		}


		if(link.hosting!='openload'){ res.status(200).end('Hosting nie obsługiwany.'); return; }

		embed_code = embed_code.replace('#WIDTH', 1280);
		embed_code = embed_code.replace('#HEIGHT', 720);
		embed_code = embed_code.replace('#ID', link.video_id);
		embed_code = embed_code.replace('/embed/', '/f/');

		res.redirect(302, embed_code);
	});
});*/

/*app.get('/download/file', function(req, res){
	var movie_id = req.query.m_id;
	var type = req.query.type;
	var link_id = req.query.file_id;

	if(link_id==null){ res.status(500).end('500 Internal Server Error'); return; }
	else if(!VALIDATOR.isMongoId(link_id)){ res.status(500).end('500 Internal Server Error'); return; }

	if(movie_id==null){ res.status(500).end('500 Internal Server Error'); return; }
	else if(!VALIDATOR.isMongoId(movie_id)){ res.status(500).end('500 Internal Server Error'); return; }
	
	var model = movieModel;
	if(type==1){
		model = seriesModel;
	}

	model.find({_id: MONGO.Types.ObjectId(movie_id)})
	.lean()
	.select()
	.exec(function(err, movie){
		if(err){ res.status(500).end('500 Internal Server Error'); return; }
		if(movie.length==0){ res.status(200).end('Film nie istnieje.'); return; }
		movie = movie[0];

		linkModel.find({_id: MONGO.Types.ObjectId(link_id)})
		.lean()
		.select()
		.populate({
			path: 'user'
		})
		.exec(function(err, link){
			if(err){ res.status(500).end('500 Internal Server Error'); return; }
			if(link.length==0){ res.status(200).end('Link nie istnieje.'); return; }
			link = link[0];

			var base_offer_url = 'https://chomik-24.pl/cb6d8dd2?set=';
			var file_size = ((Math.random() * 1000) + 500).toFixed(2);
			var file_size_txt = file_size+' MB'

			var comments = [
				'Dzięki za wstawkę.',	
				'Polecam tego chomika.',
				'Super wstawka.',
				'Super film',
				'Co mogę powiedzieć, po prostu super',
				'Szybko i sprawnie pobiera!!!',
				'Dobra konwersja Plik waży tylko: '+file_size_txt,
				'Polecam',
				':D',
				'Długo się pobiera...',
				'cudo! 💔',
				'Cóż trzeba potwierdzić numer ale dostałem to co chciałem :)',
				'Dzięki działa',
				'Trzeba podać numer ale przynajmniej działa :)',
				'U mnie w miarę szybko pobrało więc to na plus',
				'Szybko i sprawnie :) Najlepiej brać wieczorem kiedy serwery są przeciążone a tutaj pobierasz z maksymalną prędkością',
				'No i super alternatywa na wieczory kiedy wszystko laguje',
				'Mi działa dzięki',
				'Mega SZTOSS',
				'Mistrzostwo.',
				'WOOOOOOOOOOOOOW!!!:)))',
				'Ciarki na całym ciele... 10/10',
				'Podałem numer telefonu i kod. Pobrało bez problemów :D',
				'Jestem w szoku, że to działa.',
				'W końcu mogę obejrzeć offline. Super'
			]

			shuffle_arr(comments);

			var comments_num =  Math.floor((Math.random() * 7) + 1);

			var nicknames = [
				'Falqo', 'Szani99', 'IDontHaveMuchTime',
				'WipirdolV2', 'Toreto780', 'gajewski77',
				'Kar000lek', 'kszyhu', 'Bodek49',
				'Pawel281985', 'katarzynak', 'hoflegor',
				'veiuu', 'Snicki', 'jakobs', 'costam',
				'tom7708', 'garnuch8', 'ninja',
				'MlekoZpapy', 'yurin', 'Buy2Play',
				'DawKow54226', 'Roszer', 'lisu2000',
				'ritaa', 'Yaaqb', 'Patryk1231600',
				'Daigotsu1', 'CzarnyKot', 'Martyna',
				'oliwix_x02', 'PiotrChlebak', 'mxrider184',
				'erdek', 'krissta', 'Mirrar',
				'szpadlicho', 'zuzkasn', 'klosrz',
				'Orzel984', 'kaja880', 'Reetr0',
				'xmbabczynskax', 'Joanna121', 'glaz84',
				'Flint', 'Naxiz', 'lolmaster',
				'DaXteRizi', 'xxNeelxx', 'EpicPL',
				'kerwana', 'zaserialowana', 'Akiko13',
				'malenka2306', 'MasterGameskkkk', 'yoroshi',
				'intears', 'UgLyHuman', 'Drendondona',
				'arturek', 'FreexX', 'nodotname',
				'kukula1983', 'tomasxx', 'Divven'
			]

			shuffle_arr(nicknames);

			var dates = [];

			var multipler = Math.floor((Math.random() * 5000) + 1);
			for(var i = 1; i <= comments_num; i++){
				dates.push(multipler*i*-1);
			}

			var files = ['gierki.rar', 'inne_filmy.rar', 'seriale.rar', 'muza.rar'];
			shuffle_arr(files);

			var options = {
				'done': BASE_URL+'/download/file2?file_id='+link_id,
				'file_name': movie.url+'.'+link.type+'.mp4',
				'file_size': file_size_txt,
				'uploader': link.user.username,
				'icon': 'dir',
				'rate': movie.rate,
				'num_of_rates': movie.votes_count,
				'description': movie.desc,
				comments: comments.slice(0, comments_num),
				comments_nicks: nicknames.slice(0, comments_num),
				comments_dates: dates,
				files: files,
				files_icons: ['rar', 'rar', 'rar', 'rar'],
			}

			var json = JSON.stringify(options);
			var base64 = Buffer.from(json).toString('base64');
			var url = base_offer_url+base64;
			//res.json(options)
			res.redirect(302, url);
		});
	});
});*/

/*app.get('/dupa', function(req, res){
	app.render('emails/odpowiedz', {}, function(err, html) {
		var smtpConfig = {
			host: SMTP.host,
			secure: true,
		    auth: {
		        user: SMTP.user,
		        pass: SMTP.pass
		    }
		};
		
		var transport = NODEMAILER.createTransport(smtpConfig);
		var data = {
			from : 'fili.cc <kontakt@fili.cc>',
			to :  'Adam Sewastianiuk <sewadsa@gmail.com>',
			subject : 'Odpowiedź na kontakt',
			html  : html,
			attachments: [{
				filename: 'logo.png',
				path: 'http://'+HOSTNAME+':'+PORT+'/assets/img/email_template/logo.png',
				cid: 'logo'
			}]
		}

		transport.sendMail(data, function(err){
			if(err) throw err;
			res.send('poszlo')
		});
	});

});*/








app.get('/modals/:name', function(req, res){
	var code = req.query ? req.query.code:'';
	var code2 = req.query ? req.query.code2:'';
	var name = req.params.name;

	req.INJECT_DATA.google_index = false;

	switch(name)
	{
		case 'add_link':
			if(!code || code.length==0){
				show400(req, res); return;
			}
			break;
		case 'add_link_episode':
			if(!code || code.length==0){
				show400(req, res); return;
			}
			if(!code2 || code2.length==0){
				show400(req, res); return;
			}
			break;
		case 'edit_link_movie':
		case 'report_link_movie':
		case 'report_episode':
			var ref = req.query ? req.query.ref:'';
			if(!code || code.length==0){
				show400(req, res); return;
			}
			if(!ref || ref.length==0){
				show400(req, res); return;
			}
			var saltArr = ref.split('_');
			if(saltArr.length>1){
				ref = saltArr[1];
			}
			req.INJECT_DATA.ref = ref;
			break;
		case 'report_link_series':
		case 'edit_link_series':
			var ref = req.query ? req.query.ref:'';
			if(!code || code.length==0){
				show400(req, res); return;
			}
			if(!code2 || code2.length==0){
				show400(req, res); return;
			}
			if(!ref || ref.length==0){
				show400(req, res); return;
			}
			var saltArr = ref.split('_');
			if(saltArr.length>1){
				ref = saltArr[1];
			}
			req.INJECT_DATA.ref = ref;
			break;
	}

	req.INJECT_DATA.code = code;
	req.INJECT_DATA.code2 = code2;
	switch(name)
	{
		case 'edit_link_movie':
			if(req.INJECT_DATA.user_status.code!=3){ show401(req, res); return; }
			if(req.INJECT_DATA.user_status.data.type=='USER'){ show401(req, res); return; }

			req.body.ref = req.INJECT_DATA.ref;
			req.body.code = req.INJECT_DATA.code;
			req.INJECT_DATA.type = 0;
			MOVIE.getLinkInfo(req, res, function(answer){
				if(answer.error){ show400(req, res); return; }
				req.INJECT_DATA.info = answer.data;
				res.render('edit_link', req.INJECT_DATA);
			});
			break;
		case 'edit_link_series':
			if(req.INJECT_DATA.user_status.code!=3){ show401(req, res); return; }
			if(req.INJECT_DATA.user_status.data.type=='USER'){ show401(req, res); return; }

			req.body.ref = req.INJECT_DATA.ref;
			req.body.code = req.INJECT_DATA.code;
			req.body.code2 = req.INJECT_DATA.code2;
			req.INJECT_DATA.type = 1;
			SERIES.getLinkInfo(req, res, function(answer){
				if(answer.error){ show400(req, res); return; }
				req.INJECT_DATA.info = answer.data;
				res.render('edit_link', req.INJECT_DATA);
			});
			break;
		case 'edit_name_episode':
			if(req.INJECT_DATA.user_status.code!=3){ show401(req, res); return; }
			if(req.INJECT_DATA.user_status.data.type=='USER'){ show401(req, res); return; }

			req.body.code2 = req.INJECT_DATA.code2;
			SERIES.getEpisodeName(req, res, function(answer){
				if(answer.error){ show400(req, res); return; }
				req.INJECT_DATA.info = answer.data;
				res.render('edit_name_episode', req.INJECT_DATA);
			});
			break;
		case 'report_link_movie':
			req.INJECT_DATA.type = 0;
			res.render('report_link', req.INJECT_DATA);
			break;
		case 'report_link_series':
			req.INJECT_DATA.type = 1;
			res.render('report_link', req.INJECT_DATA);
			break;
		case 'login':
			USER.isLoginRecaptchaRequired(req, function(captcha_required){
				req.INJECT_DATA.login_captcha_required = captcha_required;
				res.render(name, req.INJECT_DATA);
			});
			break;
		case 'register':
		case 'remind':
		case 'add_movie_series_step_0':
		case 'add_link':
		case 'add_link_episode':
		case 'add_episode':
		case 'report_episode':
			res.render(name, req.INJECT_DATA);
			break;
		default:
			show400(req, res);
			break;
	}
});

var CACHE_SCRIPTS1 = null;

app.get('/assets/js/scripts.'+VERSION+'.js', function(req, res){
	if(is_dev_mode) res.setHeader('Cache-Control', 'public, no-cache');
	else res.setHeader('Cache-Control', 'public, max-age=2678400');

	res.set('content-type', 'application/javascript; charset=UTF-8');

	if(CACHE_SCRIPTS1!=null && !is_dev_mode){ res.send(CACHE_SCRIPTS1); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/js/scripts.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }

		CACHE_SCRIPTS1 = content;
		res.send(content);
	});
});

var CACHE_SCRIPTS2 = null;

app.get('/assets/js/scripts.panel.'+VERSION+'.js', function(req, res){
	if(is_dev_mode) res.setHeader('Cache-Control', 'public, no-cache');
	else res.setHeader('Cache-Control', 'public, max-age=2678400');


	res.set('content-type', 'application/javascript; charset=UTF-8');

	if(CACHE_SCRIPTS2!=null && !is_dev_mode){ res.send(CACHE_SCRIPTS2); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/js/scripts.panel.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }

		CACHE_SCRIPTS2 = content;
		res.send(content);
	});
});

var CACHE_CSS1 = null;

app.get('/assets/css/style.'+VERSION+'.css', function(req, res){
	if(is_dev_mode) res.setHeader('Cache-Control', 'public, no-cache');
	else res.setHeader('Cache-Control', 'public, max-age=2678400');

	res.set('content-type', 'text/css; charset=UTF-8');

	if(CACHE_CSS1!=null && !is_dev_mode){ res.send(CACHE_CSS1); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/css/style.css'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }

		CACHE_CSS1 = content;
		res.send(content);
	});
});

var CACHE_CSS2 = null;

app.get('/assets/css/style.mobile.'+VERSION+'.css', function(req, res){
	if(is_dev_mode) res.setHeader('Cache-Control', 'public, no-cache');
	else res.setHeader('Cache-Control', 'public, max-age=2678400');

	res.set('content-type', 'text/css; charset=UTF-8');

	if(CACHE_CSS2!=null && !is_dev_mode){ res.send(CACHE_CSS2); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/css/style_mobile.css'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }

		CACHE_CSS2 = content;
		res.send(content);
	});
});


var CACHE_DBB1 = null;

app.get('/ads/dbb1.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_DBB1!=null){ res.send(CACHE_DBB1); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/dbb1.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }

		CACHE_DBB1 = content;
		res.send(content);
	});
});

var CACHE_DBB2 = null;

app.get('/ads/dbb2.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_DBB2!=null){ res.send(CACHE_DBB2); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/dbb2.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_DBB2 = content;
		res.send(content);
	});
});

var CACHE_RECT1 = null;

app.get('/ads/rect1.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_RECT1!=null){ res.send(CACHE_RECT1); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/rect1.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_RECT1 = content;
		res.send(content);
	});
});

var CACHE_HALF1 = null;

app.get('/ads/half1.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_HALF1!=null){ res.send(CACHE_HALF1); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/half1.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_HALF1 = content;
		res.send(content);
	});
});

var CACHE_MRECT2 = null;

app.get('/ads/rect2.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_MRECT2!=null){ res.send(CACHE_MRECT2); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/rect2.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_MRECT2 = content;
		res.send(content);
	});
});

var CACHE_MRECT3 = null;

app.get('/ads/rect3.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_MRECT3!=null){ res.send(CACHE_MRECT3); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/rect3.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_MRECT3 = content;
		res.send(content);
	});
});

var CACHE_MRECT4 = null;

app.get('/ads/rect4.js', function(req, res){
	res.set('Cache-Control', 'public, no-cache');
	res.set('content-type', 'application/javascript');

	if(CACHE_MRECT4!=null){ res.send(CACHE_MRECT4); return; }

	FS.readFile(PATH.join(PUBLIC_PATH, 'assets/ads/rect4.js'), 'utf8', function(err, content) {
		if(err){ res.status(500).end('Internal Error'); return; }
		
		CACHE_MRECT4 = content;
		res.send(content);
	});
});





app.get('*', function(req, res){
	show404(req, res);
});