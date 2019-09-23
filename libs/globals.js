escapeForReagex = function(value)
{
	var ban_marks = [
		'\\', '[', ']', '^', '$', '.', '|', '?', '*', '+', '(',
		')', '{', '}',
	]

	var indexes = [];

	for(var i = 0, len = value.length; i < len; i++) {
		var index = ban_marks.indexOf(value[i]);
		if(index!=-1){
			indexes.push(index);
		}
	}

	indexes = removeDupInArray(indexes);

	for(var i = 0, len = indexes.length; i < len; i++) {
		value = value.replace(new RegExp('\\'+ban_marks[indexes[i]], 'g'), '\\'+ban_marks[indexes[i]]);
	}

	return value;
}

getIpVersion = function(ipz){
	if(ip.isV4Format(ipz)) return 'v4';
	else return 'v6';
}


log = function(str){
	WINSTON.log('info', str);
}

err_log = function(str){
	WINSTON.log('error', str);
}

shuffle_arr = function(a){
	for(let i = a.length; i; i--){
		let j = Math.floor(Math.random() * i);
		[a[i - 1], a[j]] = [a[j], a[i - 1]];
	}
}

liczba_to_tekst = function(liczba)
{
	if(liczba<1000) return liczba;
	else if(liczba>=1000 && liczba<1000000){
		var k = Math.floor(liczba/1000);
		return k+' tys.';
	}else if(liczba>=1000000){
		var mln = Math.floor(liczba/1000000);
		var k = Math.floor((liczba-mln*1000000)/100000);
		if(k==0) return mln+' mln';
		else return mln+','+k+' mln';
	}
}

epipsis_text = function(n, useWordBoundary )
{
	var isTooLong = this.length > n,
	s_ = isTooLong ? this.substr(0,n-1) : this;
	s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
	return  isTooLong ? s_ + '&hellip;' : s_;
};

getIP = function(req){
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
	if(ip==undefined){
		return '0.0.0.0';
	}

	var adressed = ip.split(',');

	if(adressed.length>1){
		ip = adressed[adressed.length-1];
	}

	var chunks = ip.split(':');
	if(chunks.length==8){
		return ip;
	}else if(chunks.length==1){
		return ip;
	}else{
		var index = ip.lastIndexOf(':');
		var ip = ip.substring(index+1, ip.length);
		return ip;
	}
}

ipToCountryCode = function(ipz)
{
	if(IP_GEO==null){ return null; }

	var code = null;

	try{
		var response = IP_GEO.country(ipz);
		code = response.country.isoCode;
	}catch(err){}

	return code;
}

ipToCity = function(ipz)
{
	if(IP_GEO==null){ return null; }

	var city = null;

	try{
		var response = IP_GEO_CITY.city(ipz);
		if(response.city && response.city.names && response.city.names.en){
			city = response.city.names.en;
		}
	}catch(err){}

	return city;
}

pad = function(num) {
	var s = num+"";
	while (s.length < 2) s = "0" + s;
	return s;
}


escapeRegExp = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

fileExists = function(dest)
{
	try{
		return FS.statSync(dest).isFile();
	}catch (err){
		return false;
	}
}

removeDupInArray = function(elements){
	return elements.filter(function(el,index,arr){
		return arr.indexOf(el) === index;
	});
}

requestGet = function(type, url, cb)
{
	var ssl = type=='https' ? true:false;
	var method = ssl ? HTTPS:HTTP;

	if(!VALIDATOR.isURL(url)){ cb(true); return; }

	var parsed = URL.parse(url);

	var options = {
		host: parsed.hostname,
		port: ssl ? 443:80,
		path: parsed.path,
		method: 'GET',
		headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36' }
	}

	var body = '';
	var req = method.request(options, function(res) {
		res.setEncoding('utf-8');
		res.once('error', function(err){
			cb(true);
		});
		res.on('data', function(chunk){
			body+=chunk;
		});
		res.once('end', function(){
			if(res.statusCode!=200){
				cb(true); return;
			}
			var contentType = req.res.headers['content-type'];
			if(!contentType){
				cb(null, body, req.res.headers, res.statusCode);
				return;
			}
			var type = contentType.split(';')[0];
			switch(type)
			{
				case 'application/json':
				case 'application/x-json':
					try{
						var js = JSON.parse(body);
						cb(null, js, req.res.headers, res.statusCode);
					}catch(err){
						cb(null, body, req.res.headers, res.statusCode);
					}
					break;
				default:
					cb(null, body, req.res.headers, res.statusCode);
					break;
			}
		});
	});
	req.setTimeout(30000);
	req.on('timeout', function(err){
		cb(true);
	});
	req.once('error', function(err){
		cb(true);
	});
	req.end();
}

