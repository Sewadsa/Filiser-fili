
var VIDEO = {}

VIDEO.add = function(req, res, CB)
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


	if(self.data.link==null){ self.send(); return; }
	else if(self.data.link.length==0){ self.send(1, 'Uzupełnij link do youtube.'); return; }
	else if(!VALIDATOR.isURL(self.data.link)){ self.send(1, 'Link do youtube jest błędny.'); return; }

	if(self.data.title==null){ self.send(); return; }
	else if(self.data.title.length<10 && self.data.title.length!=0){ self.send(1, 'Tytuł musi mieć minimalnie 10 znaków.'); return; }
	else if(self.data.title.length>100){ self.send(1, 'Tytuł może mieć maksymalnie 100 znaków.'); return; }

	self.data.title = self.data.title.trim();
		
	if(self.data.genres==null){ self.send(1, 'Wybierz kategorie.'); return; }
	else if(self.data.genres.length==0){ self.send(1, 'Wybierz kategorie.'); return; }
	else if(typeof self.data.genres == 'object' && self.data.genres.length>3){ self.send(1, 'Maksymalnie można wybrać 3 kategorie.'); return; }

	if(self.data.desc==null){ self.send(); return; }
	else if(self.data.desc.length==0){ self.send(1, 'Uzupełnij opis filmiku.'); return; }
	else if(self.data.desc.length>600){ self.send(1, 'Opis filmu może mieć maksymalnie 600 znaków.'); return; }

	self.data.desc = self.data.desc.trim();

	if(typeof self.data.genres == 'object'){
		for(var i = 0, len = self.data.genres.length; i < len; i++) {
			if(VIDEO_GENRES_LIST.indexOf(self.data.genres[i])==-1){ self.send(); return; }
		}
	}else{
		if(VIDEO_GENRES_LIST.indexOf(self.data.genres)==-1){ self.send(); return; }
	}

	self.data.user_id = String(req.INJECT_DATA.user_status.data._id);

	if(self.data.user_id==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data.user_id)){ self.send(); return; }


	var parsed = URL.parse(self.data.link);
	var host = parsed.host;

	var link_id = null;

	for(var j = 0, len2 = VIDEO_HOSTING_LIST.length; j < len2; j++){
		if(host==VIDEO_HOSTING_LIST[j].host){
			var ID = VIDEO_HOSTING_LIST[j].getID(self.data.link);
			if(!ID){ self.send(1, 'Błędny link.'); return; }
			else{
				link_id = ID;
			}
			break;
		}
	}

	videoModel.countDocuments({video_id: link_id}, function(err, video){
		if(err){ self.send(); return; }

		if(video>0){ self.send(1, 'Filmik już istnieje w bazie.'); return; }

		var options = {
			host: 'www.googleapis.com',
			port: 443,
			path: '/youtube/v3/videos?key=AIzaSyDfRSNG3j9fKC36WOopJJD7p4HWZcEp3bQ&part=snippet&id='+link_id,
			secure: true,
			method: 'GET',
		};

		var body = '';

		var request = HTTPS.request(options, function(answer){
			answer.setEncoding('utf8');

			answer.on('data', function(chunk){
				body+=chunk;
			});

			answer.on('end', function(){
				try{
					var parsed = JSON.parse(body);

					if(!parsed.items || parsed.items.length==0){ self.send(1, 'Nie znaleziono video.'); return; }

					var item = parsed.items[0];

					var snippet = item.snippet;

					var title = snippet.title;
					var thumbnails = snippet.thumbnails;

					if(self.data.title.length==0) self.data.title = title;

					var thumbs_best_list = ['maxres', 'standard', 'high', 'medium', 'default'];
					var res = null;
					var res_data = null;

					for(var i = 0; i < thumbs_best_list.length; i++) {
						if(thumbnails[thumbs_best_list[i]]){
							res = thumbs_best_list[i];
							res_data = thumbnails[thumbs_best_list[i]];
							break;
						}
					}

					var filename_tmp = SHORT_ID.generate()+'.jpg';
					var file_path_tmp = PATH.join(PUBLIC_PATH, 'uploads/tmp/'+filename_tmp);

					downloadImageHTTPS(res_data.url, file_path_tmp, function(err){
						if(!err){ self.send(); return; }

						var width_yt = res_data.width;
						var height_yt = res_data.height;

						var new_height = parseInt(width_yt/16*9);

						var n_width = 330;
						var n_height = 186;

						if(width_yt<330 || new_height<186){
							n_width = width_yt;
							n_height = new_height;
						}

						var filename = SHORT_ID.generate()+'.jpg';
						var file_path = PATH.join(PUBLIC_PATH, 'uploads/thumbs_yt/'+filename);

						var img = SHARP(file_path_tmp)
						img.metadata()
						.then(function(metadata){
							var width = metadata.width;
							var height = metadata.height;

							var ciach_width = 0;
							var ciach_height = 0;

							if(width_yt<1280){
								ciach_width = width_yt;
								ciach_height = new_height;
							}else{
								ciach_width = parseInt(height/9*16);
								ciach_height = height;
							}

							return img.resize(n_width, n_height).toFile(file_path);
						}).then(function(err){


							FS.unlinkSync(file_path_tmp);

							var url = url_title(self.data.title);

							var user_access = req.INJECT_DATA.user_status.data.type;

							var status = 'PUBLIC';
							if(user_access=='USER'){
								status = 'WAIT';
							}

							var query = {
								_id : MONGO.Types.ObjectId(),
								title : self.data.title,
								poster : '/uploads/thumbs_yt/'+filename,
								url : url,
								genres : self.data.genres,
								video_id : link_id,
								user : MONGO.Types.ObjectId(self.data.user_id),
								status : status,
								desc : self.data.desc,
							}

							videoModel.create(query, function(err, video){
								if(err){ self.send(); return; }

								var data = {
									redirect: '/filmik/'+url+'/'+video.num,
								}
								
								self.send(0, data);
							});
						});
					}, true);
				}catch(err){
					self.send(); return;
				}
			});
		});
	
		request.on('timeout', function(err){
			self.send(); return;
		});
		request.on('error', function(err){
			self.send(); return;
		});
		request.end();
	});
}

