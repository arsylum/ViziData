module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    //pkg: grunt.file.readJSON('package.json'),
    ///////////
    // UGLIFY
    uglify: {
      dev: {
        options: {
          beautify: true,
          compress: false,
          preserveComments: 'all'
        },
        files: {
          'js/main.js': 'js/modular/*.js'
        }
      }
    },
    ////////////
    // COMPASS
    compass: {
      dist: {
        options: {
          sassDir: 'sass',
          cssDir: 'stylesheets',
        }
      }
    },
    //////////
    // WATCH
    watch: {
      compass: {
        files: 'sass/*.scss',
        tasks: 'compass'
      },
      uglify: {
        files: 'js/modular/*.js',
        tasks: 'uglify'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['watch']);

};