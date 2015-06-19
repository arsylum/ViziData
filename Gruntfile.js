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
    // STYLUS
    stylus: {
      compile: {
        options: {
          compress: false,
          linenos: true,
          //'include css': true
          'resolve url': true
        },
        files: {
          'stylesheets/style.css': 'stylus/main.styl'
        }
      }
    },
    ///////////////
    // AUTOPREFIX
    autoprefixer: {
      screen: {
        src: 'stylesheets/screen.css',
        dest: 'stylesheets/screen.css'
      },
      style: {
        src: 'stylesheets/style.css',
        dest: 'stylesheets/style.css'
      }
    },
    //////////
    // WATCH
    watch: {
      compass: {
        files: 'sass/*.scss',
        tasks: ['compass','autoprefixer:screen']
      },
      stylus: {
        files: 'stylus/*.styl',
        tasks: ['stylus', 'autoprefixer:style']
      },
      uglify: {
        files: 'js/modular/*.js',
        tasks: ['uglify']
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-autoprefixer');

  // Default task(s).
  grunt.registerTask('default', ['watch']);

};