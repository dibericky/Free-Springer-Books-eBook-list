const fs = require('fs')
const {join} = require('path')
const https = require('https')

const downloadList = require('./list.json')

function createDownloadUrl (url) {
    console.log('Create download url from ', url)
    const code = url.split('/').pop()
    const urlToDownload = `https://link.springer.com/content/pdf/${code}.pdf`
    return urlToDownload
}

async function getDownloadUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            if (response.statusCode >= 400) {
                reject(new Error('Error: '+response.statusCode))
                return
            }
            if(response.statusCode > 300 && response.statusCode < 400) {
                // follow redirect
                getDownloadUrl(response.headers.location)
                    .then(urlToDownload => resolve(urlToDownload))
                return
            }
            // Url found!
            resolve(createDownloadUrl(url))
        })
    })
    
}

async function downloadFile(url, pathToSave) {
    return new Promise((resolve) => {
        console.log('Try to download ', url)
        var file = fs.createWriteStream(pathToSave);
        https.get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close();
                console.log('Saved')
                resolve()
            });
        });
    })
}

async function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}


async function downloadAll(downloadFolder) {
    for([index, item] of downloadList.entries()) {
        const {url, title} = item
        console.log(index, ' - Current item: ', title)
        const downloadUrl = await getDownloadUrl(url.replace(/^http/, 'https'))
        if (!downloadUrl) {
            console.log('Cannot resolve url, skip')
            await sleep(500)
        }
        console.log('RESOLVED URL', downloadUrl)
        await downloadFile(downloadUrl, join(downloadFolder, `${title}.pdf`), console.log)
        console.log('------------------------------------')
    }
}

const destinationFolder = join(__dirname, 'downloads')

if (!fs.existsSync(destinationFolder)) {
    console.log('Create "download" folder')
    fs.mkdirSync(destinationFolder)
    console.log('Folder created.')
}

downloadAll(destinationFolder)
    .then(() => {
        console.log('DONE')
    })

