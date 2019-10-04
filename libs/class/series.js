
var SERIES = {}

SERIES.add = function(req, res, CB)
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

	self.getVideo = function(id, cb)
	{
		if(id==-1){ cb(null); return; }

		FILMWEB.getFilmVideosById(id, function(err, video_list){
			if(err){ self.send(); return; }

			if(video_list.length==0) cb(null);
			else{
				var ulr = video_list[0];
				ulr = ulr.replace('https:', '');
				ulr = ulr.replace('http:', '');
				cb(ulr);
			}
		});
	}

	self.add = function()
	{	
		if(self.data.title_org==null){ self.send(); return; }
		else if(self.data.title_org.length==0){ self.send(1, 'Uzupełnij oryginalny tytuł.'); return; }
		else if(self.data.title_org.length>100){ self.send(1, 'Oryginalny tytuł może mieć maksymalnie 100 znaków.'); return; }

		if(self.data.title==null){ self.send(); return; }
		else if(self.data.title.length==0){ self.send(1, 'Uzupełnij polski tytuł.'); return; }
		else if(self.data.title.length>100){ self.send(1, 'Polski tytuł może mieć maksymalnie 100 znaków.'); return; }

		if(self.data.year==null){ self.send(); return; }
		else if(self.data.year.length==0){ self.send(1, 'Uzupełnij date premiery.'); return; }
		else if(self.data.year.length!=10){ self.send(1, 'Data premiery wymagane 10 cyfr.'); return; }
		else if(!VALIDATOR.isISO8601(self.data.year)){ self.send(1, 'Wpisz prawidłową date premiery. YYYY-MM-DD'); return; }

		self.data.premiere = self.data.year;
		var date = new Date(self.data.year);
		self.data.year = date.getFullYear();
		
		if(self.data.genres==null){ self.send(1, 'Wybierz kategorie.'); return; }
		else if(self.data.genres.length==0){ self.send(1, 'Wybierz kategorie.'); return; }
		else if(typeof self.data.genres == 'object' && self.data.genres.length>3){ self.send(1, 'Maksymalnie można wybrać 3 kategorie.'); return; }

		if(typeof self.data.genres == 'object'){
			for(var i = 0, len = self.data.genres.length; i < len; i++) {
				if(GENRES_LIST.indexOf(self.data.genres[i])==-1){ self.send(); return; }
			}
		}else{
			if(GENRES_LIST.indexOf(self.data.genres)==-1){ self.send(); return; }
		}

		if(self.data.desc==null){ self.send(); return; }
		else if(self.data.desc.length==0){ self.send(1, 'Uzupełnij opis serialu.'); return; }
		else if(self.data.desc.length>600){ self.send(1, 'Opis serialu może mieć maksymalnie 600 znaków.'); return; }

		if(self.data.id==null){ self.send(); return; }
		else if(self.data.id.length==0){
			self.data.id = -1;
		}

		self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

		if(self.data.user_id==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }

		if(self.data.poster==null){ self.send(); return; }
		else if(self.data.poster.length==0){ self.send(1, 'Dodaj okładkę.'); return; }

		seriesModel.countDocuments({filmweb_id: self.data.id}, function(err, series){
			if(err){ self.send(); return; }

			if(self.data.id!=-1)
				if(series>0){ self.send(1, 'Serial już istnieje w bazie.'); return; }

			userModel.find({_id: self.data.user_id})
			.limit(1)
			.lean()
			.exec(function(err, user){
				if(err){ self.send(); return; }
				if(user.length==0){ self.send(); return; }
				user = user[0];

				var keys = ['serial', 'serial online'];
				var keys_from_title = desc_to_keywords(self.data.title);
				var keys_from_title_org = desc_to_keywords(self.data.title_org);
				var keys_from_desc = desc_to_keywords(self.data.desc);

				keys = keys.concat(keys_from_title);
				keys = keys.concat(keys_from_title_org);
				keys = keys.concat(keys_from_desc);

				var keys = keys.filter(function(elem, index, self) {
					return index == self.indexOf(elem);
				});

				keys.sort();

				var user_access = user.type;
				var url = url_title(self.data.title);

				self.getVideo(self.data.id, function(video_url){
					var base64ImageArray = self.data.poster.split('data:image/jpeg;base64,');
					if(base64ImageArray.length!=2){ self.send(); return; }

					var base64Image = base64ImageArray.pop();
					var imageBuffer = Buffer.from(base64Image, 'base64');

					var tmp_filename = 'tmp.'+SHORT_ID.generate()+'.jpg';
					var tmp_path = PATH.join(PUBLIC_PATH, 'uploads/tmp/'+tmp_filename);

					var filename = self.data.id+'.'+SHORT_ID.generate()+'_uncompressed.jpg';
					var path = PATH.join(PUBLIC_PATH, 'uploads/thumbs/'+filename);

					FS.writeFile(tmp_path, imageBuffer, function(err){
						if(err){ self.send(); return; }

						SHARP(tmp_path)
						.resize(200, 200)
						.toFile(path, function(err){
							if(err){ self.send(); return; }

							FS.unlinkSync(tmp_path);

							file_title = url.replace(new RegExp('-', 'g'), '.');

							var filename2 = file_title+'.'+SHORT_ID.generate()+'.jpg';
							var path2 = PATH.join(PUBLIC_PATH, 'uploads/thumbs/'+filename2);

							translator = new JPEGTRAN(['-optimize', '-progressive']);
							var read = FS.createReadStream(path);
							var write = FS.createWriteStream(path2);

							translator.on('end', function(){
								FS.unlinkSync(path);

								var status = 'PUBLIC';
								if(user_access=='USER'){
									status = 'WAIT';
								}

								var title = url_title(self.data.title);
								var title_org = url_title(self.data.title_org);

								title = title.replace(new RegExp('-', 'g'), ' ');
								title_org = title_org.replace(new RegExp('-', 'g'), ' ');
								
								var lacznie = title;

								if(title!=title_org)
									lacznie = title+' '+title_org;

								var query = {
									_id : MONGO.Types.ObjectId(),
									title : self.data.title,
									title_org : self.data.title_org,
									filmweb_id : parseInt(self.data.id),
									year: self.data.year,
									premiere: self.data.premiere,
									poster : '/uploads/thumbs/'+filename2,
									desc : self.data.desc,
									url : url,
									genres : self.data.genres,
									status : status,
									user : MONGO.Types.ObjectId(self.data.user_id),
									keywords: keys,
									search : lacznie,
									trailer_url : video_url,
								}

								seriesModel.create(query, function(err, series){
									if(err){ self.send(); return; }

									var data = {
										redirect: '/serial/'+url+'/'+series.num,
									}
									
									self.send(0, data);
								});
							});

							translator.on('error', function(){
								FS.unlinkSync(path);
								if(err){ self.send(); return; }
							});

							read.pipe(translator).pipe(write);
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.add();
}


SERIES.getByUrl = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else if(type==3){
			self.answer = { error: true, code: 3, data: data }
			CB(self.answer);
		}else if(type==4){
			self.answer = { error: true, code: 4 }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	var url = req.params.url;
	var num = req.params.num;

	seriesModel.find({ $or: [ {num: num}, {num_alter: num } ]})
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: '_id',
	})
	.populate({
		path: 'episodes',
		select: 'season_num episode_num url episode_num_alter num title report users_viewed',
		options: { sort: {season_num: 1} }
	})
	.select('episodes user status poster title title_org url rate genres year desc num fav_users num_alter votes_count trailer_url')
	.exec(function(err, series){
		if(err){ self.send(); return; }

		if(series.length==0){
			counterModel.findOne({model: 'Series', field: 'num'})
			.lean()
			.select('count')
			.exec(function(err, data){
				if(err){ self.send(); return; }
				if(!data){ self.send(); return; }

				if(data.count>=num) self.send(4);
				else self.send();
			});
			return;
		}

		series = series[0];

		if(series.num!=num){ self.send(3, '/serial/'+series.url+'/'+series.num); return; }

		var isPremiumUser = false;;
		if(req.INJECT_DATA.user_status.code==3){
			isPremiumUser = req.INJECT_DATA.user_status.data.premium;
		}

		var isModAdmin = false;
		if(req.INJECT_DATA.user_status.code==3){
			isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
		}

		if(series.status=='PREMIUM' && !isPremiumUser && !isModAdmin){ self.send(4); return; }

		if(req.INJECT_DATA.user_status.code==3){
			var user_id = req.INJECT_DATA.user_status.data._id;

			if(series.episodes){
				for(var i = 0, len = series.episodes.length; i < len; i++){
					if(series.episodes[i].users_viewed){
						series.episodes[i].viewedByYou = false;

						for(var j = 0, len2 = series.episodes[i].users_viewed.length; j < len2; j++){
							if(String(series.episodes[i].users_viewed[j])==String(user_id)){
								series.episodes[i].viewedByYou = true;
								break;
							}
						}
					}
				}
			}
		}

		if(series.url!=url){ self.send(3, '/serial/'+series.url+'/'+num); return; }

		if(req.INJECT_DATA.user_status.code==3){
			voteModel.find({ $and: [{ user_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id) }, { series_id: MONGO.Types.ObjectId(series._id) }] })
			.limit(1)
			.lean()
			.select('vote')
			.exec(function(err, vote){
				if(err){ self.send(); return; }
				if(vote.length==0){ self.send(0, series); return; }
				vote = vote[0];

				series.votedByYou = vote.vote;
				self.send(0, series);
			})
		}else{
			self.send(0, series);
		}
	});
}

SERIES.getByUrlEpi = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else if(type==3){
			self.answer = { error: true, code: 3, data: data }
			CB(self.answer);
		}else if(type==4){
			self.answer = { error: true, code: 4}
			CB(self.answer);
		}else if(type==5){
			self.answer = { error: true, code: 5}
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	var num = req.params.num;
	var num2 = req.params.num2;
	var url = req.params.url;
	var url2 = req.params.url2;

	var season_num = -1;
	var episode_num = -1;

	if(!num || num.length==0){ self.send(); return; }
	if(!num2 || num2.length==0){ self.send(); return; }
	if(!url || url.length==0){ self.send(); return; }
	if(!url2 || url2.length==0){ self.send(); return; }

	var episode_num_alter = null;

	if(num.indexOf('s')!=-1 && num.indexOf('e')!=-1){
		num = num.slice(1);
		var arr = num.split('e');
		arr[1] = arr[1].replace('-', '');
		if(arr.length<2){ self.send(); return; }

		season_num = Number(arr[0]);
		episode_num = Number(arr[1]);
		if(arr.length==3) episode_num_alter = Number(arr[2]);
	}

	ASYNC.waterfall([
		function(cb){
			var additional_select = '';
			if(req.INJECT_DATA.user_status.code!=3){
				additional_select = ' -users_viewed';
			}

			episodeModel.find({ num: num2 })
			.limit(1)
			.lean()
			.populate({
				path: 'links',
				select: '_id hosting quality report status user type premium file_size video_id',
				populate: {
					path: 'user',
					select: '_id username',
				}
			})
			.populate({
				path: 'vote_logs',
				select: 'user_id vote',
			})
			.populate({
				path: 'comments',
				select: '_id user vote_logs spoilers message like_up like_down date status',
				populate: [
					{
						path: 'user',
						select: '_id username avatar premium_expire',
					},
					{
						path: 'vote_logs',
						select: 'user_id vote',
					},
				]

			})
			.select('-report_desc -report -update_date -date -user'+additional_select)
			.exec(function(err, episode){
				if(err){ cb(err); return; }
				if(episode.length==0){ cb('not_found'); return; }
				cb(null, episode[0]);
			});
		},
		function(episode, cb){
			seriesModel.find({ _id: episode.series_id })
			.limit(1)
			.lean()
			.populate({
				path: 'user',
				select: '_id'
			})
			.select('-episodes -filmweb_id -update_date -date')
			.exec(function(err, series){
				if(err){ cb(err); return; }
				if(series.length==0){ cb('not_found'); return; }
				cb(null, episode, series[0]);
			});
		},
		function(episode, series, cb) {
			var alter = false;

			if(episode.episode_num_alter!=null){
				if(episode.episode_num_alter!=episode_num_alter) alter = true;
			}

			if(String(series.url)!=String(url) ||
				episode.season_num!=season_num ||
				episode.episode_num!=episode_num ||
				alter ||
				episode.url!=String(url2)){
					var response_url = '/serial/'+series.url+'/'+'s'+pad(episode.season_num)+'e'+pad(episode.episode_num)+(episode.episode_num_alter?'-e'+pad(episode.episode_num_alter):'')+'/'+episode.url+'/'+episode.num;

					self.send(3, response_url);  
					cb(null, episode, series, 'SENDED');
					return;
			}

			var additional_select = '';
			if(req.INJECT_DATA.user_status.code==3){
				additional_select = ' users_viewed';
			}

			episodeModel.find({ $and: [{series_id: series._id}/*, {season_num: episode.season_num}*/] })
			.lean()
			.select('_id episode_num season_num episode_num_alter url title num'+additional_select)
			.exec(function(err, episodes){
				if(err){ cb(err); return; }
				if(!episodes){ cb('not_found'); return; }
				cb(null, episode, series, episodes);
			});
		}
	], function(err, episode, series, episodes){
		if(err){
			if(err=='not_found'){
				counterModel.findOne({model: 'Episode', field: 'num'})
				.lean()
				.select('count')
				.exec(function(err, data){
					if(err){ self.send(); return; }
					if(!data){ self.send(); return; }

					if(data.count>=num2) self.send(4);
					else self.send(5);
				});
			}else self.send(); 
			return; 
		}

		if(episodes=='SENDED') return;

		var isPremiumUser = false;;
		if(req.INJECT_DATA.user_status.code==3){
			isPremiumUser = req.INJECT_DATA.user_status.data.premium;
		}

		var isModAdmin = false;
		if(req.INJECT_DATA.user_status.code==3){
			isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
		}

		var q_status = { $or: [{ status: 'PUBLIC' }] }
		if(isPremiumUser){
			q_status = { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] }
		}

		if(series.status=='PREMIUM' && !isPremiumUser && !isModAdmin){ self.send(4); return; }

		if(episode.links.length>0 && !req.INJECT_DATA.isBot){
			episode.views++;
			episodeModel.updateOne({ _id: episode._id }, { $inc: { views: 1 } }, function(err){});
		}

		for(var i = 0, len = episode.comments.length; i < len; i++){
			if(!episode.comments[i]) continue;
			if(!episode.comments[i].user) continue;
			if(!episode.comments[i].user.premium_expire) continue;

			var premium = false;
			if(MOMENT(episode.comments[i].user.premium_expire).isAfter(MOMENT())) premium = true;
			episode.comments[i].user.premium = premium;
		}

		episode.viewedByYou = false;

		if(req.INJECT_DATA.user_status.code==3){
			var user_id = req.INJECT_DATA.user_status.data._id;

			for(var i = 0, len = episode.users_viewed.length; i < len; i++){
				if(String(episode.users_viewed[i])==String(user_id)){
					episode.viewedByYou = true;
					break;
				}
			}

			for(var i = 0, len = episodes.length; i < len; i++){
				for(var j = 0, len2 = episodes[i].users_viewed.length; j < len2; j++){
					if(String(episodes[i].users_viewed[j])==String(user_id)){
						episodes[i].viewedByYou = true;
						break;
					}
				}
			}
		}

		season_num = episode.season_num;

		var lowYear = Math.floor((Math.random()*10)+1);
		var topYear = Math.floor((Math.random()*10)+1);
		

		var gens = series.genres;
		if(gens.length>1){
			var removeGenNum = Math.floor((Math.random()*gens.length));
			gens.splice(removeGenNum, 1);
		}

		var qz = { $and: [ q_status, { episodes: { $ne: [] } }, { _id: { $ne: MONGO.Types.ObjectId(series._id) }}, { genres: { $in: gens }}, { year: { $gte: series.year-lowYear } }, { year: { $lte: series.year+topYear } }] };
		

		seriesModel.find(qz)
		.lean()
		.limit(6)
		.sort({viewed: -1})
		.select('title title_org year poster url num rate genres')
		.exec(function(err, seriess){
			if(err){ self.send(); return; }
			if(!seriess) seriess = [];

			if(req.INJECT_DATA.user_status.code==3){
				voteModel.find({ $and: [{ user_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id) }, { series_id: MONGO.Types.ObjectId(series._id) }] })
				.limit(1)
				.lean()
				.select('vote')
				.exec(function(err, vote){
					if(err){ self.send(); return; }
					if(vote.length==0){ self.send(0, {series:series, episodes:episodes, episode:episode, season_num:season_num, seriess:seriess}); return; }
					vote = vote[0];

					series.votedByYou = vote.vote;
					self.send(0, {series:series, episodes:episodes, episode:episode, season_num:season_num, seriess:seriess});
				})
			}else{
				self.send(0, {series:series, episodes:episodes, episode:episode, season_num:season_num, seriess:seriess});
			}
		})
	});
}


SERIES.getBy = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else if(type==3){
			self.answer = { error: true, code: 3, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	if(!req.query){ self.send(); return; }

	var query = req.query;

	var page = query.page?query.page:0;
	var sort_by = query.sort_by?query.sort_by:null;
	var type = query.type?query.type:null;

	var start_year = query.start_year?query.start_year:null;
	var end_year = query.end_year?query.end_year:null;
	var kat = query.kat?query.kat:null;

	if(page || sort_by || type || start_year || end_year || kat){
		req.INJECT_DATA.google_index = false;
	}

	var perPage = 12;

	page--;
	if(page<0) page = 0;

	if(sort_by!='date' && sort_by!='views' && sort_by!='rate' && sort_by){ self.send(3); return; }
	if(type!='desc' && type!='asc' && type){ self.send(3); return; }

	if(start_year && !VALIDATOR.isInt(String(start_year), {min: 1800, max: 2100})){ self.send(3); return; }
	if(end_year && !VALIDATOR.isInt(String(end_year), {min: 1800, max: 2100})){ self.send(3); return; }

	if(kat){
		var exist = false;
		if(typeof kat == 'string'){
			for(var i = 0, len = GENRES_LIST.length; i < len; i++) {
				if(kat==GENRES_LIST[i]){
					exist = true;
					break;
				}
			}
			kat = [kat];
		}else{
			for(var i = 0, len = GENRES_LIST.length; i < len; i++) {
				for(var j = 0, len2 = kat.length; j < len2; j++) {
					if(kat[j]==GENRES_LIST[i]){
						exist = true;
						break;
					}
				}
			}
		}
		if(!exist){ self.send(3); return; }
	}

	if(type=='desc') type = -1;
	else type = 1;

	if(!sort_by){
		sort_by = 'date';
		type = -1;
	}

	var isPremiumUser = false;;
	if(req.INJECT_DATA.user_status.code==3){
		isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	}

	var isModAdmin = false;
	if(req.INJECT_DATA.user_status.code==3){
		isModAdmin = req.INJECT_DATA.user_status.data.type == "ADMIN" || req.INJECT_DATA.user_status.data.type == "MODERATOR";
	}

	var q_status = { $or: [{ status: 'PUBLIC' }] }
	if(isPremiumUser || isModAdmin){
		q_status = { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] }
	}

	var stat = [
		q_status,
		{ episodes: { $gt: [] } },
	];

	kat = kat || [];
	

	var kats_or_stat = [];
	for(var i = 0; i < kat.length; i++) {
		kats_or_stat.push({genres: kat[i]});
	}

	if(kats_or_stat.length>0){
		stat.push({ $or: kats_or_stat });
	}

	if(start_year){
		stat.push({ year: { $gte: start_year } });
	}

	if(end_year){
		stat.push({ year: { $lte: end_year } });
	}

	var skip = perPage * page;

	sort_by_c = sort_by;
	if(sort_by=='date') sort_by_c = 'update_date';
	else if(sort_by=='views') sort_by_c = 'viewed';


	seriesModel.find({ $and: stat })
	.lean()
	.limit(perPage)
	.skip(skip)
	.select('title title_org year rate poster desc url num viewed genres episodes update_date date')
	.sort({ [sort_by_c]: type })
	.exec(function(err, series){
		if(err){ self.send(); return; }

		var url = BASE_URL+'/seriale';

		for(var i = 0, len = kat.length; i < len; i++){
			url = UTILS.buildURL(url, 'kat', kat[i].toLowerCase());
		}

		if(start_year)
			url = UTILS.buildURL(url, 'start_year', start_year);

		if(end_year)
			url = UTILS.buildURL(url, 'end_year', end_year);

		var urlPages = url;

		urlPages = UTILS.buildURL(urlPages, 'sort_by', sort_by);
		urlPages = UTILS.buildURL(urlPages, 'type', type==-1?'desc':'asc');

		var sep = url.indexOf('?') > -1 ? '' : '?';
		url += sep;

		var sep = urlPages.indexOf('?') > -1 ? '' : '?';
		urlPages += sep;

		seriesModel.countDocuments({ $and: stat })
		.lean()
		.exec(function(err, series_count){
			if(err){ self.send(); return; }

			var maxPages = Math.ceil(series_count / perPage);

			if((page+1)>maxPages){
				if(maxPages>0){
					self.send(3, url); return;
				}
			}
	
			self.send(0, {series:series, status: {kats: GENRES_LIST, katsEnabled: kat, start_year: start_year, end_year: end_year, sort_by:sort_by, type:type, url:url, urlPages:urlPages, page:(page+1), maxPage:maxPages}})
		});
	});


/*

	var series = SERIES_PAGE ? SERIES_PAGE.series.slice():[];
	var katsAvailable = SERIES_PAGE ? SERIES_PAGE.katsAvailable:[];

	for(var i = 0; i < series.length; i++){
		var removed = false;
		if(series[i] && series[i].count_links==0){
			series.splice(i, 1);
			removed = true;
		}if(series[i] && series[i].episodes.length==0){
			series.splice(i, 1);
			removed = true;
		}else if(series[i] && ver){
			var exist = false;
			loop:
			for(var l = 0, len4 = series[i].episodes.length; l < len4; l++){
				for(var j = 0, len2 = series[i].episodes[l].links.length; j < len2; j++){
					for(var k = 0, len3 = ver.length; k < len3; k++){
						if(series[i].episodes[l].links[j].type==ver[k]){
							exist = true;
							break loop;
						}	
					}
				}
			}
			if(!exist){
				series.splice(i, 1);
				removed = true;
			}
		}

		if(!removed && kat){
			var exist = false;
			for(var j = 0, len2 = kat.length; j < len2; j++){
				if(series[i].genres.indexOf(kat[j])!=-1){
					exist = true;
					break;
				}
			}
			if(!exist){
				series.splice(i, 1);
				removed = true;
			}
		}

		if(!removed && start_year){
			if(series[i].year<start_year){
				series.splice(i, 1);
				removed = true;
			}
		}

		if(!removed && end_year){
			if(series[i].year>end_year){
				series.splice(i, 1);
				removed = true;
			}
		}
		
		if(removed){
			i--;
		}
	}

	kat = kat || [];
	ver = ver || [];

	var url = BASE_URL+'/wszystkie-seriale';

	for(var i = 0, len = kat.length; i < len; i++){
		url = UTILS.buildURL(url, 'kat', kat[i].toLowerCase());
	}

	if(start_year)
		url = UTILS.buildURL(url, 'start_year', start_year);

	if(end_year)
		url = UTILS.buildURL(url, 'end_year', end_year);


	for(var i = 0, len = ver.length; i < len; i++){
		url = UTILS.buildURL(url, 'ver', ver[i].toLowerCase());
	}

	var urlPages = url;

	urlPages = UTILS.buildURL(urlPages, 'sort_by', sort_by);
	urlPages = UTILS.buildURL(urlPages, 'type', type==-1?'desc':'asc');

	var sep = url.indexOf('?') > -1 ? '' : '?';
	url += sep;

	var sep = urlPages.indexOf('?') > -1 ? '' : '?';
	urlPages += sep;

	var maxPages = Math.ceil(series.length / perPage);

	for(var i = 0, len = series.length; i < len; i++){
		series[i].viewed = 0;

		for(var l = 0, len4 = series[i].episodes.length; l < len4; l++){
			series[i].viewed += series[i].episodes[l].viewed;
		}
	}

	if(sort_by=='date'){
		series.sort(function(a, b){
			return new Date(a.update_date) - new Date(b.update_date);
		});
	}else if(sort_by=='rate'){
		series.sort(function(a, b){
			return (a.rate/2) - (b.rate/2);
		});
	}else if(sort_by=='views'){
		series.sort(function(a, b){
			return a.viewed - b.viewed;
		});
	}

	if(type==-1){
		series.reverse();
	}

	series = series.splice(page*perPage, perPage);

	if((page+1)>maxPages){
		if(maxPages>0){
			self.send(3, url); return;
		}
	}
	
	self.send(0, {series:series, status: 
		{
			kats: katsAvailable,
			katsEnabled: kat,
			start_year: start_year,
			end_year: end_year,
			vers:ver,
			sort_by:sort_by,
			type:type,
			url:url,
			urlPages:urlPages,
			page:(page+1),
			maxPage:maxPages
		}
	});*/
}

SERIES.addEpisodesFilmweb = function(req, res, CB)
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

	if(self.data.code==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.episode==null){ self.send(); return; }
	else if(typeof self.data.episode!='object'){ self.send(); return; }
	else if(self.data.episode.length==0){ self.send(1, 'Brak odcinkow do dodania.'); return; }

	if(self.data.episode_num==null){ self.send(); return; }
	else if(typeof self.data.episode_num!='object'){ self.send(); return; }
	else if(self.data.episode_num.length==0){ self.send(1, 'Brak odcinkow do dodania.'); return; }

	if(self.data.season_num==null){ self.send(); return; }
	else if(typeof self.data.season_num!='object'){ self.send(); return; }
	else if(self.data.season_num.length==0){ self.send(1, 'Brak odcinkow do dodania.'); return; }

	if(self.data.episode.length!=self.data.episode_num.length ||
		self.data.episode.length!=self.data.season_num.length ||
		self.data.episode_num.length!=self.data.season_num.length){ self.send(); return; }

	var episodes = [];

	for(var i = 0, len = self.data.episode.length; i < len; i++){
		var e = {
			title: self.data.episode[i],
			season_num: self.data.season_num[i],
			episode_num: self.data.episode_num[i],
		}
		episodes.push(e);
	}

	self.i = 0;
	self.episodes = episodes;
	self.results = [];

	self.addEpisode = function(cb)
	{
		var episode = self.episodes[self.i];

		req.body.season_num = episode.season_num;
		req.body.episode_num = episode.episode_num;
		req.body.title = episode.title;

		SERIES.addEpisode(req, res, function(data){
			if(data.error){ 
				if(data.code==1) episode.msg = data.msg;
				else episode.msg = 'Nieoczekiwany błąd';
			}else episode.msg = 'Dodany';

			self.results.push(episode);
			self.i++;

			if(self.episodes[self.i]) self.addEpisode(cb);
			else cb();
		});
	}

	self.addEpisode(function(answer){
		self.send(0, self.results);
	});
}

SERIES.addEpisode = function(req, res, CB)
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

	self.add = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.season_num==null){ self.send(); return; }
		else if(!VALIDATOR.isInt(self.data.season_num, {min: 1, max: 100})){ self.send(1, 'Sezon może mieć przedział 1-100'); return; }

		if(self.data.episode_num==null){ self.send(); return; }

		var episode_num = self.data.episode_num;
		var episode_num_alter = null;

		if(self.data.episode_num.indexOf('-')==-1){
			if(!VALIDATOR.isInt(self.data.episode_num, {min: 0})){ self.send(1, 'Numer odcinka musi być liczbą'); return; }
			episode_num = self.data.episode_num;
		}else{
			var arr = self.data.episode_num.split('-');
			if(arr.length!=2){ self.send(1, 'Numer odcinka ma nieprawidłowy format'); return; }

			episode_num = arr[0];
			episode_num_alter = arr[1];
			if(!VALIDATOR.isInt(episode_num, {min: 1})){ self.send(1, 'Odcinek: Wartość pomiedzy myślnikiem musi być liczbą'); return; }
			if(!VALIDATOR.isInt(episode_num_alter, {min: 1})){ self.send(1, 'Odcinek: Wartość pomiedzy myślnikiem musi być liczbą'); return; }

			episode_num = parseInt(episode_num);
			episode_num_alter = parseInt(episode_num_alter);

			if(episode_num_alter<=episode_num){ self.send(1, 'Odcinek: Druga liczba musi być wieksza od pierwszej'); return; }
			if(episode_num_alter-episode_num>1){ self.send(1, 'Odcinek: Druga liczba może być wieksza tylko o 1 od pierwszej'); return; }
		}

		if(self.data.title==null){ self.send(); return; }
		else if(self.data.title.length==0){
			self.data.title = 'Odcinek '+episode_num;
			if(episode_num_alter) self.data.title+='-'+episode_num_alter;
		}else if(self.data.title.length>100){ self.send(1, 'Tytuł maksymalnie 100 znaków'); return; }

		var user_id = String(req.INJECT_DATA.user_status.data._id);
		var user_type = req.INJECT_DATA.user_status.data.type;

		linkModel.countDocuments({ $and: [ { user: MONGO.Types.ObjectId(user_id), status: 'PUBLIC' } ] })
		.exec(function(err, num){
			if(err){ self.send(); return; }

			if(num<10){ self.send(1, 'Dodałeś/aś za mało linków ('+num+'/10), aby dodawać odcinki.'); return; }

			seriesModel.findById(self.data.code)
			.exec(function(err, series){
				if(err){ self.send(); return; }

				if(series==null){ self.send(); return; }

				episodeModel.find({ $and: [{series_id: series._id}, {season_num: self.data.season_num}, { $or: [{episode_num: episode_num}, {episode_num_alter: episode_num}, {title: self.data.title}] }] })
				.limit(1)
				.lean()
				.exec(function(err, episode){
					if(err){ self.send(); return; }
					var episode = episode[0];

					var user_access = user_type;

					var status = 'PUBLIC';
					if(user_access=='USER'){
						status = 'WAIT';
					}

					var url = url_title(self.data.title);

					if(episode){ self.send(1, 'Ten odcinek juz istnieje w bazie.'); return; }

					var episode_query = {
						_id : MONGO.Types.ObjectId(),
						episode_num : episode_num,
						episode_num_alter: episode_num_alter,
						season_num : self.data.season_num,
						title : self.data.title,
						url : url,
						like_up : 0,
						like_down : 0,
						status : status,
						user : MONGO.Types.ObjectId(user_id),
						series_id : MONGO.Types.ObjectId(series._id),
					}

					episodeModel.create(episode_query, function(err, episode){
						if(err){ self.send(); return; }

						var episode_id = episode._id;

						if(!series.episodes) series.episodes = [];

						series.episodes.push(MONGO.Types.ObjectId(episode_id));
						series.save(function(err){
							if(err){ self.send(); return; }

							self.send(0);
						});
					});
				});	
			});
		});	
	}

	self.data = req.body;
	self.add();
}


SERIES.reportEpisode = function(req, res, CB)
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

	self.report = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.desc==null){ self.send(); return; }
		else if(self.data.desc.length>600){ self.send(1, 'Komentarz maksymalnie może mieć 600 znaków'); return; }

		if(self.data.type==null){ self.send(); return; }

		var exist = REPORT_TYPES_LIST_EPISODE[self.data.type];
		if(!exist){ self.send(); return; }

		seriesModel.countDocuments({_id: self.data.code})
		.lean()
		.exec(function(err, series){
			if(err){ self.send(); return; }

			if(series==0){ self.send(); return; }

			episodeModel.findById(self.data.ref)
			.exec(function(err, episode){
				if(err){ self.send(); return; }

				episode.report = self.data.type;
				episode.report_desc = self.data.desc;
				episode.save(function(err){
					if(err){ self.send(); return; }
					self.send(0);
				});
			});
		});	
	}

	self.data = req.body;
	self.report();
}

