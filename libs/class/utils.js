
var UTILS = {}

var hosts_prior = [
	'gounlimited',
	'rapidvideo',
	'verystream',
	'streamcherry',
	'openload',
	'streamango',
	'vidoza',]
var host_checking = hosts_prior[0];
var nextHost = function(){
	var len = hosts_prior.length;

	if(len<2){
		return;
	}

	for (var i = 0; i < len; i++) {
		if(hosts_prior[i]==host_checking){
			if(hosts_prior[i+1]) host_checking = hosts_prior[i+1];
			else host_checking = hosts_prior[0];
			break;
		}
	}
}

var host_checking_same_count = 0;
var host_checking_same = null;

UTILS.checkLinkWorking = false;
UTILS.checkLink = function()
{	
	if(UTILS.checkLinkWorking) return;
	UTILS.checkLinkWorking = true;

	if(host_checking_same==host_checking){
		host_checking_same_count++;
	}else{
		host_checking_same = host_checking;
		host_checking_same_count = 0;
	}

	var avCount = host_checking=='vidoza'?100:10;

	if(host_checking_same_count>avCount && hosts_prior.length>1){
		UTILS.checkLinkWorking = false;
		nextHost();
		return;
	}

	var self = this;

	//var date = MOMENT().subtract(36, 'hours');

	linkModel.find({hosting: host_checking})
	.sort({last_check: 1})
	.limit(host_checking=='vidoza'?1:50)
	.lean()
	.select('hosting video_id last_check file_size')
	.exec(function(err, links){
		if(err){ UTILS.checkLinkWorking = false; return; }
		if(links.length==0){ nextHost(); UTILS.checkLinkWorking = false; return; }

		switch(host_checking)
		{
			case 'verystream':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				requestGet('https', 'https://api.verystream.com/file/info?file='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var remove_list = [];
					var update_list = [];

					var res_links = data.result;
					for(var i = 0; i < links.length; i++){
						var id = links[i].video_id;
						var elem = res_links[id];
						if(elem){
							if(elem.status==404 || elem.status==500 || elem.status==451){
								remove_list.push(elem.id);
							}else{
								if(elem.status==200 && elem.size && elem.size>0 && elem.content_type.indexOf('mp4')!=-1 && (!links[i].file_size || links[i].file_size!=parseInt(elem.size))){
									linkModel.updateOne({ $and: [{ hosting: host_checking }, { video_id: id }]}, { file_size: parseInt(elem.size) }, function(err, doc){
									});
									update_list.push(elem.id);
								}else if(elem.content_type.indexOf('mp4')==-1){
								}else update_list.push(elem.id);
							}
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			case 'openload':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				requestGet('https', 'https://api.openload.co/1/file/info?file='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var remove_list = [];
					var update_list = [];

					var res_links = data.result;
					for(var i = 0; i < links.length; i++){
						var id = links[i].video_id;
						var elem = res_links[id];
						if(elem){
							if(elem.status==404 || elem.status==500 || elem.status==451){
								remove_list.push(elem.id);
							}else{
								if(elem.status==200 && elem.size && elem.size>0 && elem.content_type.indexOf('mp4')!=-1 && (!links[i].file_size || links[i].file_size!=parseInt(elem.size))){
									linkModel.updateOne({ $and: [{ hosting: host_checking }, { video_id: id }]}, { file_size: parseInt(elem.size) }, function(err, doc){
									});
									update_list.push(elem.id);
								}else if(elem.content_type.indexOf('mp4')==-1){
								}else update_list.push(elem.id);
							}
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			case 'streamango':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				requestGet('https', 'https://api.fruithosted.net/file/info?file='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var remove_list = [];
					var update_list = [];

					var res_links = data.result;
					for(var i = 0; i < links.length; i++){
						var id = links[i].video_id;
						var elem = res_links[id];
						if(elem){
							if(elem.status==404 || elem.status==500 || elem.status==451){
								remove_list.push(elem.id);
							}else{
								if(elem.status==200 && elem.size && elem.size>0 && elem.content_type.indexOf('mp4')!=-1 && (!links[i].file_size || links[i].file_size!=parseInt(elem.size))){
									linkModel.updateOne({ $and: [{ hosting: host_checking }, { video_id: id }]}, { file_size: parseInt(elem.size) }, function(err, doc){
									});
									update_list.push(elem.id);
								}else if(elem.content_type.indexOf('mp4')==-1){
								}else update_list.push(elem.id);
							}
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			case 'streamcherry':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				requestGet('https', 'https://api.fruithosted.net/file/info?file='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var remove_list = [];
					var update_list = [];

					var res_links = data.result;
					for(var i = 0; i < links.length; i++){
						var id = links[i].video_id;
						var elem = res_links[id];
						if(elem){
							if(elem.status==404 || elem.status==500 || elem.status==451){
								remove_list.push(elem.id);
							}else{
								if(elem.status==200 && elem.size && elem.size>0 && elem.content_type.indexOf('mp4')!=-1 && (!links[i].file_size || links[i].file_size!=parseInt(elem.size))){

									linkModel.updateOne({ $and: [{ hosting: host_checking }, { video_id: id }]}, { file_size: parseInt(elem.size) }, function(err, doc){
									});
									update_list.push(elem.id);
								}else if(elem.content_type.indexOf('mp4')==-1){
								}else update_list.push(elem.id);
							}
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			case 'vidoza':
				var link = links[0];

				if(link.video_id.length!=12){
					linkModel.findByIdAndRemove(link._id, function(){
						UTILS.checkLinkWorking = false;
					});
					return;
				}

				requestGet('https', 'https://vidoza.net/embed-'+link.video_id+'.html', function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					
					if(data.indexOf('File was deleted')!=-1){
						linkModel.findByIdAndRemove(link._id, function(){
							UTILS.checkLinkWorking = false;
						});
					}else{
						linkModel.updateOne({ $and: [{ hosting: host_checking }, { video_id: link.video_id}]}, { last_check: MOMENT().toISOString() }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					}
				});
				break;
			case 'gounlimited':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				var remove_list = [];
				var update_list = [];

				for(var i = 0; i < links.length; i++){
					if(links[i].video_id.length!=12){
						remove_list.push(links[i].video_id);
					}
				}

				requestGet('https', 'https://gounlimited.to/api/file/info?key=4797ufhwdn3v1kuvo0nl&file_code='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var res_links = data.result;
					for(var i = 0; i < res_links.length; i++){
						var elem = res_links[i];
						if(elem){
							if(elem.status==404 || elem.status==500 || elem.status==451){
								remove_list.push(elem.filecode);
							}else{
								update_list.push(elem.filecode);
							}
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			case 'rapidvideo':
				var comma_ids = '';
				for(var i = 0; i < links.length; i++) {
					if(i==0) comma_ids += links[i].video_id;
					else comma_ids += ','+links[i].video_id;
				}

				requestGet('https', 'https://api.rapidvideo.com/v2/file/info?login=tRWeOwHwlCQ4DLOi&key=314fc8e45aa26810604d0c9873f6e51e5f4c53c6df7af8577fed36dc69f6eb31&file='+comma_ids, function(err, data){
					if(err){ nextHost(); UTILS.checkLinkWorking = false; return; }
					try{
						var data = JSON.parse(data);
					}catch(err){
						nextHost(); UTILS.checkLinkWorking = false; return;
					}
					
					if(data.status!=200){ nextHost(); UTILS.checkLinkWorking = false; return; }

					var remove_list = [];
					var update_list = [];

					var res_links = data.result;
					for(var i = 0; i < links.length; i++){
						var id = links[i].video_id;
						var elem = res_links[id];
						if(elem){
							if(elem.status==404 || elem.status==451){
								remove_list.push(elem.code);
							}else update_list.push(elem.code);
						}
					}

					linkModel.find({ $and: [{ hosting: host_checking }, { video_id: { $in: remove_list }}]})
					.select('_id')
					.exec(function(err, docs){
						docs.forEach(async (item) => {
							await item.remove();
						});

						linkModel.updateMany({ $and: [{ hosting: host_checking }, { video_id: { $in: update_list }}]}, { last_check: MOMENT().toISOString() }, { multi: true }, function(err, doc){
							UTILS.checkLinkWorking = false;
						});
					});
				});
				break;
			default:
				nextHost();
				UTILS.checkLinkWorking = false;
				break;
		}
	});
}



UTILS.deleteLink = function(req, res, CB)
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

		linkModel.findById(self.data.ref)
		.select('_id')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(!link){ self.send(); return; }
			link.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}


UTILS.deleteLinksByUser = function(req, res, CB)
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
var first = new Date().getTime();
	self.data = req.body;

	if(self.data.name==null){ self.send(); return; }
	else if(typeof self.data.name!='string'){ self.send(); return; }
	else if(self.data.name.length==0){ self.send(1, 'Uzupełnij nazwę użytkownika.'); return; }
	else if(self.data.name.length<5){ self.send(1, 'Nazwa użytkownika wymagane min. 5 znaków.'); return; }
	else if(self.data.name.length>25){ self.send(1, 'Nazwa użytkownika maksymalnie 25 znaków.'); return; }

	var name = self.data.name;

	
	userModel.find({username: { $regex: new RegExp('^'+name.toLowerCase()+'$', "i") }})
	.limit(1)
	.lean()
	.select('_id')
	.exec(function(err, user){
		if(err){ self.send(); return; }
		if(user.length==0){ self.send(1, 'Konto nie istnieje.'); return; }
		user = user[0];

		var user_id = user._id;

		
		linkModel.find({ user: MONGO.Types.ObjectId(user_id), $or: [ {status: 'WAIT'}, {status: 'WAIT_HIDDEN'} ] })
		.select('_id')
		.exec(function(err, links){
			var second = new Date().getTime();
			if(err){ self.send(); return; }
			if(links.length==0){ self.send(1, 'Konto nie ma linków w poczekalni.'); return; }

			ASYNC.eachOfSeries(links, function(link, index, callback){
				link.remove(function(err){
					if(err) callback(index);
					else callback();
				});
			}, function(errAtIndex){
				if(errAtIndex){
					self.send(1, 'Wystąpił błąd. Usunięto '+errAtIndex+' linki z '+links.length);
					return;
				}

				self.send(0, 'Usunięto '+links.length+' linków.');
			});
		});
	});
}



UTILS.delLink = function(req, res, CB)
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

	self.removeStorage = function(file_id, cb)
	{
		if(!file_id){ cb(false); return; }
		
		requestGet('https', 'https://zgdat02.fili.cc/delFile/'+file_id, function(err, body, head){
			if(err){ cb(true); return; }
			cb(false);
		});
	}

	self.do = function()
	{

		if(self.data.ref==null){ self.send(); return; }

		var saltArr = self.data.ref.split('_');
		if(saltArr.length>1){
			self.data.ref = saltArr[1];
		}

		if(!VALIDATOR.isMongoId(self.data.ref)){ self.send(); return; }

		
		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(self.data.code2.length>0){
			if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }
		}

		linkModel.findById(self.data.ref)
		.select('_id type premium video_id hosting')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(!link){ self.send(); return; }

			var type = link.type;
			var premium = link.premium;
			var video_id = link.video_id;
			var hosting = link.hosting;
			if(!premium) video_id = null;
			else if(premium && hosting=='rapidvideo') video_id = null;

			self.removeStorage(video_id, function(err){
				if(err){ self.send(1, 'Wystąpił problem podczas połączenia z serwerem premium. Wołaj sarde!!!'); return; }

				link.remove(function(err, removed){
					if(err){ self.send(); return; }

					if(self.data.code2.length>0){
						seriesModel.findById(self.data.code)
						.populate({
							path: 'episodes',
							select: '_id links season_num episode_num',
							populate: { 
								path: 'links',
								select: '_id type',
								match: { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] },
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

							if(series.new_status && series.new_status.episode!=null && String(series.new_status.episode)!=String(episode_id)){
								self.send(0);
								return;
							}

							var zero_links = false;

							for(var i = 0, len = series.episodes.length; i < len; i++){
								if(String(series.episodes[i]._id)!=String(episode_id)) continue;

								if(series.episodes[i].links.length==0) zero_links = true;

								for(var k = 0, len3 = series.episodes[i].links.length; k < len3; k++){
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
								self.send(0);
							}else if(link_best_type<best_type){
								series.new_status.episode = MONGO.Types.ObjectId(episode_id);
								series.new_status.str = 'Dodano link '+(VIDEO_TYPES_LIST[best_type][1]).toLowerCase()+' do';
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
						movieModel.findById(self.data.code)
						.populate({
							path: 'links',
							select: '_id type',
							match: { $or: [{ status: 'PUBLIC' }, { status: 'PREMIUM' }] },
						})
						.select('_id links new_status update_date ver')
						.exec(function(err, movie){
							if(err){ self.send(); return; }
							if(movie.length==0){ self.send(); return; }

							var link_best_type = VIDEO_TYPES_LIST.length-1;
							for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
								if(VIDEO_TYPES_LIST[i][0]==type){
									link_best_type = i;
									break;
								}
							}
							var best_type = VIDEO_TYPES_LIST.length-1;
							var zero_links = false;

							if(movie.links.length==0) zero_links = true;

							for(var i = 0, len = movie.links.length; i < len; i++){
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
							}else if(link_best_type<best_type){
								movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[best_type][1]).toLowerCase();
							}else{
								movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[best_type][1]).toLowerCase();
							}
							movie.save(function(err){
								if(err){ self.send(); return; }
								self.send(0);
							});
						});
					}
				});
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.acceptLink = function(req, res, CB)
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

		if(self.data.code==null){ self.send(); return; }
		else if(!VALIDATOR.isMongoId(self.data.code)){ self.send(); return; }

		if(self.data.code2==null){ self.send(); return; }
		else if(self.data.code2.length>0){
			if(!VALIDATOR.isMongoId(self.data.code2)){ self.send(); return; }
		}

		linkModel.findById(self.data.ref)
		.select('_id report type status hosting quality user')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(!link){ self.send(); return; }

			var report = link.report;
			var type = link.type;
			var en_link_id = link._id;

			link.status = 'PUBLIC';
			link.report = '';

			link.save(function(err){
				if(err){ self.send(); return; }

				if(report.length>0){
					self.send(0);
					return;
				}

				if(self.data.code2.length>0){
					seriesModel.findById(self.data.code)
					.populate({
						path: 'episodes',
						select: '_id links season_num episode_num',
						populate: {
							path: 'links',
							select: '_id type quality hosting user status',
							populate: {
								path: 'user',
								select: 'type',
							},
						},
					})
					.select('_id episodes new_status update_date')
					.exec(function(err, series){
						if(err){ self.send(); return; }
						if(series.length==0){ self.send(); return; }

						var episode_id = self.data.code2;
						var count = 0;

						for(var i = 0, len = series.episodes.length; i < len; i++){
							if(String(series.episodes[i]._id)!=String(episode_id)) continue;

							for(var j = 0, len2 = series.episodes[i].links.length; j < len2; j++){
								if(String(series.episodes[i].links[j]._id)==String(en_link_id)) continue;

								if(link.hosting==series.episodes[i].links[j].hosting && link.type==series.episodes[i].links[j].type && link.quality==series.episodes[i].links[j].quality && series.episodes[i].links[j].user.type=="USER"){
									count++;
								}
							}
						}

						if(count>=4){
							UTILS.deleteLink(req, res, function(answer){
								if(answer.error){ self.send(); return; }
								self.send(0);
							});
							return;
						}

						var link_best_type = VIDEO_TYPES_LIST.length-1;
						for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++){
							if(VIDEO_TYPES_LIST[i][0]==type){
								link_best_type = i;
								break;
							}
						}

						var best_type = VIDEO_TYPES_LIST.length-1;

						for(var i = 0, len = series.episodes.length; i < len; i++){
							if(String(series.episodes[i]._id)!=String(episode_id)) continue;

							for(var k = 0, len3 = series.episodes[i].links.length; k < len3; k++){
								if(String(series.episodes[i].links[k]._id)==String(en_link_id)) continue;
								if(series.episodes[i].links[k].status!='PUBLIC') continue;

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
								self.send(0);
							});
						}else{
							self.send(0);
						}
					});
				}else{
					movieModel.findById(self.data.code)
					.populate({
						path: 'links',
						select: '_id type quality hosting user status',
						populate: {
							path: 'user',
							select: 'type',
						}
					})
					.select('_id links new_status update_date ver')
					.exec(function(err, movie){
						if(err){ self.send(); return; }
						if(movie.length==0){ self.send(); return; }

						var count = 0;

						for(var j = 0, len2 = movie.links.length; j < len2; j++){
							if(String(movie.links[j]._id)==String(en_link_id)) continue;

							if(link.hosting==movie.links[j].hosting && link.type==movie.links[j].type && link.quality==movie.links[j].quality  && movie.links[j].user.type=="USER"){
								count++;
							}
						}

						if(count>=4){
							UTILS.deleteLink(req, res, function(answer){
								if(answer.error){ self.send(); return; }
								self.send(0);
							});
							return;
						}

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
							if(movie.links[i].status!='PUBLIC') continue;

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

						if(link_best_type<best_type){
							movie.new_status = 'Dodano link '+(VIDEO_TYPES_LIST[link_best_type][1]).toLowerCase();
							movie.update_date = MOMENT();
						}
						movie.save(function(err){
							if(err){ self.send(); return; }
							self.send(0);
						});
					});
				}
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.changeLinkType = function(req, res, CB)
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

		if(self.data.type==null){ self.send(); return; }

		var exist = false;
		for(var i = 0, len = VIDEO_TYPES_LIST.length; i < len; i++) {
			if(self.data.type==VIDEO_TYPES_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		linkModel.findById(self.data.ref)
		.select('type')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(!link){ self.send(); return; }
			link.type = self.data.type;
			link.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.changeLinkQuality = function(req, res, CB)
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

		if(self.data.quality==null){ self.send(); return; }

		var exist = false;
		for(var i = 0, len = VIDEO_QUALITY_LIST.length; i < len; i++) {
			if(self.data.quality==VIDEO_QUALITY_LIST[i][0]){
				exist = true;
				break;
			}
		}

		if(!exist){ self.send(); return; }

		linkModel.findById(self.data.ref)
		.select('quality')
		.exec(function(err, link){
			if(err){ self.send(); return; }
			if(!link){ self.send(); return; }
			link.quality = self.data.quality;
			link.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.editPoster = function(req, res, CB)
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

	if(self.data._id==null){ self.send(); return; }
	else if(!VALIDATOR.isMongoId(self.data._id)){ self.send(); return; }

	if(self.data.type==null){ self.send(); return; }
	else if(self.data.type!='movie' && self.data.type!='series'){ self.send(); return; }

	if(self.data.data==null){ self.send(); return; }
	else if(self.data.data.length==0){ self.send(1, 'Wystąpił błąd. Odśwież stronę i spróbuj ponownie.'); return; }

	var model = movieModel;
	if(self.data.type=='series') model = seriesModel;

	model.find({ _id: MONGO.Types.ObjectId(self.data._id) })
	.select('poster url num')
	.exec(function(err, items){
		if(err){ self.send(); return; }
		if(items.length==0){ self.send(); return; }
		var item = items[0];

		var base64ImageArray = self.data.data.split('data:image/jpeg;base64,');
		if(base64ImageArray.length!=2){ self.send(); return; }

		var base64Image = base64ImageArray.pop();
		var imageBuffer = Buffer.from(base64Image, 'base64');

		var tmp_filename = 'tmp.'+SHORT_ID.generate()+'.jpg';
		var tmp_path = PATH.join(PUBLIC_PATH, 'uploads/tmp/'+tmp_filename);

		var filename = SHORT_ID.generate()+'_uncompressed.jpg';
		var path = PATH.join(PUBLIC_PATH, 'uploads/thumbs/'+filename);

		FS.writeFile(tmp_path, imageBuffer, function(err){
			if(err){ self.send(); return; }

			SHARP(tmp_path)
			.resize(200, 200)
			.toFile(path, function(err){
				if(err){ self.send(); return; }

				FS.unlinkSync(tmp_path);

				file_title = item.url.replace(new RegExp('-', 'g'), '.');

				var filename2 = file_title+'.'+SHORT_ID.generate()+'.jpg';
				var path2 = PATH.join(PUBLIC_PATH, 'uploads/thumbs/'+filename2);

				translator = new JPEGTRAN(['-optimize', '-progressive']);
				var read = FS.createReadStream(path);
				var write = FS.createWriteStream(path2);

				translator.on('end', function(){
					FS.unlinkSync(path);

					var pathOld = PATH.join(BASE_PATH, 'app/public/'+item.poster);

					FS.unlinkSync(pathOld);

					item.poster = '/uploads/thumbs/'+filename2;
					item.save(function(err){
						if(err){ self.send(); return; }
						var url = '';
						if(self.data.type=='movie') url+='/film/';
						else url+='/serial/';
						url+=item.url+'/'+item.num;

						self.send(0, url);
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
}


UTILS.acceptComment = function(req, res, CB)
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

		commentModel.findById(self.data.ref)
		.select('status')
		.exec(function(err, comment){
			if(err){ self.send(); return; }
			if(!comment){ self.send(); return; }
			comment.status = 'PUBLIC';
			comment.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.deleteComment = function(req, res, CB)
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

		commentModel.findById(self.data.ref)
		.select('_id')
		.exec(function(err, comment){
			if(err){ self.send(); return; }
			if(!comment){ self.send(); return; }
			comment.remove(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}


UTILS.flagComment = function(req, res, CB)
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

		commentModel.findById(self.data.ref)
		.select('status spoilers')
		.exec(function(err, comment){
			if(err){ self.send(); return; }
			if(!comment){ self.send(); return; }
			comment.status = 'PUBLIC';
			comment.spoilers = true;
			comment.save(function(err){
				if(err){ self.send(); return; }
				self.send(0);
			});
		});
	}

	self.data = req.body;
	self.do();
}

UTILS.buildURL = function(base, key, value)
{
	var sep = (base.indexOf('?') > -1) ? '&' : '?';
	return base + sep + key + '=' + value;
}


UTILS.searchMoviesSeries = function(req, res, CB)
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
	var api_mode = false;

	if(self.data.q==null){
		self.data = req.query;
		api_mode = true;
	}

	if(self.data.q==null){ self.send(); return; }
	else if(typeof self.data.q!='string'){ self.send(); return; }
	else if(self.data.q.length<1){
		if(api_mode){
			self.send(0, {series: [], movies: [], q:self.data.q});
		}else{
			app.render('searchList', {series: [], movies: [], q:encodeURI(self.data.q)}, function(err, html) {
				if(err){ self.send(); return; }

				self.send(0, {count: 0, html:html});
			});
		}
		return;
	}

	var isPremiumUser = false;;
	if(req.INJECT_DATA.user_status.code==3){
		isPremiumUser = req.INJECT_DATA.user_status.data.premium;
	}

	var ipz = getIP(req);
	var city_name = ipToCity(ipz);

	var q = url_title(self.data.q);
	q = q.replace(new RegExp('-', 'g'), ' ');
	q = q.replace(new RegExp('/+', 'g'), ' ');

	var words = q.split(' ');
	var str = '';

	for(var i = 0; i < words.length; i++) {
		if(words[i].length>1) str+= words[i]+' ';
	}

	var qz = { $and: [{$text: {$search: str}}, {$or: [{status: 'PUBLIC'}, {status: 'COPY'}, {status: 'WAIT'}]}] };

	if(req.INJECT_DATA.user_status.code!=3 && (city_name=='Warsaw' || city_name==null)){
		qz = { $and: [{$text: {$search: str}}, {$or: [{status: 'PUBLIC'}, {status: 'COPY'}]}] };
	}else if(isPremiumUser){
		qz = { $and: [{$text: {$search: str}}] };
	}

	ASYNC.parallel({
		series: function(cb){
			seriesModel.find(qz, {score: {$meta: 'textScore'}})
			.sort({score:{$meta: 'textScore'}, year: -1})
			.lean()
			.limit(api_mode?1000:3)
			.select('title title_org year poster url num')
			.exec(function(err, series){
				if(err){ cb(true); return; }
				if(!series) series = [];
				cb(null, series);
			});
		},
		movies: function(cb){
			movieModel.find(qz, {score: {$meta: 'textScore'}})
			.sort({score:{$meta: 'textScore'}, year: -1})
			.lean()
			.limit(api_mode?1000:3)
			.select('title title_org year poster url num')
			.exec(function(err, movies){
				if(err){ cb(true); return; }
				if(!movies) movies = [];
				cb(null, movies);
			});
		},
	}, function(err, results){
		if(err){ self.send(); return; }

		var count = results.series.length+results.movies.length;

		if(api_mode){
			self.send(0, {series: results.series, movies: results.movies, q:self.data.q});
		}else{
			app.render('searchList', {series: results.series, movies: results.movies, q:encodeURI(self.data.q)}, function(err, html) {
				if(err){ self.send(); return; }

				self.send(0, {count:count, html:html});
			});
		}
	});
}


UTILS.removeViewedLogs = function(cb)
{
	var now = new MOMENT();
	var date = now.subtract(30, 'd');

	viewedModel.remove({ date: { $lt: date.toDate() } })
	.exec(function(err, removed){
		if(err) err_log('UTILS.removeViewedLogs');
		else{
			if(removed && removed.result)
				log('UTILS.removeViewedLogs:: removed viewed logs: '+removed.result.n);
		}
		
		cb();
	});
}

UTILS.removeLinkLogs = function(cb)
{
	var now = new MOMENT();
	var date = now.subtract(8, 'h');

	linkLogsModel.remove({ $and: [ {first_get: { $lt: date.toDate() }}, {captcha: false} ]})
	.exec(function(err, removed){
		if(err) err_log('UTILS.removeLinkLogs');
		else{
			if(removed && removed.result)
				log('UTILS.removeLinkLogs:: removed link logs: '+removed.result.n);
		}
		
		cb();
	});
}


UTILS.removeCopyrMovies = function(cb)
{
	var now = new MOMENT();

	movieModel.find({status: 'COPY'})
	.select('copyright_del_date')
	.exec(function(err, movies){
		if(err){ cb(); return; }
		if(!movies){ cb(); return; }
		if(movies.length==0){ cb(); return; }

		var i = 0;
		var dl = function(cb){
			if((i+1)>movies.length){ cb(); return; }

			var movie = movies[i];

			if(now.isBefore(movie.copyright_del_date)){
				i++;
				dl(cb);
			}else{
				movie.remove(function(err){
					if(err){ cb(); return; }

					i++;
					dl(cb);
				});
			}
		};

		dl(function(){
			cb();
		});
	});
}

UTILS.removeTmpFiles = function()
{
	var path = PATH.join(PUBLIC_PATH, 'uploads/tmp');

	FS.exists(path, function (exists){
		if(!exists){
			err_log('UTILS.removeTmpFiles:: That path not exists.');
			return;
		}

		var files = FS.readdirSync(path);

		for(var i = 0, len = files.length; i < len; i++){
			var file = files[i];
			var file_path = PATH.join(path, file);
			var stat = FS.statSync(file_path);

			var now = MOMENT();
			var file_date = MOMENT(stat.mtime).add(1, 'h');

			if(now.isAfter(file_date)){
				FS.unlinkSync(file_path);
			}
		}
	});
}

UTILS.doBackup = function(cb)
{
	var exec = require('child_process').exec;

	var now = MOMENT().format('YYYY.MM.DD');
	var now_path = PATH.join(BASE_PATH, 'data/backup/'+now);

	log('Creating backup: '+now);

	FS.mkdir(now_path, function(err){
		if(err){ cb(); return; }

		exec('sudo /usr/bin/mongodump --host 192.168.0.105 --db filiser --port 17027 -u sarda -p Pb4NAYmuZF1tBNujlkYowSax --authenticationDatabase filiser --out '+now_path, function(e, stdout, stderr){
			exec('sudo tar -cf '+PATH.join(now_path, 'uploads.tar')+' '+PATH.join('app/public/uploads'), function(e, stdout, stderr){
				exec('sudo tar -cf '+PATH.join(BASE_PATH, 'data/backup/'+now+'.tar')+' '+PATH.join(BASE_PATH, 'data/backup/'+now), function(e, stdout, stderr){
					exec('sudo rm -R '+PATH.join(BASE_PATH, 'data/backup/'+now), function(e, stdout, stderr){
						exec('rclone sync '+PATH.join(BASE_PATH, 'data/backup/')+' remote:web_backup', function(e, stdout, stderr){
							cb();
							/*exec('rclone sync '+PUBLIC_PATH+' fili02:/home/public', function(e, stdout, stderr){
								cb();
							});*/
						});
					});
				});
			});
		});
	});
}

/*UTILS.createPopularNow = function(CB)
{
	var now = new MOMENT();
	var date = now.subtract(2, 'h');

	ASYNC.series([
		function(callback){
			viewedModel.aggregate(
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'episode_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$episode_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 })
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(true); return; }
				if(aggregated.length==0){ callback(true); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					episodeModel.update( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_hour: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				episodeModel.update({ viewed_hour: { $gt: 0 } }, { $set: {viewed_hour: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		},
		function(callback){
			viewedModel.aggregate(
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'movie_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 })
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(true); return; }
				if(aggregated.length==0){ callback(true); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.update( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_hour: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				movieModel.update({ viewed_hour: { $gt: 0 } }, { $set: {viewed_hour: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}],
		function(err){
			CB();
		}
	);
}*/

UTILS.createRandomSeriesMovies = function(CB)
{
	ASYNC.series([
		function(callback){
			seriesModel.aggregate([
				{ $match: { $and: [{ status: 'PUBLIC' }, { episodes: { $ne: [] } }] }},
				{ $sample: { size: 10 } }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					seriesModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {drawn_num: i+1}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				seriesModel.updatMany({ drawn_num: { $gt: 0 } }, { $set: {drawn_num: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		},
		function(callback){
			movieModel.aggregate([
				{ $match: { $and: [{ status: 'PUBLIC' }, { links: { $ne: [] } }] }},
				{ $sample: { size: 20 } }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {drawn_num: i+1}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				movieModel.updateMany({ drawn_num: { $gt: 0 } }, { $set: {drawn_num: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}],
		function(err){
			CB();
		}
	);
}


UTILS.createPopularDay = function(CB)
{
	var now = new MOMENT();
	var date = now.subtract(24, 'h');

	ASYNC.series([
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'series_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$series_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					if(String(item._id)=='5a10cbfeb29f6c02061f8302' || String(item._id)=='5cb4e91b2d383f756c95ab38' || String(item._id)=='5a73af6214702a7b28e1101a'){
						i++;
						queue(aggre, i, cb);
						return;
					}

					seriesModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_day: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				seriesModel.updateMany({ viewed_day: { $gt: 0 } }, { $set: {viewed_day: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){

						seriesModel.find({promotion:true})
						.select('viewed_day')
						.exec(function(err, series){
							if(err){ callback(null); return; }
							if(series.length==0){ callback(null); return; }

							seriesModel.updateOne( {_id: MONGO.Types.ObjectId(series[0]._id)}, { $set: {viewed_day: 999999}}, function(err){
								callback(null);
							});
						});
					});
				});
			});
		},
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'movie_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_day: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				movieModel.updateMany({ viewed_day: { $gt: 0 } }, { $set: {viewed_day: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}/*,
		function(callback){
			viewedModel.aggregate(
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'video_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$video_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 })
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					videoModel.update( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_day: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				videoModel.update({ viewed_day: { $gt: 0 } }, { $set: {viewed_day: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}*/],
		function(err){
			CB();
		}
	);
}

UTILS.createPopularWeek = function(CB)
{
	var now = new MOMENT();
	var date = now.subtract(7, 'd');

	ASYNC.series([
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'series_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$series_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					if(String(item._id)=='5a10cbfeb29f6c02061f8302' || String(item._id)=='5cb4e91b2d383f756c95ab38' || String(item._id)=='5a73af6214702a7b28e1101a'){
						i++;
						queue(aggre, i, cb);
						return;
					}

					seriesModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_week: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				seriesModel.updateMany({ viewed_week: { $gt: 0 } }, { $set: {viewed_week: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		},
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'movie_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_week: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				movieModel.updateMany({ viewed_week: { $gt: 0 } }, { $set: {viewed_week: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}],
		function(err){
			CB();
		}
	);
}

UTILS.createPopularMonth = function(CB)
{
	var now = new MOMENT();
	var date = now.subtract(30, 'd');

	ASYNC.series([
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'series_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$series_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					if(String(item._id)=='5a10cbfeb29f6c02061f8302' || String(item._id)=='5cb4e91b2d383f756c95ab38' || String(item._id)=='5a73af6214702a7b28e1101a'){
						i++;
						queue(aggre, i, cb);
						return;
					}

					seriesModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_month: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				seriesModel.updateMany({ viewed_month: { $gt: 0 } }, { $set: {viewed_month: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		},
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'movie_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.updateOne( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_month: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				movieModel.updateMany({ viewed_month: { $gt: 0 } }, { $set: {viewed_month: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});
		}],
		function(err){
			CB();
		}
	);
}

UTILS.getLinksImport = function(req, res, CB)
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

	if(self.data.url==null){ self.send(); return; }
	else if(!VALIDATOR.isURL(self.data.url)){ self.send(); return; }


	var url = self.data.url;
	var body = '';
	var list = [];

	var req = HTTP.get(url, function(res){
		res.on('data', function(str){ body+=str; });
		res.on('end', function(){
			if(res.statusCode!=200){ self.send(); return; }

			$ = CHEERIO.load(body, {
				normalizeWhitespace: true,
				xmlMode: true
			});

			var hosts = [
				['http://alltube.tv/special.php?hosting=openload&id=', 'openload'],
				['http://alltube.tv/special.php?hosting=cda&id=', 'cda'],
				['http://alltube.tv/special.php?hosting=anyfiles&id=', 'anyfiles'],
				['http://alltube.tv/special.php?hosting=streamin&id=', 'streamin'],
				['http://alltube.tv/special.php?hosting=vidto&id=', 'vidto'],
			]

			$('tr').each(function(index, e){
				var key = $(this).children('td[style="width: 100px;"]').children('a').attr('data-iframe');
				var ver = $(this).children('td[style="width: 80px;"]').text();

				if(VALIDATOR.isBase64(String(key))){
					var embed_url = new Buffer(key, 'base64').toString('utf8')
					list.push({ver: ver, embed_url: embed_url});
				}
			});
   
			var last_list = [];

			var types_to_types = {
				'Lektor': 'LEKTOR_PL',
				'Napisy': 'NAPISY_PL',
				'PL': 'POLSKI',
				'Oryginalna': 'OTHER',
				'Dubbing': 'DUBBING',
				'ENG': 'ENG',
			}

			if(list.length>0){
				for(var i = 0, len = list.length; i < len; i++){
					for(var j = 0, len2 = hosts.length; j < len2; j++){
						if(list[i].embed_url.indexOf(hosts[j][0])!=-1){
							var splited = list[i].embed_url.split(hosts[j][0]);
							var code = splited[1];

							if(code.indexOf('&')){
								code = code.split('&');
								code = code[0];
							}

							if(code.indexOf('/')){
								code = code.split('/');
								code = code[0];
							}

							code = code.replace('?', '');

							var ver = types_to_types[list[i].ver];
							if(!ver) break;

							last_list.push({host: hosts[j][1], ver: ver, code: code});
							break;
						}
					}
				}
			}

			var last_last_list = [];

			if(last_list.length>0){
				for(var i = 0, len = last_list.length; i < len; i++){
					for(var j = 0, len2 = VIDEO_HOSTING_LIST.length; j < len2; j++){
						if(last_list[i].host==VIDEO_HOSTING_LIST[j].name){
							var embed =VIDEO_HOSTING_LIST[j].embed_code

							embed = embed.replace('#WIDTH', 820);
							embed = embed.replace('#HEIGHT', 462);
							embed = embed.replace('#ID', last_list[i].code);

							last_last_list.push({host: last_list[i].host, ver: last_list[i].ver, embed: embed});
							break;
						}
					}
				}
			}
			
			self.send(0, last_last_list);
		});
	});
	req.on('timeout', function(err){
		if(err){ self.send(); return; }
	});
	req.on('error', function(err){
		if(err){ self.send(); return; }
	});
	
}

UTILS.getLinksImport2 = function(req, res, CB)
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

	if(self.data.url==null){ self.send(); return; }
	else if(self.data.url.length==0){ self.send(); return; }
	var data = JSON.parse(self.data.url);

	self.send(0, data);
}

UTILS.hidePremiumMessage1 = function(req, res, CB)
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

	res.cookie('prem_info_1', 'true', { maxAge: 60*60*24*365*1000, httpOnly: true });
	self.send(0);
}

UTILS.downFilmwebSeries = function()
{
	var self = {};

	self.biglist = [];
	self.i = 0;

	self.photos = [];

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

	self.downQueue = function(items, cb)
	{
		if(items.length==0){ cb(); return; }

		var item = items[0];
		items.shift();

		var small = item.small;
		var large = item.large;

		var smallFilename = SHORT_ID.generate()+'.jpg';
		var largeFilename = SHORT_ID.generate()+'.jpg';

		var smallPath = PATH.join(PUBLIC_PATH, 'uploads/photos/'+smallFilename);
		var largePath = PATH.join(PUBLIC_PATH, 'uploads/photos/'+largeFilename);

		ASYNC.parallel([
			function(call){
				downloadImage(small, smallPath, function(err){
					if(!err) call(true);
					else call(null);
				});
			},
			function(call){
				downloadImage(large, largePath, function(err){
					if(!err) call(true);
					else call(null);
				});
			}
		],
		function(err){
			if(err){
				self.downQueue(items, cb);
				return;
			}

			self.photos.push({
				small: '/uploads/photos/'+smallFilename,
				large: '/uploads/photos/'+largeFilename,
			});

			self.downQueue(items, cb);
		});
	}

	self.getPhotos = function(id, cb)
	{
		if(id==-1){ cb([]); return; }

		FILMWEB.getFilmImagesById(id, function(err, photo_list){
			if(err){ self.send(); return; }

			if(photo_list.length==0) cb([]);
			else{
				var max_10 = [];
				if(photo_list.length>10){
					for(var i = 0; i < 10; i++){
						max_10.push(photo_list[i]);
					}
				}else max_10 = photo_list;

				if(max_10.length>0){
				self.downQueue(max_10, function(){
					cb(self.photos)
				});
				}else cb(max_10);
			}
		});
	}

	self.queue = function(cb){
		if(self.biglist.length==0){ cb(); return; }

		self.i++;

		var item = self.biglist[0];
		self.biglist.shift();

		var filmweb_id = item.filmweb_id;
		var photos = item.photos;
		var trailer_url = item.trailer_url;

		ASYNC.parallel([
			function(call){
				if(!trailer_url){
					self.getVideo(filmweb_id, function(answ){
						call(null, answ);
					});
				}else call(null, null);
			},
			function(call){
				if(!photos || photos.length==0){
					self.getPhotos(filmweb_id, function(){
						call(null, null)
					});

				}else call(null, null);
			}
		],
		function(err, result){
			var trailer_url_res = result[0];
			var photos_result = self.photos;

			var update = {};

			if(!trailer_url && trailer_url_res){
				update.trailer_url = trailer_url_res;
			}

			if((!photos || photos.length==0) && photos_result.length>0){
				update.photos = photos_result;
			}

			if(update.trailer_url || update.photos){
				seriesModel.updateOne({ _id: item._id }, update, function(err){
					self.photos = [];
					self.queue(cb);
				});
			}else{
				self.photos = [];
				self.queue(cb);
			} 
		});
	}

	seriesModel.find({ $and: [ {filmweb_id: { $ne: -1 }}, { $or: [ { trailer_url: { $eq: null } }, { trailer_url: { $exists: false } }, { photos: { $eq: [] } }, { photos: { $exists: false } } ] } ] })
	.lean()
	.select('trailer_url photos filmweb_id')
	.exec(function(err, series){
		if(err) throw err;

		self.biglist = series;
		self.queue(function(){


		});

	});

}

UTILS.downFilmwebMovies = function()
{
	var self = {};

	self.biglist = [];

	self.i = 0;

	self.photos = [];

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

	self.downQueue = function(items, cb)
	{
		if(items.length==0){ cb(); return; }

		var item = items[0];
		items.shift();

		var small = item.small;
		var large = item.large;

		var smallFilename = SHORT_ID.generate()+'.jpg';
		var largeFilename = SHORT_ID.generate()+'.jpg';

		var smallPath = PATH.join(PUBLIC_PATH, 'uploads/photos/'+smallFilename);
		var largePath = PATH.join(PUBLIC_PATH, 'uploads/photos/'+largeFilename);

		ASYNC.parallel([
			function(call){
				downloadImage(small, smallPath, function(err){
					if(!err) call(true);
					else call(null);
				});
			},
			function(call){
				downloadImage(large, largePath, function(err){
					if(!err) call(true);
					else call(null);
				});
			}
		],
		function(err){
			if(err){
				self.downQueue(items, cb);
				return;
			}

			self.photos.push({
				small: '/uploads/photos/'+smallFilename,
				large: '/uploads/photos/'+largeFilename,
			});

			self.downQueue(items, cb);
		});
	}

	self.getPhotos = function(id, cb)
	{
		if(id==-1){ cb([]); return; }

		FILMWEB.getFilmImagesById(id, function(err, photo_list){
			if(err){ self.send(); return; }

			if(photo_list.length==0) cb([]);
			else{
				var max_10 = [];
				if(photo_list.length>10){
					for(var i = 0; i < 10; i++){
						max_10.push(photo_list[i]);
					}
				}else max_10 = photo_list;

				if(max_10.length>0){
				self.downQueue(max_10, function(){
					cb(self.photos)
				});
				}else cb(max_10);
			}
		});
	}

	self.queue = function(cb){
		if(self.biglist.length==0){ cb(); return; }

		self.i++;

		var item = self.biglist[0];
		self.biglist.shift();

		var filmweb_id = item.filmweb_id;
		var photos = item.photos;
		var trailer_url = item.trailer_url;



		ASYNC.parallel([
			function(call){
				if(!trailer_url){
					self.getVideo(filmweb_id, function(answ){
						call(null, answ);
					});
				}else call(null, null);
			},
			function(call){
				if(!photos || photos.length==0){
					self.getPhotos(filmweb_id, function(){
						call(null, null)
					});

				}else call(null, null);
			}
		],
		function(err, result){
			var trailer_url_res = result[0];
			var photos_result = self.photos;

			var update = {};

			if(!trailer_url && trailer_url_res){
				update.trailer_url = trailer_url_res;
			}

			if((!photos || photos.length==0) && photos_result.length>0){
				update.photos = photos_result;
			}

			if(update.trailer_url || update.photos){
				movieModel.updateOne({ _id: item._id }, update, function(err){
					self.photos = [];
					self.queue(cb);
				});
			}else{
				self.photos = [];
				self.queue(cb);
			} 
		});
	}

	movieModel.find({ $and: [ {filmweb_id: { $ne: -1 }}, { $or: [ { trailer_url: { $eq: null } }, { trailer_url: { $exists: false } }, { photos: { $eq: [] } }, { photos: { $exists: false } } ] } ] })
	.lean()
	.select('trailer_url photos filmweb_id')
	.exec(function(err, series){
		if(err) throw err;

		self.biglist = series;
		self.queue(function(){

		});

	});

}


UTILS.getPopularWeek = function(CB)
{
	var now = new MOMENT();
	var date = now.subtract(30, 'd');

	var moviesLyst = [];

	ASYNC.series([
		function(callback){
			callback(null);
/*			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'series_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$series_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 40 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					seriesModel.update( {_id: MONGO.Types.ObjectId(item._id)}, { $set: {viewed_week: item.count}}, function(err){
						if(err){ callback(true); return; }
						i++;
						queue(aggre, i, cb);
					});
				}

				seriesModel.update({ viewed_week: { $gt: 0 } }, { $set: {viewed_week: 0}}, {multi: true}, function(err){
					if(err){ callback(true); return; }
					queue(aggregated, 0, function(){
						callback(null);
					});
				});
			});*/
		},
		function(callback){
			viewedModel.aggregate([
				{ $match: { $and: [
						{ 'date': { '$gte': date.toDate() } },
						{ 'movie_id': { $exists: true } }
					]
				}},
				{ $group : { '_id' : '$movie_id', 'count' : { '$sum' : 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 10 }])
			.exec(function(err, aggregated){
				if(err){ callback(true); return; }
				if(!aggregated){ callback(null); return; }
				if(aggregated.length==0){ callback(null); return; }

				

				var queue = function(aggre, i, cb){
					if(aggre[i]===undefined){ cb(); return; }

					var item = aggre[i];

					movieModel.find( {_id: MONGO.Types.ObjectId(item._id)})
					.lean()
					.select('title_org links')
					.populate({
						path: 'links',
						select: '_id premium type quality hosting video_id file_size',
						match: { $and: [{ status: 'PUBLIC' }, { hosting: { $in: ['openload', 'streamango', 'rapidvideo', 'cda', 'premium']} }, { type: { $in: ['POLSKI', 'DUBBING', 'LEKTOR_PL', 'NAPISY_PL']} }] },
					})
					.exec(function(err, movie){
						if(err){ callback(true); return; }
						if(!movie){ i++; queue(aggre, i, cb); return; }
						if(movie.length==0){ i++; queue(aggre, i, cb); return; }
						var movie = movie[0];

						var links = movie.links;
						var pol_ver = false;

						for(var j = 0; j < links.length; j++) {
							if(links[j].premium){
								i++; queue(aggre, i, cb); return;
							}
							if(links[j].type=='POLSKI' || links[j].type=='DUBBING' || links[j].type=='LEKTOR_PL' || links[j].type=='NAPISY_PL'){
								pol_ver = true;
							}
						}

						if(!pol_ver){
							i++; queue(aggre, i, cb); return;
						}

						for(var j = 0; j < links.length; j++) {
							var embed = null;

							for(var k = 0, len = VIDEO_HOSTING_LIST.length; k < len; k++){
								if(VIDEO_HOSTING_LIST[k].name==links[j].hosting){
									embed = VIDEO_HOSTING_LIST[k].embed_code;
									break;
								}
							}

							embed = embed.replace('#ID', links[j].video_id);
							embed = embed.replace('#WIDTH', 1280);
							embed = embed.replace('#HEIGHT', 1280);

							switch(links[j].hosting){
								case 'openload':
								case 'streamango':
									embed = embed.replace('/embed/', '/f/');
									break;
								case 'rapidvideo':
									embed = embed.replace('/embed/', '/v/');
									break;
							}


							links[j].embed = embed;
							links[j]._id = undefined;
							links[j].hosting = undefined;
							links[j].video_id = undefined;
							links[j].premium = undefined;
							links[j].file_size = BYTES_FORMAT(links[j].file_size, {unitSeparator: ' ', decimalPlaces: 0});
							
						}

						moviesLyst.push({
							title: movie.title_org,
							views: item.count,
							links: links,
						})

						i++;
						queue(aggre, i, cb);
					});
				}

				queue(aggregated, 0, function(){
					callback(null);
				});
			});
		}],
		function(err){
			CB(moviesLyst);
		}
	);
}

module.exports = UTILS;