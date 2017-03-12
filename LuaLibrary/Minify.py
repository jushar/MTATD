#!/usr/bin/env python

# List files here
OUTPUT_PATH = 'MTATD.bundle.lua'
FILES = [
    'MTATD.lua',
    'Backend.lua',

    'MTAUnit/MTAUnit.lua',
    'MTAUnit/UnitTest.lua',
    'MTAUnit/TestRunner.lua'
]

# Create output file
with open(OUTPUT_PATH, 'w') as outputFile:
    # Write all files
    for path in FILES:
        with open(path) as file:
            for line in file:
                outputFile.write(line)