VIDEO.getByUrl = function(req, res, CB)
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

	videoModel.find({ num: num })
	.limit(1)
	.lean()
	.populate({
		path: 'user',
		select: '_id username'
	})
	.populate({
		path: 'comments',
		select: '_id user vote_logs status spoilers message like_up like_down date desc',
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
	.exec(function(err, video){
		if(err){ self.send(); return; }
		if(video.length==0){
			counterModel.findOne({model: 'Video', field: 'num'})
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
		
		video = video[0];

		if(video.url!=url){ self.send(3, '/filmik/'+video.url+'/'+num); return; }

		if(!req.INJECT_DATA.isBot){
			video.views++;
			videoModel.findByIdAndUpdate(video._id, { views: video.views }, function(err){});
		}

		

		for(var i = 0, len = video.comments.length; i < len; i++){
			if(!video.comments[i]) continue;
			if(!video.comments[i].user) continue;
			if(!video.comments[i].user.premium_expire) continue;

			var premium = false;
			if(MOMENT(video.comments[i].user.premium_expire).isAfter(MOMENT())) premium = true;
			video.comments[i].user.premium = premium;
		}

		var ip = getIP(req);

		viewedModel.countDocuments({ $and: [{ip: ip}, {video_id: video._id}] })
		.exec(function(err, count){
			if(err){ self.send(); return; }

			if(count==0){
				var query = {
					_id : MONGO.Types.ObjectId(),
					ip : ip,
					video_id : MONGO.Types.ObjectId(video._id)
				}

				viewedModel.create(query, function(err){});
			}
		});

		var viewedRand = Math.round(Math.random());

		var qz = { $and: [ { status: 'PUBLIC' }, { _id: { $ne: MONGO.Types.ObjectId(video._id) }}, { genres: { $in: video.genres }}] };

		videoModel.find(qz)
		.lean()
		.limit(6)
		.sort({views:-1})
		.select('title poster url num views')
		.exec(function(err, videos){
			if(err){ self.send(); return; }
			if(!videos) videos = [];

			if(req.INJECT_DATA.user_status.code==3){
				voteModel.find({ $and: [{ user_id: MONGO.Types.ObjectId(req.INJECT_DATA.user_status.data._id) }, { video_id: MONGO.Types.ObjectId(video._id) }] })
				.limit(1)
				.lean()
				.select('vote')
				.exec(function(err, vote){
					if(err){ self.send(); return; }
					if(vote.length==0){ self.send(0, [video, videos]); return; }
					vote = vote[0];

					video.votedByYou = vote.vote;
					self.send(0, [video, videos]);
				})
			}else{
				self.send(0, [video, videos]);
			}
		});
	});
}

VIDEO.voteStar = function(req, res, CB)
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

	videoModel.find({ _id: self.data.code })
	.select('rate votes_count')
	.exec(function(err, video){
		if(err){ self.send(); return; }
		if(video.length==0){ self.send(); return; }
		video = video[0];

		voteModel.find({ $and: [{user_id: user_id}, {video_id: self.data.code}] })
		.select('vote')
		.limit(1)
		.exec(function(err, vote){
			if(err){ self.send(); return; }
			vote = vote[0];

			if(vote){
				if(vote.vote==self.data.value){
					vote.remove(function(err){
						if(err){ self.send(); return; }

						voteModel.aggregate(
						{ $match: { video_id: MONGO.Types.ObjectId(self.data.code) } },
						{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } })
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

							video.rate = average;
							video.votes_count = count;

							video.save(function(err){
								if(err){ self.send(); return; }
								self.send(0, {avg: average, count:count, deleted: true});
							});
						});
					});
				}else{
					vote.vote = self.data.value;
					vote.save(function(err){
						if(err){ self.send(); return; }

						voteModel.aggregate(
						{ $match: { video_id: MONGO.Types.ObjectId(self.data.code) } },
						{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } })
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

							video.rate = average;
							video.votes_count = count;

							video.save(function(err){
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
					video_id : MONGO.Types.ObjectId(self.data.code),
				}

				voteModel.create(query, function(err, vote_res){
					if(err){ self.send(); return; }

					voteModel.aggregate(
					{ $match: { video_id: MONGO.Types.ObjectId(self.data.code) } },
					{ $group: { _id: null, total: { $sum: "$vote" }, count : { $sum : 1 } } })
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

						video.rate = average;
						video.votes_count = count;

						video.save(function(err){
							if(err){ self.send(); return; }
							self.send(0, {avg: average, count:count});
						});
					});
				});
			}
		});
	});
}