SERIES.addLinkIMPORT = function(req, res, CB)
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

	self.doRequest = function(url, cb){
		var options = {
			host: 'api.openload.co',
			port: 443,
			method: 'GET',
			path: url,
		};

		var request = HTTPS.request(options, function(response){
			var dataz = '';
			response.setEncoding('utf8');
			response.on('error', function(err){
				cb(true);
			});
			response.on('data', function(data){
				dataz+=data;
			});
			response.on('end', function(){
				if(response.statusCode==200){
					var respo = JSON.parse(dataz);
					cb(false, respo);
				}
			});
		});
		request.on('error', function(err){
			cb(true);
		});
		request.end();
	}

	self.checkFolder = function(cb)
	{
		var r_url = '/1/file/listfolder?login='+self.o_login+'&key='+self.o_key;

		self.doRequest(r_url, function(err, data){
			if(err){ self.send(); return; }
			if(data.status!=200){ self.send(); return; }
			if(!data.result){ self.send(); return; }
			if(!data.result.folders){ self.send(1, 'Utwórz folder w głównym folderze openload o nazwie mega_up i spróbuj ponownie.'); return; }

			var folders = data.result.folders;

			self.folder_id = null;

			for(var i = 0, len = folders.length; i < len; i++) {
				if(folders[i].name=='mega_up') self.folder_id = folders[i].id;
			}

			if(!self.folder_id){ self.send(1, 'Utwórz folder w głównym folderze openload o nazwie mega_up i spróbuj ponownie.'); return; }
			cb();
		});
	}

	self.waiterFor = function(cb)
	{
		var check_remote_link = '/1/remotedl/status?login='+self.o_login+'&key='+self.o_key+'&id='+self.remote_id;

		self.doRequest(check_remote_link, function(err, data){
			if(err){ self.send(); return; }
			if(data.status!=200){ self.send(); return; }
			if(!data.result){ self.send(); return; }
			if(!data.result[self.remote_id]){ self.send(); return; }

			var status = data.result[self.remote_id].status;

			if(status!='finished' && status!='error'){
				setTimeout(function(){
					self.waiterFor(cb);
				}, 1000);
			}else if(status=='error'){
				self.send(); return;
			}else{
				cb(data.result[self.remote_id].url);
			}
		});
	}

	self.data = req.body;

	if(self.data.link==null){ self.send(); return; }
	else if(self.data.link.length==0){ self.send(1, 'Uzupełnij link.'); return; }
	else if(!VALIDATOR.isURL(self.data.link)){ self.send(1, 'Błędny link.'); return; }

	self.o_login = req.INJECT_DATA.user_status.data.o_login;
	self.o_key = req.INJECT_DATA.user_status.data.o_key;

	var link = {};

	link.url = self.data.link;

	var parsed = URL.parse(link.url);
	var host = parsed.host;

	var badLink = true;

	for(var j = 0, len2 = VIDEO_HOSTING_LIST.length; j < len2; j++){
		if(host==VIDEO_HOSTING_LIST[j].host){
			var ID = VIDEO_HOSTING_LIST[j].getID(link.url);
			if(!ID){ self.send(1, 'Błędny link dla hostingu.'); return; }
			else{
				link.id = ID;
				link.hosting = VIDEO_HOSTING_LIST[j].name
				badLink = false;
			}
			break;
		}
	}

	if(badLink){ self.send(1, 'Błędny link.'); return; }

	if(link.hosting!='openload'){
		SERIES.addLink(req, res, function(answer){
			CB(answer);
		});
		return;
	}

	self.checkFolder(function(){
		var remote_link = '/1/remotedl/add?login='+self.o_login+'&key='+self.o_key+'&folder='+self.folder_id+'&url='+self.data.link;

		self.doRequest(remote_link, function(err, data){
			if(err){ self.send(); return; }
			if(data.status!=200){ self.send(); return; }
			if(!data.result){ self.send(); return; }

			self.remote_id = data.result.id;

			self.waiterFor(function(url){
				self.data.link = url;
					SERIES.addLink(req, res, function(answer){
					CB(answer);
				});
			});
		});
	});
}

