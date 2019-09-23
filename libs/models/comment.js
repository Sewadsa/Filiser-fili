var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	like_up : { type: Number, default: 0 },
	like_down : { type: Number, default: 0 },
	message : String,
	date : { type: Date, default: Date.now },
	spoilers : { type: Boolean, default: false },
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	movie_id : MONGO.Schema.Types.ObjectId,
	episode_id : MONGO.Schema.Types.ObjectId,
	video_id : MONGO.Schema.Types.ObjectId,
	vote_logs : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Vote'}],

	status : { type: String, default: 'WAIT' },
});

schema.index({ date: -1});
schema.index({ status: -1});

schema.pre('remove', function(next) {
	var _id = this._id;

	ASYNC.parallel([
		function(cb){
			movieModel.updateOne({ comments: MONGO.Types.ObjectId(_id) }, { $pull: { 'comments': MONGO.Types.ObjectId(_id) } }, function(err){
				cb(null);
			});
		},
		function(cb){
			episodeModel.updateOne({ comments: MONGO.Types.ObjectId(_id) }, { $pull: { 'comments': MONGO.Types.ObjectId(_id) } }, function(err){
				cb(null);
			});
		},
	], function(){
		next();
	});
});

module.exports = MONGO.model('Comment', schema);