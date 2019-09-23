var request = require('request');
var queryString = require('query-string');

const KEY = 'qjcGhW2JnvGT9dfCt3uT_jozR3s';
const API_URL = 'https://ssl.filmweb.pl/api?';
const SEARCH_URL = 'http://www.filmweb.pl/search/live?';


var FILMWEB = {};
var self = {};


/**
* Search movie or series on filmweb.
* @param string value
* @param int type 0-2 0-movies and series, 1 - movies, 2 - series
**/
FILMWEB.search = function(value, type, CB)
{
	type = typeof type !== 'undefined' ? type : 0;

	var types = ['', 'f', 's'];

	var queryArr = {
		'q': value,
	}; 

	var query = queryString.stringify(queryArr);
	var url = SEARCH_URL+query;

	request(url, function (error, response, body) {
		if(!error && response.statusCode == 200) {
			var lines = body.split('\\a');
			
			var results = new Array();

			if(lines.length==1 && lines[0].length==0){
				CB(false, results);
				return;
			}

			for(var i = 0, len = lines.length; i < len; i++){
				var cols = lines[i].split('\\c');

				if(typeof cols[0] != 'undefined'){
					if(cols[0] == types[type]){
						if(cols[0]=='f') var stype = 'film/';
						else if(cols[0]=='s') var stype = 'serial/';

						if(cols[2]=='' || cols[2]==undefined) pos = '';
						else pos = 'https://1.fwcdn.pl/po'+(cols[2].replace('4.jpg', '2.jpg'));

						if(cols[4]=='') var title = cols[3];
						else var title = cols[4];

						var resArr = {
							'id': cols[1],
							'poster': pos=='' ? '/assets/img/no_cover_112x160.jpg':pos,
							'title_org': cols[3],
							'title': title,
							'year': cols[6],
							'type': cols[0]
						}
						results.push(resArr);
					}else{
						if(type==0 && (cols[0]=='f' || cols[0]=="s")){
							if(cols[2]=='' || cols[2]==undefined) pos = '';
							else pos = 'https://1.fwcdn.pl/po'+(cols[2].replace('4.jpg', '2.jpg'));

							if(cols[4]=='') var title = cols[3];
							else var title = cols[4];
							
							var resArr = {
								'id': cols[1],
								'poster': pos=='' ? '/assets/img/no_cover_112x160.jpg':pos,
								'title_org': cols[3],
								'title': title,
								'year': cols[6],
								'type': cols[0]
							}
							results.push(resArr);
						}else continue;
					}
				}
			}
			CB(false, results);
		}else CB(true, null);
	});
}


FILMWEB.getFullInfoById = function(id, CB)
{
	var method = 'getFilmInfoFull ['+id+']\n';
	var signature = self.createSignature(method);
	var version = '1.0';
	var appId = 'android';

	var queryArr = {
		'methods': method,
		'signature': signature,
		'version': version,
		'appId': appId
	}; 

	var query = queryString.stringify(queryArr);
	
	var url = API_URL+query;

	request(url, function (error, response, body){
		if(!error && response.statusCode == 200){		
			var arr = body.split('\n');
			if(arr[1]=='null'){
				CB(true, null);
				return;
			}

			var arr = arr[1].split(' t:');
			var resultJson = JSON.parse(arr[0]);
			
			var genresArr = resultJson[4].split(',');

			var imagePath = '';

			if(resultJson[11]){
				var imagePath = resultJson[11].replace('2.jpg', '3.jpg');
				var imagePath = 'https://1.fwcdn.pl/po'+imagePath;
			}

			var result = 
			{
				title: resultJson[0]==undefined ? resultJson[1]:resultJson[0],
				originalTitle: resultJson[1]==undefined ? resultJson[0]:resultJson[1],
				avgRate: resultJson[2],
				votesCount: resultJson[3],
				genres: genresArr,
				year: resultJson[5],
				duration: resultJson[6],
				commentsCount: resultJson[7],
				forumUrl: resultJson[8],
				hasReview: resultJson[9],
				hasDescription: resultJson[10],
				imagePath: imagePath,
				video: resultJson[12],
				premiereWorld: resultJson[13],
				premiereCountry: resultJson[14],
				filmType: resultJson[15],
				seasonsCount: resultJson[16],
				episodesCount: resultJson[17],
				countriesString: resultJson[18],
				desciption: resultJson[19],
				filmwebId: id
			}
			
			if(resultJson[12]!=undefined){
				var url = resultJson[12][1];
				var urlHD = url.replace('.iphone.mp4', '.720p.mp4');
				HTTPS.get(urlHD, function(res){
					if(res.headers['content-type']!='video/mp4'){
						CB(false, result);
					}else{
						resultJson[12][1] = urlHD;
						result.video = resultJson[12];
						CB(false, result);
					}
				}, function(err){
					CB(true, null);
				});
			}else{
				CB(false, result);
			}
		}else CB(true, null);
	});
}

checkVideo = function(url, CB)
{
	if(!VALIDATOR.isURL(url)){
		CB(true);
		return;
	}

	HTTPS.get(url, function(res){
		if(res.headers['content-type']=='video/mp4'){
			CB(false);
		}else{
			CB(true);
		}
	}, function(err){
		CB(true);
	});
}