/*SERIES.addLink = function(req, res, CB)
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

	self.add = function()
	{
		if(self.data.type==null){ self.send(); return; }
		if(self.data.quality==null){ self.send(); return; }
		if(self.data.link==null){ self.send(); return; }
		else if(self.data.link.length==0){ self.send(1, 'Uzupełnij link.'); return; }
		else if(!VALIDATOR.isURL(self.data.link)){ self.send(1, 'Błędny link.'); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

		var ip = getIP(req);

		var premium_link = false;
		if(self.data.premium && self.data.premium=='on') premium_link = true;


		if(self.data.user_id==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }

		var exist = false;
		for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++) {
			if(self.data.type==VIDEO_TYPES_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		exist = false;
		for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++) {
			if(self.data.quality==VIDEO_QUALITY_LIST[i][0]){
				exist = true;
				break;
			}
		}


		if(!exist){ self.send(); return; }

		var link = {};

		link.url = self.data.link;

		var parsed = URL.parse(link.url);
		var host = parsed.host;

		var badLink = true;

		for(var j = 0, len2 = VIDEO_HOSTING_LIST.length; j < len2; j++){
			if(host==VIDEO_HOSTING_LIST[j].host){
				if(premium_link && !VIDEO_HOSTING_LIST[j].premium){
					premium_link = false;
				}
				var ID = VIDEO_HOSTING_LIST[j].getID(link.url);
				if(!ID){ self.send(1, 'Błędny link dla hostingu.'); return; }
				else{
					link.id = ID;
					link.hosting = VIDEO_HOSTING_LIST[j].name
					badLink = false;
				}
				break;
			}
		}

		if(badLink){ self.send(1, 'Błędny link.'); return; }


		userModel.find({_id: self.data.user_id})
		.limit(1)
		.lean()
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(); return; }
			user = user[0];

			var user_access = user.type;

			var status = 'WAIT'

			linkModel.countDocuments({ $and: [ { user: MONGO.Types.ObjectId(self.data.user_id), status: 'PUBLIC' } ] })
			.exec(function(err, num){
				if(err){ self.send(); return; }
			
				if(user_access=='MODERATOR' || user_access=='ADMIN'){
					status = 'PUBLIC';
				}

				episodeModel.findById(self.data.code2)
				.populate({
					path: 'links',
					select: 'quality hosting type user',
					populate: {
						path: 'user',
						select: 'ip type'
					}
				})
				.select('links series_id')
				.populate({
					path: 'series_id',
					select: 'new_status'
				})
				.exec(function(err, episode){
					if(err){ self.send(); return; }

					if(episode==null){ self.send(); return; }

					linkModel.find()
					.select('video_id hosting')
					.or({ $and: [{video_id: link.id}, {hosting: link.hosting}] })
					.exec(function(err, results){
						if(err){ self.send(); return; }
						if(results.length>0){ self.send(1, 'Link jest już w bazie.'); return; }

						var quality = self.data.quality;

						switch(link.hosting){
							case 'vidto':
							case 'openload':
							case 'streamango':
								if(quality=='VERY_HIGHT') quality = 'HIGH';
								break;
							default:
								break;
						}

						if(episode.links && user_access=='USER'){
							for(var j = 0, len2 = episode.links.length; j < len2; j++){
								if(link.hosting==episode.links[j].hosting && self.data.type==episode.links[j].type && quality==episode.links[j].quality && String(self.data.user_id)==String(episode.links[j].user._id)){
									self.send(1, 'Dodałeś/aś już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}else if(link.hosting==episode.links[j].hosting && self.data.type==episode.links[j].type && quality==episode.links[j].quality && ip==(episode.links[j].user.ip?episode.links[j].user.ip:user.ip)){
									self.send(1, 'Z twojego adresu IP dodano już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}
							}

							var count = 0;

							for(var j = 0, len2 = episode.links.length; j < len2; j++){
								if(link.hosting==episode.links[j].hosting && self.data.type==episode.links[j].type && quality==episode.links[j].quality && episode.links[j].user.type=="USER"){
									count++;
								}
							}

							if(count>=3){
								self.send(1, 'Link odrzucony. Osiągnięto limit linków dla odcinka.<br>Więcej informacji w <a href="/faq" target="_blank" class="greenLink">FAQ</a> punkt #06.'); return;
							}
						}

						var query = {
							_id : MONGO.Types.ObjectId(),
							type : self.data.type,
							quality : quality,
							hosting : link.hosting,
							video_id : link.id,
							status : status,
							user : MONGO.Types.ObjectId(self.data.user_id),
							ip : ip,
							premium : premium_link,
						}

						linkModel.create(query, function(err, list){
							if(err){ self.send(); return; }
							
							if(!episode.links) episode.links = [];

							var en_link_id = list._id;

							episode.links.push(MONGO.Types.ObjectId(en_link_id));

							if(req.INJECT_DATA.user_status.code==3 && req.INJECT_DATA.user_status.data.type!='USER' && !premium_link){
								var type = self.data.type;

								seriesModel.findById(episode.series_id._id)
								.populate({
									path: 'episodes',
									select: '_id links season_num episode_num',
									populate: { 
										path: 'links',
										select: '_id type',
										match: { status: 'PUBLIC' },
									}
								})
								.select('_id episodes new_status update_date')
								.exec(function(err, series){
									if(err){ self.send(); return; }
									if(series.length==0){ self.send(); return; }

									var link_best_type = VIDEO_TYPES_LIST.length-1;
									for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
										if(VIDEO_TYPES_LIST[i][0]==type){
											link_best_type = i;
											break;
										}
									}
									var best_type = VIDEO_TYPES_LIST.length-1;

									var episode_id = self.data.code2;

									for(var i = 0, len = series.episodes.length; i < len; i++){
										if(String(series.episodes[i]._id)!=String(episode_id)) continue;

										for(var k = 0, len3 = series.episodes[i].links.length; k < len3; k++){
											if(String(en_link_id)==String(series.episodes[i].links[k]._id)) continue;

											for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
												if(VIDEO_TYPES_LIST[j][0]==series.episodes[i].links[k].type){
													if(j<best_type) best_type = j;
												}
											}
										}
									}

									if(link_best_type<best_type){
										series.new_status.episode = MONGO.Types.ObjectId(episode_id);
										series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase()+' do';
										series.update_date = MOMENT();
										series.save(function(err){
											if(err){ self.send(); return; }
											episode.save(function(err){
												if(err){ self.send(); return; }

												self.send(0);
											});
										});
									}else{
										episode.save(function(err){
											if(err){ self.send(); return; }

											self.send(0);
										});
									}
								});
							}else{
								episode.save(function(err){
									if(err){ self.send(); return; }

									self.send(0);
								});
							}
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.add();
}*/

