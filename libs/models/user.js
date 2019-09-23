var schema = new MONGO.Schema({
	username : String,
	email : String,
	password : { type: String, default: '' },
	ip : String,
	register_date : { type: Date, default: Date.now },
	last_activity : { type: Date, default: Date.now },
	ban_expire : { type: Date, default: Date.now },
	comments_captcha_expire : { type: Date },
	first_comment : { type: Date, default: Date.now },
	comment_count : { type: Number, default: 0 },
	type : String, // ADMIN, MODERATOR, USER
	facebook_id : { type: String, default: '' },
	facebook_token : { type: String, default: '' },
	active: { type: Boolean, default: false },
	login_logs : [],
	pass_reset_code : String,
	pass_reset_expire : { type: Date, default: Date.now },
	avatar : { type: String, default: '' },
	avatar200 : { type: String, default: '' },
	views : { type: Number, default: 0 },
	premium_expire : { type: Date, default: Date.now },
	premium_buy_times : { type: Number, default: 0 },

	fav_series : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Series'}],
	fav_movies : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Movie'}],

	link_counter : { type: Number, default: 0 },

	prem_video_time : [],
	internet_speed : [],
});

schema.index({ username: 1 });
schema.index({ email: 1 });
schema.index({ ip: 1 });
schema.index({ register_date: 1 });
schema.index({ last_activity: -1 });
schema.index({ ban_expire: -1 });

module.exports = MONGO.model('User', schema);