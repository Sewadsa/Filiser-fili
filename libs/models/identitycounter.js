var schema = new MONGO.Schema({
	model: { type: String, require: true },
	field: { type: String, require: true },
	count: { type: Number, default: 0 }
});

schema.index({ field: 1, model: 1 }, { unique: true, required: true, index: -1 });

try{
	module.exports = MONGO.model('IdentityCounter');
}catch(ex){
	if(ex.name === 'MissingSchemaError'){
		module.exports = MONGO.model('IdentityCounter', schema);
	}else throw ex;
}