SERIES.addLink = function(req, res, CB)
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

	self.add = function()
	{
		if(self.data.type==null){ self.send(); return; }
		if(self.data.quality==null){ self.send(); return; }
		if(self.data.link==null){ self.send(); return; }
		else if(self.data.link.length==0){ self.send(1, 'Uzupełnij link.'); return; }
		else if(!VALIDATOR.isURL(self.data.link)){ self.send(1, 'Błędny link.'); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

		var ip = getIP(req);

		var premium_link = false;
		if(self.data.premium && self.data.premium=='on') premium_link = true;


		if(self.data.user_id==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }

		var exist = false;
		for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++) {
			if(self.data.type==VIDEO_TYPES_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		exist = false;
		for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++) {
			if(self.data.quality==VIDEO_QUALITY_LIST[i][0]){
				exist = true;
				break;
			}
		}


		if(!exist){ self.send(); return; }

		var link = {};

		link.url = self.data.link;

		var parsed = URL.parse(link.url);
		var host = parsed.host;

		if(!host){ self.send(1, 'Błędny link.'); return; }

		var badLink = true;

		for(var j = 0, len2 = VIDEO_HOSTING_LIST.length; j < len2; j++){
			if(host.indexOf(VIDEO_HOSTING_LIST[j].host)!=-1){
				if(!VIDEO_HOSTING_LIST[j].premium){
					premium_link = false;
				}else premium_link = true;
				var ID = VIDEO_HOSTING_LIST[j].getID(link.url);
				if(!ID){ self.send(1, 'Błędny link dla hostingu.'); return; }
				else{
					link.id = ID;
					link.hosting = VIDEO_HOSTING_LIST[j].name
					badLink = false;
				}
				break;
			}
		}

		if(badLink){ self.send(1, 'Błędny link.'); return; }

		//if(link.hosting=='openload'){ self.send(1, 'Zablokowaliśmy dodawanie nowych linków z hostingu openlaod.'); return; }

		userModel.find({_id: MONGO.Types.ObjectId(self.data.user_id)})
		.limit(1)
		.lean()
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(); return; }
			user = user[0];

			linkModel.countDocuments({ $and: [ { user: MONGO.Types.ObjectId(self.data.user_id), status: 'PUBLIC' } ] })
			.exec(function(err, validLinksNum){
				if(err){ self.send(); return; }

				var user_access = user.type;

				var status = 'WAIT';

				if(validLinksNum<10){
					status = 'WAIT_HIDDEN';
				}
			
				if(user_access=='MODERATOR' || user_access=='ADMIN'){
					status = 'PUBLIC';
				}

				episodeModel.find({_id: MONGO.Types.ObjectId(self.data.code2)})
				.limit(1)
				.populate({
					path: 'links',
					select: 'quality hosting type user',
					populate: {
						path: 'user',
						select: 'ip type'
					}
				})
				.select('links series_id')
				.populate({
					path: 'series_id',
					select: 'new_status'
				})
				.exec(function(err, episode){
					if(err){ self.send(); return; }
					if(episode.length==0){ self.send(); return; }
					episode = episode[0];

					linkModel.countDocuments({ $and: [{video_id: link.id}, {hosting: link.hosting}] })
					.exec(function(err, num){
						if(err){ self.send(); return; }
						if(num>0){ self.send(1, 'Link jest już w bazie.'); return; }

						var quality = self.data.quality;

						switch(link.hosting){
							case 'openload':
							case 'streamango':
							case 'vidoza':
							case 'verystream':
							case 'gounlimited':
							case 'rapidvideo':
								if(quality=='VERY_HIGHT') quality = 'HIGH';
								break;
							default:
								break;
						}

						if(link.hosting=='vidoza' && quality=='MID') quality = 'LOW';

						if(episode.links && user_access=='USER'){
							for(var j = 0, len2 = episode.links.length; j < len2; j++){
								if(link.hosting==episode.links[j].hosting && self.data.type==episode.links[j].type && quality==episode.links[j].quality && String(self.data.user_id)==String(episode.links[j].user._id)){
									self.send(1, 'Dodałeś/aś już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}
							}

							var count = 0;

							for(var j = 0, len2 = episode.links.length; j < len2; j++){
								if(link.hosting==episode.links[j].hosting && self.data.type==episode.links[j].type && quality==episode.links[j].quality && episode.links[j].user.type=="USER"){
									count++;
								}
							}

							if(count>=4){
								self.send(1, 'Link odrzucony. Osiągnięto limit linków dla odcinka.<br>Więcej informacji w <a href="/faq" target="_blank" class="greenLink">FAQ</a> punkt #06.'); return;
							}
						}

						var query = {
							_id : MONGO.Types.ObjectId(),
							type : self.data.type,
							quality : quality,
							hosting : link.hosting,
							video_id : link.id,
							status : status,
							user : MONGO.Types.ObjectId(self.data.user_id),
							premium : premium_link,
							last_check : MOMENT("2000-01-01T00:00").toISOString(),
							series_id : MONGO.Types.ObjectId(episode.series_id._id),
							episode_id : MONGO.Types.ObjectId(episode._id),
						}

						linkModel.create(query, function(err, list){
							if(err){ self.send(); return; }
							
							if(!episode.links) episode.links = [];

							var en_link_id = list._id;

							episode.links.push(MONGO.Types.ObjectId(en_link_id));

							if(req.INJECT_DATA.user_status.code==3 && req.INJECT_DATA.user_status.data.type!='USER' && !premium_link){
								var type = self.data.type;

								seriesModel.find({_id: MONGO.Types.ObjectId(episode.series_id._id)})
								.limit(1)
								.populate({
									path: 'episodes',
									select: '_id links season_num episode_num',
									populate: { 
										path: 'links',
										select: '_id type premium',
										match: { status: 'PUBLIC' },
									}
								})
								.select('_id episodes new_status update_date')
								.exec(function(err, series){
									if(err){ self.send(); return; }
									if(series.length==0){ self.send(); return; }
									series = series[0];

									var link_best_type = VIDEO_TYPES_LIST.length-1;
									for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
										if(VIDEO_TYPES_LIST[i][0]==type){
											link_best_type = i;
											break;
										}
									}
									var best_type = VIDEO_TYPES_LIST.length-1;

									var episode_id = self.data.code2;

									for(var i = 0, len = series.episodes.length; i < len; i++){
										if(String(series.episodes[i]._id)!=String(episode_id)) continue;

										for(var k = 0, len3 = series.episodes[i].links.length; k < len3; k++){
											if(String(en_link_id)==String(series.episodes[i].links[k]._id)) continue;
											if(series.episodes[i].links[k].premium) continue;

											for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
												if(VIDEO_TYPES_LIST[j][0]==series.episodes[i].links[k].type){
													if(j<best_type) best_type = j;
												}
											}
										}
									}

									if(link_best_type<best_type){
										series.new_status.episode = MONGO.Types.ObjectId(episode_id);
										series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase()+' do';
										series.update_date = MOMENT();
										series.save(function(err){
											if(err){ self.send(); return; }
											episode.save(function(err){
												if(err){ self.send(); return; }

												self.send(0);
											});
										});
									}else{
										episode.save(function(err){
											if(err){ self.send(); return; }

											self.send(0);
										});
									}
								});
							}else{
								episode.save(function(err){
									if(err){ self.send(); return; }

									self.send(0);
								});
							}
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.add();
}

SERIES.addLinksMass = function(req, res, CB)
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

	if(self.data.type==null){ self.send(); return; }
	if(self.data.quality==null){ self.send(); return; }
	if(self.data.links==null){ self.send(); return; }
	if(self.data.season==null){ self.send(); return; }
	if(self.data.code==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

	if(self.data.user_id==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }

	var exist = false;
	for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++) {
		if(self.data.type==VIDEO_TYPES_LIST[i][0]){
			exist = true;
			break;
		}
	}

	if(!exist){ self.send(); return; }

	exist = false;
	for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++) {
		if(self.data.quality==VIDEO_QUALITY_LIST[i][0]){
			exist = true;
			break;
		}
	}

	if(!exist){ self.send(); return; }

	self.data.links = self.data.links.replace(/\r\n|\r/g, '\n');

	var linksArray = self.data.links.split('\n')

	if(linksArray.length==0){ self.send(1, 'Linki są wymagane.'); return; }

	self.req = req;
	self.res = res;

	req.body._id = self.data.code;
	req.body.season = self.data.season;

	SERIES.getEpisodesImport(req, res, function(answer){
		if(answer.error){ self.send(); return; }
		var episodes = answer.data;
		
		if(episodes.length!=linksArray.length){ self.send(1, 'Liczba linków nie jest równa liczbie odcinków.'); return; }
		
		var linksArrayWithEpi = [];

		for(var i = 0, len = episodes.length; i < len; i++){
			episodes[i].link = linksArray[i];
		}

		self.episodes = episodes;
		self.results = [];

		self.addLink(0, function(){
			self.send(0, self.results);
		});
	});

	self.addLink = function(i, cb)
	{
		var episode = self.episodes[i];

		if(episode.link.length==0){
			var result = {
				link: episode.link,
				episode_num: episode.episode_num,
				episode_num_alter: episode.episode_num_alter,
				added: false,
				error: 'Pusta linijka.',
			}
			self.results.push(result);
			i++;
			if(self.episodes[i]) self.addLink(i, cb);
			else cb();
			return;
		}


		self.req.body.code2 = String(episode._id);
		self.req.body.link = episode.link;
		self.req.body.quality = self.data.quality;
		self.req.body.type  = self.data.type;

		SERIES.addLink(self.req, self.res, function(answer){


			var result = {
				link: episode.link,
				episode_num: episode.episode_num,
				episode_num_alter: episode.episode_num_alter,
				added: answer.error?false:true,
				error: answer.error?answer.msg:'',
			}

			self.results.push(result);

			i++;
			if(self.episodes[i]) self.addLink(i, cb);
			else cb();
		});
	}
}

SERIES.setViewed = function(req, res, CB)
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
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.code2==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

	if(self.data.type==null){ self.send(); return; }
	else if(self.data.type!=-1 && self.data.type!=1){ self.send(); return; }

	episodeModel.findById(self.data.code2)
	.select('users_viewed')
	.exec(function(err, episode){
		if(err){ self.send(); return; }

		if(episode==null){ self.send(); return; }

		if(req.INJECT_DATA.user_status.code==3){
			var user_id = req.INJECT_DATA.user_status.data._id;

			if(episode.users_viewed){
				if(self.data.type==1){
					if(episode.users_viewed.indexOf(MONGO.Types.ObjectId(user_id))==-1){
						episode.users_viewed.push(MONGO.Types.ObjectId(user_id));
					}
				}else{
					var index = episode.users_viewed.indexOf(MONGO.Types.ObjectId(user_id));
					if(index!=-1){
						episode.users_viewed.splice(index, 1);
					}
				}
			}
		}

		episode.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

SERIES.publicHideLink = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.type==null){ self.send(); return; }
		else if(self.data.type!=0 && self.data.type!=1){ self.send(); return; }

		seriesModel.countDocuments({ _id : self.data.code })
		.exec(function(err, series){
			if(err){ self.send(); return; }

			if(series==0){ self.send(); return; }

			episodeModel.countDocuments({ _id : self.data.code2 })
			.exec(function(err, episode){
				if(err){ self.send(); return; }

				if(episode==0){ self.send(); return; }

				linkModel.findById(self.data.ref)
				.select('status')
				.exec(function(err, link){
					if(err){ self.send(); return; }
					if(link==null){ self.send(); return; }

					link.status = self.data.type == 1 ? 'PUBLIC':'HIDE';
					link.save(function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});
				});
			});
		});
	}

	self.data = req.body;
	self.do();
}


SERIES.reportLink = function(req, res, CB)
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

	self.report = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.desc==null){ self.send(); return; }
		else if(self.data.desc.length>600){ self.send(1, 'Komentarz maksymalnie może mieć 600 znaków'); return; }

		if(self.data.type==null){ self.send(); return; }

		var exist = REPORT_TYPES_LIST[self.data.type];
		if(!exist){ self.send(); return; }

		seriesModel.countDocuments({ _id : self.data.code })
		.exec(function(err, series){
			if(err){ self.send(); return; }

			if(series==0){ self.send(); return; }

			episodeModel.countDocuments({ _id : self.data.code2 })
			.exec(function(err, episode){
				if(err){ self.send(); return; }

				if(episode==0){ self.send(); return; }

				linkModel.findById(self.data.ref)
				.exec(function(err, link){
					if(err){ self.send(); return; }
					if(link==null){ self.send(); return; }

					link.report = self.data.type;
					link.report_desc = self.data.desc;
					link.last_check = MOMENT('01-01-2017', 'MM-DD-YYYY').toDate();

					link.save(function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});
				});
			});
		});
	}

	self.data = req.body;
	self.report();
}


