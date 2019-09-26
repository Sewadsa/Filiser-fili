var PANEL = {};

PANEL.listeners = function(doc)
{	
	var doc = $('body');
	
	doc.on('click', '#panel_verify_page .acceptMovieBtn', PANEL.acceptMovie); // ACCEPT MOVIE
	doc.on('click', '#panel_verify_page .deleteMovieBtn', PANEL.deleteMovie); // DELETE MOVIE

	doc.on('click', '#panel_verify_page .acceptVideoBtn', PANEL.acceptVideo); // ACCEPT VIDEO
	doc.on('click', '#panel_verify_page .deleteVideoBtn', PANEL.deleteVideo); // DELETE VIDEO

	doc.on('click', '#panel_verify_page .acceptSeriesBtn', PANEL.acceptSeries); // ACCEPT SERIES
	doc.on('click', '#panel_verify_page .deleteSeriesBtn', PANEL.deleteSeries); // DELETE SERIES

	doc.on('click', '#panel_verify_page .acceptEpisodeBtn', PANEL.acceptEpisode); // ACCEPT EPISODE
	doc.on('click', '#panel_verify_page .deleteEpisodeBtn', PANEL.deleteEpisode); // DELETE EPISODE

	doc.on('click', '#panel_verify_page .acceptLinkeBtn', PANEL.acceptLink); // ACCEPT LINK
	doc.on('click', '#panel_verify_page .deleteLinkBtn', PANEL.deleteLink); // DELETE LINK
	doc.on('change', '#panel_verify_page .typeSelect', PANEL.changeTypeLink); // CHANGE TYPE LINK
	doc.on('change', '#panel_verify_page .qualitySelect', PANEL.changeQualityLink); // CHANGE QUALITY LINK


	doc.on('click', '#panel_verify_page .acceptCommentBtn', PANEL.acceptComment); // ACCEPT COMMENT
	doc.on('click', '#panel_verify_page .deleteCommentkBtn', PANEL.deleteComment); // DELETE COMMENT
	doc.on('click', '#panel_verify_page .flagCommentkBtn', PANEL.flagComment); // FLAG COMMENT


	doc.on('submit', '#panelToolsDelLinksByUser', PANEL.delLinksByUser); // DELETE ALL LINKS BY USERNAME IN PANEL
	

	doc.on('click', '#panel_verify_page .l_btn', PANEL.changePageVerify); // CHANGE PAGE VERIFY
	if($('#import_page_series').length>0) PANEL.loadEpisodes();
	if($('#import_page_movie').length>0) PANEL.loadMovie();
}

