# Build & Deployment Documentation for ZSO Gantrisch Verwaltung

> **Note:** This application previously used Firebase Hosting but now uses Swizzonic FTP for deployment.

## Build Commands

- `npm run build:prod`: Standard production build
- `npm run build:analyze`: Production build with bundle analysis visualization
- `npm run build:modern`: Optimized build with modern browser optimizations 

## Deployment Commands

- `npm run deploy`: Build and deploy to FTP server (preserves existing files)
- `npm run deploy:clean`: Build and deploy with remote directory cleaning
- `npm run deploy:skip-build`: Deploy existing build without rebuilding
- `npm run deploy:skip-build:clean`: Deploy existing build with remote directory cleaning

## Additional Commands

- `npm run lint`: Run ESLint to fix code style issues
- `npm run check-env`: Validate environment variables
- `npm run preview`: Launch local server to preview the production build

## Build Output

The build process generates optimized files in the `dist/zso-gantrisch-verwaltung` directory:

1. **Main files**
   - `main.[hash].js`: Core application code
   - `polyfills.[hash].js`: Browser compatibility features
   - `runtime.[hash].js`: Angular runtime

2. **Chunk files**
   - Named vendor chunks: Third-party library code (e.g., `npm.firebase.1234abc.js`)
   - Named module chunks (e.g., `material.1234abc.js`): Specific framework modules
   - Route chunks (e.g., `123.1234abc.js`): Lazy-loaded module code

3. **Assets & Styles**
   - CSS bundles: Styles for components and layout
   - Asset files: Images, fonts, and other static files
   - `.htaccess`: Server configuration for routing

## Deployment Process

### Automatic Deployment to Swizzonic FTP

1. **Setup**:
   - Create `.env` file with your credentials based on `.env.example`
   - Install dependencies: `npm install`

2. **Deploy**:
   - First deployment: Run `npm run deploy:clean` to build and upload with clean remote directory
   - For subsequent updates: Run `npm run deploy` to preserve files not in your local build
   - Use `npm run deploy:skip-build` variants if you've already built the app

3. **Deployment Modes**:
   - **Standard Mode**: Uploads all files in your build directory but preserves any files on the server that aren't in your build
   - **Clean Mode**: Removes all files on the server before uploading, ensuring only files from your build exist on the server

4. **When to Use Clean Mode**:
   - First deployment to a new environment
   - When you've removed significant parts of the application
   - When you want to ensure old artifacts are removed
   - When changing major versions and you want a completely fresh deployment

### Manual Deployment

To deploy manually (alternative to automatic deployment):

1. Run `npm run build:prod` to generate the build
2. Use FileZilla or another FTP client to connect to your host:
   - Server: Your FTP host from `.env` file
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (default)
3. Upload all files from `dist/zso-gantrisch-verwaltung/` to your server directory (`/zso-gantrisch.marco-ammann.ch/`)

## Troubleshooting

If you encounter deployment issues:

1. **Build errors**: Check console output for specific errors
2. **FTP errors**: Verify credentials in `.env` and server availability
3. **Routing errors**: Ensure `.htaccess` is properly uploaded to root
4. **Blank page**: Check browser console for errors (likely path issues)

## Performance Optimization

The build uses advanced optimization techniques:

- **Code splitting**: Lazy loading of routes and features
- **Tree shaking**: Eliminating unused code
- **Bundle optimization**: Separating third-party libraries
- **GZIP compression**: Reducing file sizes for faster loading
- **Cache headers**: Long-term caching for static assets

For further optimization, analyze the bundle with `npm run build:analyze`.

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Regularly update dependencies with `npm update`
- The app uses secure authentication practices through Firebase

## Understanding Lazy Loading

Chunk files are created due to lazy loading. When routes are configured with:

```typescript
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(r => r.ADMIN_ROUTES)
}
```

Angular creates separate chunk files for these modules, which improves initial load performance.
