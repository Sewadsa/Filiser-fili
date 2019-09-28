var MAIN = {}
var FORM = {};

MAIN.mobileMenuOpened = false;

FORM.gElement = null;
MAIN.commentCaptchaObj = null;
MAIN.loginCaptchaObj = null;
MAIN.registerCaptchaObj = null;

MAIN.cropper = null;

// MAIN 
MAIN.init = function()
{
	MAIN.listeners();
	MAIN.modalEnabled();
	MAIN.initCropper();

	//$('#links ul').first().find('.line').first().find("#watchBtn").click();

	var contentHeightCanSee = $(window).height()-204;
	$('.box').css({'min-height': (contentHeightCanSee)+'px'});

	MAIN.episodesList('NORM');
	//MAIN.sliderInit();

}

MAIN.listeners = function()
{
	var doc = $('body');

	// MOBILE
	doc.on('click', '#header #hamburger-menu', function(){
		if(MAIN.mobileMenuOpened) return;
		MAIN.mobileMenuOpened = true;
		$('#header #menu-bg').addClass('active');
		$('#header #menu').addClass('active');
	});

	window.addEventListener('scroll', function(){
		if(!MAIN.mobileMenuOpened) return;
		
		$('#header #menu-bg').removeClass('active');
		$('#header #menu').removeClass('active');
		MAIN.mobileMenuOpened = false;
	});
	doc.on('click', '#menu-bg', function(){
		if(!MAIN.mobileMenuOpened) return;
		
		$('#header #menu-bg').removeClass('active');
		$('#header #menu').removeClass('active');
		MAIN.mobileMenuOpened = false;
	});


	// DESKTOP

	doc.on('click', '#modalBG', function(e){ if(e.target.id=='modalBG') MODAL.close(function(){}); });

	doc.on('click', '.loginBtn', function(){ MODAL.new('login'); }); // LOGIN BOX
	doc.on('click', '.registerBtn', function(){ MODAL.new('register'); }); // REGISTER BOX
	doc.on('click', '.remindBtn', function(){ MODAL.new('remind'); }); // REMIND BOX
	doc.on('click', '.addMovieSeriesBtn', function(){ MODAL.new('add_movie_series_step_0'); }); // ADD MOVIE SERIES BOX
	doc.on('click', '.addLinkBtn', function(){ MODAL.new('add_link', $(this)); }); // ADD MOVIE LINK BOX
	doc.on('click', '.addLinkEpisodeBtn', function(){ MODAL.new('add_link_episode', $(this)); }); // ADD SERIES LINK BOX

	doc.on('submit', '#createUserForm', FORM.createUser); // CREATE USER
	doc.on('submit', '#loginUserForm', FORM.loginUser); // LOGIN USER
	doc.on('submit', '#remindUserForm', FORM.remindUser); // REMIND USER
	doc.on('submit', '#remindStep2UserForm', FORM.remindUserStep2); // REMIND USER STEP 2
	doc.on('submit', '#addLinksForm', FORM.addLinks); // ADD LINKS
	doc.on('submit', '#addLinksMass', FORM.addLinksMass); // ADD LINKS MASS
	doc.on('submit', '#addLinksEpisodeForm', FORM.addLinksEpisode); // ADD LINKS EPISODE
	doc.on('submit', '#editLinkForm', FORM.editLink); // EDIT LINK
	doc.on('submit', '#reportLinkForm', FORM.reportLink); // REPORT LINK
	doc.on('submit', '#addEpisodeForm', FORM.addEpisode); // ADD EPISODE
	doc.on('submit', '#importFilmwebForm', FORM.addEpisodesFilmweb); // ADD EPISODES FILMWEB

	doc.on('submit', '#editPosterForm', FORM.editPoster); // EDIT POSTER

	doc.on('submit', '#setCodeForm', FORM.setCode); // ADD EPISODES FILMWEB


	doc.on('submit', '#addComment', FORM.addComment); // ADD COMMENT

	doc.on('submit', '#searchForm', FORM.searchForm);

	doc.on('change', '#filmwebEpisodesUrl', MAIN.getEpisodesFilmweb); // GET EPISODES FROM FILMWEB

	

	doc.on('submit', '#reportEpisodeForm', FORM.reportEpisode); // REPORT EPISODE FORM

	doc.on('change', '#add_movie_series .file_input', CROPPER.changeImage); // CHANGE POSTER
	doc.on('change', '#edit_poster_page .file_input', CROPPER.selectImageEdit); // EDIT POSTER
	doc.on('submit', '#addMovieSeriesForm', FORM.addMovieSeries);


	doc.on('submit', '#addVideoForm', FORM.addVideo);

	doc.on('click', '#video_links .l_btn', MAIN.changePageLinks); // CHANGE PAGE LINK BY TYPES
	doc.on('click', '#seasons_list .l_btn', MAIN.changePageEpisodes); // CHANGE PAGE EPISODES BY TYPES
	doc.on('click', '#video_links #watchBtn', MAIN.changeVideoSource); // CHANGE VIDEO SOURCE
	doc.on('click', '#video_links .openLinkInNewTab', MAIN.openLinkInNewTab);  // OPEN IN NEW TAB


	doc.on('click', '#series_page .watchTrailer', MAIN.watchTrailerSeries); // WATCH TRAILERSERIES
	doc.on('click', '#series_page .showPhoto, #movie_page .showPhoto', MAIN.showPhotoSeries); // SHOW PHOTO Series
	doc.on('click', '#movie_page .watchTrailer', MAIN.watchTrailerMovie); // WATCH MOVIE

	
	

/*	doc.on('click', '#popular_series .l_btn', MAIN.changePageHPS); // CHANGE PAGE HPS
	doc.on('click', '#popular_series .showMore', MAIN.showMoreHPS); // SHOW MORE HPS*/

	doc.on('click', '#newSeriesMovies li.selBox', MAIN.changePageHPNSNM); // CHANGE PAGE HPNS i HPNM
	doc.on('click', '#popularMoviesSeries li.selBox', MAIN.changePageHPSE); // CHANGE PAGE HPNS i HPNM

	doc.on('click', '#fav_series_movies li.selBox', MAIN.changePageFavPage);

	doc.on('click', '#popularMoviesSeries #series li.timeBox', MAIN.changeDateHPS);
	doc.on('click', '#popularMoviesSeries #movies li.timeBox', MAIN.changeDateHPM);

	doc.on('focus', '#commentArea', MAIN.genCaptchaComment);


	doc.on('click', '.optBtnsPane li', MAIN.optChange);

	doc.on('mouseover', '#video_page .voteVideo, #movie_page .voteVideo, #episode_page .voteVideo, #series_page .voteVideo', MAIN.voteHover);
	doc.on('mouseout', '#video_page .voteVideo, #movie_page .voteVideo, #episode_page .voteVideo, #series_page .voteVideo', MAIN.voteNotHover);
	doc.on('click', '#video_page .voteVideo, #movie_page .voteVideo, #episode_page .voteVideo, #series_page .voteVideo', MAIN.voteClick);

	
/*
	doc.on('click', '#popular_movies .l_btn', MAIN.changePageHPM); // CHANGE PAGE HPM
	doc.on('click', '#popular_movies .showMore', MAIN.showMoreHPM); // SHOW MORE HPM*/
	

	doc.on('click', '.likeUpCommentBtn', MAIN.voteComment); // VOTE COMMENT UP
	doc.on('click', '.likeDownCommentBtn', MAIN.voteComment); // VOTE COMMENT DOWN

	doc.on('click', '.delLinkBtnMovie', MAIN.delLink); // DEL LINK MOVIE
	doc.on('click', '.delLinkBtnSeries', MAIN.delLink); // DEL LINK Series

	doc.on('click', '.delComment', MAIN.delComment); // DEL comment series/movies

	doc.on('click', '.acceptLinkBtnSeriesMovies', MAIN.acceptLinkBtnSeriesMovies); // ACCEPT LINK SERIES MOVIES

	doc.on('click', '.showComment', MAIN.showComment); // SHOW COMMENT

	doc.on('click', '.editLinkBtnMovie', function(){ MODAL.new('edit_link_movie', $(this)); }); // EDIT LINK MOVIE
	doc.on('click', '.editLinkBtnSeries', function(){ MODAL.new('edit_link_series', $(this)); }); // EDIT LINK MOVIE
	doc.on('click', '.reportLinkBtnMovie', function(){ MODAL.new('report_link_movie', $(this)); }); // REPORT LINK MOVIE
	doc.on('click', '.reportLinkBtnSeries', function(){ MODAL.new('report_link_series', $(this)); }); // REPORT LINK SERIES

	doc.on('click', '.reportEpisodeBtn', function(){ MODAL.new('report_episode', $(this)); }); // REPORT EPISODE


	doc.on('click', '.addEpisodeBtn', function(){ MODAL.new('add_episode', $(this)); }); // ADD EPISODE SERIES


	doc.on('click', '#movies_page .vBox', MAIN.changeTypevBox); // CHANGE TYPE
	doc.on('click', '#movies_page .gBox li', MAIN.changeGenvBox); // CHANGE GENRES
	doc.on('click', '#movies_page .showResults', MAIN.genSortLinkMoviesSeries); // GEN LINK

	

	doc.on('click', '#series_page2 .vBox', MAIN.changeTypevBox); // CHANGE TYPE
	doc.on('click', '#series_page2 .gBox li', MAIN.changeGenvBox); // CHANGE GENRES
	doc.on('click', '#series_page2 .showResults', MAIN.genSortLinkMoviesSeries); // GEN LINK

	doc.on('click', '#videos_page .gBox li', MAIN.changeGenvBox); // CHANGE GENRES
	doc.on('click', '#videos_page .showResults', MAIN.genSortLinkVideos); // GEN LINK


	doc.on('click', '#movie_page .editDesc, #series_page .editDesc, #episode_page .editDesc, #video_page .editDesc', MAIN.editDescEnable); // EDIT DESC ENABLE
	doc.on('dblclick', '#movie_page h2.title, #episode_page h2.title, #series_page h2.title', MAIN.editTitleEnable); // EDIT TITLE ENABLE
	doc.on('dblclick', '#movie_page h3.title_org, #episode_page h3.title_org, #series_page h3.title_org', MAIN.editTitleOrgEnable); // EDIT TITLE ORG ENABLE

	doc.on('click', '#movie_page #lockMovieBtn', MAIN.lockMovie); // LOCK MOVIE
	doc.on('click', '#movie_page #delMovieBtn', MAIN.delMovie); // DEL MOVIE
	doc.on('click', '#movie_page #setMoviePremium', MAIN.setMoviePremium);

	doc.on('click', '#series_page #setSeriesPremium', MAIN.setSeriesPremium);


	doc.on('click', '#episode_page #editEpisodeNameBtn', function(){ MODAL.new('edit_name_episode', $(this)); });
	doc.on('submit', '#editNameEpisodeForm', FORM.editNameEpisode); // EDIT LINK
	


	doc.on('click', '.setViewedBtn', MAIN.viewedMovieEpisode); // MANUAL CHANGE VIEWED
	doc.on('click', '#episode_page .setFavBtn, #series_page .setFavBtn', MAIN.favSeriesBtn);
	doc.on('click', '#movie_page .setFavBtn', MAIN.favMovieBtn);
	doc.on('change', '#series_page .checkbox_s', MAIN.viewedEpisodeOnSeriesPage); // MANUAL CHANGE VIEWED ON SERIES PAGE

	doc.on('change', '#user_page .aw_file_input', MAIN.changeAvatar); // CHANGE AVE


	doc.on('keyup', '#searchbox_in', MAIN.searchLive); // SEARCH LIVE ENGINE
	//doc.on('change', '#searchbox_in', MAIN.searchLive); // SEARCH LIVE ENGINE
	
	doc.on('click', function(e){
		if($(e.target).hasClass('bt')) return;
		$('#searchbox .results_box').hide();
		$('#searchbox_in').val('')
	});

	doc.on('click', '#premium_page .select_', MAIN.changeOffer);
	doc.on('change', '#premium_page #checker1', MAIN.changeOfferCheckbox);
	doc.on('click', '#premium_page #submitz', MAIN.paySubmit);

	doc.on('click', '#premium_page .select_directB', MAIN.changeOffer2);
	doc.on('change', '#premium_page #checker2', MAIN.changeOfferCheckbox2);
	doc.on('click', '#premium_page #submitz_directB', MAIN.paySubmit2);

	doc.on('submit', '#premium_page #payMethod2', FORM.premiumSMSCode);
	
	doc.on('click', '#episode_page #lineUp', function(){ MAIN.episodesList('UP') });
	doc.on('click', '#episode_page #lineDown', function(){ MAIN.episodesList('DOWN') });


	doc.on('click', '#movie_page .hidePremiumMessage1, #episode_page .hidePremiumMessage1', MAIN.hidePremiumMessage1);
}

