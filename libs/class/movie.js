
var MOVIE = {}

MOVIE.add = function(req, res, CB)
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
		else if(self.data.desc.length==0){ self.send(1, 'Uzupełnij opis filmu.'); return; }
		else if(self.data.desc.length>600){ self.send(1, 'Opis filmu może mieć maksymalnie 600 znaków.'); return; }

		if(self.data.id==null){ self.send(); return; }
		else if(self.data.id.length==0){
			self.data.id = -1;
		}

		self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

		if(self.data.user_id==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }

		if(self.data.poster==null){ self.send(); return; }
		else if(self.data.poster.length==0){ self.send(1, 'Dodaj okładkę.'); return; }

		movieModel.countDocuments({filmweb_id: self.data.id}, function(err, movie){
			if(err){ self.send(); return; }

			if(self.data.id!=-1)
				if(movie>0){ self.send(1, 'Film już istnieje w bazie.'); return; }

			userModel.find({_id: self.data.user_id})
			.limit(1)
			.lean()
			.exec(function(err, user){
				if(err){ self.send(); return; }
				if(user.length==0){ self.send(); return; }
				user = user[0];

				var keys = ['film', 'film online'];
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
				var url = url_title(self.data.title+"-"+self.data.year);

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
									like_up : 0,
									like_down : 0,
									poster : '/uploads/thumbs/'+filename2,
									desc : self.data.desc,
									url : url,
									genres : self.data.genres,
									views : 0,
									viewed : 0,
									status : status,
									user : MONGO.Types.ObjectId(self.data.user_id),
									keywords : keys,
									search : lacznie,
									trailer_url : video_url,
								}

								movieModel.create(query, function(err, movie){
									if(err){ self.send(); return; }

									var data = {
										redirect: '/film/'+url+'/'+movie.num,
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
			})
		});
	}

	self.data = req.body;
	self.add();
}

MOVIE.getByUrl = function(req, res, CB)
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
		}else if(type==5){
			self.answer = { error: true, code: 5}
			CB(self.answer);
		}else{
			self.answer = { error: true, code: 2 }
			CB(self.answer);
		}
	}

	var url = req.params.url;
	var num = req.params.num;

	movieModel.find({ num: num })
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: '_id'
	})
	.populate({
		path: 'links',
		select: 'user _id hosting quality report status type premium file_size video_id',
		populate: {
			path: 'user',
			select: '_id username'
		}
	})
	.populate({
		path: 'vote_logs',
		select: 'user_id vote',
	})
	.populate({
		path: 'comments',
		select: '_id user vote_logs status spoilers message like_up like_down date',
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
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(movie.length==0){
			counterModel.findOne({model: 'Movie', field: 'num'})
			.lean()
			.select('count')
			.exec(function(err, data){
				if(err){ self.send(); return; }
				if(!data){ self.send(); return; }

				if(data.count>=num) self.send(4);
				else self.send(5);
			});
			return;
		}
		
		movie = movie[0];

		if(movie.url!=url){ self.send(3, '/film/'+movie.url+'/'+num); return; }

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

		if(movie.status=='PREMIUM' && !isPremiumUser && !isModAdmin){ self.send(4); return; }

		if(movie.links.length>0 && !req.INJECT_DATA.isBot){
			movie.views++;
			movieModel.updateOne({ _id: movie._id }, { $inc: { views: 1 } }, function(err){});
		}

		for(var i = 0, len = movie.comments.length; i < len; i++){
			if(!movie.comments[i]) continue;
			if(!movie.comments[i].user) continue;
			if(!movie.comments[i].user.premium_expire) continue;

			var premium = false;
			if(MOMENT(movie.comments[i].user.premium_expire).isAfter(MOMENT())) premium = true;
			movie.comments[i].user.premium = premium;
		}
		
		movie.viewedByYou = false;

		if(req.INJECT_DATA.user_status.code==3){
			var user_id = req.INJECT_DATA.user_status.data._id;

			for(var i = 0, len = movie.users_viewed.length; i < len; i++) {
				if(String(movie.users_viewed[i])==String(user_id)){
					movie.viewedByYou = true;
					break;
				}
			}
		}

		var q = url_title(movie.title+' '+movie.title_org);
		q = q.replace(new RegExp('-', 'g'), ' ');
		q = q.replace(new RegExp('/+', 'g'), ' ');

		var words = q.split(' ');
		var str = '';

		for(var i = 0; i < words.length; i++) {
			if(words[i].length>1) str+= words[i]+' ';
		}

		var qz = { $and: [ {$text: {$search: str}}, q_status, { links: { $ne: [] } }, { _id: { $ne: MONGO.Types.ObjectId(movie._id) }}] };

		if(req.INJECT_DATA.user_status.code==3){
			qz['$and'].push({ users_viewed: { $nin: [ MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id) ] } })
		}

		movieModel.find(qz, {score: {$meta: 'textScore'}})
		.sort({score:{$meta: 'textScore'}})
		.lean()
		.limit(6)
		.select('title title_org year poster url num rate ver')
		.exec(function(err, movies){
			if(err){ self.send(); return; }
			if(!movies) movies = [];
				if(req.INJECT_DATA.user_status.code==3){
					voteModel.find({ $and: [{ user_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id) }, { movie_id: MONGO.Types.ObjectId(movie._id) }] })
					.limit(1)
					.lean()
					.select('vote')
					.exec(function(err, vote){
						if(err){ self.send(); return; }
						if(vote.length==0){ self.send(0, [movie, movies]); return; }
						vote = vote[0];

						movie.votedByYou = vote.vote;
						self.send(0, [movie, movies]);
					})
				}else{
					self.send(0, [movie, movies]);
				}
		});
	});
}

