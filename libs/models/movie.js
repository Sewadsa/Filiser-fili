var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	num : Number,
	title : String,
	title_org : String,
	search : String,
	filmweb_id : Number,
	year : Number,
	premiere : Date,
	poster : String,
	desc : String,
	url : String,
	genres : [String],
	ver : [Number],
	keywords: [],
	views : { type: Number, default: 0 },
	viewed : { type: Number, default: 0 },
	viewed_hour : { type: Number, default: 0 },
	viewed_day : { type: Number, default: 0 },
	viewed_week : { type: Number, default: 0 },
	viewed_month : { type: Number, default: 0 },
	copyright_del_date : { type: Date, default: Date.now },
	date : { type: Date, default: Date.now },
	update_date : { type: Date, default: Date.now },
	new_status : { type: String, default: '' },

	rate : { type: Number, default: 0 },
	votes_count : { type: Number, default: 0 },

	users_viewed : [{ type: MONGO.Schema.Types.ObjectId, ref: 'User'}],
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	links : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Link'}],
	comments : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Comment'}],

	fav_users : [{ type: MONGO.Schema.Types.ObjectId, ref: 'User'}],

	trailer_url : { type: String, default: null },

	status : { type: String, default: 'WAIT' },
	drawn_num : Number,

	showmax_ad_750x_url : String,
});


schema.index({ year: 1 });
schema.index({ update_date: -1 });
schema.index({ update_date: 1 });
schema.index({ viewed: -1 });
schema.index({ viewed: 1 });
schema.index({ rate: -1 });
schema.index({ rate: 1 });

schema.index({ date: -1 });
schema.index({ date: 1 });

schema.index({ viewed_hour: -1 });
schema.index({ viewed_day: -1 });
schema.index({ viewed_week: -1 });
schema.index({ viewed_month: -1 });
schema.index({ drawn_num: -1 });


schema.index({ search: 1, search: "text" });

schema.index({ num: 1 });
schema.index({ url: 1 });
schema.index({ status: -1});

schema.pre('remove', function(next){
	var self = this;
	
	var _id = this._id;
	var links = this.links;
	var vote_logs = this.vote_logs;
	var comments = this.comments;
	var poster = this.poster;

	var fav_users = this.fav_users;

	ASYNC.parallel([
		function(cb){
			linkModel.deleteMany({ _id: { $in: links }}, function(err){
				cb(null);
			});
		},
		function(cb){
			voteModel.deleteMany({ movie_id: MONGO.Types.ObjectId(_id)}, function(err){
				cb(null);
			});
		},
		function(cb){
			commentModel.deleteMany({ _id: { $in: comments }}, function(err){
				cb(null);
			});
		},
		function(cb){
			userModel.updateMany({ _id: { $in: fav_users }}, { $pull: { 'fav_movies': self._id } }, function(err, dane){
				cb(null);
			});
		},
		function(cb){
			if(!poster){ cb(null); return; }
			var path = PATH.join(PUBLIC_PATH, poster);
			FS.unlink(path, function(err){
				cb(null);
			});
		},
	], function(){
		next();
	});
});


schema.plugin(MONGO_AUTO_IN.plugin, { model: 'Movie', field: 'num', startAt: 1 });
module.exports = MONGO.model('Movie', schema);

