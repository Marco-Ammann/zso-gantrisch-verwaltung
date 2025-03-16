const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['FTP_USER', 'FTP_PASSWORD', 'FTP_HOST'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nPlease make sure you have a .env file with all required variables.');
  process.exit(1);
}

// Check if build directory exists
const localRoot = path.join(__dirname, '/dist/zso-gantrisch-verwaltung');
if (!fs.existsSync(localRoot)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: Build directory not found!');
  console.log('\nPlease run npm run build:prod first to generate the build files.');
  process.exit(1);
}

// Check if user wants to clean remote directory before deploying
const shouldCleanRemote = process.argv.includes('--clean');
console.log(shouldCleanRemote 
  ? '\x1b[33m%s\x1b[0m' 
  : '\x1b[36m%s\x1b[0m', 
  shouldCleanRemote 
    ? '⚠️ Remote directory will be cleaned before deployment!' 
    : '📝 Deploying without cleaning remote directory'
);

// Get credentials from environment variables
const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: 21,
  localRoot: localRoot,
  remoteRoot: process.env.FTP_REMOTE_PATH || '/zso-gantrisch.marco-ammann.ch/',
  include: ['*', '**/*'],
  exclude: ['.git', '.github', 'node_modules', '.DS_Store'],
  deleteRemote: shouldCleanRemote,  // Now controlled via command line flag
  forcePasv: true,
  sftp: false,
  // Retry settings for better reliability
  timeout: 30000,
  continueOnError: true  // Continue uploading if a file fails
};

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting deployment to ZSO Gantrisch Application');
console.log(`📁 Local: ${config.localRoot}`);
console.log(`🌐 Remote: ${config.host}:${config.remoteRoot}`);
console.log(`🧹 Clean mode: ${config.deleteRemote ? 'YES - Will remove old files' : 'NO - Will preserve existing files'}\n`);

// Add event handlers for detailed progress
ftpDeploy.on('uploaded', function(data) {
  console.log(`✅ Uploaded: ${data.filename}`);
});

ftpDeploy.on('upload-error', function(data) {
  console.error('\x1b[31m%s\x1b[0m', `❌ Error uploading ${data.filename}: ${data.err}`);
});

// Deploy with a progress bar
let uploadedCount = 0;
let totalFiles = 0;
let errorCount = 0;

ftpDeploy.on('log', function(data) {
  if (data.indexOf('Files found:') > -1) {
    totalFiles = parseInt(data.split(' ')[2], 10);
    console.log(`\n📊 Found ${totalFiles} files to upload\n`);
  }
});

ftpDeploy.on('uploaded', function() {
  uploadedCount++;
  const percent = Math.round((uploadedCount / totalFiles) * 100);
  process.stdout.write(`\r📤 Progress: ${percent}% (${uploadedCount}/${totalFiles})`);
});

ftpDeploy.on('upload-error', function() {
  errorCount++;
});

ftpDeploy.deploy(config)
  .then(res => {
    console.log('\n\n\x1b[32m%s\x1b[0m', '✅ Deployment completed successfully!');
    console.log(`📊 Total files deployed: ${res.length}`);
    console.log(`🌐 Visit your site at: http://zso-gantrisch.marco-ammann.ch`);
    
    if (shouldCleanRemote) {
      console.log('🧹 Remote directory was cleaned before deployment');
    }
    
    if (errorCount > 0) {
      console.warn('\x1b[33m%s\x1b[0m', `⚠️ Warning: ${errorCount} files had upload errors`);
      console.log('   Some files may need to be manually uploaded.');
    }
  })
  .catch(err => {
    console.error('\x1b[31m%s\x1b[0m', '\n❌ Deployment failed:');
    console.error(err);
    process.exit(1);
  });