SERIES.getLinkInfo = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		seriesModel.countDocuments({ _id : self.data.code })
		.exec(function(err, series){
			if(err){ self.send(); return; }

			if(series==0){ self.send(); return; }

			episodeModel.countDocuments({ _id : self.data.code2 })
			.exec(function(err, episode){
				if(err){ self.send(); return; }

				if(episode==0){ self.send(); return; }

				linkModel.findById(self.data.ref)
				.exec(function(err, link){
					if(err){ self.send(); return; }
					if(link==null){ self.send(); return; }

					self.send(0, link);
				});
			});
		});
	}

	self.data = req.body;
	self.do();
}

SERIES.editLink = function(req, res, CB)
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

	self.edit = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.video_id==null){ self.send(); return; }
		else if(self.data.video_id.length==0){ self.send(1, 'Uzupełnij wideo id'); return; }

		if(self.data.type==null){ self.send(); return; }
		if(self.data.quality==null){ self.send(); return; }

		var exist = false;
		for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++) {
			if(self.data.type==VIDEO_TYPES_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		exist = false;
		for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++) {
			if(self.data.quality==VIDEO_QUALITY_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		linkModel.findById(self.data.ref)
		.select('_id type')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(link.length==0){ self.send(); return; }

			var type = link.type;
			var en_link_id = link._id;

			link.quality = self.data.quality;
			link.type = self.data.type;
			link.video_id = self.data.video_id;

			link.save(function(err){
				if(err){ self.send(); return; }

				if(type!=self.data.type){
					seriesModel.findById(self.data.code)
					.populate({
						path: 'episodes',
						select: '_id links season_num episode_num',
						populate: { 
							path: 'links',
							select: '_id type',
							match: { status: 'PUBLIC' },
						}
					})
					.select('_id episodes new_status update_date')
					.exec(function(err, series){
						if(err){ self.send(); return; }
						if(series.length==0){ self.send(); return; }

						var link_best_type = VIDEO_TYPES_LIST.length-1;
						for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
							if(VIDEO_TYPES_LIST[i][0]==self.data.type){
								link_best_type = i;
								break;
							}
						}
						var best_type = VIDEO_TYPES_LIST.length-1;

						var episode_id = self.data.code2;

						var zero_links = false;

						for(var i = 0, len = series.episodes.length; i < len; i++){
							if(String(series.episodes[i]._id)!=String(episode_id)) continue;

							if(series.episodes[i].links.length==0) zero_links = true;

							for(var k = 0, len3 = series.episodes[i].links.length; k < len3; k++){
								if(String(series.episodes[i].links[k]._id)==String(en_link_id)) continue;
								for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
									if(VIDEO_TYPES_LIST[j][0]==series.episodes[i].links[k].type){
										if(j<best_type) best_type = j;
									}
								}
							}
						}

						if(zero_links){
							series.new_status.episode = null;
							series.new_status.str = '';
							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0);
							});
						}else if(link_best_type==best_type){
							series.new_status.episode = MONGO.Types.ObjectId(episode_id);
							series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase()+' do';
							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0);
							});
						}else if(link_best_type<best_type){
							series.new_status.episode = MONGO.Types.ObjectId(episode_id);
							series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase()+' do';
							series.update_date = MOMENT();
							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0);
							});
						}else{
							series.new_status.episode = MONGO.Types.ObjectId(episode_id);
							series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[best_type][1]).toLowerCase()+' do';
							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0);
							});
						}
					});
				}else{
					self.send(0);
				}
			});
		});
	}

	self.data = req.body;
	self.edit();
}