dohttpreq = function(url, cb){
	HTTP.get(url, function(response){
		var dataz = '';
		response.setEncoding('utf8');
		response.on('error', function(err){
			cb(true);
		});
		response.on('data', function(data){
			dataz+=data;
		});
		response.on('end', function(){
			if(response.statusCode==200){
				var respo = JSON.parse(dataz);
				cb(false, respo);
			}else CB(true);
		});
	}).on('error', function(err){
		cb(true);
	});
}

requestPost = function(type, url, data, cb)
{
	var ssl = type=='https' ? true:false;
	var method = ssl ? HTTPS:HTTP;

	var post_data = QUERYSTRING.stringify(data);

	if(!VALIDATOR.isURL(url)){ cb(true); return; }

	var parsed = URL.parse(url);

	var options = {
		host: parsed.hostname,
		port: ssl ? 443:80,
		path: parsed.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	}

	var body = '';
	var req = method.request(options, function(res) {
		res.setEncoding('utf-8');
		res.once('error', function(err){
			cb(true);
		});
		res.on('data', function(chunk){
			body+=chunk;
		});
		res.once('end', function(){
			try{
				var js = JSON.parse(body);
				cb(null, js);
			}catch(err){
				cb(true);
			}
		});
	});
	req.once('error', function(err){
		cb(true);
	});
	req.write(post_data);
	req.end();
}


requestPostJson = function(type, url, data, cb, additional_headers)
{
	var ssl = type=='https' ? true:false;
	var method = ssl ? HTTPS:HTTP;

	var post_data = JSON.stringify(data);

	if(!VALIDATOR.isURL(url)){ cb(true); return; }

	var parsed = URL.parse(url);

	var options = {
		host: parsed.hostname,
		port: ssl ? 443:80,
		path: parsed.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(post_data),
		}
	}

	if(additional_headers){
		for(var k in additional_headers){
			options.headers[k] = additional_headers[k];
		}
	}

	var body = '';
	var req = method.request(options, function(res) {
		res.setEncoding('utf-8');
		res.once('error', function(err){
			cb(true);
		});
		res.on('data', function(chunk){
			body+=chunk;
		});
		res.once('end', function(){
			try{
				var js = JSON.parse(body);
				cb(null, js);
			}catch(err){
				cb(true);
			}
		});
	});
	req.once('error', function(err){
		cb(true);
	});
	req.write(post_data);
	req.end();
}

downloadImage = function(url, dest, CB, overwrite)
{
	var overwrite = overwrite?overwrite:false;

	if(!overwrite)
		if(fileExists(dest)){ CB(false); return; }

	var file = FS.createWriteStream(dest);

	var getter = HTTP;
	if(url.indexOf('https:')!=-1) getter = HTTPS;

	getter.get(url, function(response){
		var status = response.statusCode;
		if(status!=200){ CB(false); return; }

		var type = response.headers['content-type'];
		if(type!='image/jpeg' && type!='image/jpg' && type!='image/png'){ CB(false); return; }

		response.pipe(file);
		file.on('finish', function(){
			file.close(CB(true))
		});
	}).on('error', function(err){
		FS.unlink(dest);
		CB(false);
	});
}


downloadImageHTTPS = function(url, dest, CB, overwrite)
{
	var overwrite = overwrite?overwrite:false;

	if(!overwrite)
		if(fileExists(dest)){ CB(false); return; }

	var file = FS.createWriteStream(dest);
	HTTPS.get(url, function(response){
		var status = response.statusCode;
		if(status!=200){ CB(false); return; }

		var type = response.headers['content-type'];
		if(type!='image/jpeg' && type!='image/jpg' && type!='image/png'){ CB(false); return; }

		response.pipe(file);
		file.on('finish', function(){
			file.close(CB(true))
		});
	}).on('error', function(err){
		FS.unlink(dest);
		CB(false);
	});
}

encrypt = function(text){
	if(!text) return false;
	var cipher = CRYPTO.createCipheriv('aes-256-cbc', '089j8124Nj12Bh132136jkBi12421n41', 'laz13px6azn2az5p')
	var crypted = cipher.update(String(text), 'utf8', 'hex')
	crypted += cipher.final('hex');
	return crypted;
}

decrypt = function(text){
	if(!text) return false;
	var decipher = CRYPTO.createDecipheriv('aes-256-cbc', '089j8124Nj12Bh132136jkBi12421n41', 'laz13px6azn2az5p')
	var dec = decipher.update(String(text),'hex','utf8')
	dec += decipher.final('utf8');
	return dec;
}

