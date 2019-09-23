var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	ip : String,

	times: { type: Number, default: 1 },
	first_get : { type: Date, default: Date.now },
});

schema.index({ ip: 1 });

module.exports = MONGO.model('LoginLogs', schema);

