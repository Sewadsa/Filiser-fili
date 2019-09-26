var CROPPER = {};

CROPPER.changeImage = function(e)
{
	var file = e.target.files[0];
	if(!file) return;

	var fileTypes = ['jpg', 'jpeg', 'png', 'gif'];
	var file_ext = file.name.split('.').pop().toLowerCase();

	if(fileTypes.indexOf(file_ext)==-1){
		alert(LANG.BAD_FILE_EXTENSION); return;
	}
	
	var file_size = parseInt(file.size/1024);
	if(file_size>5120){
		alert(LANG.FILE_TOO_BIG); return;
	}

	var fileReader = new FileReader();
	fileReader.onload = function(){
		var imz = new Image();
		imz.src = fileReader.result;

		imz.onload = function() {
			var width = this.width;
			var height = this.height;

			if(width<220 || height<220){
				alert(LANG.FILE_TOO_SMALL); return;
			}

			

			var image2 = document.getElementById('image-to-crop');
			image2.src = fileReader.result;
			
			if(CROPPER.cropper){
				CROPPER.cropper.destroy();
			}else{
				$('#add_movie_series #full').attr('hidden', null);
				$('#add_movie_series #cropper_box').attr('hidden', null);
				$('#add_movie_series #empty').attr('hidden', 'hidden');
			}


			CROPPER.cropper = new Cropper(image2, {
				aspectRatio: 1,
				viewMode: 2,
				minCropBoxWidth: 220,
				minCropBoxHeight: 220,
				preview: '#prev',
				autoCropArea: 1,
			});
		}
	}

	fileReader.readAsDataURL(file);
}


CROPPER.selectImageEdit = function(e)
{
	var file = e.target.files[0];
	if(!file) return;

	var fileTypes = ['jpg', 'jpeg', 'png', 'gif'];
	var file_ext = file.name.split('.').pop().toLowerCase();

	if(fileTypes.indexOf(file_ext)==-1){
		alert(LANG.BAD_FILE_EXTENSION); return;
	}
	
	var file_size = parseInt(file.size/1024);
	if(file_size>5120){
		alert(LANG.FILE_TOO_BIG); return;
	}

	var fileReader = new FileReader();
	fileReader.onload = function(){
		var imz = new Image();
		imz.src = fileReader.result;

		imz.onload = function() {
			var width = this.width;
			var height = this.height;

			if(width<220 || height<220){
				alert(LANG.FILE_TOO_SMALL); return;
			}

			$('#edit_poster_page #editPosterForm').show();

			var image2 = document.getElementById('image-to-crop');
			image2.src = fileReader.result;
			
			if(CROPPER.cropper){
				CROPPER.cropper.destroy();
			}
			CROPPER.cropper = new Cropper(image2, {
				aspectRatio: 1,
				viewMode: 2,
				minCropBoxWidth: 220,
				minCropBoxHeight: 220,
				preview: '#prev',
				autoCropArea: 1,
			});
		}
	}

	fileReader.readAsDataURL(file);
}