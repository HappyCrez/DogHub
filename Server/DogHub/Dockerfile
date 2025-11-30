# --- build stage ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# сначала только csproj для кеша зависимостей
COPY DogHub.csproj ./
RUN dotnet restore

# затем весь код
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# --- runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# API слушает на 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DogHub.dll"]