MAIN.movement_index = 0;

MAIN.episodesList = function(stat)
{
	var listE = $('#episodesList li.line');
	var episode_index = 0;
	var episodes_num = listE.length;

	var top_episodes_num = 0;

	if(stat=='NORM'){
		for(var i = 0; i < listE.length; i++){
			if($(listE[i]).hasClass('l_active')){
				episode_index = i;
				break
			}
		}

		MAIN.movement_index = episode_index;
	}else if(stat=='UP'){
		episode_index = MAIN.movement_index;

		if(episode_index-4<6) episode_index = 6;
		else episode_index-=4;
	}else if(stat=='DOWN'){
		episode_index = MAIN.movement_index;

		if(episode_index+4>=(episodes_num-6)) episode_index = episodes_num-6;
		else episode_index+=4;
	}

	var px_minus = 0;

	if(episodes_num<=13){
		if(stat=='NORM') $('#lineUp, #lineDown').css({height: '0px', 'border-bottom': '0px dashed #2e2e2e'});
		else  $('#lineUp, #lineDown').animate({height: '0px', 'border-bottom': '0px dashed #2e2e2e'}, 400, 'swing');
		return;
	}

	if(episode_index>6){
		if(stat=='NORM') $('#lineUp').css({height: '34px', 'border-bottom': '1px dashed #2e2e2e'});
		else  $('#lineUp').animate({height: '34px', 'border-bottom': '1px dashed #2e2e2e'}, 400, 'swing');
	
		px_minus = (episode_index-6)*-35;
	}else{
		if(stat=='NORM') $('#lineUp').css({height: '0px', 'border-bottom': '0px dashed #2e2e2e'});
		else $('#lineUp').animate({height: '0px', 'border-bottom': '0px dashed #2e2e2e'}, 400, 'swing');
		
	}

	if(episode_index<(episodes_num-7)){
		if(stat=='NORM') $('#lineDown').css({height: '34px', 'border-bottom': '1px dashed #2e2e2e'});
		else $('#lineDown').animate({height: '34px', 'border-bottom': '1px dashed #2e2e2e'}, 400, 'swing');
	}else{
		if(stat=='NORM') $('#lineDown').css({height: '0px', 'border-bottom': '0px dashed #2e2e2e'});
		else $('#lineDown').animate({height: '0px', 'border-bottom': '0px dashed #2e2e2e'}, 400, 'swing');
	}

	if(episode_index>=(episodes_num-6)){
		var z = episodes_num-(episode_index+1);
		var times = 6-z;

		px_minus = (times*35)+px_minus;
	}

	if(stat=='NORM'){
		$('#episodesList').css({top: px_minus+'px'});
	}else if(stat=='UP' || stat=='DOWN'){
		$('#episodesList').animate({top: px_minus+'px'}, 400, 'swing');
	}

	if(episode_index-4<6) episode_index = 6;

	if(stat=='NORM' && episode_index<7) episode_index = 7;
	else if(stat=='NORM' && episode_index>=(episodes_num-7)) episode_index = episodes_num-7;

	MAIN.movement_index = episode_index;
}

FORM.premiumSMSCode = function(e)
{
	e.preventDefault();
	var sName = '#payMethod2';
	var obj = $(sName);
	var data = obj.serialize();



	//$('#premium_page #activateBtn').attr('disabled', 'disabled');

	$.post('/premiumSMSCode', data, function(answer){
		$('#premium_page #activateBtn').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ alert(answer.msg) }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR) }
			return;
		}
		alert('Konto pomyślnie doładowane.')
		location.href = '/';
	}).fail(function(){

		alert(LANG.ERROR_OCCURRED_TRY_AGAIN)
	});
}

