var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	num : Number,
	poster : String,
	title : String,
	url : String,
	genres : [],
	views : { type: Number, default: 0 },
	viewed_day : { type: Number, default: 0 },
	video_id : String,
	date : { type: Date, default: Date.now },
	rate : { type: Number, default: 0 },
	votes_count : { type: Number, default: 0 },
	desc : { type: String, default: '' },
	
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	comments : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Comment'}],
	
	status : { type: String, default: 'WAIT' },
});

schema.index({ num: 1 });
schema.index({ video_id: 1 });
schema.index({ url: 1 });
schema.index({ date: 1 });
schema.index({ date: -1 });
schema.index({ rate: 1 });
schema.index({ rate: -1 });
schema.index({ views: 1 });
schema.index({ views: -1 });
schema.index({ viewed_day: -1});
schema.index({ status: -1});



schema.pre('remove', function(next) {
	var _id = this._id;
	var comments = this.comments;
	var poster = this.poster;

	ASYNC.parallel([
		function(cb){
			commentModel.deleteMany({ _id: { $in: comments }}, function(err){
				cb(null);
			});
		},
		function(cb){
			voteModel.deleteMany({ video_id: MONGO.Types.ObjectId(_id)}, function(err){
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

schema.plugin(MONGO_AUTO_IN.plugin, { model: 'Video', field: 'num', startAt: 1 });

module.exports = MONGO.model('Video', schema);