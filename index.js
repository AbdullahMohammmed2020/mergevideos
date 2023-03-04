const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const sharp = require('sharp')
const fs = require('fs');
const sizeOf = require('image-size')
const audioconcat = require('audioconcat')
const path = require('path');
const { error } = require('console');
const bodyParser = require('body-parser')
const ffmpeg = require('fluent-ffmpeg')
const Ffmpeg = require('ffmpeg')
const videoshow = require('videoshow')
var list = '';
var listFilePath = 'public/uploads/' + Date.now() + 'list.txt';
var outputFilePath = Date.now() + 'output.mp4';
FacebookVideo = [1080, 1080]
var dir = 'public';
var subDirectory = 'public/uploads';

//Check If The Public/Uploads File Is Exists
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);

    fs.mkdirSync(subDirectory);
}

function uninstallout() {
    fs.unlinkSync(`${__dirname}/video.mp4`)
}

const app = express();

app.use(express.static('public'));

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './public/uploads');
    },
    filename: function (req, file, callback) {
        console.log(file);
        if (file.originalname.length > 6)
            callback(null, file.fieldname + '-' + Date.now() + file.originalname.substr(file.originalname.length - 6, file.originalname.length));
        else
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

//Crop Function
let crop = function (img, w, h, t, l, outFile) {
    sharp(img).extract({
        width: w,
        height: h,
        left: l,
        top: t
    }).toFile(outFile, function (err) {
        console.log(err)
    })
}

//Resize Function
let resize = function (img, w, h, outFile) {
    sharp(img)
        .resize(w, h)
        .toFile(outFile, function (err) {
            console.log(err)
        })
}

var mergeupload = multer({ storage: storage });

var convertupload = multer({ storage: storage });

var videoshowupload = multer({ storage: storage });

var watermarkupload = multer({ storage: storage });

var change_resupload = multer({ storage: storage });

var mergeaudios_upload = multer({ storage: storage });

var incDecVideo_upload = multer({ storage: storage });

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

app.get('/watermark', (req, res) => {
    res.sendFile(__dirname + '/watermark.html')
})

app.get('/change_res', (req, res) => {
    res.sendFile(__dirname + '/change_video_res.html')
})

app.get('/mergeaudios', (req, res) => {
    res.sendFile(__dirname + '/mergeaudios.html')
})

app.get('/inc_dec', (req, res) => {
    res.sendFile(__dirname + '/inc_decvideo.html')
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

app.post('/videoshow', videoshowupload.fields([{ name: 'images', maxCount: 100 }, { name: 'audio', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
    //Declare Variables
    var to = req.body.to
    var audio = req.files.audio[0]
    var text1 = req.body.text1
    var text2 = req.body.text2
    var seconds = req.body.num
    var num = parseInt(seconds)
    var images = []
    var ed_images = []
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
    //Push Uploaded Images To Image Array
    req.files.images.forEach(file => {
        images.push(`${__dirname}/${subDirectory}/${file.filename}`)
    })

    //Resize Every Image Or Crop It And Push It To Ed Image Array
    req.files.images.forEach(image => {
        let imgDIM = [sizeOf(image.path).width, sizeOf(image.path).height]

        if (to == 'Facebook Video') {
            if (imgDIM[0] >= FacebookVideo[0] && imgDIM[1] >= FacebookVideo[1]) {
                crop(image.path, FacebookVideo[0], FacebookVideo[1], ((imgDIM[1] - FacebookVideo[1]) / 2), ((imgDIM[0] - FacebookVideo[0]) / 2), `/public/uploads/ed_images/${image.originalname}`)
            }
            else if (imgDIM[0] <= FacebookVideo[0] && imgDIM[1] <= FacebookVideo[1]) {
                resize(image.path, FacebookVideo[0], FacebookVideo[1], `/public/uploads/ed_images/${image.originalname}`)
            }
        }
        ed_images.push(`${__dirname}/public/uploads/ed_images/${image.originalname}`)
    })

    //Create The VideoShow
    videoshow(ed_images, videoOptions)
        .audio(audio.path)
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
            ffmpeg('./video.mp4')
                .videoFilters({
                    filter: 'drawtext',
                    options: {
                        fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
                        text: req.body.text1,
                        fontsize: 30,
                        box: 1,
                        boxcolor: 'black',
                        boxborderw: 10,
                        fontcolor: 'white',
                        x: '(main_w/2-text_w/2)',
                        y: 20,
                        shadowcolor: 'black',
                        shadowx: 2,
                        shadowy: 2
                    }
                },
                    {
                        filter: 'drawtext',
                        options: {
                            fontfile: './Noto_Naskh_Arabic/static/NotoNaskhArabic-Regular.ttf',
                            text: req.body.text2,
                            fontsize: 30,
                            box: 1,
                            boxcolor: 'black',
                            boxborderw: 10,
                            fontcolor: 'white',
                            x: '(main_w/2-text_w/2)',
                            y: 600,
                            shadowcolor: 'black',
                            shadowx: 2,
                            shadowy: 2
                        }
                    }
                )
                .on('end', function () {
                    console.log('file has been converted succesfully');
                    res.download('./out.mp4', (err) => {
                        if (err) throw err
                        fs.unlinkSync('./video.mp4')
                        fs.unlinkSync('./out.mp4')
                    });
                })
                .on('error', function (err) {
                    console.log('an error happened: ' + err.message);
                })
                .save('./out.mp4');
        })
})

app.post('/watermark', watermarkupload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }]), (req, res) => {
    console.log(req.files.video[0].path)
    console.log(req.files.image[0].path)

    function download() {
        res.download('./video-com-watermark.mp4')
    }

    function uninst() {
        fs.unlinkSync('./video-com-watermark.mp4')
    }

    var ffmpeg = require('ffmpeg');

    try {
        var process = new Ffmpeg(req.files.video[0].path);
        process.then(function (video) {
            console.log('The video is ready to be processed');
            var watermarkPath = req.files.image[0].path,
                newFilepath = './video-com-watermark.mp4',
                settings = {
                    position: "NE"      // Position: NE NC NW SE SC SW C CE CW
                    , margin_nord: null      // Margin nord
                    , margin_sud: null      // Margin sud
                    , margin_east: null      // Margin east
                    , margin_west: null      // Margin west
                };
            var callback = function (error, files) {
                if (error) {
                    console.log('ERROR: ', error);
                }
                else {
                    console.log('TERMINOU', files);
                }
            }
            //add watermark
            video.fnAddWatermark(watermarkPath, newFilepath, settings, callback)

        }, function (err) {
            console.log('Error: ' + err);
        });
    } catch (e) {
        console.log(e.code);
        console.log(e.msg);
    }
    setTimeout(download, 10000)
    setTimeout(uninst, 20000)
})