MAIN.premSELECTED = false;
MAIN.premCHECKED = false;

MAIN.paySubmit = function()
{
	if(!MAIN.premSELECTED || !MAIN.premCHECKED){
		$('#premium_page .select_').attr('disabled', null);
		$('#premium_page .item').removeClass('activeItem');
		$('#premium_page #submitz').attr('value', 'Płacę').attr('disabled', 'disabled');
		MAIN.premSELECTED = false;
		MAIN.premCHECKED = false;
		return;
	}

	$('#premium_page #submitz').attr('disabled', 'disabled');

	var sName = '#payMethod1';
	var obj = $(sName);
	var data = obj.serialize();

	$.post('/createNewPayment', data, function(answer){
		if(answer.error){
			if(answer.code==1){ alert(answer.msg) }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR) }
			return;
		}
		window.location.replace(answer.data.url);
		//$('#payMethod1').submit();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN)
	});
}

MAIN.changeOffer = function(e)
{	
	var el = $(e.target);
	var cost = el.attr('data-cost');
	var cost_wgroszach = parseFloat(cost)*100;
	

	$('#premium_page .select_').attr('disabled', null);
	el.attr('disabled', 'disabled');

	$('#premium_page #payMethod1 .item').removeClass('activeItem');
	el.closest('.item').addClass('activeItem');

	$('#premium_page #payMethod1 input[name="amount"]').attr('value', cost);
	$('#premium_page #submitz').attr('value', 'Płacę ('+cost.replace('.', ',')+'zł)');
	
	MAIN.premSELECTED = true;

	if(MAIN.premSELECTED && MAIN.premCHECKED)
		$('#premium_page #submitz').attr('disabled', null);
}

MAIN.changeOfferCheckbox = function(e)
{
	var val = $(e.target).is(':checked');
	if(val) MAIN.premCHECKED = true;
	else MAIN.premCHECKED = false;

	if(MAIN.premSELECTED && MAIN.premCHECKED)
		$('#premium_page #submitz').attr('disabled', null);
	else
		$('#premium_page #submitz').attr('disabled', 'disabled');

}
















MAIN.premSELECTED_direct = false;
MAIN.premCHECKED_direct = false;

MAIN.paySubmit2 = function()
{
	if(!MAIN.premSELECTED_direct || !MAIN.premCHECKED_direct){
		$('#premium_page .select_').attr('disabled', null);
		$('#premium_page .item').removeClass('activeItem');
		$('#premium_page #submitz_directB').attr('value', 'Płacę').attr('disabled', 'disabled');
		MAIN.premSELECTED_direct = false;
		MAIN.premCHECKED_direct = false;
		return;
	}

	$('#premium_page #submitz_directB').attr('disabled', 'disabled');

	var sName = '#payMethod3';
	var obj = $(sName);
	var data = obj.serialize();

	$.post('/createNewPaymentDirectBilling', data, function(answer){
		if(answer.error){
			if(answer.code==1){ alert(answer.msg) }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR) }
			return;
		}
		window.location.replace(answer.data.url);
		//$('#payMethod1').submit();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN)
	});
}

MAIN.changeOffer2 = function(e)
{	
	var el = $(e.target);
	var cost = el.attr('data-cost');
	var cost_wgroszach = parseFloat(cost)*100;
	

	$('#premium_page .select_directB').attr('disabled', null);
	el.attr('disabled', 'disabled');

	$('#premium_page #payMethod3 .item').removeClass('activeItem');
	el.closest('.item').addClass('activeItem');

	$('#premium_page #payMethod3 input[name="amount"]').attr('value', cost);
	$('#premium_page #submitz_directB').attr('value', 'Płacę ('+cost.replace('.', ',')+'zł)');
	
	MAIN.premSELECTED_direct = true;

	if(MAIN.premSELECTED_direct && MAIN.premCHECKED_direct)
		$('#premium_page #submitz_directB').attr('disabled', null);
}

MAIN.changeOfferCheckbox2 = function(e)
{
	var val = $(e.target).is(':checked');
	if(val) MAIN.premCHECKED_direct = true;
	else MAIN.premCHECKED_direct = false;

	if(MAIN.premSELECTED_direct && MAIN.premCHECKED_direct)
		$('#premium_page #submitz_directB').attr('disabled', null);
	else
		$('#premium_page #submitz_directB').attr('disabled', 'disabled');

}

MAIN.changeTypevBox = function(e)
{
	var elem = $(e.target);
	if(elem.hasClass('fa') || 
	elem.hasClass('text1') ||
	elem.hasClass('text2') ||
	elem.hasClass('text3') ||
	elem.hasClass('text4') ||
	elem.hasClass('text5') ||
	elem.hasClass('text6')){
		elem = elem.parent();
	}

	if(elem.hasClass('vBox_active')) elem.removeClass('vBox_active')
	else elem.addClass('vBox_active');
}

MAIN.changeGenvBox = function(e)
{
	var elem = $(e.target);
	if(elem.hasClass('active')) elem.removeClass('active')
	else elem.addClass('active');
}

MAIN.genSortLinkVideos = function(){
	var e = $('#videos_page');

	var url = location.protocol + '//' + location.host + location.pathname;

	var sortby = MAIN.getQueryVariable('sort_by');
	if(sortby!=false){
		url = MAIN.buildURL(url, 'sort_by', sortby);
	}

	var katQuery = "";
	e.find('.gBox li.active').each(function(){
		var thiz = $(this);
		url = MAIN.buildURL(url, 'kat', thiz.attr('data-gen'));
	});

	window.location.href = encodeURI(url);
}

MAIN.genSortLinkMoviesSeries = function(){
	var e = $('#movies_page, #series_page2');

	var url = location.protocol + '//' + location.host + location.pathname;

	var sortby = MAIN.getQueryVariable('sort_by');
	if(sortby!=false){
		url = MAIN.buildURL(url, 'sort_by', sortby);
	}

	var type = MAIN.getQueryVariable('type');
	if(type!=false){
		url = MAIN.buildURL(url, 'type', type);
	}

	/*var page = MAIN.getQueryVariable('page');
	if(page!=false){
		url = MAIN.buildURL(url, 'page', page);
	}*/

	var versionQuery = "";
	e.find('.vBox.vBox_active').each(function(){
		var thiz = $(this);
		url = MAIN.buildURL(url, 'ver', thiz.attr('data-type'));
	});


	var katQuery = "";
	e.find('.gBox li.active').each(function(){
		var thiz = $(this);
		url = MAIN.buildURL(url, 'kat', thiz.attr('data-gen'));
	});


	var startYear = e.find('input[name="min"]').val();
	var endYear = e.find('input[name="max"]').val();

	if(startYear.length>0)
		url = MAIN.buildURL(url, 'start_year', startYear);

	if(endYear.length>0)
		url = MAIN.buildURL(url, 'end_year', endYear);

	window.location.href = encodeURI(url);

}

MAIN.selectedNUM = -1;
MAIN.searchEngineTimer = null;

MAIN.searchLive = function(e)
{	
	if(e.keyCode==40 || e.keyCode==38){
		var e2 = $('#searchbox .results_box .results li');
		if(e2.length>0)

		var dir = -1;
		if(e.keyCode==40) dir = 1;

		MAIN.selectedNUM += dir;
		if(MAIN.selectedNUM<0) MAIN.selectedNUM = e2.length-1;
		if(MAIN.selectedNUM>(e2.length-1)) MAIN.selectedNUM = 0;

		$('#searchbox .results_box .results li').removeClass('liActive')
		var el = $('#searchbox .results_box .results li').get(MAIN.selectedNUM);
		$(el).addClass('liActive');

	}else if(e.keyCode >= 48 && e.keyCode <= 57 || e.keyCode >= 65 && e.keyCode <= 90 || e.keyCode==8 || e.keyCode==32){
		var q = $(e.target).val();
		var z = $('#searchbox .results_box .results');
		

		if(MAIN.searchEngineTimer)
			clearTimeout(MAIN.searchEngineTimer)

		if(q.length>2){
			MAIN.searchEngineTimer = setTimeout(function(){
				z.empty();
				$('#searchbox .results_box .loader').show();
				$('#searchbox .results_box .no_result').hide();
				$('#searchbox .results_box .results').hide();
				$('#searchbox .results_box').show();
				$.post('/search', {q:q}, function(answer){
					if(answer.error){
						alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
						$('#searchbox .results_box').hide();
						MAIN.selectedNUM = -1;
						return;
					}
					$('#searchbox .results_box .loader').hide();

					if(answer.data.count==0){
						$('#searchbox .results_box .no_result').show();
						return;
					}
					z.append(answer.data.html);
					z.show();

				}).fail(function(){
					$('#searchbox .results_box').hide();
					MAIN.selectedNUM = -1;
					alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
				});
			}, 800)
		}else{
			$('#searchbox .results_box').hide();
			MAIN.selectedNUM = -1;
		}
	}else{
		$('#searchbox .results_box').hide();
		MAIN.selectedNUM = -1;
	}
}

