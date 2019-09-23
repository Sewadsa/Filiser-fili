var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	
	cost : String,
	crc : String,

	tr_date : { type: Date, default: Date.now },
	tr_id : String,

	sms_num : String,
	sms_code :  String,

	applied : { type: Boolean, default: false },
	paid : Boolean,
	factured : Boolean,

	type : Number, // 0 - transfer 1 - direct billing
});

schema.index({ crc: 1 });
schema.index({ paid: 1, applied: 1, factured: 1 });
schema.index({ paid: 1, applied: 1, factured: 1, type: 1 });

module.exports = MONGO.model('Payment', schema);