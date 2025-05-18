Retail Management System - Installation and Usage Guide

1. First Time Setup:
   - Double click on "install.bat" and wait for it to complete
   - This will install all required software and dependencies
   - You only need to do this once

2. Running the Application:
   - Double click on "start_app.bat"
   - Wait for the browser to open automatically
   - Do not close any command prompt windows that open
   - The application will be available at http://localhost:5000

3. Stopping the Application:
   - Close all command prompt windows that opened
   - This will stop the application completely

4. Troubleshooting:
   If you see any error messages:
   - Make sure no other application is using port 3000 or 5000
   - Try closing all command prompts and running start_app.bat again
   - If problems persist, contact support

Note: Keep this folder in a safe place. Do not delete any files from this folder. 

======================
📦 Backup Instructions
======================

To back up your entire application:

1. Close the app if it’s running.
2. Go to the application folder (e.g., C:\MyApp)
3. Copy the entire folder to a USB drive or another folder as backup.

✅ What Gets Backed Up:
- All your app files
- Local MySQL database stored by XAMPP (check mysql/data folder in XAMPP)

💡 Tip: You can also use XAMPP's phpMyAdmin to export the database as a .sql file for clean backups.