FORM.searchForm = function(e)
{
	e.preventDefault();
	if(MAIN.selectedNUM!=-1){
		var el = $('#searchbox .results_box .results li').get(MAIN.selectedNUM);
		$(el).click();
		return;
	}

	var q = $("#searchbox_in").val();
	document.location = '/szukaj?q='+encodeURI(q);
}

MAIN.viewedEpisodeOnSeriesPage = function(e)
{
	var parent = $(e.target).closest('.line');
	var type = -1;
	
	if($(e.target).prop('checked')) type = 1;

	var code = $('#series_page').attr('data-code');
	var code2 = parent.attr('data-ref');
	$.post('/viewed/movie_episode', {code:code, code2:code2, type:type}, function(answer){
		if(answer.error){
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}



MAIN.favSeriesBtnWorking = false;
MAIN.favSeriesBtn = function(e)
{
	if(MAIN.favSeriesBtnWorking) return;
	MAIN.favSeriesBtnWorking = true;
	var par = $(e.target).closest('.favBtn');
	var type = 1;
	if(par.attr('selected')!=undefined) type = -1;

	par.attr('disabled', 'disabled');

	var code = $('#series_page, #episode_page').attr('data-code');
	setTimeout(function(){
		$.post('/user/fav-series', {code:code, type:type}, function(answer){
			if(answer.error){
				if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
				}else { alert(LANG.NOT_EXPECTED_ERROR) }
				par.attr('disabled', null);
				MAIN.favSeriesBtnWorking = false;
				return;
			}
			if(type==1) par.attr('selected', 'selected');
			else par.attr('selected', null);
			par.attr('disabled', null);
			MAIN.favSeriesBtnWorking = false;
		}).fail(function(){
			par.attr('disabled', null);
			MAIN.favSeriesBtnWorking = false;
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	}, 500);
}

MAIN.favMovieBtnWorking = false;
MAIN.favMovieBtn = function(e)
{
	if(MAIN.favMovieBtnWorking) return;
	MAIN.favMovieBtnWorking = true;
	var par = $(e.target).closest('.favBtn');
	var type = 1;
	if(par.attr('selected')!=undefined) type = -1;

	par.attr('disabled', 'disabled');

	var code = $('#movie_page').attr('data-code');
	setTimeout(function(){
		$.post('/user/fav-movie', {code:code, type:type}, function(answer){
			if(answer.error){
				if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
				}else { alert(LANG.NOT_EXPECTED_ERROR) }
				par.attr('disabled', null);
				MAIN.favMovieBtnWorking = false;
				return;
			}
			if(type==1) par.attr('selected', 'selected');
			else par.attr('selected', null);
			par.attr('disabled', null);
			MAIN.favMovieBtnWorking = false;
		}).fail(function(){
			par.attr('disabled', null);
			MAIN.favMovieBtnWorking = false;
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	}, 500);
}




MAIN.viewedMovieEpisodeWorking = false;
MAIN.viewedMovieEpisode = function(e)
{
	if(MAIN.viewedMovieEpisodeWorking) return;
	MAIN.viewedMovieEpisodeWorking = true;
	var par = $(e.target).closest('.m_btn');
	var type = 1;
	if(par.hasClass('m_btnActive')) type = -1;

	par.attr('disabled', 'disabled');

	var code = $('#movie_page, #episode_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');
	setTimeout(function(){
		$.post('/viewed/movie_episode', {code:code, code2:code2, type:type}, function(answer){
			if(answer.error){
				if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
				}else { alert(LANG.NOT_EXPECTED_ERROR) }
				par.attr('disabled', null);
				MAIN.viewedMovieEpisodeWorking = false;
				return;
			}
			if(type==1) par.addClass('m_btnActive')
			else par.removeClass('m_btnActive')
			par.attr('disabled', null);
			MAIN.viewedMovieEpisodeWorking = false;
		}).fail(function(){
			par.attr('disabled', null);
			MAIN.viewedMovieEpisodeWorking = false;
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	}, 500);
}

MAIN.changePageHPNSNM = function(e)
{
	var name = $(e.target).attr('data-name');
	$('#newSeriesMovies .sectionBox').hide();
	$('#newSeriesMovies #'+name).show();

	$('#newSeriesMovies .selBox').attr('active', null);
	$(e.target).attr('active', true);
}

MAIN.changePageHPSE = function(e)
{
	var name = $(e.target).attr('data-name');
	$('#popularMoviesSeries .sectionBox').hide();
	$('#popularMoviesSeries #'+name).show();

	$('#popularMoviesSeries .selBox').attr('active', null);
	$(e.target).attr('active', true);
}


MAIN.changePageFavPage = function(e)
{
	var name = $(e.target).attr('data-name');
	$('#favMoviesSeries .sectionBox').hide();
	$('#favMoviesSeries #'+name).show();

	$('#favMoviesSeries .selBox').attr('active', null);
	$(e.target).attr('active', true);
}







MAIN.changeDateHPS = function(e)
{
	var name = $(e.target).attr('data-name');
	$('#popularMoviesSeries #series .day').hide();
	$('#popularMoviesSeries #series #'+name).show();

	$('#popularMoviesSeries #series .timeBox').attr('active', null);
	$(e.target).attr('active', true);
}

MAIN.changeDateHPM = function(e)
{
	var name = $(e.target).attr('data-name');
	$('#popularMoviesSeries #movies .day').hide();
	$('#popularMoviesSeries #movies #'+name).show();

	$('#popularMoviesSeries #movies .timeBox').attr('active', null);
	$(e.target).attr('active', true);
}

MAIN.changePageHPS = function(e)
{	
	var elem = e.target.attributes['data-id'];
	if(!elem) return;
	var id = elem.value;

	$('#popular_series .l_btn').removeClass('l_active');
	$('#popular_series .l_btn[data-id="'+id+'"]').addClass('l_active');

	$('#home_page #popular_series #day1, #home_page #popular_series #day7, #home_page #popular_series #day30').hide();
	$('#home_page #popular_series #'+id).show();
	MAIN.HPSShowed = 0;
	$('#home_page #popular_series #day1 .line2, #home_page #popular_series #day7 .line2, #home_page #popular_series #day30 .line2').hide().css('opacity', 0);
	$('#home_page #popular_series #day1 .line3, #home_page #popular_series #day7 .line3, #home_page #popular_series #day30 .line3').hide().css('opacity', 0);
	$('#home_page #popular_series .showMore').show();
	
}

MAIN.HPSShowed = 0;

MAIN.showMoreHPS = function(e)
{	
	if(MAIN.HPSShowed==0){
		$('#home_page #popular_series #day1 .line2, #home_page #popular_series #day7 .line2, #home_page #popular_series #day30 .line2').show().animate({opacity: 1}, 400);
		MAIN.HPSShowed = 1;
	}else if(MAIN.HPSShowed==1){
		$('#home_page #popular_series #day1 .line3, #home_page #popular_series #day7 .line3, #home_page #popular_series #day30 .line3').show().animate({opacity: 1}, 400);
		MAIN.HPSShowed = 2;
		$(e.target).hide();
	}
}

MAIN.changePageHPM = function(e)
{	
	var elem = e.target.attributes['data-id'];
	if(!elem) return;
	var id = elem.value;

	$('#popular_movies .l_btn').removeClass('l_active');
	$('#popular_movies .l_btn[data-id="'+id+'"]').addClass('l_active');

	$('#home_page #popular_movies #day1, #home_page #popular_movies #day7, #home_page #popular_movies #day30').hide();
	$('#home_page #popular_movies #'+id).show();
	MAIN.HPMShowed = 0;
	$('#home_page #popular_movies #day1 .line2, #home_page #popular_movies #day7 .line2, #home_page #popular_movies #day30 .line2').hide().css('opacity', 0);
	$('#home_page #popular_movies #day1 .line3, #home_page #popular_movies #day7 .line3, #home_page #popular_movies #day30 .line3').hide().css('opacity', 0);
	$('#home_page #popular_movies .showMore').show();
	
}

MAIN.HPMShowed = 0;

MAIN.showMoreHPM = function(e)
{	
	if(MAIN.HPMShowed==0){
		$('#home_page #popular_movies #day1 .line2, #home_page #popular_movies #day7 .line2, #home_page #popular_movies #day30 .line2').show().animate({opacity: 1}, 400);
		MAIN.HPMShowed = 1;
	}else if(MAIN.HPMShowed==1){
		$('#home_page #popular_movies #day1 .line3, #home_page #popular_movies #day7 .line3, #home_page #popular_movies #day30 .line3').show().animate({opacity: 1}, 400);
		MAIN.HPMShowed = 2;
		$(e.target).hide();
	}
}

MAIN.changePageLinks = function(e)
{
	var elem = e.target.attributes['data-type'];
	if(!elem) return;
	var type = elem.value;

	$('#video_links .l_btn').removeClass('l_active');
	$('#video_links .l_btn[data-type="'+type+'"]').addClass('l_active');

	$('#links ul').hide();
	$('#links ul[data-type="'+type+'"]').show();
}

MAIN.changePageEpisodes = function(e)
{	
	var elem = e.target.attributes['data-season-num'];
	if(!elem) return;
	var type = elem.value;

	$('#seasons_list .l_btn').removeClass('l_active');
	$('#seasons_list .l_btn[data-season-num="'+type+'"]').addClass('l_active');

	$('#seasons_list ul').hide();
	$('#seasons_list ul[data-season-num="'+type+'"]').show();
}

var firstSelect = false;
MAIN.changeVideoSource = function(e)
{
	$('#player_box').find('.blo').hide();

	$('#video_links .line').removeClass('active');
	$(e.target).parent().parent().parent().addClass('active');

	$('#video_links #watchBtn').html(LANG.WATCH);
	$(e.target).html(LANG.WATCHING);

	var ref = $(e.target).parent().parent().parent().attr('data-ref');
	if(!ref) return;

	var code = $('#movie_page, #episode_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	var type = 'episode';

	if($('#movie_page').length>0) type = 'movie';

	$('#player_box').show();
	$('#under_player').show();
	
	var str = '/embed?type='+type+'&code='+code+'&salt='+ref;
	if(code2) str+='&code2='+code2;

	document.getElementById('iframe').src = encodeURI(str);
}

MAIN.watchTrailerMovie = function(e)
{
	var url = $(e.target).attr('data-url');
	if(!firstSelect){
		firstSelect = true;
		$('#player_box').css('height', '461px');
		var k = $('#under_player');
		k.css('height', '26px');
		k.css('margin-bottom', '20px');
	}
	
	$('#video_links .line').removeClass('active');
	$('#video_links #watchBtn').html(LANG.WATCH);

	document.getElementById('iframe').src = url;
}

MAIN.watchTrailerSeries = function(e)
{
	var url = $(e.target).attr('data-url');

	var e = $('#showcase_box');
	e.empty();
	e.css('height', '461px');
	e.css('margin-top', '25px');
	e.append('<video src="'+url+'" width="820p" height="461" controls autoplay></video>');
}



MAIN.showPhotoSeries = function(e)
{
	var url = $(e.target).attr('data-url');

	var e = $('#showcase_box');
	e.empty();
	e.css('height', '461px');
	e.css('margin-top', '25px');
	e.append('<img src="'+url+'" height="100%" style="margin: 0 auto; display: block;"></img>');
}

MAIN.openLinkInNewTab = function(e)
{
	var ref = $(e.target).parent().parent().attr('data-ref');
	if(!ref) return;

	var code = $('#movie_page, #episode_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	var type = 'episode';
	if($('#movie_page').length>0) type = 'movie';

	var title = $('h2.title').text();
	var title2 = $('h3.title_org').text();

	if(type=='episode'){
		var ttl2 = $('h3.title_org').text();
		title = $('h2.title').text();
		if(ttl2 && ttl2.length>0) title+= ' / '+ttl2;
		title2 = $('h4.episode_title,h4.episode_title2').text()
	}

	window.open(location.origin+'/embed?type='+type+'&code='+code+'&code2='+code2+'&salt='+ref+'&title='+title+'&title2='+title2);
}


MAIN.voteComment = function(e)
{
	var type = 0;
	if($(e.target).hasClass('likeUpCommentBtn')){
		type = 1;
	}
	var line_e = $(e.target).parent().parent().parent();
	var ref = line_e.attr('data-ref');
	var code = $('#movie_page, #episode_page, #video_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	var type2 = 'episode';

	if($('#movie_page').length>0) type2 = 'movie';
	else if($('#video_page').length>0) type2 = 'video';

	$.post('/vote-comment', {type:type, code:code, code2:code2, ref:ref, type2:type2}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		
		line_e.find('.likeUpCommentBtn span.l').html(answer.data.like_up)
		line_e.find('.likeDownCommentBtn span.l').html(answer.data.like_down)
		if(answer.data.my_like==1){
			line_e.find('.likeUpCommentBtn').css('color', '#28aa31')
			line_e.find('.likeDownCommentBtn').css('color', '#959595')
		}else if(answer.data.my_like==0){
			line_e.find('.likeUpCommentBtn').css('color', '#959595')
			line_e.find('.likeDownCommentBtn').css('color', '#e2391d')
		}else{
			line_e.find('.likeUpCommentBtn').css('color', '#959595')
			line_e.find('.likeDownCommentBtn').css('color', '#959595')
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


MAIN.delComment = function(e)
{
	var obj = $(e.target).parent().parent();
	var ref = obj.attr('data-ref');

	$.post('/panel/delete-comment', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==1){
				alert(answer.msg)
				return;
			}else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		obj.remove();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

MAIN.delLink = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	var code = $('#movie_page, #episode_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	if(!code2) code2 = '';

	$.post('/delLink', {ref:ref, code:code, code2:code2}, function(answer){
		if(answer.error){
			if(answer.code==1){
				alert(answer.msg)
				return;
			}else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.remove();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

MAIN.acceptLinkBtnSeriesMovies = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	var code = $('#episode_page, #movie_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	if(!code2) code2 = '';

	$.post('/acceptLinkSeriesMovie', {ref:ref, code:code, code2:code2}, function(answer){
		if(answer.error){
			if(answer.code==1){
				alert(answer.msg)
				return;
			}else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.remove();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}



MAIN.modalEnabled = function()
{
	var e = $("#modalEnabled");
	var name = e.attr('data-name');
	e.remove();
	MODAL.new(name);
}


MAIN.initCropper = function()
{
	if($('#add_movie_series').length>0){

		var image = document.getElementById('image-to-crop');
		if(!image.src || image.src=='') return;
		console.log('PRSZESZLO')
		CROPPER.cropper = new Cropper(image, {
			aspectRatio: 1,
			viewMode: 2,
			minCropBoxWidth: 220,
			minCropBoxHeight: 220,
			preview: '#prev',
			autoCropArea: 1,
		});
	}
}


FORM.editPoster = function(e)
{
	var HTMLCanvasElement = CROPPER.cropper.getCroppedCanvas()
	var dataURL = HTMLCanvasElement.toDataURL('image/jpeg', 1);
	$('#editPosterData').val(dataURL);

	e.preventDefault();
	var sName = '#editPosterForm';
	var obj = $(sName);
	var data = obj.serialize();

	$('#editPosterData').val('');
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.err').html('');

	$.post('/api/edit-poster', data, function(answer){
		if(answer.error){
			obj.find('fieldset').attr('disabled', null);
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		location.href = answer.data;
	}).fail(function(){
		obj.find('fieldset').attr('disabled', null);
		obj.find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});

}

MAIN.showComment = function(e)
{
	$(e.target).parent().hide();
	$(e.target).parent().parent().find('p').show();
}


MAIN.descPrev = '';
MAIN.editDescEnable = function(e)
{
	$('.editDesc').hide();
	var e_desc = $('p#desc');
	var e_descArea = $('#areaDescEdit');
	var val = e_desc.html();
	var height = e_desc.height();
	MAIN.descPrev = val;
	e_desc.hide();
	e_descArea.show();
	e_descArea.val(val);
	e_descArea.css('height', height+'px');
	e_descArea.focus();
}

MAIN.changeAreaDesc  = function(e)
{
	var val = e.value;
	var type = -1;
	if($('#movie_page').length>0){
		type = 0;
		code = $('#movie_page').attr('data-code');
	}else if($('#series_page').length>0){
		type = 1;
		code = $('#series_page').attr('data-code');
	}else if($('#episode_page').length>0){
		type = 2;
		code = $('#episode_page').attr('data-code2');
	}else if($('#video_page').length>0){
		type = 3;
		code = $('#video_page').attr('data-code');
	}else return;

	var e_desc = $('p#desc');
	var e_descArea = $('#areaDescEdit');

	if(MAIN.descPrev==val){
		$('.editDesc').show();
		e_desc.show();
		e_descArea.hide();
		return;
	}

	$.post('/api/change-desc', {code:code, type:type, data:val}, function(answer){
		$('.editDesc').show();
		e_desc.show();
		e_descArea.hide();
		if(answer.error){
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}

		e_desc.html(val);
	}).fail(function(){
		$('.editDesc').show();
		e_desc.show();
		e_descArea.hide();
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


MAIN.lockMovie = function(e)
{
	var conf = confirm('Chcesz zablokować ten film? Zostaną usunięte wszystkie linki, a po 14 dniach film zostanie usunięty.');
	if(!conf) return;

	$(e.target).attr('disabled', 'disabled');

	var code = $('#movie_page').attr('data-code');

	$.post('/api/lock-movie', {code:code}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		location.reload();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		$(e.target).attr('disabled', null);
	});
}

MAIN.delMovie = function(e)
{
	var conf = confirm('Chcesz usunąć ten film? Nie będzie można go przywrócić!');
	if(!conf) return;

	$(e.target).attr('disabled', 'disabled');

	var code = $('#movie_page').attr('data-code');

	$.post('/panel/delete-movie', {ref:code}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		location.reload();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		$(e.target).attr('disabled', null);
	});
}

MAIN.setSeriesPremium  = function(e)
{
	var conf = confirm('Ustawić ten serial jako premium?');
	if(!conf) return;

	$(e.target).attr('disabled', 'disabled');

	var code = $('#series_page').attr('data-code');

	$.post('/panel/set-series-premium', {ref:code}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		location.href = answer.data;
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		$(e.target).attr('disabled', null);
	});
}

MAIN.setMoviePremium = function(e)
{
	var conf = confirm('Ustawić ten film jako premium?');
	if(!conf) return;

	$(e.target).attr('disabled', 'disabled');

	var code = $('#movie_page').attr('data-code');

	$.post('/panel/set-movie-premium', {ref:code}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		location.href = answer.data;
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		$(e.target).attr('disabled', null);
	});
}




MAIN.titlePrevName = '';
MAIN.editTitleEnable = function(e)
{
	var e_title = $('h2.title');
	var e_titleArea = $('#titleEdit');

	if(e_titleArea.length==0) return;

	var val = e_title.html();
	MAIN.titlePrevName = val;
	e_title.hide();
	e_titleArea.show();
	e_titleArea.val(val);
	e_titleArea.focus();
}

MAIN.changeInputTitle = function(e)
{
	var val = e.value;

	var type = 0;
	if($('#series_page').length>0 || $('#episode_page').length>0) type = 1;
	var code = $('#movie_page, #episode_page, #series_page').attr('data-code');
	var e_title = $('h2.title');
	var e_titleArea = $('#titleEdit');


	if(MAIN.titlePrevName==val){
		e_title.show();
		e_titleArea.hide();
		return;
	}

	$.post('/api/change-title', {code:code, type: type, data:val}, function(answer){
		e_title.show();
		e_titleArea.hide();
		if(answer.error){
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}

		e_title.html(val);
		location.reload();
	}).fail(function(){
		e_title.show();
		e_titleArea.hide();
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


MAIN.titleOrgPrevName = '';
MAIN.editTitleOrgEnable = function(e)
{
	var e_title = $('h3.title_org');
	var e_titleArea = $('#titleOrgEdit');

	if(e_titleArea.length==0) return;

	var val = e_title.html();
	MAIN.titleOrgPrevName = val;
	e_title.hide();
	e_titleArea.show();
	e_titleArea.val(val);
	e_titleArea.focus();
}


MAIN.changeInputTitleOrg  = function(e)
{
	var val = e.value;
	
	var type = 0;
	if($('#series_page').length>0 || $('#episode_page').length>0) type = 1;
	var code = $('#movie_page, #episode_page, #series_page').attr('data-code');

	var e_title = $('h3.title_org');
	var e_titleArea = $('#titleOrgEdit');


	if(MAIN.titleOrgPrevName==val){
		e_title.show();
		e_titleArea.hide();
		return;
	}

	$.post('/api/change-title-org', {code:code, type:type, data:val}, function(answer){
		e_title.show();
		e_titleArea.hide();
		if(answer.error){
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}

		e_title.html(val);
	}).fail(function(){
		e_title.show();
		e_titleArea.hide();
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

MAIN.resizeArea = function(e)
{
	e.style.height = "1px";
	e.style.height = (e.scrollHeight)+"px";
}

// FORM

FORM.createUser = function(e)
{
	e.preventDefault();
	var sName = '#createUserForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/create', data, function(answer){
		if(answer.error){
			obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
			obj.find('fieldset').attr('disabled', null);
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			grecaptcha.reset(MAIN.registerCaptchaObj);
			return;
		}
		location.reload();
	}).fail(function(){
		grecaptcha.reset(MAIN.registerCaptchaObj);
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.setCode = function(e)
{
	e.preventDefault();
	var sName = '#setCodeForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	$.post('/user/setCodePremium', data, function(answer){
		if(answer.error){
			if(answer.code==1){ alert(answer.msg) }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { alert(LANG.NOT_EXPECTED_ERROR) }
			return;
		}

		document.location.reload();
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN)
	});
}

FORM.loginUser = function(e)
{
	e.preventDefault();
	var sName = '#loginUserForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/login', data, function(answer){
		if(answer.error){
			obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
			obj.find('fieldset').attr('disabled', null);
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			if(MAIN.loginCaptchaObj!=null) grecaptcha.reset(MAIN.loginCaptchaObj);
			return;
		}

		if(location.pathname.indexOf('aktywacja')!=-1 || location.pathname.indexOf('tansfer')!=-1) document.location.href = '/';
		else if(location.search.indexOf('modal=login')!=-1) document.location.href = '/';
		else location.reload();
		
	}).fail(function(){
		if(MAIN.loginCaptchaObj!=null) grecaptcha.reset(MAIN.loginCaptchaObj);
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.remindUser = function(e)
{
	e.preventDefault();
	var sName = '#remindUserForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/remind', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		$('.form_step').hide();
		$('.succes_step').show();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}



FORM.remindUserStep2 = function(e)
{
	e.preventDefault();
	var sName = '#remindStep2UserForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/remindStep2', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		$('.form_step').hide();
		$('.succes_step').show();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


FORM.addMovieSeries = function(e)
{
	e.preventDefault();
	var sName = '#addMovieSeriesForm';
	var obj = $(sName);

	var HTMLCanvasElement = CROPPER.cropper.getCroppedCanvas();
	var dataURL = HTMLCanvasElement.toDataURL('image/jpeg', 1);

	obj.find('#poster_input').val(dataURL);

	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/add-movie-series', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		document.location = answer.data.redirect;
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


FORM.addVideo = function(e)
{
	e.preventDefault();
	var sName = '#addVideoForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/user/add-video', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		document.location = answer.data.redirect;
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.addLinksMass = function(e)
{
	e.preventDefault();
	var sName = '#addLinksMass';
	var obj = $(sName);
	var data = obj.serialize();

	obj.find('fieldset').attr('disabled', true);
	obj.parent().find('.err').html('');

	$.post('/series/add-links-mass', data, function(answer){
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		var epis = answer.data;

		var k = $('#add_links_mass_page #results')
		k.empty();

		for(var i = 0, len = epis.length; i < len; i++){
			var html = '<li>'
			html+='Odcinek '+epis[i].episode_num;
			if(epis[i].episode_num_alter) html+='-'+epis[i].episode_num_alter;
			
			if(epis[i].added) html+=' Dodany.'
			else{
				html+=' '+epis[i].error
			}

			html+='</li>'
			k.append(html);
		}

		k.show();
		$('#add_links_mass_page #results2').show();

	}).fail(function(){
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.addLinks = function(e)
{
	e.preventDefault();
	var sName = '#addLinksForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');
	obj.parent().find('.confirm').html('');

	$.post('/movie/add-links', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.find('input[name="link"]').val('').focus();
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}

		obj.parent().find('.confirm').html('Link dodany pomyślnie.');
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.addLinksEpisode = function(e)
{
	e.preventDefault();
	var sName = '#addLinksEpisodeForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');
	obj.parent().find('.confirm').html('');

	$.post('/series/add-links', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.find('input[name="link"]').val('').focus();
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}

		obj.parent().find('.confirm').html('Link dodany pomyślnie.');
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.editNameEpisode = function(e)
{
	e.preventDefault();
	var sName = '#editNameEpisodeForm';
	var obj = $(sName);
	var data = obj.serialize();

	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');
	$.post('/edit-name-episode', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		document.location.reload();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.editLink = function(e)
{
	e.preventDefault();
	var sName = '#editLinkForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');
	$.post('/edit-link', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		document.location.reload();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


FORM.reportLink = function(e)
{
	e.preventDefault();
	var sName = '#reportLinkForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/report-link', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		obj.hide();
		$('#report_link_page #result').show();
		setTimeout(function(){
			MODAL.close();
		}, 1400);
		
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}



FORM.addEpisode = function(e)
{
	e.preventDefault();
	var sName = '#addEpisodeForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/series/addEpisode', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		document.location.reload();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


FORM.reportEpisode = function(e)
{
	e.preventDefault();
	var sName = '#reportEpisodeForm';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.parent().find('.err').html('');

	$.post('/series/report-episode', data, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		alert(LANG.SENT_SUCCESSFUL);
		document.location.reload();
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.addComment = function(e)
{
	e.preventDefault();
	var sName = '#addComment';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.find('.err').html('');

	var code = $('#movie_page, #episode_page, #video_page').attr('data-code');
	var code2 = $('#episode_page').attr('data-code2');

	var type = 'episode';

	if($('#movie_page').length>0) type = 'movie';
	else if($('#video_page').length>0) type = 'video';

	$.post('/addComment', data+'&code='+code+'&code2='+code2+'&type='+type, function(answer){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			if(MAIN.commentCaptchaObj!=null) grecaptcha.reset(MAIN.commentCaptchaObj);
			return;
		}
		document.location.reload();
	}).fail(function(){
		if(MAIN.commentCaptchaObj!=null) grecaptcha.reset(MAIN.commentCaptchaObj);
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

MAIN.changeAvatar = function(e)
{
	var file = e.target.files[0];
	if(!file) return;

	var fileTypes = ['jpg', 'jpeg', 'png', 'gif'];
	var file_ext = file.name.split('.').pop().toLowerCase();

	if(fileTypes.indexOf(file_ext)==-1){
		alert(LANG.BAD_FILE_EXTENSION); return;
	}
	
	var file_size = parseInt(file.size/1024);
	if(file_size>1024){
		alert(LANG.FILE_TOO_BIG); return;
	}

	fileReader = new FileReader();
	fileReader.onload = function(){
		var image = new Image();
		image.src = fileReader.result;

		image.onload = function() {
			var width = this.width;
			var height = this.height;

			if(width<200 || height<200){
				alert(LANG.FILE_TOO_SMALL); return;
			}

			$.post('/change-avatar', {data:fileReader.result, ext:file_ext}, function(answer){
				if(answer.error){
					alert(LANG.NOT_EXPECTED_ERROR)
					return;
				}
				$("#user_page .avatar img").attr('src', answer.data);
				$(e.target).val('');
			}).fail(function(){
				alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
			});

		}
	}

	fileReader.readAsDataURL(file);
}

MAIN.sliderTimeout = null;
MAIN.sliderNow = 0;
MAIN.sliderCount = 0;
MAIN.sliderType = 0;
MAIN.sliderInit = function()
{
	var elems = $('#slider .item');
	var count = elems.length;
	MAIN.sliderCount = count;

	var first = elems.eq(0);

	var src = first.attr('data-src');
	var color = first.attr('data-color');

	$('<img/>').attr('src', src).load(function(){
		$(this).remove();

		first.css({'background': color+' url('+src+') center center no-repeat', 'z-index': '0'});
		first.attr('data-active', true);

		if(MAIN.sliderCount>1){
			var html = '<li onclick="MAIN.sliderChange(0);"><div class="active"></div></li>';
			for(var i = 1; i < count; i++) {
				html += '<li onclick="MAIN.sliderChange('+i+');"></li>';
			}

			$('#slider .nav ul').append(html);

			var margin = ((count*21)+(count-1)*9)/2;

			$('#slider .nav').css({'margin-left': -margin+'px'});

			MAIN.sliderTimeout = setTimeout(function(){
				MAIN.sliderNext();
			}, 12000)
			
		}
	});
}

MAIN.sliderChange = function(num)
{
	if(num==MAIN.sliderNow) return;
	clearTimeout(MAIN.sliderTimeout);
	var elems = $('#slider .item');

	var elemPrev = elems.eq(MAIN.sliderNow);
	var numPrev = MAIN.sliderNow;

	MAIN.sliderNow = num;
	if(MAIN.sliderNow>=MAIN.sliderCount || MAIN.sliderNow<0) MAIN.sliderNow = 0;

	var elem = elems.eq(MAIN.sliderNow);

	var src = elem.attr('data-src');
	var color = elem.attr('data-color');

	$('<img/>').attr('src', src).load(function(){
		$(this).remove();

		$('#slider .nav li').eq(numPrev).empty();
		$('#slider .nav li').eq(MAIN.sliderNow).append('<div class="active"></div>');

		elemPrev.css({'z-index': '-1'});
		elemPrev.attr('data-active', false);

		elem.css({'background': color+' url('+src+') center center no-repeat', 'z-index': '0'});
		elem.attr('data-active', true);

		MAIN.sliderTimeout = setTimeout(function(){
			MAIN.sliderNext();
		}, 12000)
	});
}

MAIN.sliderNext = function()
{
	var elems = $('#slider .item');

	var elemPrev = elems.eq(MAIN.sliderNow);
	var numPrev = MAIN.sliderNow;

	MAIN.sliderNow++;
	if(MAIN.sliderNow>=MAIN.sliderCount || MAIN.sliderNow<0) MAIN.sliderNow = 0;

	var elem = elems.eq(MAIN.sliderNow);

	var src = elem.attr('data-src');
	var color = elem.attr('data-color');

	$('<img/>').attr('src', src).load(function(){
		$(this).remove();

		$('#slider .nav li').eq(numPrev).empty();
		$('#slider .nav li').eq(MAIN.sliderNow).append('<div class="active"></div>');

		elemPrev.css({'z-index': '-1'});
		elemPrev.attr('data-active', false);

		elem.css({'background': color+' url('+src+') center center no-repeat', 'z-index': '0'});
		elem.attr('data-active', true);

		MAIN.sliderTimeout = setTimeout(function(){
			MAIN.sliderNext();
		}, 12000)
	});
}

MAIN.rmEpiFilmweb = function(e)
{
	$(e).parent().remove();
}

MAIN.getEpisodesFilmweb = function(e)
{
	var url = $(e.target).val();
	if(url.length<10) return;

	var pad = function(num) {
		var s = num+"";
		while (s.length < 2) s = "0" + s;
		return s;
	}

	$.post('/filmweb/getEpisodes', {url:url}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}else if(answer.code==1){
				alert(answer.msg)
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
			
		console.log(answer)
		var seasons = answer.data;
		if(!seasons || seasons.length==0){ alert('Brak odcinków.'); return; }

		var e_import = $('#import_filmweb_page .imported');

		e_import.empty();

		var html = '';

		for(var i = 0, len = seasons.length; i < len; i++){
			if(seasons[i].length==0) continue;

			seasons[i].sort(function(a, b) { return a.episode_num - b.episode_num });

			html+= '<div class="subTit">Sezon '+(i+1)+'</div>';

			html+= '<ul>';

			for(var j = 0, len2 = seasons[i].length; j < len2; j++){
				html+= '<li>';

				html+= '<div class="num">e'+pad(seasons[i][j].episode_num)+'</div>';
				html+= '<input type="text" class="input" name="episode[]" value="'+seasons[i][j].title+'">';
				html+= '<input type="text" hidden name="episode_num[]" value="'+seasons[i][j].episode_num+'">';
				html+= '<input type="text" hidden name="season_num[]" value="'+(i+1)+'">';
				html+= '<i class="fa fa-times" aria-hidden="true" title="Usuń odcinek" onclick="MAIN.rmEpiFilmweb(this)"></i>';

				html+= '<div class="clear"></div>';

				html+= '</li>';
			}

			html+= '</ul>';
		}

		e_import.append(html);
		$('#importFilmwebForm').show();


	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

FORM.addEpisodesFilmweb = function(e)
{
	e.preventDefault();
	var sName = '#importFilmwebForm';
	var obj = $(sName);
	var data = obj.serialize();

	var pad = function(num) {
		var s = num+"";
		while (s.length < 2) s = "0" + s;
		return s;
	}
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.parent().find('.err').html('');

	$.post('/series/addEpisodesFilmweb', data, function(answer){
		obj.find('fieldset').attr('disabled', null);
		if(answer.error){
			if(answer.code==1){ obj.parent().find('.err').html(answer.msg); }
			else if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
			}else { obj.parent().find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}
		var results = answer.data;

		var result_e = $('#import_filmweb_page #results');
		result_e.empty();

		var html = '';
		
		for(var i = 0, len = results.length; i < len; i++){
			html += '<li>s'+pad(results[i].season_num)+'e'+pad(results[i].episode_num)+' '+results[i].msg+' '+results[i].title+'</li>';
		}
		result_e.append(html);
		result_e.show();
		$('#import_filmweb_page #results2').show();

	}).fail(function(){
		obj.find('fieldset').attr('disabled', null);
		obj.parent().find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

MAIN.genCaptchaComment = function()
{
	if(MAIN.commentCaptchaObj!=null) return;
	if($('#recaptchaComment').length==0) return;
	MAIN.commentCaptchaObj = grecaptcha.render('recaptchaComment', {
		sitekey: '6LdRmTIUAAAAAP7deeg41Vprk2zP3MPiNScD534K',
		theme: 'dark',
		callback: function(){},
		'expired-callback': function(){
			grecaptcha.reset(MAIN.commentCaptchaObj);
		},
	});
}

MAIN.optChange = function(e)
{
	var value = $(e.target).attr('data-val');
	var target_id = $(e.target).closest('.optBtnsPane').attr('data-target');
	
	$(target_id).val(value);
	$(target_id).change();

	$(e.target).closest('.optBtnsPane').find('li').removeClass('selected');
	$(e.target).addClass('selected');

}

MAIN.hidePremiumMessage1 = function()
{
	$.post('/api/hidePremiumMessage1', [], function(){
		$('#PremiumMessage1').hide();
	}).fail(function(){});
}




MAIN.buildURL = function(base, key, value) {
	var sep = (base.indexOf('?') > -1) ? '&' : '?';
	return base + sep + key + '=' + value;
}

MAIN.getQueryVariable = function(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");

	for(var i=0;i<vars.length;i++){
		var pair = vars[i].split("=");
		if(pair[0] == variable){
			return pair[1];
		}
	} 
	return false;
}

MAIN.voteClickWorking = false;
MAIN.voteHover = function(e)
{
	if(MAIN.voteClickWorking) return;
	var targ = $(e.target);

	var num = targ.attr('data-value');

	for(var i = 1; i <= num; i++){
		var z = $('#star_rate2 .voteVideo[data-value="'+i+'"]');

		z.removeClass('fa-star fa-star-o fa-star-half-o');
		z.addClass('fa-star');
		z.css('color', '#2f7bbf');
	}
}

MAIN.voteNotHover = function(e)
{
	if(MAIN.voteClickWorking) return;
	for(var i = 1; i <= 5; i++){
		var z = $('#star_rate2 .voteVideo[data-value="'+i+'"]');
		var def = z.attr('data-default');

		z.removeClass('fa-star fa-star-o fa-star-half-o');
		z.addClass(def);
		z.css('color', '#e0c50d');
	}
}

MAIN.voteClick = function(e)
{
	var e = $(e.target);
	var value = e.attr('data-value');

	if(MAIN.voteClickWorking) return;
	MAIN.voteClickWorking = true;

	for(var i = 1; i <= 5; i++){
		var z = $('#star_rate2 .voteVideo[data-value="'+i+'"]');
		var def = z.attr('data-default');

		z.removeClass('fa-star fa-star-o fa-star-half-o');
		z.addClass(def);
		z.css('color', '#e0c50d');
	}

	$('#star_rate2 .voteVideo').css('color', '#626262')

	var code = $('#series_page, #episode_page, #movie_page, #video_page').attr('data-code');
	var type = 'series';

	if($('#movie_page').length>0) type = 'movie';
	else if($('#video_page').length>0) type = 'video';

	setTimeout(function(){
		$.post('/user/vote', {value:value, code:code, type:type}, function(answer){
			if(answer.error){
				if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
				}else { alert(LANG.NOT_EXPECTED_ERROR) }
				MAIN.voteClickWorking = false;
				MAIN.voteNotHover();
				return;
			}
			MAIN.voteClickWorking = false;
			MAIN.voteNotHover();

			var txt = 'serial';
			if(type=='movie') txt = 'film';
			else if(type=='video') txt = 'materiał';

			if(answer.data.deleted) $('#rate_this').html('Oceń ten '+txt+':');
			else $('#rate_this').html('Twoja ocena: '+value);
			$('#rate').html(answer.data.avg+' / 5.0');
			$('#votes').html('Głosów: '+answer.data.count);

			var avg = answer.data.avg;

			var fullStars = Math.floor(avg);
			var starsAdded = fullStars;

			for(var i = 1; i <= fullStars; i++){
				var z = $('#star_rate2 .voteVideo[data-value="'+i+'"]');
				z.removeClass('fa-star fa-star-o fa-star-half-o');
				z.addClass('fa-star');
				z.attr('data-default', 'fa-star');
			}

			if(starsAdded<5){
				var polowka = (avg-fullStars).toFixed(1);
				if(polowka>=0.5){
					starsAdded++;
					var z = $('#star_rate2 .voteVideo[data-value="'+starsAdded+'"]');
					z.removeClass('fa-star fa-star-o fa-star-half-o');
					z.addClass('fa-star-half-o');
					z.attr('data-default', 'fa-star-half-o');
				}else{
					starsAdded++;
					var z = $('#star_rate2 .voteVideo[data-value="'+starsAdded+'"]');
					z.removeClass('fa-star fa-star-o fa-star-half-o');
					z.addClass('fa-star-o');
					z.attr('data-default', 'fa-star-o');
				}
			}

			if(starsAdded<5){
				for(var i = starsAdded+1; i <= 5; i++){
					var z = $('#star_rate2 .voteVideo[data-value="'+i+'"]');
					z.removeClass('fa-star fa-star-o fa-star-half-o');
					z.addClass('fa-star-o');
					z.attr('data-default', 'fa-star-o');
				}
			}



		}).fail(function(){
			MAIN.voteClickWorking = false;
				MAIN.voteNotHover();
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	}, 500)
}



$(document).ready(function(){
	MAIN.init();

	setTimeout(function(){
		$('body').removeClass('preload');
	}, 500);

});