VIDEO.addComment = function(req, res, CB)
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
		if(!req.INJECT_DATA.user_status.data.comment_captcha){ cb(true); return; }

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
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.message==null){ self.send(); return; }
		else if(self.data.message.length==0){ self.send(1, 'Uzupełnij komentarz'); return; }
		else if(self.data.message.length>500){ self.send(1, 'Komentarz moze mieć maksymalnie 500 znaków'); return; }

		if(req.INJECT_DATA.user_status.data.comment_captcha){
			if(self.data['g-recaptcha-response']==null){ self.send(1, 'Wypełnij recaptcha.'); return; }
			else if(self.data['g-recaptcha-response'].length==0){ self.send(1, 'Wypełnij recaptcha.'); return; }
		}

		var user_id = req.INJECT_DATA.user_status.data._id;


		videoModel.findById(self.data.code)
		.exec(function(err, video){
			if(err){ self.send(); return; }

			if(video==null){ self.send(); return; }
			
			var status = 'WAIT';
			if(self.data.message.indexOf('http://')!=-1 ||
				self.data.message.indexOf('http')!=-1 ||
				self.data.message.indexOf('.pl')!=-1 ||
				self.data.message.indexOf('.com')!=-1 ||
				self.data.message.indexOf('.tv')!=-1 ||
				self.data.message.indexOf('.index')!=-1 ||
				self.data.message.indexOf('tutaj')!=-1 ||
				self.data.message.indexOf('link')!=-1 ||
				self.data.message.indexOf('href')!=-1 ||
				self.data.message.indexOf('www')!=-1 ||
				self.data.message.indexOf('://')!=-1 ||
				self.data.message.indexOf('.io')!=-1
			){
				status = 'HIDE_WAIT';
			}

			self.captcha(function(captch_result){
				if(!captch_result){ self.send(); return; }
			
				var query = {
					_id : MONGO.Types.ObjectId(),
					like_up : 0,
					like_down : 0,
					message : self.data.message,
					status : status,
					video_id : MONGO.Types.ObjectId(self.data.code),
					user : MONGO.Types.ObjectId(user_id),
				}

				commentModel.create(query, function(err, comment){
					if(err){ self.send(); return; }

					if(!video.comments) video.comments = [];
					video.comments.push(MONGO.Types.ObjectId(comment._id));

					video.save(function(err){
						if(err){ self.send(); return; }
						self.send(0);
					});
				});
			});
		});
	}

	self.data = req.body;
	self.add();
}


