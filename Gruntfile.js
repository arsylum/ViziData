module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    //pkg: grunt.file.readJSON('package.json'),
    ///////////
    // UGLIFY
    uglify: {
      dev: {
        options: {
          mangle: false,
          beautify: true,
          compress: false,
          preserveComments: 'all'
        },
        files: {
          'js/main.js': 'js/*/*.js'
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
          //outputStyle: 'compressed',
          environment: 'development'
        }
      }
    },
    ///////////////
    // AUTOPREFIX
    autoprefixer: {
      screen: {
        src: 'stylesheets/screen.css',
        dest: 'stylesheets/screen.css'
      }
    },
    //////////
    // WATCH
    watch: {
      compass: {
        files: 'sass/*.scss',
        tasks: ['compass','autoprefixer:screen']
      },
      uglify: {
        files: 'js/modular/*.js',
        tasks: ['uglify']
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-autoprefixer');

  // Default task(s).
  grunt.registerTask('default', ['watch']);

};