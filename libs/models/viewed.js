var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	date : { type: Date, default: Date.now },
	ip : String,
	adb: { type: Boolean, default: false },
	movie_id : MONGO.Schema.Types.ObjectId,
	episode_id : MONGO.Schema.Types.ObjectId,
	series_id : MONGO.Schema.Types.ObjectId,
	video_id : MONGO.Schema.Types.ObjectId,
});

schema.index({ date: -1 });
schema.index({ ip: 1 });
schema.index({ movie_id: 1 });
schema.index({ episode_id: 1 });
schema.index({ series_id: 1 });
schema.index({ video_id: 1 });


module.exports = MONGO.model('Viewed', schema);