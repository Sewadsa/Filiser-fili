var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	vote : { type: Number, default: 0 },
	date : { type: Date, default: Date.now },
	user_id : MONGO.Schema.Types.ObjectId,
	movie_id : { type: MONGO.Schema.Types.ObjectId },
	series_id : { type: MONGO.Schema.Types.ObjectId },
	comment_id : { type: MONGO.Schema.Types.ObjectId },
	video_id : { type: MONGO.Schema.Types.ObjectId },
});


schema.index({ date: 1 });
schema.index({ movie_id: 1 });
schema.index({ series_id: 1 });
schema.index({ comment_id: 1 });
schema.index({ video_id: 1 });

schema.pre('remove', function(next) {
	this.model('Comment').updateOne({ vote_logs: this._id }, { $pull: { 'vote_logs': this._id } }, next);
});

module.exports = MONGO.model('Vote', schema);