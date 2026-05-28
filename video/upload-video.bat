@echo off
cd /d "%~dp0.."
if not exist "video\demo.mp4" (
    echo.
    echo  שגיאה: לא נמצא קובץ demo.mp4 בתיקיית video
    echo  שמור את הוידאו בשם demo.mp4 ונסה שוב.
    echo.
    pause
    exit /b
)
echo Uploading video to GitHub...
git add video/demo.mp4
git commit -m "Add demo video"
git push
echo.
echo Done! Video is live on GitHub.
pause