VIDEO.voteComment = function(req, res, CB)
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

VIDEO.getBy = function(req, res, CB)
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

	var kat = query.kat?query.kat:null;

	var perPage = 12;

	page--;
	if(page<0) page = 0;

	if(sort_by!='date' && sort_by!='views' && sort_by!='rate' && sort_by){ self.send(3); return; }
	if(type!='desc' && type!='asc' && type){ self.send(3); return; }

	if(kat){
		var exist = false;
		if(typeof kat == 'string'){
			for(var i = 0, len = VIDEO_GENRES_LIST.length; i < len; i++) {
				if(kat==VIDEO_GENRES_LIST[i]){
					exist = true;
					break;
				}
			}
			kat = [kat];
		}else{
			for(var i = 0, len = VIDEO_GENRES_LIST.length; i < len; i++) {
				for(var j = 0, len2 = kat.length; j < len2; j++) {
					if(kat[j]==VIDEO_GENRES_LIST[i]){
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

	kat = kat || [];

	var stat = [
		{ status: 'PUBLIC'},
	];

	var kats_or_stat = [];
	for(var i = 0; i < kat.length; i++) {
		kats_or_stat.push({genres: kat[i]});
	}

	if(kats_or_stat.length>0){
		stat.push({ $or: kats_or_stat });
	}
	
	var skip = perPage * page;

	videoModel.find({ $and: stat })
	.lean()
	.limit(perPage)
	.skip(skip)
	.sort({ [sort_by]: type })
	.exec(function(err, videos){
		if(err){ self.send(); return; }

		var url = BASE_URL+'/filmiki';

		for(var i = 0, len = kat.length; i < len; i++){
			url = UTILS.buildURL(url, 'kat', kat[i].toLowerCase());
		}

		var urlPages = url;

		urlPages = UTILS.buildURL(urlPages, 'sort_by', sort_by);
		urlPages = UTILS.buildURL(urlPages, 'type', type==-1?'desc':'asc');

		var sep = url.indexOf('?') > -1 ? '' : '?';
		url += sep;

		videoModel.countDocuments({ $and: stat })
		.lean()
		.exec(function(err, videos_count){
			if(err){ self.send(); return; }

			var maxPages = Math.ceil(videos_count / perPage);

			if((page+1)>maxPages){
				if(maxPages>0){
					self.send(3, url); return;
				}
			}

			self.send(0, {videos:videos, status: {kats: VIDEO_GENRES_LIST, katsEnabled: kat, sort_by:sort_by, type:type, url:url, urlPages:urlPages, page:(page+1), maxPage:maxPages}})
		});
	});
}

VIDEO.delete = function(req, res, CB)
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

		videoModel.findById(self.data.ref)
		.exec(function(err, video){
			if(err){ self.send(); return; }
			if(!video){ self.send(); return; }
			video.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

VIDEO.accept = function(req, res, CB)
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

		videoModel.findById(self.data.ref)
		.select('status')
		.exec(function(err, video){
			if(err){ self.send(); return; }
			if(!video){ self.send(); return; }

			video.status = 'PUBLIC';
			video.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}


VIDEO.changeDesc = function(req, res, CB)
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

	videoModel.findById(self.data.code)
	.exec(function(err, video){
		if(err){ self.send(); return; }
		if(!video){ self.send(); return; }
		if(self.data.data.length==0){ self.send(); return; }

		video.desc = self.data.data;

		video.save(function(err){
			if(err){ self.send(); return; }
			self.send(0);
		});
	});
}


module.exports = VIDEO;