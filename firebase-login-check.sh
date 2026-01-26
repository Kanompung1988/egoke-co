#!/bin/bash
firebase login:list 2>&1 | grep -q "No authorized accounts"
if [ $? -eq 0 ]; then
    echo "Need to login"
    exit 1
else
    echo "Already logged in"
    exit 0
fi
