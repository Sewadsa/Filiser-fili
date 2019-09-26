var MODAL = {};

MODAL.isOpened = false;
MODAL.opened = '';

MODAL.new = function(name, e, CB)
{
	if(MODAL.isOpened){
		MODAL.close(function(){
			MODAL.new(name, e, CB);
		});
		return;
	}

	var params = null;

	switch(name)
	{
		case 'add_link':
			params = '?code='+$('#movie_page').attr('data-code');
			break;
		case 'add_link_episode':
			params = '?code='+$('#episode_page').attr('data-code')+'&code2='+$('#episode_page').attr('data-code2');
			break;
		case 'add_episode':
			params = '?code='+$('#series_page, #episode_page').attr('data-code');
			break;
		case 'edit_link_movie':
		case 'report_link_movie':
			params = '?ref='+e.parent().parent().attr('data-ref')+'&code='+$('#movie_page, #episode_page').attr('data-code');
			break;
		case 'report_link_series':
		case 'edit_link_series':
			params = '?ref='+e.parent().parent().attr('data-ref')+'&code='+$('#episode_page').attr('data-code')+'&code2='+$('#episode_page').attr('data-code2');
			break;
		case 'report_episode':
			params = '?ref='+e.parent().parent().attr('data-ref')+'&code='+$('#series_page').attr('data-code');
			break;
		case 'edit_name_episode':
			params = '?code2='+$('#episode_page').attr('data-code2');
			break;
	}

	switch(name)
	{
		case 'login':
		case 'register':
		case 'remind':
		case 'add_movie_series_step_0':
		case 'add_link':
		case 'edit_link_movie':
		case 'report_link_movie':
		case 'add_episode':
		case 'report_episode':
		case 'add_link_episode':
		case 'report_link_series':
		case 'edit_link_series':
		case 'edit_name_episode':
			MODAL.create(name, params);
			break;
		default:
			break;
	}

}

MODAL.create = function(name, params)
{
	$.get('/modals/'+name+(params?params:''), function(data){
		$('body').append(data);
		MODAL.isOpened = true;
		$('#modalBG').attr('show', true);
	}).fail(function(){
		alert('Wystąpił błąd');
	});

}


MODAL.close = function(CB)
{
	$('#modalBG').attr('show', null);
	$('#modalBG').remove();
	MODAL.isOpened = false;
	CB();
}