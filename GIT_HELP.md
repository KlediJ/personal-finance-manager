# Simple Git Guide for Your Project

This guide provides straightforward instructions on how to use Git with your Personal Finance Manager project. It focuses on the most useful commands for saving your work and recovering from problems.

## Checking Your Project Status

To see what files you've changed:
```
git status
```
This shows:
- Files you've modified
- New files that aren't being tracked
- Files staged for the next commit

## Saving Your Work

### Step 1: Stage your changes
```
git add .
```
This prepares all your changes to be saved.

### Step 2: Commit your changes
```
git commit -m "Describe what you changed here"
```
This saves your changes to your local Git history with a description.

### Step 3: Push to GitHub (optional but recommended)
```
git push
```
This uploads your commits to GitHub for backup.

## Viewing Your Saved Versions

To see your previous saves:
```
git log --oneline
```
This shows a list of all your commits with:
- A unique commit ID (like b7990c0)
- The commit message you wrote

## Returning to a Previous Version

If something breaks and you need to go back to a working version:

### Option 1: Go back to your last commit (discards all current changes)
```
cd C:\Users\joana\Desktop\libri\personal-finance-manager
git reset --hard HEAD
git clean -fd
```
This throws away all changes since your last commit.

### Option 2: Go back to a specific earlier version
```
cd C:\Users\joana\Desktop\libri\personal-finance-manager
git reset --hard b7990c0
```
Replace "b7990c0" with the commit ID you want to return to (from the git log).

## After Returning to a Previous Version

Always rebuild your project after going back to an earlier version:
```
npm install
npm run rebuild-sqlite
```

## Making a Safety Backup Branch

Before trying something risky, make a backup branch:
```
git checkout -b backup-today
git push -u origin backup-today
```
This creates a named backup you can easily return to.

## Getting Back to the Latest Version

If you're viewing an old version and want to return to the latest:
```
git checkout main
```

## Finding Your GitHub Repository

1. Open your browser and go to [GitHub](https://github.com)
2. Sign in to your account
3. Click your profile picture in the top right
4. Select "Your repositories"
5. Look for "personal-finance-manager" in the list

You can also check which GitHub repository your project is connected to:
```
git remote -v
```
This shows the GitHub URL where your project is stored.

## Common Problems and Solutions

### "I made changes I don't want to keep"
```
git reset --hard HEAD
```

### "I need to pull the latest version from GitHub"
```
git pull
```

### "Git says I have conflicts"
The safest option is to make a backup of your work outside Git (copy the folder somewhere else), then reset:
```
git reset --hard origin/main
```

### "I committed changes but haven't pushed to GitHub yet"
Your changes are safe in your local Git history. Push them to GitHub for backup:
```
git push
```

## Remember:
1. Commit often with clear messages
2. Push to GitHub regularly for backup
3. If you're stuck, it's always safe to copy your entire project folder somewhere else before trying Git commands

For the current project, your last commits were:
- b7990c0: Version 0.3 Account Summary Update
- 2832741: Version 0.2 Account Summary
- 9e461ec: Version 0.1 MVP
- 94a48f2: Dashboard pre category version
- 28f7349: Clean up project structure and fix PapaParse type issues