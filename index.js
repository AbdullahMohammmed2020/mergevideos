const express = require('express');

const multer = require('multer');

const {exec} = require('child_process');

const fs = require('fs');

const path = require('path');
const { error } = require('console');

var list = '';

var listFilePath = 'public/uploads/' + Date.now() + 'list.txt';

var outputFilePath = Date.now() + 'output.mp4';

var dir = 'public';
var subDirectory = 'public/uploads';

if(!fs.existsSync(dir)){
    fs.mkdirSync(dir);

    fs.mkdirSync(subDirectory);
}

const app = express();

app.use(express.static('public'));

var storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb){
        cb(null, file.filename + '-' + Date.now() + path.extname(file.originalname));
    }
});

// var videoFilter = function(req, file, cb){
//     //Accept Videos Only
//     if(!file.originalname.match(/\.mp4$/)){
//         req.fileValidationError = 'Only Videos Files Are Allowed! ';
//         return cb(new Error('Only Videos Files Are Allowed! '), false);
//     }
//     cb(null, true);
// }

var upload = multer({storage:storage});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.post('/merge',upload.array('files', 100),(req, res) => {
    list = "";

    if(req.files){
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
            if(error){
                console.log(`error: ${error.message}`);
                return;
            }
            else{
                console.log('videos are successfully merged');
                res.download(outputFilePath,(err) => {
                    if(err) throw err

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

app.listen(PORT, () => {
    console.log(`App Is LIstening To ${PORT}`);
});