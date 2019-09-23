var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	session_id: String,
	ip: String,
	page_type: String,
	episode_id: { type: MONGO.Schema.Types.ObjectId },
	movie_id: { type: MONGO.Schema.Types.ObjectId },
	date: { type: Date, default: Date.now },
	watch_tick: Date,
	wait_tick: { type: Date, default: Date.now },
});

schema.index({ session_id: 1 });
schema.index({ watch_tick: 1 });
schema.index({ wait_tick: 1 });



module.exports = MONGO.model('WatchQueue', schema);