FILMWEB.getFilmVideosById = function(id, CB)
{
	var self2 = this;
	self2.list = null;

	self2.checkQueue = function(num, cb)
	{
		var url = self2.list[num];
		if(!url){ cb(); return; }

		checkVideo(url, function(err){
			if(err){
				url.replace('.720p.mp4', '.iphone.mp4');
				checkVideo(url, function(err){
					if(err){
						self2.list.splice(num, 1);
						self2.checkQueue(num, cb);
						return;
					}

					num++;
					self2.checkQueue(num, cb);
				});
				return;
			}

			num++;
			self2.checkQueue(num, cb);
		});
	}

	var method = 'getFilmVideos ['+id+',0,100]\n';
	var signature = self.createSignature(method);
	var version = '1.0';
	var appId = 'android';

	var queryArr = {
		'methods': method,
		'signature': signature,
		'version': version,
		'appId': appId
	}; 

	var query = queryString.stringify(queryArr);
	
	var url = API_URL+query;
	
	request(url, function (error, response, body){
		if(!error && response.statusCode == 200){		
			var arr = body.split('\n');
			if(arr[1]=='null'){
				CB(true, null);
				return;
			}

			var arr = arr[1].split(' t:');
			var resultJson = JSON.parse(arr[0]);

			if(!resultJson){
				CB(true, null);
				return;
			}

			var list = [];

			for(var i = 0, len = resultJson.length; i < len; i++){
				list.push(resultJson[i][2].replace('.iphone.mp4', '.720p.mp4'));
			}

			self2.list = list;
			self2.checkQueue(0, function(){
				CB(false, self2.list);
			});
		}else CB(true, null);
	});
}

FILMWEB.getFilmImagesById = function(id, CB)
{
	var method = 'getFilmImages ['+id+',0,50]\n';
	var signature = self.createSignature(method);
	var version = '1.0';
	var appId = 'android';

	var queryArr = {
		'methods': method,
		'signature': signature,
		'version': version,
		'appId': appId
	}; 

	var query = queryString.stringify(queryArr);
	
	var url = API_URL+query;
	
	request(url, function (error, response, body){
		if(!error && response.statusCode == 200){		
			var arr = body.split('\n');
			if(arr[1]=='null'){
				CB(false, []);
				return;
			}

			var arr = arr[1].split(' t:');
			var resultJson = JSON.parse(arr[0]);

			if(!resultJson){
				CB(false, []);
				return;
			}


			var list = [];

			for(var i = 0, len = resultJson.length; i < len; i++){
				if(!resultJson[i]) continue;
				list.push({
					large: 'http://1.fwcdn.pl/ph'+(resultJson[i][0].replace('.0.jpg', '.1.jpg')),
					small: 'http://1.fwcdn.pl/ph'+(resultJson[i][0].replace('.0.jpg', '.2.jpg')),
				});
			}

			CB(false, list);
		}else CB(true, null);
	});
}

FILMWEB.getFilmPersonsById = function(id, CB)
{
	var method = 'getFilmPersons ['+id+',6,0,50]\n';
	var signature = self.createSignature(method);
	var version = '1.0';
	var appId = 'android';

	var queryArr = {
		'methods': method,
		'signature': signature,
		'version': version,
		'appId': appId
	}; 

	var query = queryString.stringify(queryArr);
	
	var url = API_URL+query;
	
	request(url, function (error, response, body){
		if(!error && response.statusCode == 200){		
			var arr = body.split('\n');
			if(arr[1]=='null'){
				CB(true, null);
				return;
			}

			var arr = arr[1].split(' t:');
			var resultJson = JSON.parse(arr[0]);

			if(!resultJson){
				CB(true, null);
				return;
			}


/*			var list = [];

			for(var i = 0, len = resultJson.length; i < len; i++){
				list.push({
					large: 'http://1.fwcdn.pl/ph'+(resultJson[i][0].replace('.0.jpg', '.1.jpg')),
					small: 'http://1.fwcdn.pl/ph'+(resultJson[i][0].replace('.0.jpg', '.2.jpg')),
				});
			}*/

			CB(false, resultJson);
		}else CB(true, null);
	});
}


FILMWEB.getEpisodes = function(url, CB)
{
	request(url, function (error, response, body) {
		if(!error && response.statusCode == 200) {
			var result = new Array();

			$ = CHEERIO.load(body, {
				normalizeWhitespace: true,
				xmlMode: true
			});

			var season = $('#episode_top').text();
			season = parseInt(season.replace('Season&nbsp;', ''));

			for(var i = 0; i < season; i++){
				result.push(new Array());
			}

			var index2 = season-1;
			
			var countOfOdcinek = 0;
			var countOfepisodes = 0;

			$('.list_item').each(function(index, e){
				var title = $(e).find('strong').text();
				var ep = $(e).find('.image').find('div').find('div').text();
				var s = ep.split(', ');
				var num = s[1].replace('Ep', '');

				countOfepisodes++;

				result[index2].push({
					episode_num: num,
					title: title,
					noname: false
				});

			});

			result.countOfepisodes = countOfepisodes;

			CB(false, result);
		}else CB(true, null);
	});
	
}

self.createSignature = function(method)
{
	return '1.0,'+CRYPTO.createHash("md5").update(method+'android'+KEY).digest("hex");
}

module.exports = FILMWEB;