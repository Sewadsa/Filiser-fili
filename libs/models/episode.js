var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	num : Number,
	season_num : Number,
	episode_num : Number,
	episode_num_alter : { type: Number, default: null },
	title : String,
	url : String,
	desc : String,
	keywords: [],
	views : { type: Number, default: 0 },
	viewed : { type: Number, default: 0 },
	//viewed_hour : { type: Number, default: 0 },
	date : { type: Date, default: Date.now },
	update_date : { type: Date, default: Date.now },
	report : { type: String, default: '' },
	report_desc : { type: String, default: '' },

	series_id : { type: MONGO.Schema.Types.ObjectId, ref: 'Series'},
	users_viewed : [{ type: MONGO.Schema.Types.ObjectId, ref: 'User'}],
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	links : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Link'}],
	comments : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Comment'}],

	status : { type: String, default: 'WAIT' },
});


schema.index({ title: 1 });
schema.index({ series_id: 1 });
schema.index({ num: 1 });
schema.index({ season_num: 1 });
schema.index({ episode_num: 1 });
schema.index({ episode_num_alter: 1 });
schema.index({ date: 1 });
schema.index({ date: -1 });
schema.index({ update_date: -1 });
schema.index({ url: 1 });
schema.index({ status: -1});

schema.pre('remove', function(next){
	var _id = this._id;
	var links = this.links;
	var vote_logs = this.vote_logs;
	var comments = this.comments;

	ASYNC.parallel([
		function(cb){
			linkModel.deleteMany({ _id: { $in: links }}, function(err){
				cb(null);
			});
		},
		function(cb){
			voteModel.deleteMany({ _id: { $in: vote_logs }}, function(err){
				cb(null);
			});
		},
		function(cb){
			commentModel.deleteMany({ _id: { $in: comments }}, function(err){
				cb(null);
			});
		},
		function(cb){
			seriesModel.updateOne({ episodes: MONGO.Types.ObjectId(_id) }, { $pull: { 'episodes': MONGO.Types.ObjectId(_id) } }, function(err){
				cb(null);
			});
		},
	], function(){
		next();
	});
});

schema.plugin(MONGO_AUTO_IN.plugin, { model: 'Episode', field: 'num', startAt: 1 });
module.exports = MONGO.model('Episode', schema);