MOVIE.getBy = function(req, res, CB)
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

	var ver = query.ver?query.ver:null;
	var start_year = query.start_year?query.start_year:null;
	var end_year = query.end_year?query.end_year:null;
	var kat = query.kat?query.kat:null;

	if(page || sort_by || type || start_year || end_year || kat || ver){
		req.INJECT_DATA.google_index = false;
	}

	var perPage = 12;

	page--;
	if(page<0) page = 0;

	if(sort_by!='date' && sort_by!='views' && sort_by!='rate' && sort_by){ self.send(3); return; }
	if(type!='desc' && type!='asc' && type){ self.send(3); return; }

	var types_nums = [0, 1, 2, 4, 5, 6];

	if(ver){
		var exist = false;
		if(typeof ver == 'number' || typeof ver == 'string'){
			ver = parseInt(ver);
			if(types_nums.indexOf(ver)!=-1){
				ver = [ver];
				exist = true;
			}
		}else{
			for(var j = 0, len2 = ver.length; j < len2; j++) {
				ver[j] = parseInt(ver[j]);
				if(types_nums.indexOf(ver[j])!=-1){
					exist = true;
				}
			}
		}
		if(!exist){ self.send(3); return; }
	}

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
		{ ver: { $gt: [] } },
		{ links: { $ne: [] } },
	];

	kat = kat || [];
	

	var kats_or_stat = [];
	for(var i = 0; i < kat.length; i++) {
		kats_or_stat.push({genres: kat[i]});
	}

	if(kats_or_stat.length>0){
		stat.push({ $or: kats_or_stat });
	}

	ver = ver || [];

	var ver_or_stat = [];
	for(var i = 0; i < ver.length; i++) {
		ver_or_stat.push({ver: ver[i]});
	}

	if(ver_or_stat.length>0){
		stat.push({ $or: ver_or_stat });
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

	movieModel.find({ $and: stat })
	.lean()
	.limit(perPage)
	.skip(skip)
	.select('title title_org year rate poster desc url num users_viewed viewed genres ver update_date date')
	.sort({ [sort_by_c]: type })
	.exec(function(err, movies){
		if(err){ self.send(); return; }

		for(var i = 0, len = movies.length; i < len; i++){
			if(movies[i].ver && movies[i].ver.length>0){
				movies[i].typeVideo = VIDEO_TYPES_LIST[Math.min.apply(Math, movies[i].ver)][1];
			}
		}

		var url = BASE_URL+'/filmy';

		for(var i = 0, len = kat.length; i < len; i++){
			url = UTILS.buildURL(url, 'kat', kat[i].toLowerCase());
		}

		if(start_year)
			url = UTILS.buildURL(url, 'start_year', start_year);

		if(end_year)
			url = UTILS.buildURL(url, 'end_year', end_year);


		for(var i = 0, len = ver.length; i < len; i++){
			url = UTILS.buildURL(url, 'ver', ver[i]);
		}

		var urlPages = url;

		urlPages = UTILS.buildURL(urlPages, 'sort_by', sort_by);
		urlPages = UTILS.buildURL(urlPages, 'type', type==-1?'desc':'asc');

		var sep = url.indexOf('?') > -1 ? '' : '?';
		url += sep;

		var sep = urlPages.indexOf('?') > -1 ? '' : '?';
		urlPages += sep;

		movieModel.countDocuments({ $and: stat })
		.lean()
		.exec(function(err, movies_count){
			if(err){ self.send(); return; }

			var maxPages = Math.ceil(movies_count / perPage);

			if((page+1)>maxPages){
				if(maxPages>0){
					self.send(3, url); return;
				}
			}
	
			self.send(0, {movies:movies, status: {kats: GENRES_LIST, katsEnabled: kat, start_year: start_year, end_year: end_year, vers:ver, sort_by:sort_by, type:type, url:url, urlPages:urlPages, page:(page+1), maxPage:maxPages}})
		});
	});
}

