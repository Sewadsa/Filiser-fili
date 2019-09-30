var every3Sec = SCHEDULE.scheduleJob('*/2 * * * * *', function(){

	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'checkLink'});
		}
	}
});

SCHEDULE.scheduleJob('*/5 * * * * *', function(){ // PREMIUM PAID CHECKER
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'checkPaymentPaid'});
		}
	}
});


SCHEDULE.scheduleJob('*/10 * * * * *', function(){ // PREMIUM APPLIED CHECKER
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(LOCK_FACTURING) return;
	if(is_dev_mode) return;
	LOCK_FACTURING = true;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'checkPaymentApplied'});
		}
	}
});


var everyDayAt330 = SCHEDULE.scheduleJob({hour: 3, minute: 30}, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updateOn330'});
		}
	}
});

SCHEDULE.scheduleJob({minute: 15}, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updateRandomSeriesMovies'});
		}
	}
});


var rule = new SCHEDULE.RecurrenceRule();
rule.hour  = [5, 11, 17, 23];
rule.minute = 12;

SCHEDULE.scheduleJob(rule, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updatePopularDay'});
		}
	}
});

SCHEDULE.scheduleJob({hour: 6, minute: 0, dayOfWeek: 0}, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updatePopularWeek'});
		}
	}
});

SCHEDULE.scheduleJob({hour: 6, minute: 0, dayOfWeek: 4}, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updatePopularWeek'});
		}
	}
});


SCHEDULE.scheduleJob({hour: 7, minute: 0, dayOfWeek: 6}, function(){
	if(!initRuned) return;
	if(MAINTAINCE || SHUTTING_DOWN) return;
	if(is_dev_mode) return;

	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updatePopularMonth'});
		}
	}
});

/*z = function()
{
	for(var i = 0; i < workers.length; i++){
		if(workers[i].main){
			workers[i].send({type: 'updateOn330'});
		}
	}
}
*/

