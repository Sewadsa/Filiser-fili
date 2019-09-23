var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	start: Number,
	end: Number,
	start_ipv6: Buffer,
	end_ipv6: Buffer,
	type: String,
	country_code: String,
	added_manual: { type: Boolean, default: false },
});


schema.index({ start: 1 });
schema.index({ end: 1 });
schema.index({ start: -1 });
schema.index({ end: -1 });

schema.index({ start_ipv6: 1 });
schema.index({ end_ipv6: -1 });
schema.index({ start_ipv6: 1 });
schema.index({ end_ipv6: -1 });

schema.index({ type: 1 });





module.exports = MONGO.model('Geo', schema);