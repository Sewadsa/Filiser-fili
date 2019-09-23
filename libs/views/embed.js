//- var log_url = '!{log_url}'

					//- var loadz = function(sand){
					//- 	var timer = null;

					//- 	var loader = document.getElementById('loader');
					//- 	loader.style.marginTop = (document.body.clientHeight/2-26)+'px';
					//- 	var iframe = document.getElementById('iframe');

						//- var origin = !{allow_origin};

						//- if(sand)
						//- 	iframe.setAttribute('sandbox', 'allow-scripts allow-forms '+(origin?'allow-same-origin':''))

						//- var usr = !{isModAdmin};
					//- 	var url = '!{url}';
					//- 	url = url.replace('#WIDTH', String(window.innerWidth));
					//- 	url = url.replace('#HEIGHT', String(window.innerHeight));

					//- 	if(usr && window.top==window) location.href = url;

					//- 	iframe.onload = function(){
					//- 		document.getElementById('loader').style.display = 'none';
					//- 		document.getElementById('iframe').style.visibility = 'visible';
					//- 		clearTimeout(timer);
					//- 	}

					//- 	timF = function(){
					//- 		document.getElementById('loader').style.display = 'none';
					//- 		document.getElementById('iframe').style.visibility = 'visible';
					//- 	}

					//- 	timer = setTimeout(timF, 3000);
					//- 	iframe.src = url;

					//- 	document.getElementById('reload_btn').addEventListener('click', function(){
					//- 		document.getElementById('loader').style.display = 'block';
					//- 		document.getElementById('iframe').style.visibility = 'hidden';
					//- 		var iframe = document.getElementById('iframe');

					//- 		iframe.onload = function(){
					//- 			document.getElementById('loader').style.display = 'none';
					//- 			document.getElementById('iframe').style.visibility = 'visible';
					//- 		}

					//- 		timer = setTimeout(timF, 3000);
					//- 		iframe.src = url;
					//- 	});
					//- }

					//- var dispose = false;
					//- var showed = false;

					//- adsManagerLoadedCallback = function()
					//- {
					//- 	player.ima.addEventListener(google.ima.AdEvent.Type.COMPLETE, function(){
					//- 		showed = true;
					//- 		var xhr = new XMLHttpRequest();
					//- 		xhr.onload = function() {
					//- 		}
					//- 		xhr.open('get', log_url);
					//- 		xhr.responseType = "document";
					//- 		xhr.send();
					//- 	});
					//- 	player.ima.addEventListener(google.ima.AdEvent.Type.SKIPPED, function(){
					//- 		showed = true;
					//- 		var xhr = new XMLHttpRequest();
					//- 		xhr.onload = function() {
					//- 		}
					//- 		xhr.open('get', log_url);
					//- 		xhr.responseType = "document";
					//- 		xhr.send();
					//- 	});


					//- 	player.ima.startFromReadyCallback();
					//- }

					//- try{
					//- 	var player = videojs('content_video', {width: window.innerWidth, height: window.innerHeight});

					//- 	var options = {
					//- 		id: 'content_video',
					//- 		adLabel: 'Reklama',
					//- 		adTagUrl: 'https://a.spolecznosci.net/vast?x=1294&n=[timestamp]', 
					//- 	};


					//- 	player.ima(options, adsManagerLoadedCallback);
					//- }catch(err){
					//- 	dispose = true;
					//- }

					//- if (!('remove' in Element.prototype)) {
					//- Element.prototype.remove = function() {
					//- if (this.parentNode) {
					//- this.parentNode.removeChild(this);
					//- }
					//- };
					//- }

					//- if(dispose){
					//- 	var k = document.getElementById('content_video');
					//- 	if(k) k.remove();
					//- 	document.getElementById('loader').style.display = 'block';
					//- 	document.getElementById('reload_btn').style.display = 'block';
					//- 	loadz(showed);
					//- }else{
					//- 	player.ima.addContentEndedListener(function(c){
					//- 		var k = document.getElementById('content_video');
					//- 		if(k) k.remove();
					//- 		document.getElementById('loader').style.display = 'block';
					//- 		document.getElementById('reload_btn').style.display = 'block';
					//- 		loadz(showed);
					//- 	});

						
					//- 	player.ima.initializeAdDisplayContainer();
					//- 	player.ima.requestAds();
					//- 	player.play();
					//- }