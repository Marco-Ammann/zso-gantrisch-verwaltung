const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting FTP deployment for ZSO Gantrisch');

// Check for required environment variables
if (!process.env.FTP_USER || !process.env.FTP_PASSWORD || !process.env.FTP_HOST) {
  console.error('❌ Missing FTP credentials in .env file!');
  process.exit(1);
}

// Check if build directory exists
const localRoot = path.join(__dirname, '/dist/zso-gantrisch-verwaltung');
if (!fs.existsSync(localRoot)) {
  console.error('❌ Build directory not found! Run npm run build:prod first.');
  process.exit(1);
}

// Check if critical files exist
if (!fs.existsSync(path.join(localRoot, 'index.html'))) {
  console.error('❌ index.html not found in build directory!');
  process.exit(1);
}

// Check if user wants to clean the remote directory
const shouldCleanRemote = process.argv.includes('--clean');
console.log(shouldCleanRemote 
  ? '⚠️ Clean mode: Will remove all files on server before upload'
  : '📝 Regular mode: Will preserve existing server files');

// Configure FTP deployment
const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: 21,
  localRoot: localRoot,
  remoteRoot: process.env.FTP_REMOTE_PATH || '/zso-gantrisch.marco-ammann.ch/',
  include: ['*', '**/*', '.htaccess'],  // Explicitly include .htaccess
  exclude: ['.git', '.github', 'node_modules', '.DS_Store'],
  deleteRemote: shouldCleanRemote,
  forcePasv: true
};

// Add event handlers
let uploadedFiles = 0;
let totalFiles = 0;

ftpDeploy.on('uploaded', function(data) {
  uploadedFiles++;
  const percent = Math.round((uploadedFiles / totalFiles) * 100);
  process.stdout.write(`\rUploading: ${percent}% (${uploadedFiles}/${totalFiles})`);
});

ftpDeploy.on('upload-error', function(data) {
  console.error(`\n❌ Error uploading ${data.filename}: ${data.err}`);
});

ftpDeploy.on('log', function(data) {
  if (data.indexOf('Files found:') > -1) {
    totalFiles = parseInt(data.split(' ')[2], 10);
    console.log(`\nFound ${totalFiles} files to upload`);
  }
});

// Start deployment
ftpDeploy.deploy(config)
  .then(res => {
    console.log('\n\n✅ Deployment successful!');
    console.log(`📊 Uploaded ${res.length} files`);
    console.log('🌐 Visit your site at: https://zso-gantrisch.marco-ammann.ch/');
  })
  .catch(err => {
    console.error('\n❌ Deployment failed:');
    console.error(err);
    process.exit(1);
  });
