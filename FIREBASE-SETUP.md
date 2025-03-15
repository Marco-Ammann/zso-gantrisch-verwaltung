# Firebase Setup Instructions

## Deploying Firebase Security Rules

To fix the "Missing or insufficient permissions" errors, you need to deploy the correct security rules to your Firebase project.

### Prerequisites

1. Install Firebase CLI if not already installed:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project directory (if not done already):
```bash
firebase init
```

### Deploying Rules

1. Deploy the Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

2. Deploy the Storage security rules:
```bash
firebase deploy --only storage
```

## Verifying Rule Deployment

To verify that your rules are properly deployed:

1. Open the Firebase console (https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database → Rules
4. Check that the rules match what's in your `firestore.rules` file
5. Use the Rules Playground to test your rules directly

## Common Authentication & Rule Problems

### 1. Authentication State Issues

If you're seeing "Missing or insufficient permissions" errors:

- **Symptom**: FirebaseService methods fail with permission errors
- **Check 1**: Verify you're actually signed in (check browser dev tools → Application tab → IndexedDB → firebaseLocalStorage)
- **Check 2**: Make sure your security rules are properly deployed
- **Check 3**: Check that the user document exists in Firestore with the correct role

### 2. Circular Dependency Issues

Firebase authentication can sometimes create circular dependencies:

- FirebaseService needs authentication to work
- AuthService needs FirebaseService to check user roles
- This creates a chicken-and-egg problem

**Solution**:
1. Add special handling for auth-related collections in FirebaseService
2. Implement retry logic for database operations during authentication
3. Make sure the 'users' collection rules allow newly authenticated users to create their own documents

### 3. Rule Debugging

If rules aren't working as expected:

1. Use the Rules Playground in Firebase Console to test specific operations
2. Add the Firebase Rules Tester component to your app to test rules at runtime
3. Use the Firebase Emulator Suite for local development:

```bash
firebase emulators:start
```

### 4. Database Structure Issues

Ensure your database structure matches what your rules are expecting:

- The 'users' collection should have documents with IDs matching user UIDs
- Each user document should have a 'role' field that matches what your rules check
- Check for typos in field names both in your code and rules

## Testing Your Firebase Setup

If you're still encountering permission issues, consider adding the `FirebaseRulesTesterComponent` to your application temporarily:

1. Add the component to a route or dialog
2. Run the tests to check if basic operations work
3. Review the console logs for detailed error messages

This component will help identify exactly which operations are failing and why.

## Troubleshooting Authentication Issues

If you're still experiencing authentication issues:

1. Check that the Firebase project ID in your environment files matches your actual Firebase project.

2. Verify that your user accounts have the correct roles set in the Firestore "users" collection.

3. Make sure you're properly signed in before attempting operations that require authentication.

4. Check the Firebase console Authentication section to ensure users exist and are verified.

## Common Issues and Solutions

### 1. "Missing or insufficient permissions" errors

This typically indicates one of the following:

- User is not authenticated
- Security rules are too restrictive
- User doesn't have the required role to perform the operation

### 2. Authentication state issues

If authentication state isn't persisting:

- Check that `browserLocalPersistence` is properly set in the auth service
- Ensure the user document exists in the "users" collection
- Verify that the auth state listener is working correctly

### 3. Database access issues

If you can't read/write to the database:

- Check the rules in the Firebase Console
- Ensure the collections mentioned in the security rules actually exist
- Verify that the user's role is properly set in their user document

## Conclusion

The "Missing or insufficient permissions" error indicates issues with Firebase security rules not allowing your authenticated users to access the required collections. The solution above:

1. Enhances error handling to provide better feedback
2. Adds proper security rules for Firestore
3. Improves authentication state management
4. Provides configuration files for Firebase deployment

After implementing these changes, your application should be able to properly access Firebase resources when users are authenticated.