convert_accented_characters = function(str)
{
	entities = new ENTITIES();
	str = entities.decode(str);

	for(var i = 0, len = foreign_chars.length; i < len; i++){
		str = str.replace(new RegExp(foreign_chars[i].from, 'g'), foreign_chars[i].to);
	}
	return str;
}

url_title = function(str)
{
	str = convert_accented_characters(str);

	var trans = new Array(
		{from: /[.+?;!@#$%^*()\[\]{}:,~`\\\'\\|"‘’<>=…]/g, to: ''},
		{from: /[&]/g, to: ' and '},
		{from: /[\/]/g, to: ' '},
		{from: /\s\s+/g, to: ' '},
		{from: /\s/g, to: '-'},
		{from: /\-\-+/g, to: '-'}
	);

	var possible_marks = [
		'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
		'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z',
		'x', 'c', 'v', 'b', 'n', 'm', 'Q', 'W', 'E', 'R',
		'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F',
		'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B',
		'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7',
		'8', '9', '-'
	]

	for(var i = 0, len = trans.length; i < len; i++){
		str = str.trim();
		str = str.replace(new RegExp(trans[i].from, 'g'), trans[i].to);
	}

	for(var i = 0; i < str.length; i++){
		if(possible_marks.indexOf(str[i])==-1){
			str = str.replace(new RegExp(str[i], 'g'), '');
		}
	}

	return str.toLowerCase().trim();
}

desc_to_keywords = function(desc)
{
	desc = desc.trim();
	desc = desc.replace(new RegExp(/[+?;!@#$%^*()\[\]{}:,~`\\\'\\|"‘’<>=…]/g, 'g'), '');

	var possible_marks = [
		'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
		'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z',
		'x', 'c', 'v', 'b', 'n', 'm', 'Q', 'W', 'E', 'R',
		'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F',
		'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B',
		'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7',
		'8', '9', 'ę', 'ó', 'ą', 'ś', 'ł', 'ż', 'ź', 'ć',
		'ń', 'Ę', 'Ó', 'Ą', 'Ś', 'Ł', 'Ż', 'Ź', 'Ć', 'Ń',
		' ', '.',
	]

	for(var i = 0; i < desc.length; i++){
		if(possible_marks.indexOf(desc[i])==-1){
			desc = desc.replace(new RegExp(desc[i], 'g'), '');
		}
	}

	var arr = desc.split(' ');
	var keys = [];

	for(var i = 0, len = arr.length; i < len; i++){
		if(arr[i].length>3){
			var val = arr[i].toLowerCase();
			if(val[0]=='.') val = val.substr(1);
			var index = val.length-1;
			if(val[index]=='.') val = val.substr(0, index)+val.substr(index + 1);

			if(val.length>3)
				keys.push(val);
		}
	}
	return keys;
}

RESTRICTED_COUNTRIES = [
	'TH', 'NZ', 'AU', 'SG', 'JP',
	'KR', 'KP', 'CN', 'TW', 'IN',
	'BE', 'BR', 'MX', 'SA', 'US',
	'UM',
]

CRAWLER_LIST = [
	'aspseek', 'abachobot', 'accoona',
	'acoirobot', 'adsbot', 'alexa',
	'alta', 'vista', 'altavista',
	'ask jeeves', 'baidu', 'crawler',
	'croccrawler', 'dumbot', 'estyle',
	'exabot', 'fast-enterprise', 'fast-webcrawler',
	'francis', 'geonabot', 'gigabot',
	'google', 'heise', 'heritrix',
	'ibm', 'iccrawler', 'idbot',
	'ichiro', 'lycos', 'msn',
	'msrbot', 'majestic-12', 'metager',
	'ng-search', 'nutch', 'omniexplorer',
	'psbot', 'rambler', 'seosearch',
	'scooter', 'scrubby', 'seekport',
	'sensis', 'seoma', 'snappy',
	'steeler', 'synoo', 'telekom',
	'turnitinbot', 'voyager', 'wisenut',
	'yacy', 'yahoo', 'Facebot',
	'facebot', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
	'facebookexternalhit/1.1', 'freesitemapgenerator', 'googlebot',
	'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'bot', 'yandexbot', 'facebookexternalhit/1.0', 'facebookexternalhit/1.0 (+http://www.facebook.com/externalhit_uatext.php)',
	'ia_archiver', 
]

invisible_ip_list = [
	//'78.88.5.134'
]

var foreign_chars = new Array(
	{from: /ä|æ|ǽ/g, to: 'ae'},
	{from: /ö|œ/g, to: 'oe'},
	{from: /ü/g, to: 'ue'},
	{from: /Ä/g, to: 'Ae'},
	{from: /Ü/g, to: 'Ue'},
	{from: /Ö/g, to: 'Oe'},
	{from: /À|Á|Â|Ã|Ä|Å|Ǻ|Ā|Ă|Ą|Ǎ|Α|Ά|Ả|Ạ|Ầ|Ẫ|Ẩ|Ậ|Ằ|Ắ|Ẵ|Ẳ|Ặ|А/g, to: 'A'},
	{from: /à|á|â|ã|å|ǻ|ā|ă|ą|ǎ|ª|α|ά|ả|ạ|ầ|ấ|ẫ|ẩ|ậ|ằ|ắ|ẵ|ẳ|ặ|а/g, to: 'a'},
	{from: /Б/g, to: 'B'},
	{from: /б/g, to: 'b'},
	{from: /Ç|Ć|Ĉ|Ċ|Č/g, to: 'C'},
	{from: /ç|ć|ĉ|ċ|č/g, to: 'c'},
	{from: /Д/g, to: 'D'},
	{from: /д/g, to: 'd'},
	{from: /Ð|Ď|Đ|Δ/g, to: 'Dj'},
	{from: /ð|ď|đ|δ/g, to: 'dj'},
	{from: /È|É|Ê|Ë|Ē|Ĕ|Ė|Ę|Ě|Ε|Έ|Ẽ|Ẻ|Ẹ|Ề|Ế|Ễ|Ể|Ệ|Е|Э/g, to: 'E'},
	{from: /è|é|ê|ë|ē|ĕ|ė|ę|ě|έ|ε|ẽ|ẻ|ẹ|ề|ế|ễ|ể|ệ|е|э/g, to: 'e'},
	{from: /Ф/g, to: 'F'},
	{from: /ф/g, to: 'f'},
	{from: /Ĝ|Ğ|Ġ|Ģ|Γ|Г|Ґ/g, to: 'G'},
	{from: /ĝ|ğ|ġ|ģ|γ|г|ґ/g, to: 'g'},
	{from: /Ĥ|Ħ/g, to: 'H'},
	{from: /ĥ|ħ/g, to: 'h'},
	{from: /Ì|Í|Î|Ï|Ĩ|Ī|Ĭ|Ǐ|Į|İ|Η|Ή|Ί|Ι|Ϊ|Ỉ|Ị|И|Ы/g, to: 'I'},
	{from: /ì|í|î|ï|ĩ|ī|ĭ|ǐ|į|ı|η|ή|ί|ι|ϊ|ỉ|ị|и|ы|ї/g, to: 'i'},
	{from: /Ĵ/g, to: 'J'},
	{from: /ĵ/g, to: 'j'},
	{from: /Ķ|Κ|К/g, to: 'K'},
	{from: /ķ|κ|к/g, to: 'k'},
	{from: /Ĺ|Ļ|Ľ|Ŀ|Ł|Λ|Л/g, to: 'L'},
	{from: /ĺ|ļ|ľ|ŀ|ł|λ|л/g, to: 'l'},
	{from: /М/g, to: 'M'},
	{from: /м/g, to: 'm'},
	{from: /Ñ|Ń|Ņ|Ň|Ν|Н/g, to: 'N'},
	{from: /ñ|ń|ņ|ň|ŉ|ν|н/g, to: 'n'},
	{from: /Ò|Ó|Ô|Õ|Ō|Ŏ|Ǒ|Ő|Ơ|Ø|Ǿ|Ο|Ό|Ω|Ώ|Ỏ|Ọ|Ồ|Ố|Ỗ|Ổ|Ộ|Ờ|Ớ|Ỡ|Ở|Ợ|О/g, to: 'O'},
	{from: /ò|ó|ô|õ|ō|ŏ|ǒ|ő|ơ|ø|ǿ|º|ο|ό|ω|ώ|ỏ|ọ|ồ|ố|ỗ|ổ|ộ|ờ|ớ|ỡ|ở|ợ|о/g, to: 'o'},
	{from: /П/g, to: 'P'},
	{from: /п/g, to: 'p'},
	{from: /Ŕ|Ŗ|Ř|Ρ|Р/g, to: 'R'},
	{from: /ŕ|ŗ|ř|ρ|р/g, to: 'r'},
	{from: /Ś|Ŝ|Ş|Ș|Š|Σ|С/g, to: 'S'},
	{from: /ś|ŝ|ş|ș|š|ſ|σ|ς|с/g, to: 's'},
	{from: /Ț|Ţ|Ť|Ŧ|τ|Т/g, to: 'T'},
	{from: /ț|ţ|ť|ŧ|т/g, to: 't'},
	{from: /Ù|Ú|Û|Ũ|Ū|Ŭ|Ů|Ű|Ų|Ư|Ǔ|Ǖ|Ǘ|Ǚ|Ǜ|Ũ|Ủ|Ụ|Ừ|Ứ|Ữ|Ử|Ự|У/g, to: 'U'},
	{from: /ù|ú|û|ũ|ū|ŭ|ů|ű|ų|ư|ǔ|ǖ|ǘ|ǚ|ǜ|υ|ύ|ϋ|ủ|ụ|ừ|ứ|ữ|ử|ự|у/g, to: 'u'},
	{from: /Ý|Ÿ|Ŷ|Υ|Ύ|Ϋ|Ỳ|Ỹ|Ỷ|Ỵ|Й/g, to: 'Y'},
	{from: /ý|ÿ|ŷ|ỳ|ỹ|ỷ|ỵ|й/g, to: 'y'},
	{from: /В/g, to: 'V'},
	{from: /в/g, to: 'v'},
	{from: /Ŵ/g, to: 'W'},
	{from: /ŵ/g, to: 'w'},
	{from: /Ź|Ż|Ž|Ζ|З/g, to: 'Z'},
	{from: /ź|ż|ž|ζ|з/g, to: 'z'},
	{from: /Æ|Ǽ/g, to: 'AE'},
	{from: /ß/g, to: 'ss'},
	{from: /Ĳ/g, to: 'IJ'},
	{from: /ĳ/g, to: 'ij'},
	{from: /Œ/g, to: 'OE'},
	{from: /ƒ/g, to: 'f'},
	{from: /ξ/g, to: 'ks'},
	{from: /π/g, to: 'p'},
	{from: /β/g, to: 'v'},
	{from: /μ/g, to: 'm'},
	{from: /ψ/g, to: 'ps'},
	{from: /Ё/g, to: 'Yo'},
	{from: /ё/g, to: 'yo'},
	{from: /Є/g, to: 'Ye'},
	{from: /є/g, to: 'ye'},
	{from: /Ї/g, to: 'Yi'},
	{from: /Ж/g, to: 'Zh'},
	{from: /ж/g, to: 'zh'},
	{from: /Х/g, to: 'Kh'},
	{from: /х/g, to: 'kh'},
	{from: /Ц/g, to: 'Ts'},
	{from: /ц/g, to: 'ts'},
	{from: /Ч/g, to: 'Ch'},
	{from: /ч/g, to: 'ch'},
	{from: /Ш/g, to: 'Sh'},
	{from: /ш/g, to: 'sh'},
	{from: /Щ/g, to: 'Shch'},
	{from: /щ/g, to: 'shch'},
	{from: /Ъ|ъ|Ь|ь/g, to: ''},
	{from: /Ю/g, to: 'Yu'},
	{from: /ю/g, to: 'yu'},
	{from: /Я/g, to: 'Ya'},
	{from: /я/g, to: 'ya'}
);

COMMENTS_BLACKLIST = [
	'http', '.pl', '.com',
	'.tv', '.xyz', '.index',
	'tutaj', 'alltube', 'online',
	'free', 'darmo', 'zalukaj',
	'limit', 'premium', 'link', 
	'href', 'www.', '://', 
	'filmanteria', '.io', 'lepszej',
	'release', 'movie', 'film',
	'serial', 'star', '.org',
	'.net', '.xxx', 'tutaj',
]

usernameBlackList = [ 'about',
	'access', 'account', 'accounts', 'add', 'address', 'adm',
	'admin', 'administration', 'adult', 'advertising', 'affiliate', 'affiliates',
	'ajax', 'analytics', 'android', 'anon', 'anonymous', 'api', 'app',
	'apps', 'archive', 'atom', 'auth', 'authentication', 'avatar',
	'backup', 'banner', 'banners', 'bin', 'billing', 'blog',
	'blogs', 'board', 'bot', 'bots', 'business', 'chat',
	'cache', 'cadastro', 'calendar', 'campaign', 'careers', 'cgi',
	'client', 'cliente', 'code', 'comercial', 'compare', 'config',
	'connect', 'contact', 'contest', 'create', 'code', 'compras',
	'css', 'dashboard', 'data', 'db', 'design', 'delete',
	'demo', 'design', 'designer', 'dev', 'devel', 'dir',
	'directory', 'doc', 'docs', 'domain', 'download', 'downloads',
	'edit', 'editor', 'email', 'ecommerce', 'forum', 'forums',
	'faq', 'favorite', 'feed', 'feedback', 'flog', 'follow',
	'file', 'files', 'free', 'ftp', 'gadget', 'gadgets',
	'games', 'guest', 'group', 'groups', 'help', 'home',
	'homepage', 'host', 'hosting', 'hostname', 'html', 'http',
	'httpd', 'https', 'hpg', 'info', 'information', 'image',
	'img', 'images', 'imap', 'index', 'invite', 'intranet',
	'indice', 'ipad', 'iphone', 'irc', 'java', 'javascript',
	'job', 'jobs', 'js', 'knowledgebase', 'log', 'login',
	'logs', 'logout', 'list', 'lists', 'mail', 'mail1',
	'mail2', 'mail3', 'mail4', 'mail5', 'mailer', 'mailing',
	'mx', 'manager', 'marketing', 'master', 'me', 'media',
	'message', 'microblog', 'microblogs', 'mine',
	'mp3', 'msg', 'msn', 'mysql', 'messenger', 'mob',
	'mobile', 'movie', 'movies', 'music', 'musicas',
	'name', 'named', 'net', 'network', 'new', 'news',
	'newsletter', 'nick', 'nickname', 'notes', 'noticias',
	'ns', 'ns1', 'ns2', 'ns3', 'ns4', 'old', 'online', 'operator', 'offline',
	'order', 'orders', 'page', 'pager', 'pages', 'panel', 'password',
	'perl', 'pic', 'pics', 'photo', 'photos', 'photoalbum',
	'php', 'plugin', 'plugins', 'pop', 'pop3', 'post',
	'postmaster', 'postfix', 'posts', 'profile', 'project',
	'projects', 'promo', 'pub', 'public', 'python', 'random',
	'register', 'registration', 'root', 'ruby', 'rss',
	'sale', 'sales', 'sample', 'samples', 'script', 'scripts',
	'secure', 'send', 'service', 'shop', 'sql', 'signup',
	'signin', 'search', 'security', 'settings', 'setting',
	'setup', 'site', 'sites', 'sitemap', 'smtp', 'soporte',
	'ssh', 'stage', 'staging', 'start', 'subscribe', 'subdomain',
	'suporte', 'support', 'stat', 'static', 'stats', 'status',
	'store', 'stores', 'system', 'tablet', 'tablets', 'tech',
	'telnet', 'test', 'test1', 'test2', 'test3', 'teste',
	'tests', 'theme', 'themes', 'tmp', 'todo', 'task', 'tasks',
	'tools', 'tv', 'talk', 'update', 'upload', 'url', 'user',
	'username', 'usuario', 'usage', 'vendas', 'video', 'videos',
	'visitor', 'win', 'ww', 'www', 'www1', 'www2', 'www3', 'www4',
	'www5', 'www6', 'www7', 'wwww', 'wws', 'wwws', 'web', 'webmail',
	'website', 'websites', 'webmaster', 'workshop', 'xxx', 'xpg', 'you',
	'yourname', 'yourusername', 'yoursite', 'yourdomain' ]

VIDEO_GENRES_LIST = [
	'ciekawostki',
	'dzieci',
	'extremalne',
	'gadżety',
	'gry',
	'iluzje i sztuczki',
	'jedzenie i gotowanie',
	'kompilacje',
	'kreskówki',
	'motoryzacja',
	'muzyka',
	'na drodze',
	'nauka i technika',
	'niesamowite',
	'polityczne',
	'poradniki',
	'prank',
	'rosja',
	'sport',
	'studenci',
	'śmieszne',
	'talent',
	'trailery',
	'w pracy',
	'w telewizji',
	'wypadki',
	'vlog',
	'zwierzęta',
]


GENRES_LIST = [
	'akcja',
	'animacja',
	'anime',
	'baśń',
	'biblijny',
	'biograficzny',
	'czarna komedia',
	'dla dzieci',
	'dla młodzieży',
	'dokumentalizowany',
	'dokumentalny',
	'dramat',
	'dramat historyczny',
	'dramat obyczajowy',
	'dramat sądowy',
	'dramat społeczny',
	'dreszczowiec',
	'edukacyjny',
	'erotyczny',
	'etiuda',
	'fabularyzowany dok.',
	'familijny',
	'fantasy',
	'fikcja literacka',
	'film-noir',
	'gangsterski',
	'groteska filmowa',
	'historyczny',
	'horror',
	'karate',
	'katastroficzny',
	'komedia',
	'komedia dokumentalna',
	'komedia kryminalna',
	'komedia obycz.',
	'komedia rom.',
	'kostiumowy',
	'krótkometrażowy',
	'kryminał',
	'melodramat',
	'musical',
	'muzyczny',
	'niemy',
	'nowele filmowe',
	'obyczajowy',
	'poetycki',
	'polityczny',
	'prawniczy',
	'propagandowy',
	'przygodowy',
	'przyrodniczy',
	'psychologiczny',
	'płaszcza i szpady',
	'religijny',
	'romans',
	'satyra',
	'sci-fi',
	'sensacyjny',
	'sportowy',
	'surrealistyczny',
	'szpiegowski',
	'sztuki walki',
	'thriller',
	'western',
	'wojenny'
]


PREMIUM_TRANSFER_COST_TO_TIME = {
	'2.99' : 3,
	'4.99' : 5,
	'8.99' : 15,
	'14.99' : 30,
	'26.99' : 60,
	'34.99' : 90,
	'39.99' : 100,
}

PREMIUM_DIRECT_BILLING_COST_TO_TIME = {
	'6.15' : 3,
	'17.22' : 15,
	'30.76' : 30,
	'55.35' : 60,
}

PREMIUM_SMS_NUMBER_TO_TIME = {
	'7555' : 3,
	'91455' : 15,
	'92555' : 30,
}

VIDEO_TYPES_LIST = [
	['POLSKI', 'Polski'],
	['DUBBING', 'Dubbing PL'],
	['LEKTOR_PL', 'Lektor PL'],
	['LEKTOR_AMATOR', 'Lektor amatorski'],
	['NAPISY_PL', 'Napisy PL'],
	['NAPISY_ENG', 'Napisy ENG'],
	['ENG', 'ENG'],
	['OTHER', 'Inna']
]

VIDEO_TYPES_LIST_ASSOCIATE = {
	'POLSKI': 'Polski',
	'DUBBING': 'Dubbing PL',
	'LEKTOR_PL': 'Lektor PL',
	'LEKTOR_AMATOR': 'Lektor amatorski',
	'NAPISY_PL': 'Napisy PL',
	'NAPISY_ENG': 'Napisy ENG',
	'ENG': 'ENG',
	'OTHER': 'Inna'
}

VIDEO_QUALITY_LIST = [
	['VERY_HIGHT', 'Bardzo wysoka / 1080p'],
	['HIGH', 'Wysoka / 720p'],
	['MID', 'Średnia / 480p'],
	['LOW', 'Niska / 360p']
]

VIDEO_QUALITY_ASSOCIATE = {
	'VERY_HIGHT': 'Bardzo wysoka / 1080p',
	'HIGH': 'Wysoka / 720p',
	'MID': 'Średnia / 480p',
	'LOW': 'Niska / 360p',
}

REPORT_TYPES_LIST = {
	'DELETED': 'Link został usunięty',
	'BAD_TYPE': 'Błędna wersja językowa',
	'BAD_QUALITY': 'Błędna jakość wideo',
	'BAD_MOVIE_SERIES': 'Nie ten film, serial, odcinek',
	'OTHER': 'Inny powód (podaj jaki)'
}


REPORT_TYPES_LIST_EPISODE = {
	'BAD_TITLE': 'Błędna nazwa odcinka',
	'BAD_EPISODE': 'Nie ten odcinek',
	'OTHER': 'Inny powód (podaj jaki)'
}

ONLY_PREMIUM_HOSTS = [
	'rapidvideo',
	'premium',
];

PREMIUM_NO_ADS = [
	'premium',
]

PREMIUM_NO_BAD_ADS = [
	'cda',
	'youtube'
]

VIDEO_HOSTING_LIST = [
	{
		name: 'verystream',
		host: 'verystream.com',
		embed_code: 'https://verystream.com/e/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='stream' || arr[1]=='e')){
				if(arr[2] && arr[2].length>0) return arr[2];
				else return false;
			}else return false;
		}
	},
	{
		name: 'openload',
		host: 'openload.co',
		embed_code: 'https://oload.tv/embed/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='f' || arr[1]=='embed')){
				if(arr[2] && arr[2].length>0) return arr[2];
				else return false;
			}else return false;
		}
	},
	{
		name: 'streamango',
		host: 'streamango.com',
		embed_code: 'https://streamango.com/embed/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='f' || arr[1]=='embed')){
				if(arr[2] && arr[2].length>0) return arr[2];
				else return false;
			}else return false;
		}
	},
	{
		name: 'streamcherry',
		host: 'streamcherry.com',
		embed_code: 'https://streamcherry.com/embed/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='f' || arr[1]=='embed')){
				if(arr[2] && arr[2].length>0) return arr[2];
				else return false;
			}else return false;
		}
	},
	{
		name: 'rapidvideo',
		host: 'rapidvid.to',
		embed_code: 'https://rapidvid.to/embed/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='e' || arr[1]=='embed' || arr[1]=='v')){
				if(arr[2] && arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}else return false;
			}else{
				var query = parsed.query;
				if(query && query.length==0) return false;
				var p = QUERYSTRING.parse(query)
				if(p && p.length==0) return false;
				if(p.v && p.v.length>0){
					if(/[^a-zA-Z0-9_-]/.test(p.v)) return false;
					else return p.v;
				}
				else return false;
			}
		}
	},
	{
		name: 'rapidvideo',
		host: 'rapidvideo.com',
		embed_code: 'https://rapidvid.to/embed/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1] && (arr[1]=='e' || arr[1]=='embed' || arr[1]=='v')){
				if(arr[2] && arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}else return false;
			}else{
				var query = parsed.query;
				if(query && query.length==0) return false;
				var p = QUERYSTRING.parse(query)
				if(p && p.length==0) return false;
				if(p.v && p.v.length>0){
					if(/[^a-zA-Z0-9_-]/.test(p.v)) return false;
					else return p.v;
				}
				else return false;
			}
		}
	},
	{
		name: 'vidoza',
		host: 'vidoza.net',
		embed_code: 'https://vidoza.net/embed-#ID.html', 
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]==undefined) return false;

			var arr2 = arr[1].split('-');
			if(arr2.length>1){
				if(arr2[1]!=undefined && arr2[1].length>0){ return arr2[1].replace('.html', ''); }
				else return false;
			}else if(arr2.length==1){
				if(arr2[0]!=undefined && arr2[0].length>0){ return arr2[0].replace('.html', ''); }
				else return false;
			}else return false;
		}
	},
	{
		name: 'gounlimited',
		host: 'gounlimited.to',
		embed_code: 'https://gounlimited.to/embed-#ID.html', 
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]==undefined) return false;

			var arr2 = arr[1].split('-');
			if(arr2.length>1){
				if(arr2[1]!=undefined && arr2[1].length>0){ return arr2[1].replace('.html', ''); }
				else return false;
			}else if(arr2.length==1){
				if(arr2[0]!=undefined && arr2[0].length>0){ return arr2[0]; }
				else return false;
			}else return false;
		}
	},
