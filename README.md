# Professional information system "DogHub"
Project is developing by order Altai state technical university in course "Development projects"

# Project struct
1. Docs - folder with all theoretical data
2. timeline.json - time management for jQueryGantt app (github.com/robicch/jQueryGantt)
3. Server - Server c# directory
   1. Server/DogHub - source code
   2. Server/Test - unit test code

# Dependencies
1. DotNet version 9

# Build instruction
To use server you should start PostgreSQL and  expand database using Docs/doghub_db.sql script. It will create "doghub_db" database

To build server use commands: 
```
dotnet build
dotnet test
dotnet run --project Server/Doghub
```

# Authors
1. Sh1chi
2. Tychaaa
3. LexCivis