const express = require('express');

const multer = require('multer');

const { exec } = require('child_process');

const fs = require('fs');

const path = require('path');

const { error } = require('console');

const bodyParser = require('body-parser')

var list = '';

var listFilePath = 'public/uploads/' + Date.now() + 'list.txt';

var outputFilePath = Date.now() + 'output.mp4';

const videoshow = require('videoshow')

var dir = 'public';
var subDirectory = 'public/uploads';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);

    fs.mkdirSync(subDirectory);
}

function uninstallout() {
    fs.unlinkSync(`${__dirname}/video.mp4`)
}

const app = express();

app.use(express.static('public'));

var mergestorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

var convertstorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

var videoshowstorage = multer.diskStorage({
      destination: function(req, file, callback) {
        callback(null, 'public/uploads');
      },
      filename: function(req, file, callback) {
          callback(null, file.fieldname + '-' + Date.now() + file.originalname);
      }
});

var videoFilter = function (req, file, cb) {
    //Accept Videos Only
    if (!file.originalname.match(/\.mp4$/)) {
        req.fileValidationError = 'Only Videos Files Are Allowed! ';
        return cb(new Error('Only Videos Files Are Allowed! '), false);
    }
    cb(null, true);
}

var mergeupload = multer({ storage: mergestorage });
var convertupload = multer({ storage: convertstorage });
var videoshowupload = multer({ storage: videoshowstorage });

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(function (req, res, next) {

    res.setHeader("Cross-Origin-Opener-Policy", "same-origin")

    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")

    next()
})

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get('/convert', (req, res) => {
    res.sendFile(__dirname + "/convertmp4.html");
});

app.get('/remove', (req, res) => {
    res.sendFile(__dirname + "/remove.html");
});

app.get('/compress', (req, res) => {
    res.sendFile(__dirname + "/compress.html");
});

app.get('/videoshow', (req, res) => {
    res.sendFile(__dirname + '/videoshow.html')
})

app.post('/merge', mergeupload.array('files', 100), (req, res) => {
    list = "";

    if (req.files) {
        req.files.forEach((file) => {
            console.log(file.path);

            list += `file ${file.filename}`;
            list += "\n";
        });

        var writeSteam = fs.createWriteStream(listFilePath);

        writeSteam.write(list);

        writeSteam.end();

        exec(`ffmpeg -safe 0 -f concat -i ${listFilePath} -c copy ${outputFilePath}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                else {
                    console.log('videos are successfully merged');
                    res.download(outputFilePath, (err) => {
                        if (err) throw err

                        req.files.forEach((file) => {
                            fs.unlinkSync(file.path);
                        });

                        fs.unlinkSync(listFilePath);
                        fs.unlinkSync(outputFilePath);
                    });
                }
            });
    }
});

app.post('/convert', convertupload.single('file'), (req, res, next) => {
    if (req.file) {
        console.log(req.file.path)

        var output = Date.now() + "output.mp3"

        exec(`ffmpeg -i ${req.file.path} ${output}`, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            else {
                console.log("file is converted")
                res.download(output, (err) => {
                    if (err) throw err

                    fs.unlinkSync(req.file.path)
                    fs.unlinkSync(output)

                    next()

                })
            }
        })
    }
})

app.post('/videoshow',videoshowupload.fields([{
  name: 'images', maxCount: 100
}, {
  name: 'audio', maxCount: 1
}]) ,(req, res) => {

    images = []
    var seconds = req.body.text
    const audioFile = req.files.audio[0];

    req.files.images.forEach(file => {
        images.push(`${__dirname}/${subDirectory}/${file.filename}`)
    })

    num = parseInt(seconds)

    console.log(num)

    var videoOptions = {
      fps: 25,
      loop: num, // seconds
      transition: true,
      transitionDuration: 1, // seconds
      videoBitrate: 1024,
      videoCodec: 'libx264',
      size: '640x?',
      audioBitrate: '128k',
      audioChannels: 2,
      format: 'mp4',
      pixelFormat: 'yuv420p'
    }

    videoshow(images, videoOptions)
      .audio(`${__dirname}/${subDirectory}/${audioFile.filename}`)
      .save('video.mp4')
      .on('start', function (command) {
        console.log('ffmpeg process started:', command)
      })
      .on('error', function (err, stdout, stderr) {
        console.error('Error:', err)
        console.error('ffmpeg stderr:', stderr)
      })
      .on('end', function (output) {
        console.error('Video created in:', output)
        res.download(`${__dirname}/video.mp4`)
        req.files.images.forEach(file => {
            fs.unlinkSync(file.path)
        })
        fs.unlinkSync(audioFile.path)
        setTimeout(uninstallout, 30000)
      })

})

app.listen(PORT, () => {
    console.log(`App Is LIstening To ${PORT}`);
    console.log("Welcome");
});