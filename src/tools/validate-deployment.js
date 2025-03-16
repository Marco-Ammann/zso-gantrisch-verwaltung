/**
 * Validates the deployment environment by checking:
 * 1. Required environment variables
 * 2. Build output directory
 * 3. Critical files for deployment
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Define paths
const rootDir = path.resolve(__dirname, '../../');
const buildDir = path.join(rootDir, 'dist', 'zso-gantrisch-verwaltung');
const envFile = path.join(rootDir, '.env');

console.log(chalk.cyan('🔍 Validating deployment environment for ZSO Gantrisch...'));

// Check for .env file
if (!fs.existsSync(envFile)) {
  console.error(chalk.red('❌ Error: .env file is missing!'));
  console.log(chalk.yellow('Please create it based on the .env.example template.'));
  process.exit(1);
}

// Load .env variables
require('dotenv').config({path: envFile});

// Check required environment variables
const requiredEnvVars = ['FTP_USER', 'FTP_PASSWORD', 'FTP_HOST', 'FTP_REMOTE_PATH'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(chalk.red('❌ Error: Missing required environment variables:'));
  missingEnvVars.forEach(varName => console.error(chalk.yellow(`   - ${varName}`)));
  console.log(chalk.gray('Please update your .env file with all required variables.'));
  process.exit(1);
}

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error(chalk.red('❌ Error: Build directory not found!'));
  console.log(chalk.yellow('Please run npm run build:prod first to generate the build files.'));
  process.exit(1);
}

// Check critical files
const criticalFiles = ['index.html', '.htaccess'];
const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(buildDir, file)));

if (missingFiles.length > 0) {
  console.error(chalk.red('❌ Error: Missing critical files in build directory:'));
  missingFiles.forEach(file => console.error(chalk.yellow(`   - ${file}`)));
  console.log(chalk.gray('Make sure your build process is correctly configured.'));
  process.exit(1);
}

// All checks passed
console.log(chalk.green('✅ All validation checks passed! Deployment environment is ready.'));
console.log(chalk.gray('You can now run npm run deploy to deploy your application.'));
