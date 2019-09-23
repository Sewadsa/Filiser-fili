CLUSTER = require('cluster');
PATH = require('path');
ASYNC = require('async');

PREMIUM = true;

MAINTAINCE = false;
SHUTTING_DOWN = false;

BASE_PATH = PATH.resolve(__dirname, '..');
PUBLIC_PATH = PATH.join(BASE_PATH, '/data/public');

require(PATH.join(BASE_PATH, 'libs/config.js'));

if(CLUSTER.isMaster){
	LOCK_FACTURING = false;
		
	SCHEDULE = require('node-schedule');

	initRuned = false;
	needMain = false;

	workers = [];

	CLUSTER.fork();

	require(PATH.join(BASE_PATH, 'libs/schedule.js'));

	CLUSTER.on('online', function(worker) {
		workers.push(worker);

		worker.on('message', function(msg){
			switch(msg.type){
				case 'ready':
					if(!initRuned){
						for(var i = 0; i < workers.length; i++){
							if(workers[i].id==worker.id){
								workers[i].main = true;
								workers[i].send({type: 'youAreMainFirst'}); }
							}
					}else{
						if(needMain){
							needMain = false;
							console.log('URUCHAMIAM NOWEGO MAINA')

							for(var i = 0; i < workers.length; i++){
								if(workers[i].id==worker.id){
									workers[i].main = true;
									LOCK_FACTURING = false;
									workers[i].send({type: 'newWorker'});
								}
							}
						}else{
							console.log('URUCHAMIAM NIE MAINA')
							worker.send({type: 'newWorker'});
						}

					}
					break;
				case 'dataFirst':
					initRuned = true;
					CLUSTER.fork();
					if(NUM_OF_PROCESS>2){
						for(var i = 0; i < NUM_OF_PROCESS-2; i++){
							CLUSTER.fork();
						}
					}
					break;
				case 'checkPaymentAppliedEnded':
					LOCK_FACTURING = false;
					break;
				default:
					break;
			}


		});
	});

	CLUSTER.on('exit', function(worker, code, signal){
		if(MAINTAINCE) return;

		for(var i = 0; i < workers.length; i++){
			if(workers[i].id==worker.id){

				if(workers[i].main){
					needMain = true;
				}

				workers.splice(i, 1);
				break;
			}
		}

		console.log('Worker ' + worker.id + ' died with code: ' + code + ', and signal: ' + signal);
		CLUSTER.fork();
	});

	broadcast = function(msg, without)
	{
		for(var i = 0; i < workers.length; i++){
			if(without && workers[i].id==without.id) continue;
			workers[i].send(msg);
		}

	}

	process.on('SIGINT', function(){
		MAINTAINCE = true;

		setTimeout(function(){
			console.log('MASTER SHUTED DOWN')
			process.exit(0);
		}, 1000);
	});
}else{
	require(PATH.join(BASE_PATH, 'libs/app.js'));

	process.on('SIGINT', function(){
		MAINTAINCE = true;

		setTimeout(function(){
			CLOSE();
		}, 1000);
	});
}