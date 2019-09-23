var schema = new MONGO.Schema({
	_id : MONGO.Schema.Types.ObjectId,
	num : Number,
	num_alter : [{ type: Number, default: null }],
	title : String,
	title_org : String,
	search : String,
	filmweb_id : Number,
	year : Number,
	viewed : { type: Number, default: 0 },
	viewed_day : { type: Number, default: 0 },
	viewed_week : { type: Number, default: 0 },
	viewed_month : { type: Number, default: 0 },
	premiere : Date,
	poster : String,
	desc : String,
	url : String,
	genres : [],
	keywords: [],
	date : { type: Date, default: Date.now },
	update_date : { type: Date, default: Date.now },
	new_status : {
		str : { type: String, default: '' },
		episode : { type: MONGO.Schema.Types.ObjectId, ref: 'Episode'},
	},

	rate : { type: Number, default: 0 },
	votes_count : { type: Number, default: 0 },

	user : { type: MONGO.Schema.Types.ObjectId, ref: 'User'},
	episodes : [{ type: MONGO.Schema.Types.ObjectId, ref: 'Episode'}],

	fav_users : [{ type: MONGO.Schema.Types.ObjectId, ref: 'User'}],

	trailer_url : { type: String, default: null },

	status : { type: String, default: 'WAIT' },
	drawn_num : Number,

	showmax_ad_750x_url : String,

	promotion: Boolean,
});

schema.index({ year: 1 });
schema.index({ update_date: -1 });
schema.index({ update_date: 1 });
schema.index({ viewed: -1 });
schema.index({ viewed: 1 });
schema.index({ rate: -1 });
schema.index({ rate: 1 });

schema.index({ viewed_hour: -1 });
schema.index({ viewed_day: -1 });
schema.index({ viewed_week: -1 });
schema.index({ viewed_month: -1 });
schema.index({ drawn_num: -1 });

schema.index({ search: 1, search: "text" });

schema.index({ num: 1 });
schema.index({ num_alter: 1 });
schema.index({ url: 1 });

schema.index({ status: -1});



schema.pre('remove', function(next){
	var self = this;

	var episodes = this.episodes;
	var poster = this.poster;

	var fav_users = this.fav_users;

	ASYNC.parallel([
		function(cb){
			episodeModel.find({ _id: { $in: episodes }}, function(err, epi){
				if(err){ cb(null); return; }
				if(!epi){ cb(null); return; }

				for(var i = 0, len = epi.length; i < len; i++) {
					epi[i].remove();
				}
				cb(null);
			});
		},
		function(cb){
			userModel.updateMany({ _id: { $in: fav_users }}, { $pull: { 'fav_series': self._id } }, function(err, dane){
				cb(null);
			});
		},
		function(cb){
			if(!poster){ cb(null); return; }
			var path = PATH.join(PUBLIC_PATH, poster);
			FS.unlink(path, function(err){
				cb(null);
			});

		},
	], function(){
		next();
	});
});

schema.plugin(MONGO_AUTO_IN.plugin, { model: 'Series', field: 'num', startAt: 1 });
module.exports = MONGO.model('Series', schema);