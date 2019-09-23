var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	ip : String,

	captcha: { type: Boolean, default: false },
	times: { type: Number, default: 1 },
	first_get : { type: Date, default: Date.now },
	advertising_last : { type: Date, default: Date.now },
	advertising_ended : { type: Boolean, default: false },
});

schema.index({ ip: 1, first_get: -1 });

module.exports = MONGO.model('LinkLogs', schema);