SERIES.getEpisodeName = function(req, res, CB)
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

	if(self.data.code2==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

	episodeModel.find({ _id: self.data.code2 })
	.lean()
	.select('title')
	.exec(function(err, episode){
		if(err){ self.send(); return; }
		if(episode.length==0){ self.send(); return; }
		var episode = episode[0];

		var title = episode.title;
		self.send(0, title);

	});
}


SERIES.editNameEpisode = function(req, res, CB)
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

	if(self.data.code2==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

	if(self.data.title==null){ self.send(); return; }
	else if(self.data.title.length==0){ self.send(1, 'Uzupełnij tytuł'); return; }
	else if(self.data.title.length>100){ self.send(1, 'Tytuł maksymalnie 100 znaków'); return; }

	episodeModel.find({ _id: self.data.code2 })
	.select('title url')
	.exec(function(err, episode){
		if(err){ self.send(); return; }
		if(episode.length==0){ self.send(); return; }
		var episode = episode[0];

		var url = url_title(self.data.title);


		episode.title = self.data.title;
		episode.url = url;

		episode.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

SERIES.countView = function(req, res, CB)
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

	self.count = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(typeof self.data.code!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(typeof self.data.code2!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.adb==null){ self.send(); return; }
		else if(typeof self.data.adb!='string'){ self.send(); return; }
		else if(self.data.adb!='true' && self.data.adb!='false'){ self.send(); return; }

		var adb = false;
		if(self.data.adb=='true') adb = true;

		var ip = getIP(req);
		if(!ip || ip.length==0){ self.send(); return; }

		seriesModel.countDocuments({ _id: MONGO.Types.ObjectId(self.data.code)})
		.exec(function(err, series){
			if(err){ self.send(); return; }
			if(series==0){ self.send(); return; }

			episodeModel.countDocuments({ _id: MONGO.Types.ObjectId(self.data.code2)})
			.exec(function(err, episodes){
				if(err){ self.send(); return; }
				if(episodes==0){ self.send(); return; }

				var setViewed = false;

				if(req.INJECT_DATA.user_status.code==3){
					var user_id = req.INJECT_DATA.user_status.data._id;
					setViewed = true;
					episodeModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code2)}, { $addToSet: { users_viewed: MONGO.Types.ObjectId(user_id) } }, function(err){});
				}

				viewedModel.countDocuments({ $and: [{ip: ip}, {episode_id: self.data.code2}] })
				.exec(function(err, count){
					if(err){ self.send(); return; }

					if(count>0){
						self.send(0, {setViewed:setViewed}); return;
					}

					var query = {
						_id : MONGO.Types.ObjectId(),
						ip : ip,
						episode_id : MONGO.Types.ObjectId(self.data.code2),
						series_id: MONGO.Types.ObjectId(self.data.code),
						adb: adb,
					}

					viewedModel.create(query, function(view){
						episodeModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code2)}, { $inc: { viewed: 1 } }, function(err){
							if(err){ self.send(); return; }

							seriesModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code)}, { $inc: { viewed: 1 } }, function(err){
								if(err){ self.send(); return; }
								self.send(0, {setViewed:setViewed});
							});
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.count();
}


SERIES.addComment = function(req, res, CB)
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

	self.captcha = function(cb)
	{
		if(!self.comment_captcha){ cb(true); return; }

		var data = {
			secret : RECAPTCHA_SITE_SECRET,
			response : self.data['g-recaptcha-response']
		}

		requestPost('https', 'https://www.google.com/recaptcha/api/siteverify', data, function(err, answ){
			if(err){ cb(false); return; }
			cb(answ.success)
		});
	}

	self.add = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(typeof self.data.code!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(typeof self.data.code2!='string'){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.message==null){ self.send(); return; }
		else if(typeof self.data.message!='string'){ self.send(); return; }
		else if(self.data.message.length==0){ self.send(1, 'Uzupełnij komentarz'); return; }
		else if(self.data.message.length>500){ self.send(1, 'Komentarz może mieć maksymalnie 500 znaków'); return; }

		var user_id = req.INJECT_DATA.user_status.data._id;
		var message = self.data.message;

		userModel.find({ _id: MONGO.Types.ObjectId(user_id) })
		.lean()
		.select('comments_captcha_expire first_comment comment_count')
		.exec(function(err, user){
			if(err){ self.send(); return; }
			if(user.length==0){ self.send(); return; }

			var user = user[0];

			self.comment_captcha = false;
			if(user.comments_captcha_expire && MOMENT().isBefore(user.comments_captcha_expire)){
				self.comment_captcha = true;
			}

			if(self.comment_captcha){
				if(self.data['g-recaptcha-response']==null){ self.send(1, 'Wypełnij recaptcha.'); return; }
				else if(self.data['g-recaptcha-response'].length==0){ self.send(1, 'Wypełnij recaptcha.'); return; }
			}
			
			episodeModel.countDocuments({ _id: MONGO.Types.ObjectId(self.data.code2)})
			.lean()
			.select('_id')
			.exec(function(err, episode){
				if(err){ self.send(); return; }

				if(episode==0){ self.send(); return; }

				var possible_marks = [
					'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
					'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z',
					'x', 'c', 'v', 'b', 'n', 'm', 'Q', 'W', 'E', 'R',
					'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F',
					'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B',
					'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7',
					'8', '9', 'ę', 'ó', 'ą', 'ś', 'ł', 'ż', 'ź', 'ć',
					'ń', 'Ę', 'Ó', 'Ą', 'Ś', 'Ł', 'Ż', 'Ź', 'Ć', 'Ń',
					'.', '_', '`', '~', '!', '@', '#', '$', '%', '^',
					'&', '*', '(', ')', '-', '+', '=', '[', ']', '{', '}', 
					';', ':', '"', '\'', ',', '<', '>', '?', '/', '\\', '§',
					'°', '€', '„', '”', '…', '×', '±', '|', ' ', '\n', '\r', '\r\n',
 				]

				var isBadChar = false;
				for(var i = 0, len = message.length; i < len; i++) {
					if(possible_marks.indexOf(message[i])==-1){
						isBadChar = true;
						break;
					}
				}

				if(isBadChar){ self.send(1, 'Komentarz zawiera zabronione znaki. Dozwolone to a-z, A-Z, 0-9 oraz podstawowe znaki typograficzne i interpunkcyjne.'); return; }
				
				var status = 'WAIT';
				for(var i = 0; i < COMMENTS_BLACKLIST.length; i++){
					var found = message.search(new RegExp(COMMENTS_BLACKLIST[i], "i")) != -1;
					if(found){
						status = 'HIDE_WAIT';
						break;
					}
				}

				self.captcha(function(captch_result){
					if(!captch_result){ self.send(); return; }

					if(!self.comment_captcha){
						var comment_count = user.comment_count?user.comment_count+1:1;
						var first_comment = user.first_comment?user.first_comment:MOMENT().toISOString();
						var first_comment_moment = MOMENT(first_comment).add(1, 'day');
						var now = MOMENT();

						if(comment_count>=8){
							if(first_comment_moment.isAfter(now)){
								var comments_captcha_expire = MOMENT().add(1, 'day');
								userModel.updateOne({ _id: MONGO.Types.ObjectId(user_id)}, { $set: { comments_captcha_expire: MOMENT(comments_captcha_expire).toISOString(), comment_count: 0, first_comment: MOMENT().toISOString() } }, function(err, d){});
							}else{
								var first_comment = MOMENT();
						
								userModel.updateOne({ _id: MONGO.Types.ObjectId(user_id)}, { $set: { first_comment: MOMENT(first_comment).toISOString(), comment_count: 0 } }, function(err, d){});
								
							}
						}else{
							if(comment_count==1){
								first_comment = MOMENT();
							}
							userModel.updateOne({ _id: MONGO.Types.ObjectId(user_id)}, { $set: { first_comment: MOMENT(first_comment).toISOString(), comment_count: comment_count } }, function(err, d){});
						}
					}

					var query = {
						_id : MONGO.Types.ObjectId(),
						message : self.data.message,
						status : status,
						episode_id : MONGO.Types.ObjectId(self.data.code),
						user : MONGO.Types.ObjectId(user_id),
					}

					commentModel.create(query, function(err, comment){
						if(err){ self.send(); return; }

						episodeModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code2)}, { $addToSet: { comments: MONGO.Types.ObjectId(comment._id) } }, function(err){
							if(err){ self.send(); return; }
							self.send(0);
						});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.add();
}

SERIES.voteStar = function(req, res, CB)
{
	var self = {};
	self.send = function(type, data)
	{	
		if(type==0){
			self.answer = { error: false, data: data }
			CB(self.answer);
		}else if(type==3){
			self.answer = { error: true, code: 3, data: data }
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	var user_id = req.INJECT_DATA.user_status.data._id;

	self.data = req.body;

	if(self.data.code==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.value==null){ self.send(); return; }
	else if(!VALIDATOR.isInt(self.data.value, { min: 1, max: 5, allow_leading_zeroes: false })){ self.send(); return; }

	seriesModel.find({ _id: self.data.code })
	.select('rate votes_count')
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(series.length==0){ self.send(); return; }
		series = series[0];

		voteModel.find({ $and: [{user_id: user_id}, {series_id: self.data.code}] })
		.select('vote')
		.limit(1)
		.exec(function(err, vote){
			if(err){ self.send(); return; }
			vote = vote[0];

			if(vote){
				if(vote.vote==self.data.value){
					vote.remove(function(err){
						if(err){ self.send(); return; }

						voteModel.aggregate([
						{ $match: { series_id: MONGO.Types.ObjectId(self.data.code) } },
						{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } }])
						.exec(function(err, aggregated){
							if(err){ self.send(); return; }
							var total = 0;
							var count = 0;
							var average = 0;

							if(aggregated.length>0){
								total = aggregated[0].total;
								count = aggregated[0].count;
								average = (total/count).toFixed(1);
							}

							series.rate = average;
							series.votes_count = count;

							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0, {avg: average, count:count, deleted: true});
							});
						});
					});
				}else{
					vote.vote = self.data.value;
					vote.save(function(err){
						if(err){ self.send(); return; }

						voteModel.aggregate([
						{ $match: { series_id: MONGO.Types.ObjectId(self.data.code) } },
						{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } }])
						.exec(function(err, aggregated){
							if(err){ self.send(); return; }
							
							var total = 0;
							var count = 0;
							var average = 0;

							if(aggregated.length>0){
								total = aggregated[0].total;
								count = aggregated[0].count;
								average = (total/count).toFixed(1);
							}

							series.rate = average;
							series.votes_count = count;

							series.save(function(err){
								if(err){ self.send(); return; }
								self.send(0, {avg: average, count:count});
							});
						});
					})
				}
			}else{
				var query = {
					_id : MONGO.Types.ObjectId(),
					vote : self.data.value,
					user_id : MONGO.Types.ObjectId(user_id),
					series_id : MONGO.Types.ObjectId(self.data.code),
				}

				voteModel.create(query, function(err, vote_res){
					if(err){ self.send(); return; }

					voteModel.aggregate([
					{ $match: { series_id: MONGO.Types.ObjectId(self.data.code) } },
					{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } }])
					.exec(function(err, aggregated){
						if(err){ self.send(); return; }
						
						var total = 0;
						var count = 0;
						var average = 0;

						if(aggregated.length>0){
							total = aggregated[0].total;
							count = aggregated[0].count;
							average = (total/count).toFixed(1);
						}

						series.rate = average;
						series.votes_count = count;

						series.save(function(err){
							if(err){ self.send(); return; }
							self.send(0, {avg: average, count:count});
						});
					});
				});
			}
		});
	});
}

SERIES.voteComment = function(req, res, CB)
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

	self.vote = function()
	{
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.type==null){ self.send(); return; }
		else if(self.data.type!=0 && self.data.type!=1){ self.send(); return; }

		commentModel.findById(self.data.ref)
		.exec(function(err, comment){
			if(err){ self.send(); return; }

			if(comment==null){ self.send(); return; }

			var user_id = req.INJECT_DATA.user_status.data._id;

			voteModel.find({ $and: [{user_id: user_id}, {comment_id: self.data.ref}] })
			.exec(function(err, vote){
				if(err){ self.send(); return; }
				vote = vote[0];

				if(vote){
					if(vote.vote!=self.data.type){
						vote.vote = self.data.type;
						vote.save();
						if(self.data.type==1){
							comment.like_up++;
							comment.like_down--;
						} 
						else{
							comment.like_up--;
							comment.like_down++;
						}
					}else{
						vote.remove();
						if(self.data.type==1) comment.like_up--;
						else comment.like_down--;

						if(comment.like_up<0) comment.like_up = 0;
						if(comment.like_down<0) comment.like_down = 0;

						self.data.type = -1;
					}
					comment.save(function(err){
						if(err){ self.send(); return; }
						self.send(0, {like_up: comment.like_up, like_down: comment.like_down, my_like: self.data.type});
					});
				}else{
					var query = {
						_id : MONGO.Types.ObjectId(),
						vote : self.data.type,
						user_id : MONGO.Types.ObjectId(user_id),
						comment_id : MONGO.Types.ObjectId(self.data.ref),
					}

					if(self.data.type==1) comment.like_up++;
					else comment.like_down++;

					voteModel.create(query, function(err, vote_res){
						if(err){ self.send(); return; }

						if(!comment.vote_logs) comment.vote_logs = [];
						comment.vote_logs.push(MONGO.Types.ObjectId(vote_res._id));
						comment.save(function(err){
							if(err){ self.send(); return; }
							self.send(0, {like_up: comment.like_up, like_down: comment.like_down, my_like: self.data.type});
						});
					});
				}
			});
		});
	}

	self.data = req.body;
	self.vote();
}

SERIES.createHPSzxcxz = function(CB)
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

	self.good = 0;
	self.getted = 0;
	self.goodSeries = [];
	self.days = 0;
	self.goodOrderIds = [];

	self.load = function(skip, limit, cb)
	{		
		limit+=skip;

		var now = new MOMENT();
		var date = now.subtract(self.days, 'd');
		viewedModel.aggregate([
			{ $match: { $and: [
					{ 'date': { '$gte': date.toDate() } },
					{ 'series_id': { $exists: true } }
				]
			}},
			{ $group : { '_id' : '$series_id', 'count' : { '$sum' : 1 } } }, 
			{$sort: { count: -1 }},
			{ $limit: limit },
			{ $skip: skip }])
		.exec(function(err, aggregated){
			if(err){ self.send(); return; }
			if(!aggregated){ self.send(); return; }
			if(aggregated.length==0){ cb(); return; }

			var ids = [];

			for(var i = 0, len = aggregated.length; i < len; i++){
				if(aggregated[i]._id)
					ids.push(MONGO.Types.ObjectId(aggregated[i]._id));
			}

			self.goodOrderIds = ids;

			seriesModel.find({ $and: [{ status: 'PUBLIC' }, { episodes: { $ne: [] } }, { _id: { $in: ids } }]})
			.lean()
			.populate({
				path: 'episodes',
				select: 'season_num links',
				match: { $and: [{$where: 'this.links.length>0'}, {status: 'PUBLIC'}] },
				populate: {
					path: 'links',
					select: '_id',
					match: { status: 'PUBLIC' },
				}
			})
			.populate({
				path: 'new_status.episode',
				select: 'episode_num season_num url num episode_num_alter'
			})
			.select('_id title title_org year rate poster url views episodes links num update_date new_status')
			.exec(function(err, series){
				if(err){ self.send(); return; }
				if(!seriesModel){ self.send(); return; }
				if(series.length==0){ cb(); return; }

				self.getted += limit;

				self.series = series;
				self.check(function(){
					cb();
				});
			});
		});
	}

	self.check = function(cb)
	{
		self.good = 0;
		for(var i = 0; i < self.series.length; i++){
			var links = 0;
			for(var j = 0, len2 = self.series[i].episodes.length; j < len2; j++){
				if(self.series[i].episodes[j].links)
					links += self.series[i].episodes[j].links.length;
			}

			if(links==0){
				self.series.splice(i, 1);
				i--;
			}else{
				self.series[i].episodes = null;
				self.goodSeries.push(self.series[i]);
			}

			self.good++;
			if(self.good==10) break
		}

		if(self.goodSeries.length<10) self.load(self.getted, 10-self.series.length, cb);
		else cb();
	}

	ASYNC.series({
		day1: function(cb){
			self.days = 1;
			self.load(0, 10, function(){
				var seriesSorted = [];

				for(var i = 0, len = self.goodOrderIds.length; i < len; i++){
					for(var j = 0, len2 = self.goodSeries.length; j < len2; j++){
						if(String(self.goodOrderIds[i])==String(self.goodSeries[j]._id)){
							seriesSorted.push(self.goodSeries[j]);
							break;
						}
					}
				}

				self.goodSeries = [];
				cb(null, seriesSorted);
			});
		},
		day7: function(cb){
			self.days = 7;
			self.load(0, 10, function(){
				var seriesSorted = [];

				for(var i = 0, len = self.goodOrderIds.length; i < len; i++){
					for(var j = 0, len2 = self.goodSeries.length; j < len2; j++){
						if(String(self.goodOrderIds[i])==String(self.goodSeries[j]._id)){
							seriesSorted.push(self.goodSeries[j]);
							break;
						}
					}
				}
				self.goodSeries = [];
				cb(null, seriesSorted);
			});
		},
		day30: function(cb){
			self.days = 30;
			self.load(0, 10, function(){
				var seriesSorted = [];

				for(var i = 0, len = self.goodOrderIds.length; i < len; i++){
					for(var j = 0, len2 = self.goodSeries.length; j < len2; j++){
						if(String(self.goodOrderIds[i])==String(self.goodSeries[j]._id)){
							seriesSorted.push(self.goodSeries[j]);
							break;
						}
					}
				}
				self.goodSeries = [];
				cb(null, seriesSorted);
			});
		},
	}, function(err, results){
		if(err){ self.send(); return; }

		var result = [
			['day1', results.day1],
			['day7', results.day7],
			['day30', results.day30],
		]

		self.send(0, result);
	});
}