/*	{
		name: 'clipwatching',
		host: 'clipwatching.com',
		embed_code: 'https://clipwatching.com/embed-#ID.html', 
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]==undefined) return false;

			var arr2 = arr[1].split('-');
			if(arr2.length>1){
				if(arr2[1]!=undefined && arr2[1].length>0){ return arr2[1].replace('.html', ''); }
				else return false;
			}else if(arr2.length==1){
				if(arr2[0]!=undefined && arr2[0].length>0){ return arr2[0]; }
				else return false;
			}else return false;
		}
	},*/
	{
		name: 'cda',
		host: 'cda.pl',
		embed_code: 'https://ebd.cda.pl/#WIDTHx#HEIGHT/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]!=undefined && arr[1]=='video'){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else if(arr[1]!=undefined && arr[1].indexOf('x')!=-1){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else return false;
		}
	},
	{
		name: 'cda',
		host: 'www.cda.pl',
		embed_code: 'https://ebd.cda.pl/#WIDTHx#HEIGHT/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]!=undefined && arr[1]=='video'){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else if(arr[1]!=undefined && arr[1].indexOf('x')!=-1){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else return false;
		}
	},
	{
		name: 'cda',
		host: 'ebd.cda.pl',
		embed_code: 'https://ebd.cda.pl/#WIDTHx#HEIGHT/#ID',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;

			if(arr[1]!=undefined && arr[1]=='video'){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else if(arr[1]!=undefined && arr[1].indexOf('x')!=-1){
				if(arr[2].length>0){
					if(/[^a-zA-Z0-9_-]/.test(arr[2])) return false;
					else return arr[2];
				}
				else return false;
			}else return false;
		}
	},
	{
		name: 'youtube',
		host: 'www.youtube.com',
		embed_code: 'https://www.youtube.com/embed/#ID?iv_load_policy=3&modestbranding=0&rel=0&showinfo=0',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			if(pathname!='/watch') return false;

			var query = parsed.query;
			if(query && query.length==0) return false;

			var queryArr = query.split('=');
			if(queryArr.length<=1) return false;
			if(queryArr[0]!='v') return false;
			if(queryArr[1].length>0){
				if(queryArr[1].indexOf('&')!=-1){
					return queryArr[1].substring(0, queryArr[1].indexOf('&'));
				}
				return queryArr[1];
			}
			else return false;
		}
	},
	{
		name: 'youtube',
		host: 'youtu.be',
		embed_code: 'https://www.youtube.com/embed/#ID?iv_load_policy=3&modestbranding=0&rel=0&showinfo=0',
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[1]!=undefined && arr[1].length>0) return arr[1];
			else return false;
		}
	},
	{
		name: 'premium',
		host: 'zgdat01.fili.cc',
		embed_code: 'https://zgdat01.fili.cc/e/#ID',
		premium: true,
		getID: function(url){
			var parsed = URL.parse(url);
			var pathname = parsed.pathname;
			var arr = pathname.split('/');
			if(arr.length==0) return false;
			if(arr[2]!=undefined && arr[2].length>0) return arr[2];
			else return false;
		}
	},
]