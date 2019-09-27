// MONGO MODELS
userModel = require(PATH.join(BASE_PATH, 'libs/models/user.js'));
linkModel = require(PATH.join(BASE_PATH, 'libs/models/link.js'));
viewedModel = require(PATH.join(BASE_PATH, 'libs/models/viewed.js'));
voteModel = require(PATH.join(BASE_PATH, 'libs/models/vote.js'));
commentModel = require(PATH.join(BASE_PATH, 'libs/models/comment.js'));
movieModel = require(PATH.join(BASE_PATH, 'libs/models/movie.js'));
episodeModel = require(PATH.join(BASE_PATH, 'libs/models/episode.js'));
seriesModel = require(PATH.join(BASE_PATH, 'libs/models/series.js'));

linkLogsModel = require(PATH.join(BASE_PATH, 'libs/models/link_logs.js'));
paymentModel = require(PATH.join(BASE_PATH, 'libs/models/payment.js'));
counterModel = require(PATH.join(BASE_PATH, 'libs/models/identitycounter.js'));
videoModel = require(PATH.join(BASE_PATH, 'libs/models/video.js'));

loginLogsModel = require(PATH.join(BASE_PATH, 'libs/models/login_logs.js'));
watchQueueModel = require(PATH.join(BASE_PATH, 'libs/models/watch_queue.js'));

//geoModel = require(PATH.join(BASE_PATH, 'app/models/geo.js'));



// CLASSES
FILMWEB = require(PATH.join(BASE_PATH, 'libs/class/filmweb.js'));
UTILS = require(PATH.join(BASE_PATH, 'libs/class/utils.js'));
USER = require(PATH.join(BASE_PATH, 'libs/class/user.js'));
MOVIE = require(PATH.join(BASE_PATH, 'libs/class/movie.js'));
SERIES = require(PATH.join(BASE_PATH, 'libs/class/series.js'));
PAYMENT  = require(PATH.join(BASE_PATH, 'libs/class/payment.js'));
VIDEO  = require(PATH.join(BASE_PATH, 'libs/class/video.js'));
GMAIL  = require(PATH.join(BASE_PATH, 'libs/class/gmail.js'));
SENDGRID  = require(PATH.join(BASE_PATH, 'libs/class/sendgrid.js'));



// ROUTES
require(PATH.join(BASE_PATH, 'libs/routes/get.js'));
require(PATH.join(BASE_PATH, 'libs/routes/post.js'));


// INIT FUNCTIONS 
homeFunctions = function(CB)
{

	httpServer.listen(PORT);
	httpsServer.listen(PORT_SSL);

	if(CLUSTER.worker.id==1){
		seriesModel.countDocuments({ viewed_day: { $gt: 0 } }, function(err, count){
			if(err || count>0){
				console.log('Main ready');
				CB();
			}else{
				UTILS.createPopularDay(function(){
					UTILS.createPopularWeek(function(){
						UTILS.createPopularMonth(function(){
							console.log('Main ready');
							CB();
						});
					});
				});
			}
		});
	}else{
		console.log('Main ready');
		CB();
	}

	
}

updateOn330 = function()
{
	UTILS.doBackup(function(){
		UTILS.removeViewedLogs(function(){
			UTILS.removeCopyrMovies(function(){
				UTILS.removeLinkLogs(function(){
					UTILS.removeTmpFiles();
				});
			});
		});
	});
}

CLOSE = function()
{
	MAINTAINCE = true;
	SHUTTING_DOWN = true;
	var time = 13000;
	if(is_dev_mode) time = 300;
	setTimeout(function(){
		httpServer.close();
		httpsServer.close();
		MONGO.connection.close(function(){
			process.send({type:'CLOSING'});
			console.log(`Niewolnik ${CLUSTER.worker.id} jest zamykany`)
			process.exit(0);
		});
	}, time);
}


process.send({type:'ready'});

process.on('message', function(msg){
	switch(msg.type){
		case 'checkLink':
			UTILS.checkLink();
			break;
		case 'checkPaymentPaid':
			PAYMENT.checkPaymentPaid();
			break;
		case 'checkPaymentApplied':
			PAYMENT.checkPaymentApplied(function(){
				process.send({type:'checkPaymentAppliedEnded'});
			});
			break;
		case 'youAreMainFirst':

			homeFunctions(function(){
				process.send({type: 'dataFirst'});
			});
			break;
		case 'newWorker':
				httpServer.listen(PORT);
				httpsServer.listen(PORT_SSL);
				console.log(`Worker ${CLUSTER.worker.id} started listening`)
			break;
		case 'updateOn330':
			updateOn330();
			break;
		case 'updateRandomSeriesMovies':
			UTILS.createRandomSeriesMovies(function(){
				log('Random Series Movies updated.')
			});
			break;
		case 'updatePopularDay':
			UTILS.createPopularDay(function(){
				log('Popular Day updated.')
			});
			break;
		case 'updatePopularWeek':
			UTILS.createPopularWeek(function(){
				log('Popular Week updated.')
			});
			break;
		case 'updatePopularMonth':
			UTILS.createPopularMonth(function(){
				log('Popular Month updated.')
			});
			break;
		case 'CLOSE':
			CLOSE();
			break;
		default:
			break;
	}

});