SERIES.accept = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		seriesModel.findById(self.data.ref)
		.select('status')
		.exec(function(err, series){
			if(err){ self.send(); return; }
			if(!series){ self.send(); return; }

			series.status = 'PUBLIC';
			series.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

SERIES.delete = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		seriesModel.findById(self.data.ref)
		.exec(function(err, series){
			if(err){ self.send(); return; }
			if(!series){ self.send(); return; }
			series.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

SERIES.setPremium = function(req, res, CB)
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

	if(self.data.ref==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

	seriesModel.find({_id: MONGO.Types.ObjectId(self.data.ref)})
	.select('status num episodes url num_alter viewed viewed_day viewed_week viewed_month')
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(series.length==0){ self.send(); return; }
		var series = series[0];

		counterModel.findOneAndUpdate({model: 'Series', field: 'num'}, { $inc: { count: 1 } }, { new: true }, function(err, doc){
			if(err){ self.send(); return; }

			var num = doc.count;
			var episodesArr = series.episodes;

			series.status = 'PREMIUM';
			series.num = num;
			series.num_alter = null;
			series.viewed = 0;
			series.viewed_day = 0;
			series.viewed_week = 0;
			series.viewed_month = 0;
			series.save(function(err){
				if(err){ self.send(); return; }

				episodeModel.find({_id: { $in: episodesArr}})
				.select('num views viewed')
				.exec(function(err, episodes){
					if(err){ self.send(); return; }

					var func = function(i, cb){
						var episode = episodes[i];
						if(!episode){ cb(); return; }

						counterModel.findOneAndUpdate({model: 'Episode', field: 'num'}, { $inc: { count: 1 } }, { new: true }, function(err, doc){
							var num = doc.count;
							episode.num = num;
							episode.views = 0;
							episode.viewed = 0;
							episode.save(function(err){
								if(err){ self.send(); return; }
								i++;
								func(i, cb);
							});
						});
					}
					
					func(0, function(){
						self.send(0, '/serial/'+series.url+'/'+num);
					});
				});
			});
		});
	});
}

SERIES.changeDesc = function(req, res, CB)
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
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.data==null){ self.send(); return; }

	seriesModel.findById(self.data.code)
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(!series){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		var keys = ['serial', 'serial online'];
		var keys_from_title = desc_to_keywords(series.title);
		var keys_from_title_org = desc_to_keywords(series.title_org);
		var keys_from_desc = desc_to_keywords(self.data.data);

		keys = keys.concat(keys_from_title);
		keys = keys.concat(keys_from_title_org);
		keys = keys.concat(keys_from_desc);

		series.desc = self.data.data;

		var keys = keys.filter(function(elem, index, self) {
			return index == self.indexOf(elem);
		});

		keys.sort();

		series.keywords = keys;

		series.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

SERIES.changeEpisodeDesc = function(req, res, CB)
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
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.data==null){ self.send(); return; }

	episodeModel.findById(self.data.code)
	.exec(function(err, episode){
		if(err){ self.send(); return; }
		if(!episode){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		var keys = ['serial', 'serial online', 'odcinek', 'sezon', 'odcinek '+episode.episode_num+(episode.episode_num_alter?'-'+episode.episode_num_alter:''), 'sezon '+episode.season_num];
		var keys_from_title = desc_to_keywords(episode.title);
		var keys_from_desc = desc_to_keywords(self.data.data);

		keys = keys.concat(keys_from_title);
		keys = keys.concat(keys_from_desc);

		episode.desc = self.data.data;

		var keys = keys.filter(function(elem, index, self) {
			return index == self.indexOf(elem);
		});

		keys.sort();

		episode.keywords = keys;

		episode.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

SERIES.changeTitle = function(req, res, CB)
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
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.data==null){ self.send(); return; }

	seriesModel.findById(self.data.code)
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(!series){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		series.title = self.data.data;
		series.url = url_title(self.data.data);

		var title = url_title(self.data.data);
		var title_org = url_title(series.title_org);

		title = title.replace(new RegExp('-', 'g'), ' ');
		title_org = title_org.replace(new RegExp('-', 'g'), ' ');
		
		var lacznie = title;

		if(title!=title_org)
			lacznie = title+' '+title_org;

		series.search = lacznie;

		series.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}


SERIES.changeTitleOrg = function(req, res, CB)
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
	else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

	if(self.data.data==null){ self.send(); return; }

	seriesModel.findById(self.data.code)
	.exec(function(err, series){
		if(err){ self.send(); return; }
		if(!series){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		series.title_org = self.data.data;

		var title = url_title(series.title);
		var title_org = url_title(self.data.data);

		title = title.replace(new RegExp('-', 'g'), ' ');
		title_org = title_org.replace(new RegExp('-', 'g'), ' ');
		
		var lacznie = title;

		if(title!=title_org)
			lacznie = title+' '+title_org;

		series.search = lacznie;

		series.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}



SERIES.acceptEpisode = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		episodeModel.findById(self.data.ref)
		.select('status')
		.exec(function(err, episode){
			if(err){ self.send(); return; }
			if(!episode){ self.send(); return; }

			episode.status = 'PUBLIC';
			episode.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

SERIES.deleteEpisode = function(req, res, CB)
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

	self.do = function()
	{
		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		episodeModel.findById(self.data.ref)
		.exec(function(err, episode){
			if(err){ self.send(); return; }
			if(!episode){ self.send(); return; }
			episode.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

SERIES.getEpisodesImport = function(req, res, CB)
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

	if(self.data._id==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data._id)){ self.send(); return; }

	if(self.data.season==null){ self.send(); return; }
	else if(!VALIDATOR.isInt(self.data.season)){ self.send(); return; }

	var series_id = self.data._id;
	var season_num = self.data.season;

	episodeModel.find({ $and: [{series_id: MONGO.Types.ObjectId(series_id) }, {season_num: season_num}] })
	.lean()
	.sort({episode_num: 1})
	.select('_id episode_num season_num episode_num_alter num series_id')
	.populate({
		path: 'series_id',
		select: 'title'
	})
	.exec(function(err, episodes){
		if(err){ self.send(); return; }
		self.send(0, episodes);

	});
}

module.exports = SERIES;