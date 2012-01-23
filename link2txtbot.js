var fs = require('fs'),
    request = require('request'),
    path = require('path'),
    irc = require('irc'),
    util = require('utile'),
    Stream = require('stream').Stream,
    spawn = require('child_process').spawn;

var seconds = 1000,
    minutes = 60*seconds,
    hours = 60*minutes,
    days = 24*hours;

var channel = '#nodebombrange';

var url2txt = function (url, cb) {

  var p = path.resolve('/tmp/'+path.basename(url));

  process.nextTick(function () {
    cb(null, 'downloading '+url);
    var r = request(url);
    r.pipe(fs.createWriteStream(p));

    r.on('error', function (err) {
      cb(null, err.split('\n').map(function (l) {
        return 'Error: '+l;
      }));
    });

    r.on('end', function (err) {
      if (err) {
        throw err;
      }

      cb(null, 'done downloading!');

      var img2txt = spawn('img2txt', [ '--format', 'irc', p ]);

      img2txt.stdout.on('data', function (data) {
        cb(null, data);
      });


      img2txt.stderr.on('data', function (data) {

        cb(null, data.toString().split('\n').map(function (l) {
          return 'Error: '+l;
        }).join('\n'));

      });

    });
  });

};

var imgbot = new irc.Client('irc.freenode.net', 'link2txtbot', {
  channels: [
    channel
  ],
  debug: true
});

imgbot.on('message', function (from, to, msg) {
  var url = msg.match('^!view (.*)');

  if (url) {

    url2txt(url[1], function (err, data) {
      if (err) {
        imgbot.say(to, 'Error. :(');
        return console.log(error.stack);
      }

      var img = data.toString().split('\n');

      util.async.forEachSeries(img, function (l, cb) {
        if (l.length > 0) {
          imgbot.say(to, l);
          setTimeout(cb.bind(null, null), 1.5*seconds);
        } else {
          cb(null, null);
        }
      }, function (err) {
        if (err) {
          imgbot.say(to, err.message);
        }
      });
    });
  }
});
