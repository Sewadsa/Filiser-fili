module.exports = function(grunt){

	grunt.initConfig({
		sass: {
			dist: {
				options: {
					style: 'compressed',
					'no-source-map': ''
				},
				files: {
					'data/public/assets/css/style_mobile.css': 'libs/sass/style_mobile.scss',
					'data/public/assets/css/style.css': 'libs/sass/style.scss'
				}
			}
		},
		uglify: {
			options: {
				mangle: true,
				compress: true,
			},
			my_target: {
				files: {
					'data/public/assets/js/scripts.js': ['libs/js/lang_pl.js', 'libs/js/modal.js', 'libs/js/cropper.js', 'libs/js/main.js'],
					'data/public/assets/js/scripts.panel.js': ['libs/js/panel.js'],
				}
			}
		},
		watch: {
			sass: {
				files: ['libs/sass/**'],
				tasks: ['sass'],
			},
			uglify: {
				files: ['libs/js/**'],
				tasks: ['uglify'],
			},
		},
	});

	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['sass', 'uglify']);

};