PANEL.delLinksByUser = function(e)
{
	e.preventDefault();
	var sName = '#panelToolsDelLinksByUser';
	var obj = $(sName);
	var data = obj.serialize();
	
	obj.find('fieldset').attr('disabled', 'disabled');
	obj.find('.cssload-loader').css({'visibility': 'visible', 'opacity': 1});
	obj.find('.err').html('');

	$.post('/panel/delete-links-by-user', data, function(answer){
		if(answer.error){
			obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
			obj.find('fieldset').attr('disabled', null);
			if(answer.code==1){ obj.find('.err').html(answer.msg); }
			else { obj.find('.err').html(LANG.NOT_EXPECTED_ERROR); }
			return;
		}

		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.find('.err').html(answer.data);
	}).fail(function(){
		obj.find('.cssload-loader').css({'visibility': 'hidden', 'opacity': 0});
		obj.find('fieldset').attr('disabled', null);
		obj.find('.err').html(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.changePageVerify = function(e)
{	
	var elem = e.target.attributes['data-name'];
	if(!elem) return;
	var type = elem.value;

	$('#panel_verify_page .l_btn').removeClass('l_active');
	$('#panel_verify_page .l_btn[data-name="'+type+'"]').addClass('l_active');

	$('#panel_verify_page ul.par').hide();
	$('#panel_verify_page ul[data-name="'+type+'"]').show();
}

PANEL.acceptMovie = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/accept-movie', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.deleteMovie = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/delete-movie', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.acceptVideo = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/accept-video', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.deleteVideo = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/delete-video', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.acceptSeries = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/accept-series', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.deleteSeries = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/delete-series', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.acceptEpisode = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/accept-episode', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.deleteEpisode = function(e)
{
	var line_e = $(e.target).parent().parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/delete-episode', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		line_e.animate({opacity: 0}, 200, function(){
			line_e.remove();
		})
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.acceptLink = function(e)
{
	var superParent = $(e.target).parent().parent().parent();
	var len = superParent.find('.lineInner').length;

	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');
	var code = line_e.attr('data-code');
	var code2 = line_e.attr('data-code2');

	if(!code2) code2 = '';

	$.post('/panel/accept-link', {ref:ref, code:code, code2:code2}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		if(len<=1){
			superParent.animate({opacity: 0}, 200, function(){
				superParent.remove();
			});
		}else{
			line_e.animate({opacity: 0}, 200, function(){
				line_e.remove();
			});
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.deleteLink = function(e)
{
	var superParent = $(e.target).parent().parent().parent();
	var len = superParent.find('.lineInner').length;

	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');
	var code = line_e.attr('data-code');
	var code2 = line_e.attr('data-code2');

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
		if(len<=1){
			superParent.animate({opacity: 0}, 200, function(){
				superParent.remove();
			});
		}else{
			line_e.animate({opacity: 0}, 200, function(){
				line_e.remove();
			});
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.changeTypeLink = function(e)
{	
	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');

	$(e.target).attr('disabled', 'disabled');

	var val = $(e.target).val();
	$.post('/panel/change-link-type', {ref:ref, type:val}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		$(e.target).attr('disabled', null);
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.changeQualityLink = function(e)
{	
	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');

	$(e.target).attr('disabled', 'disabled');

	var val = $(e.target).val();
	$.post('/panel/change-link-quality', {ref:ref, quality:val}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		$(e.target).attr('disabled', null);
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.acceptComment = function(e)
{
	var superParent = $(e.target).parent().parent().parent();
	var len = superParent.find('.lineInner').length;

	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/accept-comment', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		if(len<=1){
			superParent.animate({opacity: 0}, 200, function(){
				superParent.remove();
			});
		}else{
			line_e.animate({opacity: 0}, 200, function(){
				line_e.remove();
			});
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}


PANEL.deleteComment = function(e)
{
	var superParent = $(e.target).parent().parent().parent();
	var len = superParent.find('.lineInner').length;

	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/delete-comment', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		if(len<=1){
			superParent.animate({opacity: 0}, 200, function(){
				superParent.remove();
			});
		}else{
			line_e.animate({opacity: 0}, 200, function(){
				line_e.remove();
			});
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.flagComment  = function(e)
{
	var superParent = $(e.target).parent().parent().parent();
	var len = superParent.find('.lineInner').length;

	var line_e = $(e.target).parent();
	var ref = line_e.attr('data-ref');
	$.post('/panel/flag-comment', {ref:ref}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		if(len<=1){
			superParent.animate({opacity: 0}, 200, function(){
				superParent.remove();
			});
		}else{
			line_e.animate({opacity: 0}, 200, function(){
				line_e.remove();
			});
		}
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});
}

PANEL.loadMovie = function()
{	
	var self = this;
	var pathname = location.pathname;
	var arrPathname = pathname.split('/');
	if(arrPathname.length!=3) return;
	if(arrPathname[1]!='import') return;

	var _id = arrPathname[2];

	$('#movieLinkInput').change(function(e){
		var all_url = $(e.target).val();
		if(all_url.length==0) return;

		$(e.target).val('');

		$.post('/panel/import/getLinks', {url:all_url}, function(answer){
			if(answer.error){
				if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
					return;
				}
				alert(LANG.NOT_EXPECTED_ERROR)
				return;
			}
			
			self.links = answer.data;
			if(self.links.length==0){ alert('Brak linków'); return; }

			$('#import_page_movie ul#hostings').empty()
			for(var i = 0, len = self.links.length; i < len; i++){
				$('#import_page_movie ul#hostings').append('<li class="host_li" data="'+i+'">'+self.links[i].host+'</li>')
			}

			self.selectedLink = 0;

			self.selectLink = function()
			{
				var link = self.links[self.selectedLink];

				$('#import_page_movie ul#hostings li').css({'color': '#d7d7d7'});
				$('#import_page_movie ul#hostings li').eq(self.selectedLink).css({'color': '#6ccb2d'});
				$('#import_page_movie #iframeImport').attr('src', link.embed);
				$('#import_page_movie #iframeImport2').attr('src', '');

				if(link.host=='openload'){
					var ul = link.embed;
					ul = ul.replace('embed', 'f');
					$('#import_page_movie #iframeImport2').attr('src', ul);
				}
				
				$('#import_page_movie #type_select').val(link.ver);

				$('.optBtnsPane').find('li').removeClass('selected');
				$('li.optBtn[data-val="'+link.ver+'"]').addClass('selected');
			}

			$('#import_page_movie .host_li').click(function(e){
				self.selectedLink = $(e.target).attr('data');
				self.selectLink();
			});

			self.selectLink();
		}).fail(function(){
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	});

	$('#import_page_movie #iframeReload').click(function(){
		var z = $('#import_page_movie #iframeImport');
		z.attr('src', z.attr('src'));
	});

	$('#import_page_movie #prevLink').click(function(){
		self.selectedLink--;
		if(self.selectedLink<0) self.selectedLink = self.links.length-1;
		self.selectLink();
	});

	$('#import_page_movie #nextLink').click(function(){
		self.selectedLink++;
		if(self.selectedLink>self.links.length-1) self.selectedLink = 0;
		self.selectLink();
	});

	$('#import_page_movie #quality_select').change(function(e){
		var quality = $(e.target).val();
		if(quality=='') return;
		$('#import_page_movie #quality_select').val('');
		var type = $('#import_page_movie #type_select').val();
		var link = self.links[self.selectedLink].embed;
		var code = _id;
		
		var data = {
			quality: quality,
			type: type,
			code: code,
			link: link
		}

		$.post('/movie/add-links', data, function(answer){
			console.log(answer)
			if(answer.error){
				if(answer.code==1){
					$('#import_page_movie .err').html(answer.msg); 
					var zk = $('#import_page_movie ul#hostings li');
					zk.eq(self.selectedLink).html('+'+zk.eq(self.selectedLink).html());
					$('#import_page_movie #nextLink').click();
				}else if(answer.code==3){
					alert(LANG.MUST_LOG_IN)
					MODAL.new('login');
				}else { alert(LANG.NOT_EXPECTED_ERROR); }
				return;
			}
			$('#import_page_movie .err').html('Link dodany.');
			var zk = $('#import_page_movie ul#hostings li');
			zk.eq(self.selectedLink).html('+'+zk.eq(self.selectedLink).html());
			$('#import_page_movie #nextLink').click();
		}).fail(function(){
			alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
		});
	});

}

PANEL.loadEpisodes = function()
{	
	var pad = function(num) {
		var s = num+"";
		while (s.length < 2) s = "0" + s;
		return s;
	}

	var self = this;
	var pathname = location.pathname;
	var arrPathname = pathname.split('/');
	if(arrPathname.length!=4) return;
	if(arrPathname[1]!='import') return;

	var _id = arrPathname[2];
	var season = arrPathname[3];

	$.post('/panel/import/getEpisodes', {_id:_id, season:season}, function(answer){
		if(answer.error){
			if(answer.code==3){
				alert(LANG.MUST_LOG_IN)
				MODAL.new('login');
				return;
			}
			alert(LANG.NOT_EXPECTED_ERROR)
			return;
		}
		
		self.episodes = answer.data;
		if(self.episodes.length==0){ alert('Brak odcinków.'); return; }
		self.selectedEpisode = 0;

		$('#import_page_series .num').html('odcinków: '+self.episodes.length);

		self.selectEpisode = function()
		{
			$('#import_page_series ul#hostings').empty()
			$('#import_page_series #iframeImport').attr('src', '');
			self.links = [];
			self.episode = self.episodes[self.selectedEpisode];
			$('#import_page_series .title').html(self.episode.series_id.title+' s'+pad(self.episode.season_num)+'e'+pad(self.episode.episode_num)+(self.episode.episode_num_alter?'-e'+pad(self.episode.episode_num_alter):''))
		}

		


		$('#import_page_series #prevEpisode').click(function(){
			self.selectedEpisode--;
			if(self.selectedEpisode<0) self.selectedEpisode = self.episodes.length-1;
			self.selectEpisode();
		});

		$('#import_page_series #nextEpisode').click(function(){
			self.selectedEpisode++;
			if(self.selectedEpisode>self.episodes.length-1) self.selectedEpisode = 0;
			self.selectEpisode();
		});

		$('#import_page_series #episodeLinkInput').change(function(e){
			var all_url = $(e.target).val();
			if(all_url.length==0) return;

			$(e.target).val('');

			$.post('/panel/import/getLinks', {url:all_url}, function(answer){
				if(answer.error){
					if(answer.code==3){
						alert(LANG.MUST_LOG_IN)
						MODAL.new('login');
						return;
					}
					alert(LANG.NOT_EXPECTED_ERROR)
					return;
				}
				
				self.links = answer.data;
				if(self.links.length==0){ alert('Brak linków'); return; }

				$('#import_page_series ul#hostings').empty()
				for(var i = 0, len = self.links.length; i < len; i++){
					$('#import_page_series ul#hostings').append('<li class="host_li" data="'+i+'">'+self.links[i].host+'</li>')
				}

				self.selectedLink = 0;

				self.selectLink = function()
				{
					var link = self.links[self.selectedLink];

					$('#import_page_series ul#hostings li').css({'color': '#d7d7d7'});
					$('#import_page_series ul#hostings li').eq(self.selectedLink).css({'color': '#6ccb2d'});
					$('#import_page_series #iframeImport').attr('src', link.embed);
					$('#import_page_series #iframeImport2').attr('src', '');

					if(link.host=='openload'){
						var ul = link.embed;
						ul = ul.replace('embed', 'f');
						$('#import_page_series #iframeImport2').attr('src', ul);
					}
					$('#import_page_series #type_select').val(link.ver);

					$('.optBtnsPane').find('li').removeClass('selected');
					$('li.optBtn[data-val="'+link.ver+'"]').addClass('selected');

				}

				$('#import_page_series .host_li').click(function(e){
					self.selectedLink = $(e.target).attr('data');
					self.selectLink();
				});

				self.selectLink();
			}).fail(function(){
				alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
			});
		});

		$('#import_page_series #iframeReload').click(function(){
			var z = $('#import_page_series #iframeImport');
			z.attr('src', z.attr('src'));
		});

		$('#import_page_series #prevLink').click(function(){
			self.selectedLink--;
			if(self.selectedLink<0) self.selectedLink = self.links.length-1;
			self.selectLink();
		});

		$('#import_page_series #nextLink').click(function(){
			self.selectedLink++;
			if(self.selectedLink>self.links.length-1) self.selectedLink = 0;
			self.selectLink();
		});

		$('#import_page_series #quality_select').change(function(e){
			var quality = $(e.target).val();
			if(quality=='') return;
			$('#import_page_series #quality_select').val('');
			var type = $('#import_page_series #type_select').val();
			var link = self.links[self.selectedLink].embed;
			var code2 = self.episode._id;
			
			var data = {
				quality: quality,
				type: type,
				code2: code2,
				link: link
			}

			$.post('/series/add-links-import', data, function(answer){
				if(answer.error){
					if(answer.code==1){
						$('#import_page_series .err').html(answer.msg); 
						var zk = $('#import_page_series ul#hostings li');
						zk.eq(self.selectedLink).html('+'+zk.eq(self.selectedLink).html());
						$('#import_page_series #nextLink').click();
					}else if(answer.code==3){
						alert(LANG.MUST_LOG_IN)
						MODAL.new('login');
					}else { alert(LANG.NOT_EXPECTED_ERROR); }
					return;
				}
				$('#import_page_series .err').html('Link dodany.');
				var zk = $('#import_page_series ul#hostings li');
				zk.eq(self.selectedLink).html('+'+zk.eq(self.selectedLink).html());
				$('#import_page_series #nextLink').click();
			}).fail(function(){
				alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
			});
		});

		self.selectEpisode(0);
	}).fail(function(){
		alert(LANG.ERROR_OCCURRED_TRY_AGAIN);
	});

}


$(document).ready(function(){
	PANEL.listeners();
});