/*MOVIE.addLink = function(req, res, CB)
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

		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

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

			var status = 'WAIT';

			linkModel.countDocuments({ $and: [ { user: MONGO.Types.ObjectId(self.data.user_id), status: 'PUBLIC' } ] })
			.exec(function(err, num){
				if(err){ self.send(); return; }

				if(user_access=='MODERATOR' || user_access=='ADMIN'){
					status = 'PUBLIC'
				}

				movieModel.findById(self.data.code)
				.populate({
					path: 'links',
					select: 'quality hosting type user',
					populate: {
						path: 'user',
						select: 'ip type'
					}
				})
				.select('links new_status update_date ver')
				.exec(function(err, movie){
					if(err){ self.send(); return; }

					if(movie==null){ self.send(); return; }

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

						if(movie.links && user_access=='USER'){
							for(var j = 0, len2 = movie.links.length; j < len2; j++){
								if(link.hosting==movie.links[j].hosting && self.data.type==movie.links[j].type && quality==movie.links[j].quality && String(self.data.user_id)==String(movie.links[j].user._id)){

									self.send(1, 'Dodałeś/aś już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}else if(link.hosting==movie.links[j].hosting && self.data.type==movie.links[j].type && quality==movie.links[j].quality && ip==(movie.links[j].user.ip?movie.links[j].user.ip:user.ip)){
									self.send(1, 'Z twojego adresu IP dodano już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}
							}

							var count = 0;

							for(var j = 0, len2 = movie.links.length; j < len2; j++){
								if(link.hosting==movie.links[j].hosting && self.data.type==movie.links[j].type && quality==movie.links[j].quality && movie.links[j].user.type=="USER"){
									count++;
								}
							}

							if(count>=5){
								self.send(1, 'Link odrzucony. Osiągnięto limit linków dla filmu.<br>Więcej informacji w <a href="/faq" target="_blank" class="greenLink">FAQ</a> punkt #06.'); return;
							}
						}

						var query = {
							_id : MONGO.Types.ObjectId(),
							type : self.data.type,
							quality : quality,
							hosting : link.hosting,
							video_id : link.id,
							like_up : 0,
							like_down : 0,
							user : MONGO.Types.ObjectId(self.data.user_id),
							status : status,
							ip : ip,
							premium : premium_link,
						}

						linkModel.create(query, function(err, list){
							if(err){ self.send(); return; }
							
							if(!movie.links) movie.links = [];

							var en_link_id = list._id;

							movie.links.push(MONGO.Types.ObjectId(en_link_id));

							if(req.INJECT_DATA.user_status.code==3 && req.INJECT_DATA.user_status.data.type!='USER' && !premium_link){
								var type = self.data.type;

								var link_best_type = VIDEO_TYPES_LIST.length-1;
								for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
									if(VIDEO_TYPES_LIST[i][0]==type){
										link_best_type = i;
										break;
									}
								}
								var best_type = VIDEO_TYPES_LIST.length-1;


								for(var i = 0, len = movie.links.length; i < len; i++){
									if(String(movie.links[i]._id)==String(en_link_id)) continue;
									for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
										if(VIDEO_TYPES_LIST[j][0]==movie.links[i].type){
											if(j<best_type) best_type = j;
										}
									}
								}

								var types = [];
								var count_links = 0;

								for(var j = 0, len2 = movie.links.length; j < len2; j++){
									count_links++;
									if(String(movie.links[j]._id)==String(en_link_id)){
										for(var k = 0, len3 = VIDEO_TYPES_LIST.length; k < len3; k++){
											if(VIDEO_TYPES_LIST[k].indexOf(self.data.type)!=-1){
												if(types.indexOf(k)==-1){
													types.push(k);
												}
											}
										}
										continue;
									}
								
									for(var k = 0, len3 = VIDEO_TYPES_LIST.length; k < len3; k++){
										if(VIDEO_TYPES_LIST[k].indexOf(movie.links[j].type)!=-1){
											if(types.indexOf(k)==-1){
												types.push(k);
											}
										}
									}
								}

								movie.ver = types;

								if(link_best_type<best_type){
									movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase();
									movie.update_date = MOMENT();
								}
								movie.save(function(err){
									if(err){ self.send(); return; }
									self.send(0);
								});
							}else{
								movie.save(function(err){
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

MOVIE.addLink = function(req, res, CB)
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

		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

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

				movieModel.find({_id: MONGO.Types.ObjectId(self.data.code)})
				.limit(1)
				.populate({
					path: 'links',
					select: 'quality hosting type user premium',
					populate: {
						path: 'user',
						select: 'ip type'
					}
				})
				.select('links new_status update_date ver')
				.exec(function(err, movie){
					if(err){ self.send(); return; }
					if(movie.length==0){ self.send(); return; }
					movie = movie[0];

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

						if(movie.links && user_access=='USER'){
							for(var j = 0, len2 = movie.links.length; j < len2; j++){
								if(link.hosting==movie.links[j].hosting && self.data.type==movie.links[j].type && quality==movie.links[j].quality && String(self.data.user_id)==String(movie.links[j].user._id)){
									self.send(1, 'Dodałeś/aś już link '+link.hosting+' do '+VIDEO_TYPES_LIST_ASSOCIATE[self.data.type]+'<br> w jakości '+VIDEO_QUALITY_ASSOCIATE[quality]+'.'); return;
								}
							}

							var count = 0;

							for(var j = 0, len2 = movie.links.length; j < len2; j++){
								if(link.hosting==movie.links[j].hosting && self.data.type==movie.links[j].type && quality==movie.links[j].quality && movie.links[j].user.type=="USER"){
									count++;
								}
							}

							if(count>=4){
								self.send(1, 'Link odrzucony. Osiągnięto limit linków dla filmu.<br>Więcej informacji w <a href="/faq" target="_blank" class="greenLink">FAQ</a> punkt #06.'); return;
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
							movie_id : MONGO.Types.ObjectId(movie._id),
						}

						linkModel.create(query, function(err, list){
							if(err){ self.send(); return; }
							
							if(!movie.links) movie.links = [];

							var en_link_id = list._id;

							movie.links.push(MONGO.Types.ObjectId(en_link_id));

							if(req.INJECT_DATA.user_status.code==3 && req.INJECT_DATA.user_status.data.type!='USER' && !premium_link){
								var type = self.data.type;

								var link_best_type = VIDEO_TYPES_LIST.length-1;
								for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
									if(VIDEO_TYPES_LIST[i][0]==type){
										link_best_type = i;
										break;
									}
								}
								var best_type = VIDEO_TYPES_LIST.length-1;


								for(var i = 0, len = movie.links.length; i < len; i++){
									if(String(movie.links[i]._id)==String(en_link_id)) continue;
									if(movie.links[i].premium) continue;

									for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
										if(VIDEO_TYPES_LIST[j][0]==movie.links[i].type){
											if(j<best_type) best_type = j;
										}
									}
								}

								var types = [];
								var count_links = 0;

								for(var j = 0, len2 = movie.links.length; j < len2; j++){
									count_links++;
									if(String(movie.links[j]._id)==String(en_link_id)){
										for(var k = 0, len3 = VIDEO_TYPES_LIST.length; k < len3; k++){
											if(VIDEO_TYPES_LIST[k].indexOf(self.data.type)!=-1){
												if(types.indexOf(k)==-1){
													types.push(k);
												}
											}
										}
										continue;
									}
								
									for(var k = 0, len3 = VIDEO_TYPES_LIST.length; k < len3; k++){
										if(VIDEO_TYPES_LIST[k].indexOf(movie.links[j].type)!=-1){
											if(types.indexOf(k)==-1){
												types.push(k);
											}
										}
									}
								}

								movie.ver = types;

								if(link_best_type<best_type){
									movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase();
									movie.update_date = MOMENT();
								}
								movie.save(function(err){
									if(err){ self.send(); return; }
									self.send(0);
								});
							}else{
								movie.save(function(err){
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


MOVIE.setViewed = function(req, res, CB)
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

	if(self.data.type==null){ self.send(); return; }
	else if(self.data.type!=-1 && self.data.type!=1){ self.send(); return; }

	movieModel.findById(self.data.code)
	.select('users_viewed')
	.exec(function(err, movie){
		if(err){ self.send(); return; }

		if(movie==null){ self.send(); return; }

		if(req.INJECT_DATA.user_status.code==3){
			var user_id = req.INJECT_DATA.user_status.data._id;

			if(movie.users_viewed){
				if(self.data.type==1){
					if(movie.users_viewed.indexOf(MONGO.Types.ObjectId(user_id))==-1){
						movie.users_viewed.push(MONGO.Types.ObjectId(user_id));
					}
				}else{
					var index = movie.users_viewed.indexOf(MONGO.Types.ObjectId(user_id));
					if(index!=-1){
						movie.users_viewed.splice(index, 1);
					}
				}
			}
		}

		movie.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

MOVIE.countView = function(req, res, CB)
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

		if(self.data.adb==null){ self.send(); return; }
		else if(typeof self.data.adb!='string'){ self.send(); return; }
		else if(self.data.adb!='true' && self.data.adb!='false'){ self.send(); return; }

		var adb = false;
		if(self.data.adb=='true') adb = true;

		var ip = getIP(req);
		if(!ip || ip.length==0){ self.send(); return; }

		movieModel.countDocuments({ _id: MONGO.Types.ObjectId(self.data.code)})
		.exec(function(err, movies){
			if(err){ self.send(); return; }
			if(movies==0){ self.send(); return; }

			var setViewed = false;

			if(req.INJECT_DATA.user_status.code==3){
				var user_id = req.INJECT_DATA.user_status.data._id;
				setViewed = true;
				movieModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code)}, { $addToSet: { users_viewed: MONGO.Types.ObjectId(user_id) } }, function(err){});
			}

			viewedModel.countDocuments({ $and: [{ip: ip}, {movie_id: self.data.code}] })
			.exec(function(err, count){
				if(err){ self.send(); return; }

				if(count>0){
					self.send(0, {setViewed:setViewed}); return;
				}

				var query = {
					_id : MONGO.Types.ObjectId(),
					ip : ip,
					movie_id : MONGO.Types.ObjectId(self.data.code),
					adb: adb,
				}

				viewedModel.create(query, function(view){
					movieModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code)}, { $inc: { viewed: 1 } }, function(err){
						if(err){ self.send(); return; }
						self.send(0, {setViewed:setViewed});
					});
				});
			});
		});
	}

	self.data = req.body;
	self.count();
}

MOVIE.voteStar = function(req, res, CB)
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

	movieModel.find({ _id: self.data.code })
	.select('rate votes_count')
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(movie.length==0){ self.send(); return; }
		movie = movie[0];

		voteModel.find({ $and: [{user_id: user_id}, {movie_id: self.data.code}] })
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
						{ $match: { movie_id: MONGO.Types.ObjectId(self.data.code) } },
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

							movie.rate = average;
							movie.votes_count = count;

							movie.save(function(err){
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
						{ $match: { movie_id: MONGO.Types.ObjectId(self.data.code) } },
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

							movie.rate = average;
							movie.votes_count = count;

							movie.save(function(err){
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
					movie_id : MONGO.Types.ObjectId(self.data.code),
				}

				voteModel.create(query, function(err, vote_res){
					if(err){ self.send(); return; }

					voteModel.aggregate([
					{ $match: { movie_id: MONGO.Types.ObjectId(self.data.code) } },
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

						movie.rate = average;
						movie.votes_count = count;

						movie.save(function(err){
							if(err){ self.send(); return; }
							self.send(0, {avg: average, count:count});
						});
					});
				});
			}
		});
	});
}

MOVIE.publicHideLink = function(req, res, CB)
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

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		if(self.data.type==null){ self.send(); return; }
		else if(self.data.type!=0 && self.data.type!=1){ self.send(); return; }

		movieModel.countDocuments({ _id : self.data.code })
		.exec(function(err, movie){
			if(err){ self.send(); return; }

			if(movie==0){ self.send(); return; }

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
	}

	self.data = req.body;
	self.do();
}


MOVIE.getLinkInfo = function(req, res, CB)
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

		if(self.data.ref==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		movieModel.countDocuments({ _id : self.data.code })
		.exec(function(err, movie){
			if(err){ self.send(); return; }

			if(movie==0){ self.send(); return; }

			linkModel.findById(self.data.ref)
			.exec(function(err, link){
				if(err){ self.send(); return; }
				if(link==null){ self.send(); return; }

				self.send(0, link);
			});
		});
	}

	self.data = req.body;
	self.do();
}


MOVIE.editLink = function(req, res, CB)
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
					movieModel.findById(self.data.code)
					.populate({
						path: 'links',
						select: '_id type',
						match: { status: 'PUBLIC' },
					})
					.select('_id links new_status update_date ver')
					.exec(function(err, movie){
						if(err){ self.send(); return; }
						if(movie.length==0){ self.send(); return; }

						var link_best_type = VIDEO_TYPES_LIST.length-1;
						for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
							if(VIDEO_TYPES_LIST[i][0]==self.data.type){
								link_best_type = i;
								break;
							}
						}
						var best_type = VIDEO_TYPES_LIST.length-1;
						var zero_links = false;

						if(movie.links.length==0) zero_links = true;

						for(var i = 0, len = movie.links.length; i < len; i++){
							if(String(movie.links[i]._id)==String(en_link_id)) continue;
							for(var j = 0, len2 = VIDEO_TYPES_LIST.length; j < len2; j++){
								if(VIDEO_TYPES_LIST[j][0]==movie.links[i].type){
									if(j<best_type) best_type = j;
								}
							}
						}

						var types = [];
						var count_links = 0;

						for(var j = 0, len2 = movie.links.length; j < len2; j++){
							count_links++;
							for(var k = 0, len3 = VIDEO_TYPES_LIST.length; k < len3; k++){
								if(VIDEO_TYPES_LIST[k].indexOf(movie.links[j].type)!=-1){
									if(types.indexOf(k)==-1){
										types.push(k);
									}
								}
							}
						}

						movie.ver = types;

						if(zero_links){
							movie.new_status = '';
						}else if(link_best_type==best_type){
							movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase();
						}else if(link_best_type<best_type){
							movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase();
							movie.update_date = MOMENT();
						}else{
							movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[best_type][1]).toLowerCase();
						}

						movie.save(function(err){
							if(err){ self.send(); return; }
							self.send(0);
						});
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


MOVIE.reportLink = function(req, res, CB)
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

		var exist = REPORT_TYPES_LIST[self.data.type];
		if(!exist){ self.send(); return; }

		movieModel.countDocuments({ _id : self.data.code })
		.exec(function(err, movie){
			if(err){ self.send(); return; }

			if(movie==0){ self.send(); return; }

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
	}

	self.data = req.body;
	self.report();
}

MOVIE.addComment = function(req, res, CB)
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

		if(self.data.message==null){ self.send(); return; }
		else if(typeof self.data.message!='string'){ self.send(); return; }
		else if(self.data.message.length==0){ self.send(1, 'Uzupełnij komentarz'); return; }
		else if(self.data.message.length>500){ self.send(1, 'Komentarz moze mieć maksymalnie 500 znaków'); return; }

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

			movieModel.countDocuments({ _id: MONGO.Types.ObjectId(self.data.code)})
			.lean()
			.select('_id')
			.exec(function(err, movie){
				if(err){ self.send(); return; }

				if(movie==0){ self.send(); return; }

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
						movie_id : MONGO.Types.ObjectId(self.data.code),
						user : MONGO.Types.ObjectId(user_id),
					}

					commentModel.create(query, function(err, comment){
						if(err){ self.send(); return; }

						movieModel.updateOne({ _id: MONGO.Types.ObjectId(self.data.code)}, { $addToSet: { comments: MONGO.Types.ObjectId(comment._id) } }, function(err){
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

MOVIE.voteComment = function(req, res, CB)
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
			.limit(1)
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

MOVIE.createHPM = function(CB)
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
	self.goodMovies = [];
	self.days = 0;
	self.goodOrderIds = [];

	self.load = function(limit, cb)
	{		
		var now = new MOMENT();
		var date = now.subtract(self.days, 'd');
		viewedModel.aggregate([
			{ $match: { $and: [
					{ 'date': { '$gte': date.toDate() } },
					{ 'movie_id': { $exists: true } }
				]
			}},
			{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
			{ $sort: { count: -1 } },
			{ $limit: limit }])
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

			movieModel.find({ $and: [{ _id: { $in: ids } }]})
			.lean()
			.select('_id title title_org year rate poster url views links num update_date new_status status')
			.populate({
				path: 'links',
				select: '_id'
			})
			.exec(function(err, movies){
				if(err){ self.send(); return; }
				if(!movies){ self.send(); return; }
				if(movies.length==0){ cb(); return; }

				self.getted = limit;

				var moviesSorted = [];

				self.movies = movies;

				for(var i = 0, len = self.goodOrderIds.length; i < len; i++){
					for(var j = 0, len2 = self.movies.length; j < len2; j++){
						if(String(self.goodOrderIds[i])==String(self.movies[j]._id)){
							moviesSorted.push(self.movies[j]);
							break;
						}
					}
				}

				self.movies = moviesSorted;

				
				self.check(function(){
					cb();
				});
			});
		});
	}

	self.check = function(cb)
	{
		for(var i = 0; i < self.movies.length; i++){

			if(self.movies[i].status=='HIDE'){
				self.movies.splice(i, 1);
				i--;
			}else if(self.movies[i].status=='COPY'){
				self.movies.splice(i, 1);
				i--;
			}else if(self.movies[i].status=='WAIT'){
				self.movies.splice(i, 1);
				i--;
			}else if(self.movies[i].links.length==0){
				self.movies.splice(i, 1);
				i--;
			}else{
				self.movies[i].links = null;
				self.goodMovies.push(self.movies[i]);
			}

			if(self.goodMovies.length==10) break;
		}

		if(self.getted>200){
			cb();
			return;
		}

		if(self.goodMovies.length<10){
			self.goodMovies = [];
			self.load(self.getted+10, cb);
		}else cb();
	}

	ASYNC.series({
		day1: function(cb){
			self.days = 1;
			self.load(10, function(){
				self.getted = 0;
				var goodMoviesz = self.goodMovies;
				self.goodMovies = [];
				cb(null, goodMoviesz);
			});
		},
		day7: function(cb){
			self.days = 7;
			self.load(10, function(){
				self.getted = 0;
				var goodMoviesz = self.goodMovies;
				self.goodMovies = [];
				cb(null, goodMoviesz);
			});
		},
		day30: function(cb){
			self.days = 30;
			self.load(10, function(){
				self.getted = 0;
				var goodMoviesz = self.goodMovies;
				self.goodMovies = [];
				cb(null, goodMoviesz);
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

MOVIE.accept = function(req, res, CB)
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

		movieModel.findById(self.data.ref)
		.select('status')
		.exec(function(err, movie){
			if(err){ self.send(); return; }
			if(!movie){ self.send(); return; }

			movie.status = 'PUBLIC';
			movie.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

MOVIE.delete = function(req, res, CB)
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

		movieModel.findById(self.data.ref)
		.exec(function(err, movie){
			if(err){ self.send(); return; }
			if(!movie){ self.send(); return; }
			movie.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

MOVIE.setPremium = function(req, res, CB)
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

	movieModel.find({_id: MONGO.Types.ObjectId(self.data.ref)})
	.select('status num url')
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(movie.length==0){ self.send(); return; }
		var movie = movie[0];

		counterModel.findOneAndUpdate({model: 'Movie', field: 'num'}, { $inc: { count: 1 } }, { new: true }, function(err, doc){
			if(err){ self.send(); return; }

			var num = doc.count;

			movie.status = 'PREMIUM';
			movie.num = num;
			movie.save(function(err){
				if(err){ self.send(); return; }
				self.send(0, '/film/'+movie.url+'/'+num);
			});
		});
	});
}


MOVIE.changeDesc = function(req, res, CB)
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

	movieModel.findById(self.data.code)
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(!movie){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		var keys = ['film', 'film online'];

		var keys_from_title = desc_to_keywords(movie.title);
		var keys_from_title_org = desc_to_keywords(movie.title_org);
		var keys_from_desc = desc_to_keywords(self.data.data);

		keys = keys.concat(keys_from_title);
		keys = keys.concat(keys_from_title_org);
		keys = keys.concat(keys_from_desc);

		movie.desc = self.data.data;

		var keys = keys.filter(function(elem, index, self) {
			return index == self.indexOf(elem);
		});

		keys.sort();

		movie.keywords = keys;

		movie.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}


MOVIE.changeTitle = function(req, res, CB)
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

	movieModel.findById(self.data.code)
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(!movie){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		movie.title = self.data.data;
		movie.url = url_title(self.data.data+"-"+movie.year);

		var title = url_title(self.data.data);
		var title_org = url_title(movie.title_org);

		title = title.replace(new RegExp('-', 'g'), ' ');
		title_org = title_org.replace(new RegExp('-', 'g'), ' ');
		
		var lacznie = title;

		if(title!=title_org)
			lacznie = title+' '+title_org;

		movie.search = lacznie;

		movie.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}


MOVIE.changeTitleOrg = function(req, res, CB)
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

	movieModel.findById(self.data.code)
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(!movie){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		movie.title_org = self.data.data;

		var title = url_title(movie.title);
		var title_org = url_title(self.data.data);

		title = title.replace(new RegExp('-', 'g'), ' ');
		title_org = title_org.replace(new RegExp('-', 'g'), ' ');
		
		var lacznie = title;

		if(title!=title_org)
			lacznie = title+' '+title_org;

		movie.search = lacznie;

		movie.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}

MOVIE.lock = function(req, res, CB)
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

	movieModel.findById(self.data.code)
	.select('status copyright_del_date links')
	.exec(function(err, movie){
		if(err){ self.send(); return; }
		if(!movie){ self.send(); return; }

		var moment = new MOMENT().add(14, 'days');

		moment.hour(3);
		moment.minute(30);
		moment.second(30);

		movie.status = 'COPY';
		movie.copyright_del_date = moment.toDate();

		movie.save(function(err){
			if(err){ self.send(); return; }

			linkModel.find({ _id: { $in: movie.links }}, function(err, links){
				if(err){ self.send(); return; }

				var i = 0;
				var dl = function(cb){
					if((i+1)>links.length){ cb(); return; }

					var link = links[i];

					link.remove(function(err){
						if(err){ self.send(); return; }

						i++;
						dl(cb);
					});
				};

				dl(function(){
					self.send(0);
				});
			});
		});
	});
}

module.exports = MOVIE;