app.post('/change-video-res', change_resupload.single('video'), (req, res) => {
    var width = 0
    var height = 0
    console.log(req.file.path)
    var to = parseInt(req.body.to)
    console.log(typeof to);
    console.log(to);

    function uninstall() {
        fs.unlinkSync(req.file.path)
        fs.unlinkSync(`${req.file.filename}video.mp4`)
    }

    if (to == 240) {
        width = 426
        height = 240
    } else if (to == 360) {
        width = 640
        height = 360
    } else if (to == 480) {
        width = 854
        height = 480
    } else if (to == 720) {
        width = 1280
        height = 720
    } else if (to == 1080) {
        width = 1920
        height = 1080
    } else {
        console.log('You Are Laughing')
    }

    ffmpeg(req.file.path)
        .output(`${req.file.filename}video.mp4`)
        .videoCodec('libx264')
        .size(`${width}x${height}`)
        .on('error', function (err) {
            console.log('An error occuarred: ' + err.message);
        })
        .on('progress', function (progress) {
            console.log('... frames: ' + progress.frames);
        })
        .on('end', function () {
            console.log('Finished processing');
            res.download(`${req.file.filename}video.mp4`)
        })
        .run();
    setTimeout(uninstall, 20000)
})

app.post('/mergeaudios', mergeaudios_upload.array('audios', 100), (req, res) => {
    var songs = []
    req.files.forEach((file) => {
        // console.log(file.path);
        songs.push(`${__dirname}/public/uploads/${file.filename}`)
    });
    console.log(songs)

    function uninstall() {
        fs.unlinkSync(`${req.files[0].filename}`)
        req.files.forEach(file => {
            fs.unlinkSync(file.path)
        })
    }

    audioconcat(songs)
        .concat(`${req.files[0].filename}`)
        .on('start', function (command) {
            console.log('ffmpeg process started:', command)
        })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err)
            console.error('ffmpeg stderr:', stderr)
        })
        .on('end', function (output) {
            console.error('Audio created in:', output)
            res.download(`${req.files[0].filename}`)
        })
    setTimeout(uninstall, 20000)
});

app.post('/inc_dec', incDecVideo_upload.single('video'), (req, res) => {
    const outpath = `${req.file.filename}out.mp4`
    console.log(req.file.filename)
    var file = req.file.path
    var pts = parseFloat(req.body.pts)
    const audio_s = (1 / pts)
    exec(`ffmpeg -i ${req.file.path} -filter_complex "[0:v]setpts=${pts}*PTS[v];[0:a]atempo=${audio_s}[a]" -map "[v]" -map "[a]" ${outpath}`, (e, stdout, stderr) => {
        if (e instanceof Error) {
            console.error(e);
            throw e;
        } else {
            console.log('video Speeded');
            res.download(`${req.file.filename}out.mp4`, (err) => {
                if (err) throw err

                fs.unlinkSync(file)
                fs.unlinkSync(outpath);
            });
        }
        console.log('stdout: ', stdout)
        console.log('stderr: ', stderr)
    })
})


app.listen(PORT, () => {
    console.log(`App Is LIstening To ${PORT}`);
});