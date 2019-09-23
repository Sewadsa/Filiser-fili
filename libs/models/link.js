var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	type : String,
	quality : String,
	hosting : String,
	video_id : String,
	file_size : Number,
	date : { type: Date, default: Date.now },
	last_check : { type: Date, default: Date.now },
	report : { type: String, default: '' },
	report_desc : { type: String, default: '' },
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	ip : { type: String, default: '' },
	premium : { type: Boolean, default: false },

	status : { type: String, default: 'WAIT' },

	series_id : { type: MONGO.Schema.Types.ObjectId, ref: 'Series'},
	episode_id : { type: MONGO.Schema.Types.ObjectId, ref: 'Episode'},
	movie_id : { type: MONGO.Schema.Types.ObjectId, ref: 'Movie'},
});


schema.index({ date: -1 });
schema.index({ video_id: 1 });
schema.index({ hosting: 1 });
schema.index({ last_check: 1 });
schema.index({ ip: 1 });
schema.index({ status: -1});
schema.index({ series_id: 1 });
schema.index({ movie_id: 1 });
schema.index({ episode_id: 1 });


schema.pre('remove', function(next) {
	var _id = this._id;

	ASYNC.parallel([
		function(cb){
			movieModel.updateOne({ links: MONGO.Types.ObjectId(_id) }, { $pull: { 'links': MONGO.Types.ObjectId(_id) } }, function(err){
				cb(null);
			});
		},
		function(cb){
			episodeModel.updateOne({ links: MONGO.Types.ObjectId(_id) }, { $pull: { 'links': MONGO.Types.ObjectId(_id) } }, function(err){
				cb(null);
			});
		},
	], function(){
		next();
	});
});

schema.post('findOneAndRemove', function(doc){
	if(!doc) return;
	var _id = doc._id;

	movieModel.updateOne({ links: MONGO.Types.ObjectId(_id) }, { $pull: { 'links': MONGO.Types.ObjectId(_id) } }, function(err){
		episodeModel.updateOne({ links: MONGO.Types.ObjectId(_id) }, { $pull: { 'links': MONGO.Types.ObjectId(_id) } }, function(err){});
	});
});



module.exports = MONGO.model('Link', schema);